import { AssetItem, UserInfoResponse } from "../../common/codegen/Bank.types";
import { IAppDataSchema, IUserDataSchema } from "../db/types";
import { dateToTimestamp } from "../services/utils";
import {
  DECIMAL_PLACES,
  dedupVector,
  getLast,
  numberFrom,
} from "../../common/utils";

function calcMergedAssetList(
  assetsA: AssetItem[],
  assetsB: AssetItem[]
): AssetItem[] {
  const rewardsSymbolList = dedupVector([
    ...assetsA.map((x) => x.symbol),
    ...assetsB.map((x) => x.symbol),
  ]);

  return rewardsSymbolList.reduce((acc, symbol) => {
    const amountA = numberFrom(
      assetsA.find((x) => x.symbol === symbol)?.amount
    );
    const amountB = numberFrom(
      assetsB.find((x) => x.symbol === symbol)?.amount
    );
    const amount = amountA.add(amountB).toFixed();

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
  return totalAusdc.isZero() ? numberFrom(1) : totalUsdcGross.div(totalAusdc);
}

// returns [rewards, usdcYield, assets, feeSum]
export function calcClaimAndSwapData(
  userInfoList: UserInfoResponse[]
): [math.BigNumber, math.BigNumber, AssetItem[], math.BigNumber] {
  const zero = numberFrom(0);

  return userInfoList.reduce(
    ([rewards, usdc_yield, assets, feeSum], cur) => [
      rewards.add(numberFrom(cur.user_yield.next.total)),
      usdc_yield.add(numberFrom(cur.user_yield.next.usdc)),
      calcMergedAssetList(assets, cur.user_yield.next.assets),
      feeSum.add(numberFrom(cur.fee_next)),
    ],
    [zero, zero, [] as AssetItem[], zero]
  );
}

// average_entry_price = sum(amount_i * price_i) / sum(amount_i)
export function calcAverageEntryPriceList(
  appData: IAppDataSchema[],
  userData: IUserDataSchema[]
): [string, number][] {
  const assetList: string[] = dedupVector(userData.map((x) => x.asset));
  const zero = numberFrom(0);

  return assetList.map((asset) => {
    const [amountSum, productSum] = userData.reduce(
      ([amountAcc, productAcc], cur) => {
        if (cur.asset === asset) {
          const timestamp = dateToTimestamp(cur.timestamp);
          const priceList =
            appData.find((x) => dateToTimestamp(x.timestamp) === timestamp)
              ?.assetPrices || [];
          const price = numberFrom(
            priceList.find((x) => x.asset === cur.asset)?.price
          );

          if (!price.isZero()) {
            const amount = numberFrom(cur.amount);
            amountAcc = amountAcc.add(amount);
            productAcc = productAcc.add(amount.mul(price));
          }
        }

        return [amountAcc, productAcc];
      },
      [zero, zero]
    );

    return [
      asset,
      productSum.div(amountSum).toDecimalPlaces(DECIMAL_PLACES).toNumber(),
    ];
  });
}

// profit = sum(amount_i * (price - price_i))
export function calcProfit(
  currentPriceList: [string, math.BigNumber][],
  appData: IAppDataSchema[],
  userData: IUserDataSchema[]
): [string, number][] {
  const assetList: string[] = dedupVector(userData.map((x) => x.asset));
  const zero = numberFrom(0);

  return assetList.map((asset) => {
    const productSum = userData.reduce((acc, cur) => {
      if (cur.asset === asset) {
        const timestamp = dateToTimestamp(cur.timestamp);
        const priceList =
          appData.find((x) => dateToTimestamp(x.timestamp) === timestamp)
            ?.assetPrices || [];
        const price = numberFrom(
          priceList.find((x) => x.asset === cur.asset)?.price
        );
        const currentPrice =
          currentPriceList.find(([symbol]) => symbol === asset)?.[1] || zero;

        if (!price.isZero() && !currentPrice.isZero()) {
          const amount = numberFrom(cur.amount);
          acc = acc.add(amount.mul(currentPrice.sub(price)));
        }
      }

      return acc;
    }, zero);

    return [asset, productSum.toDecimalPlaces(DECIMAL_PLACES).toNumber()];
  });
}

// returns [yieldRate, timestamp][]
export function calcYieldRate(
  ausdcDenom: string,
  appData: IAppDataSchema[],
  period?: number
): [number, number][] {
  const zero = numberFrom(0);
  const one = numberFrom(1);
  const ausdcPriceLast =
    getLast(appData)?.assetPrices?.find((x) => x.asset === ausdcDenom)?.price ||
    1;

  const priceList: [math.BigNumber, number][] = appData.map((x) => {
    const ausdcPrice =
      x.assetPrices.find((y) => y.asset === ausdcDenom)?.price ||
      ausdcPriceLast;

    return [numberFrom(ausdcPrice), dateToTimestamp(x.timestamp)];
  });

  // [yieldRate, timestamp][]
  let yieldRateList: [math.BigNumber, number][] = [];
  let [ausdcPricePre, _] = priceList[0] || [one, 0];

  for (const [ausdcPrice, timestamp] of priceList) {
    const yieldRate = ausdcPrice.div(ausdcPricePre).sub(one);

    if (yieldRate) {
      yieldRateList.push([yieldRate, timestamp]);
      ausdcPricePre = ausdcPrice;
    }
  }

  if (!period) {
    return processYieldRateList(yieldRateList);
  }

  // [yieldRate, timestamp][]
  let yieldRateListAggregated: [math.BigNumber, number][] = [];
  let [yieldRateAcc, timestampPre] = yieldRateList[0] || [zero, 0];

  for (const [yieldRate, timestamp] of yieldRateList) {
    yieldRateAcc = yieldRateAcc.add(one).mul(yieldRate.add(one)).sub(one);

    if (timestamp - timestampPre >= period) {
      yieldRateListAggregated.push([yieldRateAcc, timestamp]);

      yieldRateAcc = zero;
      timestampPre = timestamp;
    }
  }

  return processYieldRateList(yieldRateListAggregated);
}

function processYieldRateList(
  yieldRateList: [math.BigNumber, number][]
): [number, number][] {
  return yieldRateList
    .filter(([y, _t]) => !y.isZero())
    .map(([y, t]) => [y.toDecimalPlaces(DECIMAL_PLACES).toNumber(), t]);
}
