import { floor, li } from "../../common/utils";
import { MONGODB, ORBIT_CONTROLLER } from "../envs";
import { DatabaseClient } from "../db/client";
import { AppRequest, UserRequest } from "../db/requests";
import { extractPrices, getAllPrices, updateUserData } from "../helpers";
import { ENCODING, PATH_TO_CONFIG_JSON } from "../services/utils";
import { readFile } from "fs/promises";
import { ChainConfig } from "../../common/interfaces";
import { getChainOptionById } from "../../common/config/config-utils";
import { CHAIN_ID } from "../constants";
import { getCwQueryHelpers } from "../../common/account/cw-helpers";
import {
  dateToTimestamp,
  IAppDataDocument,
  IUserDataDocument,
} from "../db/types";

const dbClient = new DatabaseClient(MONGODB, ORBIT_CONTROLLER);

// average_entry_price = sum(amount_i * price_i) / sum(amount_i)
export async function getAverageEntryPrice(
  address: string,
  from: number,
  to: number
): Promise<[string, number][]> {
  let averagePriceList: [string, number][] = [];

  try {
    await dbClient.connect();
    const userData = await UserRequest.getDataInTimestampRange(
      address,
      from,
      to
    );
    const appData = await AppRequest.getDataInTimestampRange(from, to);
    await dbClient.disconnect();

    const assetList: string[] = [...new Set(userData.map((x) => x.asset))];

    averagePriceList = assetList.map((asset) => {
      const [amountSum, productSum] = userData.reduce(
        ([amountAcc, productAcc], cur) => {
          if (cur.asset === asset) {
            const timestamp = dateToTimestamp(cur.timestamp);
            const priceList =
              appData.find((x) => dateToTimestamp(x.timestamp) === timestamp)
                ?.assetPrices || [];
            const price =
              priceList.find((x) => x.asset === cur.asset)?.price || 0;

            if (price) {
              amountAcc += cur.amount;
              productAcc += cur.amount * price;
            }
          }

          return [amountAcc, productAcc];
        },
        [0, 0]
      );

      return [asset, floor(productSum / amountSum, 6)];
    });
  } catch (_) {}

  return averagePriceList;
}

// profit = sum(amount_i * (price - price_i))
export async function getProfit(
  address: string,
  from: number,
  to: number
): Promise<[string, number][]> {
  let profitList: [string, number][] = [];

  try {
    await dbClient.connect();
    const userData = await UserRequest.getDataInTimestampRange(
      address,
      from,
      to
    );
    const appData = await AppRequest.getDataInTimestampRange(from, to);
    await dbClient.disconnect();

    const currentPriceList: [string, number][] = extractPrices(
      await getAllPrices()
    );
    const assetList: string[] = [...new Set(userData.map((x) => x.asset))];

    profitList = assetList.map((asset) => {
      const productSum = userData.reduce((acc, cur) => {
        if (cur.asset === asset) {
          const timestamp = dateToTimestamp(cur.timestamp);
          const priceList =
            appData.find((x) => dateToTimestamp(x.timestamp) === timestamp)
              ?.assetPrices || [];
          const price =
            priceList.find((x) => x.asset === cur.asset)?.price || 0;
          const currentPrice =
            currentPriceList.find(([symbol]) => symbol === asset)?.[1] || 0;

          if (price && currentPrice) {
            acc += cur.amount * (currentPrice - price);
          }
        }

        return acc;
      }, 0);

      return [asset, floor(productSum, 6)];
    });
  } catch (_) {}

  return profitList;
}

export async function getUserFirstData(address: string) {
  let userFirstData: IUserDataDocument | null = null;

  try {
    await dbClient.connect();
    userFirstData = await UserRequest.getFirstData(address);
    await dbClient.disconnect();
  } catch (_) {}

  return userFirstData;
}

export async function getYieldRate(
  from: number,
  to: number,
  period?: number
): Promise<[number, number][]> {
  // [yieldRate, timestamp][]
  let yieldRateList: [number, number][] = [];

  try {
    const configJsonStr = await readFile(PATH_TO_CONFIG_JSON, {
      encoding: ENCODING,
    });
    const CHAIN_CONFIG: ChainConfig = JSON.parse(configJsonStr);
    const {
      OPTION: {
        RPC_LIST: [RPC],
      },
    } = getChainOptionById(CHAIN_CONFIG, CHAIN_ID);

    const { bank } = await getCwQueryHelpers(CHAIN_ID, RPC);

    const config = await bank.cwQueryConfig();
    let ausdcPriceLast = 1;
    try {
      ausdcPriceLast = await bank.cwQueryAusdcPrice();
    } catch (_) {}

    await dbClient.connect();
    const priceList: [number, number][] = (
      await AppRequest.getDataInTimestampRange(from, to)
    ).map((x) => {
      const ausdcPrice =
        x.assetPrices.find((y) => y.asset === config.ausdc)?.price ||
        ausdcPriceLast;

      return [ausdcPrice, dateToTimestamp(x.timestamp)];
    });
    await dbClient.disconnect();

    const priceListItemPre = priceList[0] || [1, 0];
    let [ausdcPricePre, _timestampPre] = priceListItemPre;

    for (const [ausdcPrice, timestamp] of priceList) {
      const yieldRate = ausdcPrice / ausdcPricePre - 1;

      if (yieldRate) {
        yieldRateList.push([yieldRate, timestamp]);
        ausdcPricePre = ausdcPrice;
      }
    }
  } catch (_) {}

  if (!period) {
    return yieldRateList;
  }

  // [yieldRate, timestamp][]
  let yieldRateListAggregated: [number, number][] = [];

  const yieldRateListItemPre = yieldRateList[0] || [0, 0];
  let [yieldRateAcc, timestampPre] = yieldRateListItemPre;

  for (const [yieldRate, timestamp] of yieldRateList) {
    yieldRateAcc = (1 + yieldRateAcc) * (1 + yieldRate) - 1;

    if (timestamp - timestampPre >= period) {
      yieldRateListAggregated.push([yieldRateAcc, timestamp]);

      yieldRateAcc = 0;
      timestampPre = timestamp;
    }
  }

  return yieldRateListAggregated;
}

export async function getAppDataInTimestampRange(from: number, to: number) {
  let AppData: IAppDataDocument[] = [];

  try {
    await dbClient.connect();
    AppData = await AppRequest.getDataInTimestampRange(from, to);
    await dbClient.disconnect();
  } catch (_) {}

  return AppData;
}

export async function getUserDataInTimestampRange(
  address: string,
  from: number,
  to: number
) {
  let userData: IUserDataDocument[] = [];

  try {
    await dbClient.connect();
    userData = await UserRequest.getDataInTimestampRange(address, from, to);
    await dbClient.disconnect();
  } catch (_) {}

  return userData;
}

export async function updateUserAssets(address: string) {
  try {
    const configJsonStr = await readFile(PATH_TO_CONFIG_JSON, {
      encoding: ENCODING,
    });
    const CHAIN_CONFIG: ChainConfig = JSON.parse(configJsonStr);
    const {
      OPTION: {
        RPC_LIST: [RPC],
      },
    } = getChainOptionById(CHAIN_CONFIG, CHAIN_ID);

    await updateUserData(dbClient, CHAIN_ID, RPC, address);
  } catch (_) {}
}
