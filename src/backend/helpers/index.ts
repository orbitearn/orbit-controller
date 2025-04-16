import { getCwQueryHelpers } from "../../common/account/cw-helpers";
import { AssetItem, Token } from "../../common/codegen/Bank.types";
import { TokenInfo } from "../../common/interfaces";
import {
  AssetAmount,
  IAppDataSchema,
  IUserDataSchema,
  TimestampData,
} from "../db/types";
import { DatabaseClient } from "../db/client";
import { AppRequest, UserRequest } from "../db/requests";
import { dateToTimestamp, epochToDateStringUTC } from "../services/utils";
import * as math from "mathjs";
import { BANK, DECIMALS_DEFAULT } from "../constants";
import {
  DECIMAL_PLACES,
  dedupVector,
  l,
  li,
  numberFrom,
  Request,
} from "../../common/utils/index";

export interface PriceItem {
  price: math.BigNumber;
  symbol: string;
}

export async function getAllPrices(symbols?: string[]): Promise<PriceItem[]> {
  const baseURL = "https://api.astroport.fi/api";
  const route = "/tokens";
  const req = new Request({ baseURL });

  let prices: PriceItem[] = [];

  try {
    const tokenList: TokenInfo[] = await req.get(route);

    // iterate over tokens
    for (const { priceUSD, denom } of tokenList) {
      if (!priceUSD) {
        continue;
      }

      prices.push({ symbol: denom, price: numberFrom(priceUSD) });
    }
  } catch (_) {}

  // remove duplications calculating average prices
  let denoms = dedupVector(prices.map((x) => x.symbol));
  denoms = symbols ? denoms.filter((x) => symbols.includes(x)) : denoms;

  return denoms.map((denom) => {
    const priceList = prices
      .filter(({ symbol }) => symbol === denom)
      .map((x) => x.price);
    const averagePrice = math.mean(priceList);

    return {
      symbol: denom,
      price: averagePrice,
    };
  });
}

export function getTokenSymbol(token: Token): string {
  return "native" in token ? token.native.denom : token.cw20.address;
}

interface UserDataListItem {
  user: string;
  userData: IUserDataSchema[];
  appData: IAppDataSchema[];
  dbAssets: AssetItem[][];
}

export async function updateUserData(
  dbClient: DatabaseClient,
  chainId: string,
  rpc: string,
  userList: string[],
  bankAddress: string
): Promise<void> {
  let addressAndDataList: [string, TimestampData[]][] = [];

  // get user data from the contract
  try {
    const { bank } = await getCwQueryHelpers(chainId, rpc);
    await dbClient.connect();
    const dbAssetsList = await bank.cwQueryDbAssetsList(userList);
    const assetList = await bank.pQueryAssetList(BANK.PAGINATION.ASSET_LIST);

    const distributionStateList = await bank.cwQueryDistributionStateList([
      ...userList,
      bankAddress,
    ]);
    const userDistributionStateList = distributionStateList.filter(
      ([address]) => address !== bankAddress
    );

    const dateTo =
      userDistributionStateList.find(
        ([address]) => address === bankAddress
      )?.[1]?.update_date || 0;

    let userDataList: UserDataListItem[] = [];

    for (const [user, { counter }] of userDistributionStateList) {
      const timestamp = (await AppRequest.getDataByCounter(counter))?.timestamp;
      const dateFrom = dateToTimestamp(timestamp) || dateTo;
      const userData = await UserRequest.getDataInTimestampRange(
        user,
        dateFrom,
        dateTo
      );
      const appData = await AppRequest.getDataInTimestampRange(
        dateFrom,
        dateTo
      );
      const dbAssets =
        dbAssetsList.find(([address]) => address === user)?.[1] || [];

      li({
        user,
        dateFrom: epochToDateStringUTC(dateFrom),
        dateTo: epochToDateStringUTC(dateTo),
        userData,
        appData,
        dbAssets,
      });

      userDataList.push({ user, userData, appData, dbAssets });
    }

    // get exactly what must be added
    let dbAssetsToAddList: UserDataListItem[] = [];

    for (const { user, userData, appData, dbAssets } of userDataList) {
      const dbAssetsToAdd = dbAssets.reduce((acc, cur) => {
        const assetsToAdd = cur.filter(
          (x) =>
            !userData.some(
              (y) =>
                y.asset === x.symbol &&
                numberFrom(y.amount) === numberFrom(x.amount)
            )
        );

        if (assetsToAdd.length) {
          acc.push(assetsToAdd);
        }

        return acc;
      }, [] as AssetItem[][]);

      if (dbAssetsToAdd.length) {
        li({
          user,
          userData,
          appData,
          dbAssetsToAdd,
        });

        dbAssetsToAddList.push({
          user,
          userData,
          appData,
          dbAssets: dbAssetsToAdd,
        });
      }
    }

    // get decimals for unique asset symbol list
    const symbolList = dedupVector(
      dbAssetsToAddList.flatMap(({ dbAssets }) =>
        dbAssets.flatMap((x) => x.map((y) => y.symbol))
      )
    );
    const symbolAndDecimalsList: [string, number][] = symbolList.map(
      (symbol) => {
        const decimals =
          assetList.find((x) => getTokenSymbol(x.token) === symbol)?.decimals ||
          DECIMALS_DEFAULT;

        return [symbol, decimals];
      }
    );

    // dbAssets amounts must be divided according to its decimals to store in db amounts as ts numbers with 18 decimal places
    for (const {
      user,
      appData,
      dbAssets: dbAssetsToAdd,
    } of dbAssetsToAddList) {
      const dataList = dbAssetsToAdd
        .map((assets, i) => {
          const { timestamp } = appData[i];
          const assetList: AssetAmount[] = assets
            .map(({ amount, symbol }) => {
              const decimals =
                symbolAndDecimalsList.find(([s, _d]) => s === symbol)?.[1] ||
                DECIMALS_DEFAULT;

              const divider = numberFrom(10).pow(decimals);
              const amountDec = numberFrom(amount)
                .div(divider)
                .toDecimalPlaces(DECIMAL_PLACES)
                .toNumber();

              return {
                asset: symbol,
                amount: amountDec,
              };
            })
            .filter((x) => x.amount);

          return { timestamp, assetList };
        })
        .filter((x) => x.assetList.length);

      if (dataList.length) {
        addressAndDataList.push([user, dataList]);
      }
    }
  } catch (e) {
    l(e);
  }

  try {
    if (addressAndDataList.length) {
      await UserRequest.addMultipleDataList(addressAndDataList);
      l("Prices are stored in DB");
    }
  } catch (e) {
    l(e);
  }

  try {
    await dbClient.disconnect();
  } catch (_) {}
}

// pagination to avoid gas limit problem updating user counters
export function getUpdateStateList(
  appCounter: number,
  maxCounterDiff: number,
  maxUpdateStateList: number,
  userCounterList: [string, number][]
): string[] {
  const minAppCnt = appCounter - maxCounterDiff;

  return userCounterList
    .filter(([_, userCnt]) => minAppCnt >= userCnt)
    .sort(([_userA, cntA], [_userB, cntB]) => cntA - cntB)
    .map(([user]) => user)
    .slice(0, maxUpdateStateList);
}

// TODO: fake logic

// [real, fake][]
const ASSET_TABLE: [string, string][] = [
  // wBTC: https://github.com/astroport-fi/astroport-token-lists/blob/main/tokenLists/neutron.json#L572
  [
    "ibc/78F7404035221CD1010518C7BC3DD99B90E59C2BA37ABFC3CE56B0CFB7E8901B",
    "factory/neutron1lh2w8ne2scnc7jve38ymr3xelyw5gt2l34flxf8mpeptwg3u575setmke6/axlWBTC",
  ],
  // wstETH: https://github.com/astroport-fi/astroport-token-lists/blob/main/tokenLists/neutron.json#L139
  [
    "factory/neutron1ug740qrkquxzrk2hh29qrlx3sktkfml3je7juusc2te7xmvsscns0n2wry/wstETH",
    "factory/neutron1lh2w8ne2scnc7jve38ymr3xelyw5gt2l34flxf8mpeptwg3u575setmke6/wstETH",
  ],
];

export function getRealAsset(fakeAsset: string): string {
  return ASSET_TABLE.find(([_real, fake]) => fake === fakeAsset)?.[0] || "";
}

export function getFakeAsset(realAsset: string): string {
  return ASSET_TABLE.find(([real, _fake]) => real === realAsset)?.[1] || "";
}

export function extractPrices(
  realPrices: PriceItem[]
): [string, math.BigNumber][] {
  return realPrices.reduce((acc, cur) => {
    let fake = ASSET_TABLE.find(([real]) => real === cur.symbol)?.[1];

    if (fake) {
      acc.push([fake, cur.price]);
    }

    return acc;
  }, [] as [string, math.BigNumber][]);
}
