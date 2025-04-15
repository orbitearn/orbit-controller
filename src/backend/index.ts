import express from "express";
import { text, json } from "body-parser";
import cors from "cors";
import { api } from "./routes/api";
import rateLimit from "express-rate-limit";
import { readFile } from "fs/promises";
import * as h from "helmet";
import { MONGODB, ORBIT_CONTROLLER, PORT, SEED } from "./envs";
import { ChainConfig } from "../common/interfaces";
import { getChainOptionById } from "../common/config/config-utils";
import { getSigner } from "./account/signer";
import { AppRequest } from "./db/requests";
import { DatabaseClient } from "./db/client";
import { BANK, CHAIN_ID } from "./constants";
import { extractPrices, getAllPrices, getUpdateStateList } from "./helpers";
import { calcAusdcPrice, calcClaimAndSwapData } from "./helpers/math";
import { AssetPrice } from "./db/types";
import * as math from "mathjs";
import {
  getCwExecHelpers,
  getCwQueryHelpers,
} from "../common/account/cw-helpers";
import {
  ENCODING,
  getLocalBlockTime,
  MS_PER_SECOND,
  PATH_TO_CONFIG_JSON,
} from "./services/utils";
import {
  DECIMAL_PLACES,
  decimalFrom,
  l,
  numberFrom,
  wait,
} from "../common/utils";

const dbClient = new DatabaseClient(MONGODB, ORBIT_CONTROLLER);

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
    cors(),
    h.crossOriginEmbedderPolicy({ policy: "credentialless" }),
    h.crossOriginOpenerPolicy(),
    h.crossOriginResourcePolicy({ policy: "cross-origin" }),
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
    text(),
    json()
  );

app.use("/api", api);

app.listen(PORT, async () => {
  // init
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
  const { bank } = await getCwQueryHelpers(CHAIN_ID, RPC);
  const h = await getCwExecHelpers(CHAIN_ID, RPC, owner, signer);

  // helpers
  const getNextAusdcPrice = async () => {
    const appInfo = await bank.cwQueryAppInfo();
    const rewards = await bank.cwQueryRewards();
    const ausdcPrice = await bank.cwQueryAusdcPrice();
    const nextAusdcPrice = calcAusdcPrice(
      numberFrom(appInfo.usdc_net).add(numberFrom(rewards)),
      numberFrom(appInfo.ausdc.minted)
    );

    return decimalFrom(math.max([nextAusdcPrice, numberFrom(ausdcPrice)]));
  };

  console.clear();
  l(`\n✔️ Server is running on PORT: ${PORT}`);

  // TODO: use TaskScheduler
  // service to claim and swap orbit rewards and save data in db
  let isAusdcPriceUpdated = true;
  while (true) {
    await wait(BANK.CYCLE_PERIOD_MIN * MS_PER_SECOND);

    let usersToUpdate: string[] = [];
    let blockTime: number = getLocalBlockTime();
    let nextUpdateDate: number = blockTime + 1;

    // check distribution date and user counters
    try {
      const userCounterList = await bank.pQueryUserCounterList(
        BANK.PAGINATION.USER_COUNTER
      );
      const { update_date: lastUpdateDate, counter: appCounter } =
        await bank.cwQueryDistributionState({});
      blockTime = await bank.cwQueryBlockTime();
      nextUpdateDate = lastUpdateDate + BANK.DISTRIBUTION_PERIOD;

      usersToUpdate = getUpdateStateList(
        appCounter,
        BANK.MAX_COUNTER_DIFF,
        BANK.MAX_UPDATE_STATE_LIST,
        userCounterList
      );
    } catch (error) {
      l(error);
    }

    // try update user states
    try {
      if (usersToUpdate.length) {
        await h.bank.cwUpdateUserState(usersToUpdate, gasPrice);
      }
    } catch (error) {
      l(error);
    }

    if (blockTime < nextUpdateDate) {
      continue;
    }

    // enable capture mode, collect and process data, claim and swap
    let priceList: [string, math.BigNumber][] = [];
    try {
      const isCaptureMode = (await bank.cwQueryState()).capture_mode;
      if (!isCaptureMode) {
        await h.bank.cwEnableCapture(gasPrice);
      }

      priceList = extractPrices(await getAllPrices());
      const ausdcPriceNext = await getNextAusdcPrice();
      const userInfoList = await bank.pQueryUserInfoList(
        { ausdcPriceNext: numberFrom(ausdcPriceNext) },
        BANK.PAGINATION.USER_INFO
      );
      const [rewards, usdcYield, assets, feeSum] =
        calcClaimAndSwapData(userInfoList);

      await h.bank.cwClaimAndSwap(
        rewards,
        usdcYield,
        assets,
        feeSum,
        priceList,
        gasPrice
      );
      l("Rewards are distributed");

      blockTime = await bank.cwQueryBlockTime();
      isAusdcPriceUpdated = false;
    } catch (error) {
      l(error);
    }

    // add asset prices in DB
    try {
      if (!isAusdcPriceUpdated) {
        if (!priceList.length) {
          priceList = extractPrices(await getAllPrices());
        }

        const { counter } = await bank.cwQueryDistributionState({});
        const { ausdc: ausdcSymbol } = await bank.cwQueryConfig();
        const ausdcPrice = await bank.cwQueryAusdcPrice();
        const assetPrices: AssetPrice[] = [
          { asset: ausdcSymbol, price: ausdcPrice },
          ...priceList.map(([asset, price]) => ({
            asset,
            price: price.toDecimalPlaces(DECIMAL_PLACES).toNumber(),
          })),
        ];

        try {
          await dbClient.connect();
          await AppRequest.addDataItem(blockTime, counter, assetPrices);
          l("Prices are stored in DB");
        } catch (_) {}
        try {
          await dbClient.disconnect();
        } catch (_) {}

        isAusdcPriceUpdated = true;
      }
    } catch (error) {}
  }
});
