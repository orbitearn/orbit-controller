import { dedupVector, floor, numberFrom } from "../../common/utils";
import { AssetItem, UserInfoResponse } from "../../common/codegen/Bank.types";
import { IAppDataSchema, IUserDataSchema } from "../db/types";
import { dateToTimestamp } from "../services/utils";

// TODO: add tests

function calcMergedAssetList(
  assetsA: AssetItem[],
  assetsB: AssetItem[]
): AssetItem[] {
  const rewardsSymbolList = dedupVector(
    [...assetsA, ...assetsB].map((x) => x.symbol)
  );

  return rewardsSymbolList.reduce((acc, symbol) => {
    const amountA = assetsA.find((x) => x.symbol === symbol)?.amount || "";
    const amountB = assetsB.find((x) => x.symbol === symbol)?.amount || "";
    const amount = numberFrom(amountA).add(numberFrom(amountB)).toString();

    if (amount) {
      acc.push({ symbol, amount });
    }

    return acc;
  }, [] as AssetItem[]);
}

export function calcAusdcPrice(
  totalUsdcGross: math.BigNumber,
  totalAusdc: math.BigNumber
): math.BigNumber {
  return !totalAusdc ? numberFrom(1) : totalUsdcGross.div(totalAusdc);
}

// returns [rewards, usdcYield, assets, feeSum]
export function calcClaimAndSwapData(
  userInfoList: UserInfoResponse[]
): [string, string, AssetItem[], string] {
  const [rewards, usdc_yield, assets, feeSum] = userInfoList.reduce(
    ([rewards, usdc_yield, assets, feeSum], cur) => [
      rewards.add(numberFrom(cur.user_yield.next.total)),
      usdc_yield.add(numberFrom(cur.user_yield.next.usdc)),
      calcMergedAssetList(assets, cur.user_yield.next.assets),
      feeSum.add(numberFrom(cur.fee_next)),
    ],
    [numberFrom(0), numberFrom(0), [], numberFrom(0)] as [
      math.BigNumber,
      math.BigNumber,
      AssetItem[],
      math.BigNumber
    ]
  );

  return [rewards.toFixed(), usdc_yield.toFixed(), assets, feeSum.toFixed()];
}

// average_entry_price = sum(amount_i * price_i) / sum(amount_i)
export function calcAverageEntryPriceList(
  assetList: string[],
  appData: IAppDataSchema[],
  userData: IUserDataSchema[]
): [string, number][] {
  return assetList.map((asset) => {
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
}

// profit = sum(amount_i * (price - price_i))
export function calcProfit(
  currentPriceList: [string, number][],
  assetList: string[],
  appData: IAppDataSchema[],
  userData: IUserDataSchema[]
): [string, number][] {
  return assetList.map((asset) => {
    const productSum = userData.reduce((acc, cur) => {
      if (cur.asset === asset) {
        const timestamp = dateToTimestamp(cur.timestamp);
        const priceList =
          appData.find((x) => dateToTimestamp(x.timestamp) === timestamp)
            ?.assetPrices || [];
        const price = priceList.find((x) => x.asset === cur.asset)?.price || 0;
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
}

export function calcYieldRate(
  ausdcDenom: string,
  ausdcPriceLast: number,
  appData: IAppDataSchema[],
  period?: number
): [number, number][] {
  const priceList: [number, number][] = appData.map((x) => {
    const ausdcPrice =
      x.assetPrices.find((y) => y.asset === ausdcDenom)?.price ||
      ausdcPriceLast;

    return [ausdcPrice, dateToTimestamp(x.timestamp)];
  });

  // [yieldRate, timestamp][]
  let yieldRateList: [number, number][] = [];
  let [ausdcPricePre, _] = priceList[0] || [1, 0];

  for (const [ausdcPrice, timestamp] of priceList) {
    const yieldRate = ausdcPrice / ausdcPricePre - 1;

    if (yieldRate) {
      yieldRateList.push([yieldRate, timestamp]);
      ausdcPricePre = ausdcPrice;
    }
  }

  if (!period) {
    return yieldRateList;
  }

  // [yieldRate, timestamp][]
  let yieldRateListAggregated: [number, number][] = [];
  let [yieldRateAcc, timestampPre] = yieldRateList[0] || [0, 0];

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
