import express from "express";
import { getLast, l, li, wait } from "../common/utils";
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
import {
  getCwExecHelpers,
  getCwQueryHelpers,
} from "../common/account/cw-helpers";
import { ENCODING, PATH_TO_CONFIG_JSON } from "./services/utils";

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
      Number(appInfo.usdc_net) + Number(rewards),
      Number(appInfo.ausdc.minted)
    );

    return Math.max(nextAusdcPrice, ausdcPrice);
  };

  console.clear();
  l(`\n✔️ Server is running on PORT: ${PORT}`);

  // service to claim and swap orbit rewards and save data in db
  let isAusdcPriceUpdated = true;
  while (true) {
    await wait(BANK.CYCLE_PERIOD_MIN * MS_PER_SECOND);

    // check distribution date
    const { update_date: lastUpdateDate } = await bank.cwQueryDistributionState(
      {}
    );
    let blockTime = await bank.cwQueryBlockTime();
    const nextUpdateDate = lastUpdateDate + BANK.DISTRIBUTION_PERIOD;

    if (blockTime < nextUpdateDate) {
      continue;
    }

    // pause, collect and process data, claim and swap
    let priceList: [string, number][] = [];
    const isPaused = await bank.cwQueryPauseState();
    try {
      if (!isPaused) {
        await h.bank.cwPause(gasPrice);
      }

      priceList = extractPrices(await getAllPrices());
      const ausdcPriceNext = await getNextAusdcPrice();
      const userInfoList = await bank.pQueryUserInfoList(
        { ausdcPriceNext },
        BANK.PAGINATION_AMOUNT
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

        await dbClient.connect();
        try {
          await AppRequest.addDataItem(blockTime, counter, assetPrices);
          l("Prices are stored in DB");
        } catch (_) {}
        await dbClient.disconnect();

        isAusdcPriceUpdated = true;
      }
    } catch (error) {}
  }
});
