import { getCwQueryHelpers } from "../../common/account/cw-helpers";
import { AssetItem, Token } from "../../common/codegen/Bank.types";
import { TokenInfo } from "../../common/interfaces";
import { l, Request } from "../../common/utils/index";
import { AssetAmount, TimestampData } from "../db/types";
import { DatabaseClient } from "../db/client";
import { AppRequest, UserRequest } from "../db/requests";
import { dateToTimestamp } from "../services/utils";

export interface PriceItem {
  price: string;
  symbol: string;
}

const baseURL = "https://api.astroport.fi/api";

export async function getAllPrices(symbols?: string[]): Promise<PriceItem[]> {
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

      prices.push({ symbol: denom, price: priceUSD.toString() });
    }
  } catch (_) {}

  // remove duplications calculating average prices
  let denoms = [...new Set(prices.map((x) => x.symbol))];
  denoms = symbols ? denoms.filter((x) => symbols.includes(x)) : denoms;

  return denoms.map((denom) => {
    const priceList = prices
      .filter(({ symbol }) => symbol === denom)
      .map((x) => Number(x.price));
    const averagePrice =
      priceList.reduce((acc, cur) => acc + cur, 0) / priceList.length;

    return {
      symbol: denom,
      price: averagePrice.toString(),
    };
  });
}

export function getTokenSymbol(token: Token): string {
  return "native" in token ? token.native.denom : token.cw20.address;
}

export async function updateUserData(
  dbClient: DatabaseClient,
  chainId: string,
  rpc: string,
  owner: string
): Promise<void> {
  let dataList: TimestampData[] = [];

  // get user data from the contract
  try {
    const { bank } = await getCwQueryHelpers(chainId, rpc);
    await dbClient.connect();
    const dbAssets = await bank.cwQueryDbAssets(owner);

    const userDistributionState = await bank.cwQueryDistributionState({
      address: owner,
    });
    const distributionState = await bank.cwQueryDistributionState({});

    const dateTo = distributionState.update_date;
    const timestamp = (
      await AppRequest.getDataByCounter(userDistributionState.counter)
    )?.timestamp;
    const dateFrom = dateToTimestamp(timestamp) || dateTo;
    const userData = await UserRequest.getDataInTimestampRange(
      owner,
      dateFrom,
      dateTo
    );

    // get exactly what must be added
    const dbAssetsToAdd = dbAssets.reduce((acc, cur) => {
      const assetsToAdd = cur.filter(
        (x) =>
          !userData.some(
            (y) => y.asset === x.symbol && y.amount === Number(x.amount)
          )
      );

      if (assetsToAdd.length) {
        acc.push(assetsToAdd);
      }

      return acc;
    }, [] as AssetItem[][]);
    if (!dbAssetsToAdd.length) {
      throw new Error("User data update isn't required!");
    }

    const appData = await AppRequest.getDataInTimestampRange(dateFrom, dateTo);
    if (appData.length !== dbAssets.length) {
      throw new Error("Unequal data arrays!");
    }

    dataList = dbAssetsToAdd.map((assets, i) => {
      const { timestamp } = appData[i];
      const assetList: AssetAmount[] = assets.map(({ amount, symbol }) => ({
        asset: symbol,
        amount: Number(amount),
      }));

      return { timestamp, assetList };
    });
  } catch (e) {
    l(e);
  }

  try {
    if (dataList.length) {
      await UserRequest.addDataList(owner, dataList);
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
    .sort(([_userA, cntA], [_userB, cntB]) => cntB - cntA)
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

export function extractPrices(realPrices: PriceItem[]): [string, number][] {
  return realPrices.reduce((acc, cur) => {
    let fake = ASSET_TABLE.find(([real]) => real === cur.symbol)?.[1];

    if (fake) {
      acc.push([fake, Number(cur.price)]);
    }

    return acc;
  }, [] as [string, number][]);
}
