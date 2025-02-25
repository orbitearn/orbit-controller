import { getSigner } from "../account/signer";
import { getLast, l, li, wait } from "../../common/utils";
import { readFile } from "fs/promises";
import { ChainConfig } from "../../common/interfaces";
import { ENCODING, PATH_TO_CONFIG_JSON, writeSnapshot } from "./utils";
import { getChainOptionById } from "../../common/config/config-utils";
import { SEED } from "../envs";
import {
  getSgQueryHelpers,
  getSgExecHelpers,
} from "../../common/account/sg-helpers";
import {
  getCwExecHelpers,
  getCwQueryHelpers,
} from "../../common/account/cw-helpers";
import {
  calcEstimatedDaoProfit,
  calcOptimizedDaoWeights,
} from "../helpers/math";
import { getAllPrices } from "../helpers";
import { VOTER } from "../constants";

async function main() {
  try {
    const chainId = "neutron-1";
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
    } = getChainOptionById(CHAIN_CONFIG, chainId);

    const gasPrice = `${GAS_PRICE_AMOUNT}${DENOM}`;

    const { signer, owner } = await getSigner(PREFIX, SEED);

    const sgQueryHelpers = await getSgQueryHelpers(RPC);
    const sgExecHelpers = await getSgExecHelpers(RPC, owner, signer);

    const { voter } = await getCwQueryHelpers(chainId, RPC);
    const h = await getCwExecHelpers(chainId, RPC, owner, signer);

    const { getBalance, getAllBalances } = sgQueryHelpers;
    const { sgMultiSend, sgSend } = sgExecHelpers;
    console.clear();

    // const users = await voter.pQueryUserList(15);
    // await writeSnapshot("voters", users);

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

    li(1 - daoProfit / maxDaoProfit);
  } catch (error) {
    l(error);
  }
}

main();
