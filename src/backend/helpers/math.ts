import { Decimal } from "decimal.js";
import { floor, getLast } from "../../common/utils";

export interface PriceItem {
  price: string;
  symbol: string;
}

// function correctWeights(
//   weights: WeightAllocationItem[],
//   decimalPlaces: number
// ): WeightAllocationItem[] {
//   const k = new Decimal(10).pow(decimalPlaces);

//   // Sort weights and apply rounding
//   const sortedWeights = weights.sort((a, b) =>
//     new Decimal(a.weight).sub(new Decimal(b.weight)).toNumber()
//   );
//   const result = sortedWeights.slice(0, -1).map(({ lp_token, weight }) => ({
//     lp_token,
//     weight: new Decimal(weight).mul(k).round().div(k).toString(),
//   }));

//   // Calculate and set the last weight to ensure sum is 1
//   const sumOthers = result.reduce(
//     (acc, { weight }) => acc.add(new Decimal(weight)),
//     new Decimal(0)
//   );
//   const lastWeight: WeightAllocationItem = {
//     lp_token: getLast(sortedWeights)?.lp_token || "",
//     weight: new Decimal(1).sub(sumOthers).toString(),
//   };

//   return [...result, lastWeight].filter((x) => Number(x.weight) && x.lp_token);
// }
