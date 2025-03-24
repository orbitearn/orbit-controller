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
    const amount = (Number(amountA) + Number(amountB)).toString();

    if (amount) {
      acc.push({ symbol, amount });
    }

    return acc;
  }, [] as AssetItem[]);
}

export function calcAusdcPrice(totalUsdcGross: number, totalAusdc: number) {
  return !totalAusdc ? 1 : totalUsdcGross / totalAusdc;
}

// returns [rewards, usdcYield, assets, feeSum]
export function calcClaimAndSwapData(
  userInfoList: UserInfoResponse[]
): [number, number, AssetItem[], number] {
  return userInfoList.reduce(
    ([rewards, usdc_yield, assets, feeSum], cur) => [
      rewards + Number(cur.user_yield.next.total),
      usdc_yield + Number(cur.user_yield.next.usdc),
      calcMergedAssetList(assets, cur.user_yield.next.assets),
      feeSum + Number(cur.fee_next),
    ],
    [0, 0, [], 0] as [number, number, AssetItem[], number]
  );
}
