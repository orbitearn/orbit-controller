import express from "express";
import { getLast, l, li, wait } from "../common/utils";
import { text, json } from "body-parser";
import cors from "cors";
import { api } from "./routes/api";
import rateLimit from "express-rate-limit";
import { readFile } from "fs/promises";
import * as h from "helmet";
import { MONGODB, PORT, SEED } from "./envs";
import { ChainConfig } from "../common/interfaces";
import { getChainOptionById } from "../common/config/config-utils";
import { getSigner } from "./account/signer";
import { addEssence, addVoteResults, addVoters } from "./db/requests";
import { getEssence } from "./middleware/api";
import { DatabaseClient } from "./db/client";
import { CHAIN_ID, MS_PER_SECOND, SNAPSHOT, STAKING, VOTER } from "./constants";
import { getAllPrices } from "./helpers";
import {
  calcEstimatedDaoProfit,
  calcOptimizedDaoWeights,
} from "./helpers/math";
import {
  getCwExecHelpers,
  getCwQueryHelpers,
} from "../common/account/cw-helpers";
import {
  ENCODING,
  getLocalBlockTime,
  PATH_TO_CONFIG_JSON,
  ScheduledTaskRunner,
  writeSnapshot,
} from "./services/utils";

const dbClient = new DatabaseClient(MONGODB, "equinox_voter_controller");

const limiter = rateLimit({
  windowMs: 60 * MS_PER_SECOND, // 1 minute
  max: 30, // Limit each IP to 30 requests per `window`
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (_req, res) => res.send("Request rate is limited"),
});

const app = express()
  .disable("x-powered-by")
  .use(
    h.crossOriginEmbedderPolicy({ policy: "credentialless" }),
    h.crossOriginOpenerPolicy(),
    h.crossOriginResourcePolicy(),
    h.dnsPrefetchControl(),
    h.frameguard(),
    h.hidePoweredBy(),
    h.hsts(),
    h.ieNoOpen(),
    h.noSniff(),
    h.permittedCrossDomainPolicies(),
    h.referrerPolicy(),
    h.xssFilter(),
    limiter,
    cors(),
    text(),
    json()
  );

app.use("/api", api);

app.listen(PORT, async () => {
  const configJsonStr = await readFile(PATH_TO_CONFIG_JSON, {
    encoding: ENCODING,
  });
  const CHAIN_CONFIG: ChainConfig = JSON.parse(configJsonStr);
  const {
    PREFIX,
    OPTION: {
      RPC_LIST: [RPC],
      DENOM,
      GAS_PRICE_AMOUNT,
    },
  } = getChainOptionById(CHAIN_CONFIG, CHAIN_ID);

  const gasPrice = `${GAS_PRICE_AMOUNT}${DENOM}`;
  const { signer, owner } = await getSigner(PREFIX, SEED);
  const { staking, voter } = await getCwQueryHelpers(CHAIN_ID, RPC);
  const h = await getCwExecHelpers(CHAIN_ID, RPC, owner, signer);

  console.clear();
  l(`\n✔️ Server is running on PORT: ${PORT}`);

  // schedule essence snapshot for db
  new ScheduledTaskRunner().scheduleTask(
    STAKING.DB_ESSENCE_SNAPSHOT_HOUR,
    async () => {
      const essence = await getEssence();
      await dbClient.connect();
      await addEssence(essence);
      await dbClient.disconnect();
    }
  );

  // service to rebalance delegation DAO weights
  setInterval(async () => {
    try {
      const configJsonStr = await readFile(PATH_TO_CONFIG_JSON, {
        encoding: ENCODING,
      });
      const CHAIN_CONFIG: ChainConfig = JSON.parse(configJsonStr);
      const {
        PREFIX,
        OPTION: {
          RPC_LIST: [RPC],
          DENOM,
          GAS_PRICE_AMOUNT,
        },
      } = getChainOptionById(CHAIN_CONFIG, CHAIN_ID);

      const gasPrice = `${GAS_PRICE_AMOUNT}${DENOM}`;
      const { signer, owner } = await getSigner(PREFIX, SEED);
      const { voter } = await getCwQueryHelpers(CHAIN_ID, RPC);
      const h = await getCwExecHelpers(CHAIN_ID, RPC, owner, signer);

      const {
        elector_essence,
        dao_essence,
        slacker_essence,
        elector_weights: electorWeights,
        dao_weights: daoWeights,
        bribes,
      } = await voter.cwQueryOptimizationData();
      const symbols = [
        ...new Set(bribes.flatMap((x) => x.rewards).map((x) => x.symbol)),
      ];
      const prices = await getAllPrices(symbols);
      const electorEssence = Number(elector_essence);
      const daoEssence = Number(dao_essence);
      const slackerEssence = Number(slacker_essence);

      if (!electorWeights.length) {
        return;
      }

      const optimizedDaoWeights = calcOptimizedDaoWeights(
        electorEssence,
        daoEssence,
        slackerEssence,
        electorWeights,
        bribes,
        prices,
        VOTER.OPTIMIZER.ITERATIONS,
        VOTER.OPTIMIZER.DECIMAL_PLACES
      );

      const maxDaoProfit = calcEstimatedDaoProfit(
        electorEssence,
        daoEssence,
        slackerEssence,
        electorWeights,
        optimizedDaoWeights,
        bribes,
        prices
      );
      const daoProfit = calcEstimatedDaoProfit(
        electorEssence,
        daoEssence,
        slackerEssence,
        electorWeights,
        daoWeights,
        bribes,
        prices
      );

      if (Math.abs(1 - daoProfit / maxDaoProfit) > VOTER.REBALANCER.THRESHOLD) {
        await h.voter.cwPlaceVoteAsDao(optimizedDaoWeights, gasPrice);
      }
    } catch (error) {
      l(error);
    }
  }, VOTER.REBALANCER.PERIOD * MS_PER_SECOND);

  // service to make regular snapshots
  setInterval(async () => {
    // vaults
    try {
      const stakers = await staking.pQueryStakerList(STAKING.PAGINATION_AMOUNT);
      const lockers = await staking.pQueryLockerList(STAKING.PAGINATION_AMOUNT);
      await writeSnapshot(SNAPSHOT.STAKERS, stakers);
      await writeSnapshot(SNAPSHOT.LOCKERS, lockers);
      await wait(VOTER.SETTLE_PERIOD * MS_PER_SECOND);
    } catch (error) {
      l(error);
    }

    // essence
    try {
      const blocktTime = getLocalBlockTime();
      const stakingEssenceList = await staking.pQueryStakingEssenceList(
        blocktTime,
        STAKING.PAGINATION_AMOUNT
      );
      const lockingEssenceList = await staking.pQueryLockingEssenceList(
        STAKING.PAGINATION_AMOUNT
      );
      await writeSnapshot(SNAPSHOT.STAKING_ESSENCE, stakingEssenceList);
      await writeSnapshot(SNAPSHOT.LOCKING_ESSENCE, lockingEssenceList);
      await wait(VOTER.SETTLE_PERIOD * MS_PER_SECOND);
    } catch (error) {
      l(error);
    }
  }, STAKING.SNAPSHOT_PERIOD * MS_PER_SECOND);

  // service to update voter state and make voters snapshots
  let isSnapshotUpdated = false;
  while (true) {
    // try push
    await wait(VOTER.PUSH_PERIOD * MS_PER_SECOND);
    const { id } = await voter.cwQueryEpochInfo();

    try {
      await h.voter.cwPushByAdmin(gasPrice);
      await wait(VOTER.SETTLE_PERIOD * MS_PER_SECOND);
    } catch (error) {
      l(error);
    }

    try {
      const { rewards_claim_stage } = await voter.cwQueryOperationStatus();
      l({ isSnapshotUpdated, rewardsClaimStage: rewards_claim_stage });

      // make snapshot single time when votes will be applied
      if (!isSnapshotUpdated && rewards_claim_stage === "unclaimed") {
        const users = await voter.pQueryUserList(VOTER.PAGINATION_AMOUNT);
        await writeSnapshot(SNAPSHOT.VOTERS, users);

        await dbClient.connect();
        await addVoters(users, id);
        await dbClient.disconnect();

        isSnapshotUpdated = true;
      }

      // update db single time when rewards will be updated, reset snapshot flag
      if (isSnapshotUpdated && rewards_claim_stage === "swapped") {
        const { vote_results } = await voter.cwQueryVoterInfo();
        const voteResults = getLast(vote_results);

        await dbClient.connect();
        await addVoteResults(voteResults);
        await dbClient.disconnect();

        isSnapshotUpdated = false;
      }
    } catch (error) {
      l(error);
    }
  }
});
