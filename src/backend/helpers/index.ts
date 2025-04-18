import { getCwQueryHelpers } from "../../common/account/cw-helpers";
import { AssetItem, Token } from "../../common/codegen/Bank.types";
import { TokenInfo } from "../../common/interfaces";
import { AppRequest, UserRequest } from "../db/requests";
import { dateToTimestamp } from "../services/utils";
import * as math from "mathjs";
import { BANK, DECIMALS_DEFAULT } from "../constants";
import {
  AssetAmount,
  IAppDataSchema,
  IUserDataSchema,
  TimestampData,
} from "../db/types";
import {
  DECIMAL_PLACES,
  dedupVector,
  l,
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
  chainId: string,
  rpc: string,
  userList: string[],
  bankAddress: string
): Promise<void> {
  let addressAndDataList: [string, TimestampData[]][] = [];

  // get user data from the contract
  const { bank } = await getCwQueryHelpers(chainId, rpc);
  const dbAssetsList = await bank.cwQueryDbAssetsList(userList);
  const assetList = await bank.pQueryAssetList(BANK.PAGINATION.ASSET_LIST);

  const distributionStateList = await bank.cwQueryDistributionStateList([
    ...userList,
    bankAddress,
  ]);
  const userDistributionStateList = distributionStateList.filter(
    ([address]) => address !== bankAddress
  );
  const distributionState = distributionStateList.find(
    ([address]) => address === bankAddress
  );

  const dateTo = distributionState?.[1]?.update_date || 0;
  const lastAppCounter = distributionState?.[1]?.counter;

  let userDataList: UserDataListItem[] = [];

  for (const [user, { counter }] of userDistributionStateList) {
    const [{ timestamp }] = await AppRequest.getDataInCounterRange(
      counter,
      lastAppCounter || counter + 1
    );
    const dateFrom =
      dateToTimestamp(timestamp) ||
      dateTo - BANK.DISTRIBUTION_PERIOD * BANK.MAX_COUNTER_DIFF;
    const userData = await UserRequest.getDataInTimestampRange(
      user,
      dateFrom,
      dateTo
    );
    const appData = await AppRequest.getDataInTimestampRange(dateFrom, dateTo);
    const dbAssets =
      dbAssetsList.find(([address]) => address === user)?.[1] || [];

    userDataList.push({ user, userData, appData, dbAssets });
  }

  // get decimals for unique asset symbol list
  const symbolAndDecimalsList: [string, number][] = assetList.map((x) => [
    getTokenSymbol(x.token),
    x.decimals,
  ]);

  // get exactly what must be added
  let dbAssetsToAddList: UserDataListItem[] = [];

  for (const { user, userData, appData, dbAssets } of userDataList) {
    const dbAssetsToAdd = dbAssets.reduce((acc, cur) => {
      // assetsForDb amounts must be divided according to its decimals to store in db amounts as ts numbers with 18 decimal places
      const assetsForDb: AssetItem[] = cur.map((x) => {
        const decimals =
          symbolAndDecimalsList.find(([s, _d]) => s === x.symbol)?.[1] ||
          DECIMALS_DEFAULT;

        const divider = numberFrom(10).pow(decimals);
        const amountDec = numberFrom(x.amount)
          .div(divider)
          .toDecimalPlaces(DECIMAL_PLACES)
          .toFixed();

        return { amount: amountDec, symbol: x.symbol };
      });

      const assetsToAdd = assetsForDb.filter(
        (x) =>
          !userData.some(
            (y) =>
              y.asset === x.symbol &&
              numberFrom(y.amount).equals(numberFrom(x.amount))
          )
      );

      if (assetsToAdd.length) {
        acc.push(assetsToAdd);
      }

      return acc;
    }, [] as AssetItem[][]);

    if (dbAssetsToAdd.length) {
      dbAssetsToAddList.push({
        user,
        userData,
        appData,
        dbAssets: dbAssetsToAdd,
      });
    }
  }

  for (const { user, appData, dbAssets: dbAssetsToAdd } of dbAssetsToAddList) {
    const dataList = dbAssetsToAdd
      .map((assets, i) => {
        const { timestamp } =
          appData[appData.length - dbAssetsToAdd.length + i];

        const assetList: AssetAmount[] = assets
          .map(({ amount, symbol }) => ({
            asset: symbol,
            amount: numberFrom(amount).toNumber(),
          }))
          .filter((x) => x.amount);

        return { timestamp, assetList };
      })
      .filter((x) => x.assetList.length);

    if (dataList.length) {
      addressAndDataList.push([user, dataList]);
    }
  }

  if (addressAndDataList.length) {
    await UserRequest.addMultipleDataList(addressAndDataList);
    l("Prices are stored in DB");
  }
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
