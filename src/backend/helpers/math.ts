import { numberFrom } from "../../common/utils";
import { AssetItem, UserInfoResponse } from "../../common/codegen/Bank.types";

function dedupVector<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

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
