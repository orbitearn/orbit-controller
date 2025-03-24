import { DeliverTxResponse } from "@cosmjs/stargate";
import { getCwQueryHelpers } from "../../common/account/cw-helpers";
import { Token } from "../../common/codegen/Bank.types";
import { AstroportPool, TokenInfo } from "../../common/interfaces";
import { l, Request } from "../../common/utils/index";
import { AssetAmount, dateToTimestamp, TimestampData } from "../db/types";
import { DatabaseClient } from "../db/client";
import { AppRequest, UserRequest } from "../db/requests";

export interface PriceItem {
  price: string;
  symbol: string;
}

interface TokensResponse {
  result: {
    data: {
      json: {
        [chainId: string]: TokenInfo;
      };
    };
  };
}

const baseURL = "https://app.astroport.fi/api/trpc";
const chainId = [
  "phoenix-1",
  "injective-1",
  "neutron-1",
  "pacific-1",
  "osmosis-1",
];

export async function getAllPools(): Promise<AstroportPool[]> {
  const req = new Request({ baseURL });

  let pools: AstroportPool[] = [];

  const fn = async (route: string) => {
    try {
      const res: { result: { data: { json: AstroportPool[] } } } =
        await req.get(route);

      pools = [...pools, ...res.result.data.json];
    } catch (_) {}
  };

  await Promise.all(
    chainId.map((chain) => {
      const route = `/pools.getAll?input={"json":{"chainId":["${chain}"]}}`;
      return fn(route);
    })
  );

  return pools;
}

export async function getAllPrices(symbols?: string[]): Promise<PriceItem[]> {
  const input = JSON.stringify({ json: { chainId } });
  const route = `/tokens.getAll?input=${input}`;
  const req = new Request({ baseURL });

  let prices: PriceItem[] = [];

  try {
    const {
      result: {
        data: { json },
      },
    }: TokensResponse = await req.get(route);

    // iterate over chains
    for (const x of Object.values(json)) {
      // iterate over denoms
      for (const [k, v] of Object.entries(x)) {
        const price = v?.priceUsd;
        if (!price) {
          continue;
        }

        prices.push({ symbol: k, price: price.toString() });
      }
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

export async function getDbHandlerWrapper(
  dbClient: DatabaseClient,
  chainId: string,
  rpc: string,
  owner: string
): Promise<
  (
    fn: () => Promise<DeliverTxResponse>
  ) => Promise<DeliverTxResponse | undefined>
> {
  const { bank } = await getCwQueryHelpers(chainId, rpc);

  return async (
    fn: () => Promise<DeliverTxResponse>
  ): Promise<DeliverTxResponse | undefined> => {
    let dataList: TimestampData[] = [];
    let res: DeliverTxResponse | undefined = undefined;

    await dbClient.connect();
    try {
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
      const appData = await AppRequest.getDataInTimestampRange(
        dateFrom,
        dateTo
      );
      if (appData.length !== dbAssets.length) {
        throw new Error("Unequal data arrays!");
      }

      dataList = dbAssets.map((assets, i) => {
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
      // user action
      res = await fn();

      if (dataList.length) {
        await UserRequest.addDataList(owner, dataList);
        l("Prices are stored in DB");
      }
    } catch (e) {
      l(e);
    }
    await dbClient.disconnect();

    return res;
  };
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
