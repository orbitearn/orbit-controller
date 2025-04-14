import express from "express";
import { getLast, l, li, numberFrom, wait } from "../common/utils";
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
import { AppRequest, UserRequest } from "./db/requests";
import { DatabaseClient } from "./db/client";
import { BANK, CHAIN_ID, MS_PER_SECOND } from "./constants";
import { extractPrices, getAllPrices, getTokenSymbol } from "./helpers";
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
  PATH_TO_CONFIG_JSON,
} from "./services/utils";

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
    const DECIMAL_PRECISION = 18;
    const appInfo = await bank.cwQueryAppInfo();
    const rewards = await bank.cwQueryRewards();
    const ausdcPrice = await bank.cwQueryAusdcPrice();
    const nextAusdcPrice = calcAusdcPrice(
      numberFrom(appInfo.usdc_net).add(numberFrom(rewards)),
      numberFrom(appInfo.ausdc.minted)
    );

    return math
      .max([nextAusdcPrice, ausdcPrice])
      .toPrecision(DECIMAL_PRECISION);
  };

  console.clear();
  l(`\n✔️ Server is running on PORT: ${PORT}`);

  // service to claim and swap orbit rewards and save data in db
  let isAusdcPriceUpdated = true;
  while (true) {
    await wait(BANK.CYCLE_PERIOD_MIN * MS_PER_SECOND);

    let blockTime: number = getLocalBlockTime();
    let nextUpdateDate: number = blockTime + 1;

    // check distribution date
    try {
      // const userCounterList = await bank.pQueryUserCounterList(BANK.PAGINATION.USER_COUNTER);
      const { update_date: lastUpdateDate, counter: appCounter } =
        await bank.cwQueryDistributionState({});
      blockTime = await bank.cwQueryBlockTime();
      nextUpdateDate = lastUpdateDate + BANK.DISTRIBUTION_PERIOD;
    } catch (error) {
      l(error);
    }

    // TODO: add
    // let app_counter = h.bank_query_distribution_state(None)?.counter;
    // let user_counter_list = h.bank_query_user_counter_list(9, None)?;
    // let users_to_update: Vec<_> = user_counter_list
    //     .iter()
    //     .filter(|(_, counter)| app_counter >= counter + 50)
    //     .map(|(address, _)| address.to_owned())
    //     .collect();
    // h.bank_try_update_user_state(owner, &users_to_update)?;

    if (blockTime < nextUpdateDate) {
      continue;
    }

    // enable capture mode, collect and process data, claim and swap
    let priceList: [string, number][] = [];
    try {
      const isCaptureMode = (await bank.cwQueryState()).capture_mode;
      if (!isCaptureMode) {
        await h.bank.cwEnableCapture(gasPrice);
      }

      priceList = extractPrices(await getAllPrices());
      const ausdcPriceNext = await getNextAusdcPrice();
      const userInfoList = await bank.pQueryUserInfoList(
        { ausdcPriceNext },
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
            price,
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
