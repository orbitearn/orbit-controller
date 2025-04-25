import { MONGODB, ORBIT_CONTROLLER } from "../envs";
import { DatabaseClient } from "../db/client";
import { AppRequest, UserRequest } from "../db/requests";
import { readFile } from "fs/promises";
import { ChainConfig } from "../../common/interfaces";
import { CHAIN_ID } from "../constants";
import { getCwQueryHelpers } from "../../common/account/cw-helpers";
import { IAppDataDocument, IUserDataDocument } from "../db/types";
import { ENCODING, PATH_TO_CONFIG_JSON } from "../services/utils";
import {
  getChainOptionById,
  getContractByLabel,
} from "../../common/config/config-utils";
import {
  calcAverageEntryPriceList,
  calcProfit,
  calcApr,
} from "../helpers/math";
import {
  getAggregatedAssetList,
  extractPrices,
  getAllPrices,
  updateUserData,
  UserAsset,
} from "../helpers";

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

    averagePriceList = calcAverageEntryPriceList(appData, userData);
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
    profitList = calcProfit(currentPriceList, appData, userData);
  } catch (_) {}

  try {
    await dbClient.disconnect();
  } catch (_) {}

  return profitList;
}

export async function getUserFirstData(
  address: string
): Promise<IUserDataDocument | null> {
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

export async function getApr(
  from: number,
  to: number,
  period: number
): Promise<[number, number][]> {
  let aprList: [number, number][] = [];

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

    await dbClient.connect();
    const appData = await AppRequest.getDataInTimestampRange(from, to);

    aprList = calcApr(config.ausdc, appData, period);
  } catch (_) {}

  try {
    await dbClient.disconnect();
  } catch (_) {}

  return aprList;
}

export async function getAppDataInTimestampRange(
  from: number,
  to: number
): Promise<IAppDataDocument[]> {
  let appData: IAppDataDocument[] = [];

  try {
    await dbClient.connect();
    appData = await AppRequest.getDataInTimestampRange(from, to);
  } catch (_) {}

  try {
    await dbClient.disconnect();
  } catch (_) {}

  return appData;
}

export async function getUserDataInTimestampRange(
  address: string,
  from: number,
  to: number,
  period: number
): Promise<UserAsset[]> {
  let userData: IUserDataDocument[] = [];

  try {
    await dbClient.connect();
    userData = await UserRequest.getDataInTimestampRange(address, from, to);
  } catch (_) {}

  try {
    await dbClient.disconnect();
  } catch (_) {}

  return getAggregatedAssetList(userData, period);
}

export async function updateUserAssets(addressList: string[]): Promise<void> {
  try {
    const configJsonStr = await readFile(PATH_TO_CONFIG_JSON, {
      encoding: ENCODING,
    });
    const CHAIN_CONFIG: ChainConfig = JSON.parse(configJsonStr);
    const {
      OPTION: {
        RPC_LIST: [RPC],
        CONTRACTS,
      },
    } = getChainOptionById(CHAIN_CONFIG, CHAIN_ID);
    const bankAddress = getContractByLabel(CONTRACTS, "bank")?.ADDRESS || "";

    await dbClient.connect();
    await updateUserData(CHAIN_ID, RPC, addressList, bankAddress);
  } catch (_) {}

  try {
    await dbClient.disconnect();
  } catch (_) {}
}
