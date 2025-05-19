import { getCwQueryHelpers } from "../../common/account/cw-helpers";
import { AssetItem, Token } from "../../common/codegen/Bank.types";
import { TokenInfo } from "../../common/interfaces";
import { AppRequest, UserRequest } from "../db/requests";
import { dateToTimestamp, toDate } from "../services/utils";
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
    const dataList = dbAssetsToAdd.reduce(
      (acc, assets, i) => {
        const index = appData.length - dbAssetsToAdd.length + i;
        const assetList: AssetAmount[] = assets
          .map(({ amount, symbol }) => ({
            asset: symbol,
            amount: numberFrom(amount).toNumber(),
          }))
          .filter((x) => x.amount);

        if (index >= 0 && assetList.length) {
          const { timestamp } = appData[index];
          acc.push({ timestamp, assetList });
        }

        return acc;
      },
      [] as {
        timestamp: Date;
        assetList: AssetAmount[];
      }[]
    );

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

export interface UserAsset {
  asset: string;
  samples: AssetSample[];
}

export interface AssetSample {
  amount: number;
  timestamp: Date;
}

export function getAggregatedAssetList(
  userData: IUserDataSchema[],
  period: number
): UserAsset[] {
  const zero = numberFrom(0);
  let userAssetList: UserAsset[] = [];

  const assetList = dedupVector(userData.map((x) => x.asset));

  if (!period) {
    userAssetList = assetList.map((asset) => ({
      asset,
      samples: userData
        .filter((x) => x.asset === asset)
        .map((x) => ({ amount: x.amount, timestamp: x.timestamp })),
    }));
  } else {
    for (const asset of assetList) {
      const sampleList: AssetSample[] = userData
        .filter((x) => x.asset === asset)
        .map((x) => ({ amount: x.amount, timestamp: x.timestamp }));

      if (sampleList.length < 2) {
        continue;
      }

      const [{ timestamp: firstTimestamp }] = sampleList;
      const firstTimestampValue = dateToTimestamp(firstTimestamp);

      let periodStart = firstTimestampValue;
      let periodEnd = periodStart + period;
      let currentPeriodSamples: AssetSample[] = [];
      let sampleListAcc: AssetSample[] = [];

      // process all samples and group them into periods
      for (const sample of sampleList) {
        const sampleTimestamp = dateToTimestamp(sample.timestamp);

        // if sample belongs to next period, finalize current period and start a new one
        while (sampleTimestamp >= periodEnd) {
          // add accumulated samples for current period
          if (currentPeriodSamples.length > 0) {
            const totalAmount = currentPeriodSamples
              .reduce((sum, s) => sum.add(numberFrom(s.amount)), zero)
              .toNumber();

            sampleListAcc.push({
              amount: totalAmount,
              timestamp: toDate(periodEnd),
            });
          }

          // move to next period
          periodStart = periodEnd;
          periodEnd = periodStart + period;
          currentPeriodSamples = [];
        }

        // add sample to current period
        currentPeriodSamples.push(sample);
      }

      // add final period if there are remaining samples
      if (currentPeriodSamples.length > 0) {
        const totalAmount = currentPeriodSamples
          .reduce((sum, s) => sum.add(numberFrom(s.amount)), zero)
          .toNumber();

        sampleListAcc.push({
          amount: totalAmount,
          timestamp: toDate(periodEnd),
        });
      }

      if (sampleListAcc.length) {
        userAssetList.push({ asset, samples: sampleListAcc });
      }
    }
  }

  return userAssetList;
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
