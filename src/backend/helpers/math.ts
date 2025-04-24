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

// returns [apr, timestamp][]
export function calcApr(
  ausdcDenom: string,
  appData: IAppDataSchema[],
  period: number
): [number, number][] {
  if (appData.length < 2) {
    return [];
  }

  const [{ assetPrices: pricesFirst, timestamp: timestampFirst }] = appData;
  const ausdcPriceFirst = pricesFirst.find((x) => x.asset === ausdcDenom);

  if (!ausdcPriceFirst) {
    return [];
  }

  const one = numberFrom(1);
  const pct = numberFrom(100);
  const secondsInYear = numberFrom(365 * 24 * 3600);
  const k = pct.mul(secondsInYear);

  let ausdcPricePre = numberFrom(ausdcPriceFirst.price);
  let timestampPre = dateToTimestamp(timestampFirst);

  // [apr, timestamp][]
  let aprListAggregated: [math.BigNumber, number][] = [];

  for (const { assetPrices, timestamp: t } of appData) {
    const ausdcPrice = numberFrom(
      assetPrices.find((x) => x.asset === ausdcDenom)?.price
    );
    const timestamp = dateToTimestamp(t);

    if (timestamp - timestampPre >= period) {
      const range = numberFrom(timestamp - timestampPre);
      // apr = 100 % * (price / price_pre - 1) * seconds_in_year / seconds_in_range
      const apr = ausdcPrice.div(ausdcPricePre).sub(one).mul(k).div(range);
      aprListAggregated.push([apr, timestamp]);

      ausdcPricePre = ausdcPrice;
      timestampPre = timestamp;
    }
  }

  return aprListAggregated
    .filter(([y, _t]) => !y.isZero())
    .map(([y, t]) => [y.toDecimalPlaces(DECIMAL_PLACES).toNumber(), t]);
}
