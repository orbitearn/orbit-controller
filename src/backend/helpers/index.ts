import { AstroportPool, TokenInfo } from "../../common/interfaces";
import { Request } from "../../common/utils/index";
import { PriceItem } from "./math";

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
