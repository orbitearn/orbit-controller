import { MONGODB, ORBIT_CONTROLLER } from "../envs";
import { DatabaseClient } from "../db/client";
import { AppRequest, UserRequest } from "../db/requests";
import { ENCODING, PATH_TO_CONFIG_JSON } from "../services/utils";
import { readFile } from "fs/promises";
import { ChainConfig } from "../../common/interfaces";
import { getChainOptionById } from "../../common/config/config-utils";
import { CHAIN_ID } from "../constants";
import { getCwQueryHelpers } from "../../common/account/cw-helpers";
import { IAppDataDocument, IUserDataDocument } from "../db/types";
import { extractPrices, getAllPrices, updateUserData } from "../helpers";
import {
  calcAverageEntryPriceList,
  calcProfit,
  calcYieldRate,
} from "../helpers/math";

const dbClient = new DatabaseClient(MONGODB, ORBIT_CONTROLLER);

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

    const assetList: string[] = [...new Set(userData.map((x) => x.asset))];
    averagePriceList = calcAverageEntryPriceList(assetList, appData, userData);
  } catch (_) {}

  try {
    await dbClient.disconnect();
  } catch (_) {}

  return averagePriceList;
}

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

    const currentPriceList = extractPrices(await getAllPrices());
    const assetList: string[] = [...new Set(userData.map((x) => x.asset))];
    profitList = calcProfit(currentPriceList, assetList, appData, userData);
  } catch (_) {}

  try {
    await dbClient.disconnect();
  } catch (_) {}

  return profitList;
}

export async function getUserFirstData(address: string) {
  let userFirstData: IUserDataDocument | null = null;

  try {
    await dbClient.connect();
    userFirstData = await UserRequest.getFirstData(address);
  } catch (_) {}

  try {
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
    const appData = await AppRequest.getDataInTimestampRange(from, to);

    yieldRateList = calcYieldRate(
      config.ausdc,
      ausdcPriceLast,
      appData,
      period
    );
  } catch (_) {}

  try {
    await dbClient.disconnect();
  } catch (_) {}

  return yieldRateList;
}

export async function getAppDataInTimestampRange(from: number, to: number) {
  let AppData: IAppDataDocument[] = [];

  try {
    await dbClient.connect();
    AppData = await AppRequest.getDataInTimestampRange(from, to);
  } catch (_) {}

  try {
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
  } catch (_) {}

  try {
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
