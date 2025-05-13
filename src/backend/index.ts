import express from "express";
import fs from "fs";
import https from "https";
import { text, json } from "body-parser";
import cors from "cors";
import { api } from "./routes/api";
import rateLimit from "express-rate-limit";
import { readFile } from "fs/promises";
import * as h from "helmet";
import { ChainConfig } from "../common/interfaces";
import { getSigner } from "./account/signer";
import { AppRequest } from "./db/requests";
import { DatabaseClient } from "./db/client";
import { BANK, CHAIN_ID } from "./constants";
import { calcAusdcPrice, calcClaimAndSwapData } from "./helpers/math";
import { AssetPrice } from "./db/types";
import * as math from "mathjs";
import { logger, le } from "./services/logger";
import {
  getChainOptionById,
  getContractByLabel,
} from "../common/config/config-utils";
import {
  getCwExecHelpers,
  getCwQueryHelpers,
} from "../common/account/cw-helpers";
import {
  extractPrices,
  getAllPrices,
  getUpdateStateList,
  updateUserData,
} from "./helpers";
import {
  DECIMAL_PLACES,
  decimalFrom,
  dedupVector,
  li,
  numberFrom,
  wait,
} from "../common/utils";
import {
  dateToTimestamp,
  ENCODING,
  epochToDateStringUTC,
  getBlockTime,
  getLocalBlockTime,
  MS_PER_SECOND,
  PATH_TO_CONFIG_JSON,
  toDate,
} from "./services/utils";
import {
  MONGODB,
  ORBIT_CONTROLLER,
  PORT,
  SEED,
  LOCAL_IP_LIST,
  LOCAL_PORT_LIST,
  BE_DEV_URL,
  BE_TUNNEL_URL,
  BE_PROD_URL,
  FE_DEV_URL,
  FE_STAGE_URL,
  FE_PROD_URL,
  FE_DEV_NEW_URL,
  FE_STAGE_NEW_URL,
  FE_PROD_NEW_URL,
  rootPath,
  IS_PROD,
} from "./envs";

const dbClient = new DatabaseClient(MONGODB, ORBIT_CONTROLLER);

const limiter = rateLimit({
  windowMs: 60 * MS_PER_SECOND, // 1 minute
  max: 30, // Limit each IP to 30 requests per `window`
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (_req, res) => res.send("Request rate is limited"),
});

// const allowedOrigins = dedupVector([
//   ...LOCAL_IP_LIST.flatMap((ip) =>
//     LOCAL_PORT_LIST.map((port) => `${ip}:${port}`)
//   ),
//   BE_DEV_URL,
//   BE_TUNNEL_URL,
//   BE_PROD_URL,
//   FE_DEV_URL,
//   FE_STAGE_URL,
//   FE_PROD_URL,
//   FE_DEV_NEW_URL,
//   FE_STAGE_NEW_URL,
//   FE_PROD_NEW_URL,
// ]).filter((x) => x);

// const app = express()
//   .disable("x-powered-by")
//   .use(
//     cors({
//       origin: function (origin, callback) {
//         // Allow requests with no origin (like mobile apps, curl requests)
//         if (!origin) return callback(null, true);

//         // For whitelisted origins
//         if (allowedOrigins.indexOf(origin) !== -1) {
//           return callback(null, true);
//         }

//         // For non-whitelisted origins
//         const msg =
//           "The CORS policy for this site does not allow access from the specified Origin.";
//         return callback(new Error(msg), false);
//       },
//       methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
//       allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
//       credentials: true,
//     }),
//     h.crossOriginEmbedderPolicy({ policy: "credentialless" }),
//     h.crossOriginOpenerPolicy(),
//     h.crossOriginResourcePolicy({ policy: "cross-origin" }),
//     h.dnsPrefetchControl(),
//     h.frameguard(),
//     h.hidePoweredBy(),
//     h.hsts(),
//     h.ieNoOpen(),
//     h.noSniff(),
//     h.permittedCrossDomainPolicies(),
//     h.referrerPolicy(),
//     h.xssFilter(),
//     limiter,
//     text(),
//     json()
//   );

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

const [prodKey, prodCert] = [
  "../../../etc/letsencrypt/live/backend.orbitearn.com/privkey.pem",
  "../../../etc/letsencrypt/live/backend.orbitearn.com/fullchain.pem",
];
const [devKey, devCert] = [
  "src/backend/ssl/key.pem",
  "src/backend/ssl/cert.pem",
];
const [key, cert] = IS_PROD ? [prodKey, prodCert] : [devKey, devCert];
const options = {
  key: fs.readFileSync(rootPath(key)),
  cert: fs.readFileSync(rootPath(cert)),
};

app.use("/api", api);

https.createServer(options, app).listen(PORT, async () => {
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
      CONTRACTS,
    },
  } = getChainOptionById(CHAIN_CONFIG, CHAIN_ID);
  const bankAddress = getContractByLabel(CONTRACTS, "bank")?.ADDRESS || "";

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

  // make sure contract block time can be get initially
  let blockTime = await bank.cwQueryBlockTime();
  let blockTimeOffset = blockTime - getLocalBlockTime();
  const now = toDate(blockTime);

  // calculate the next top of the hour
  let nextTopOfHour = toDate(blockTime);
  nextTopOfHour.setMinutes(BANK.START_DATE_MINUTES, 0, 0);

  // if we're already past this hour, move to the next hour
  if (nextTopOfHour <= now) {
    nextTopOfHour.setHours(nextTopOfHour.getHours() + 1);
  }

  let scriptStartTimestamp: number = 0;

  try {
    await dbClient.connect();
    const timestamp = (await AppRequest.getDataByLastCounter())?.timestamp;

    if (!timestamp) {
      throw new Error();
    }

    scriptStartTimestamp =
      dateToTimestamp(timestamp) + BANK.DISTRIBUTION_PERIOD;
  } catch (_) {
    scriptStartTimestamp = dateToTimestamp(nextTopOfHour);
  }

  let nextUpdateDate = scriptStartTimestamp;

  console.clear();
  le(`\n✔️ Server is running on PORT: ${PORT}`);

  // the script should be started earlier to be ready to update just in time
  scriptStartTimestamp -= 5 * BANK.CYCLE_COOLDOWN;
  li({
    scriptStartTimestamp: epochToDateStringUTC(scriptStartTimestamp),
    nextUpdateDate: epochToDateStringUTC(nextUpdateDate),
  });

  await wait((scriptStartTimestamp - blockTime) * MS_PER_SECOND);
  le(
    `\n✔️ Script is running since: ${epochToDateStringUTC(
      getBlockTime(blockTimeOffset)
    )}`
  );

  // service to claim and swap orbit rewards and save data in db
  let isAusdcPriceUpdated = true;
  while (true) {
    // to limit rpc request frequency
    await wait(BANK.CYCLE_COOLDOWN * MS_PER_SECOND);

    // check the connection and reconnect if it's required
    if (!dbClient.isConnected()) {
      try {
        dbClient.connect();
      } catch (error) {
        le(error);
      }
    }

    let usersToUpdate: string[] = [];
    // check distribution date and user counters
    try {
      const userCounterList = await bank.pQueryUserCounterList(
        BANK.PAGINATION.USER_COUNTER
      );
      const { counter: appCounter } = await bank.cwQueryDistributionState({});

      usersToUpdate = getUpdateStateList(
        appCounter,
        BANK.MAX_COUNTER_DIFF,
        BANK.UPDATE_STATE_LIST.LIMIT,
        userCounterList
      );
    } catch (error) {
      le(error);
    }

    // get block time, sync clock
    try {
      blockTime = await bank.cwQueryBlockTime();
      blockTimeOffset = blockTime - getLocalBlockTime();
    } catch (_) {
      blockTime = getBlockTime(blockTimeOffset);
    }

    // try update user states if we have enough time
    if (
      blockTime + BANK.UPDATE_STATE_TIME_MARGIN < nextUpdateDate &&
      usersToUpdate.length >= BANK.UPDATE_STATE_LIST.MIN
    ) {
      try {
        // update user assets in db first!
        await updateUserData(CHAIN_ID, RPC, usersToUpdate, bankAddress);
        le("user db data is updated");

        // should be used only in case of updateUserData success!
        await h.bank.cwUpdateUserState(usersToUpdate, gasPrice);
        le("user state is updated");
      } catch (error) {
        le(error);
      }

      continue;
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
      le("Rewards are distributed");

      isAusdcPriceUpdated = false;
    } catch (error) {
      le(error);
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
          await AppRequest.addDataItem(nextUpdateDate, counter, assetPrices);
          le("Prices are stored in DB");
        } catch (error) {
          le(error);
        }

        isAusdcPriceUpdated = true;
      }
    } catch (error) {
      le(error);
    }

    nextUpdateDate += BANK.DISTRIBUTION_PERIOD;
  }
});

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM signal received");
  await dbClient.disconnect();
  process.exit(0);
});
