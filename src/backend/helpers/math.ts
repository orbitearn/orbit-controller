import { Decimal } from "decimal.js";
import { floor, getLast } from "../../common/utils";
import {
  BribesAllocationItem,
  WeightAllocationItem,
} from "../../common/codegen/Voter.types";

export interface PriceItem {
  price: string;
  symbol: string;
}

function correctWeights(
  weights: WeightAllocationItem[],
  decimalPlaces: number
): WeightAllocationItem[] {
  const k = new Decimal(10).pow(decimalPlaces);

  // Sort weights and apply rounding
  const sortedWeights = weights.sort((a, b) =>
    new Decimal(a.weight).sub(new Decimal(b.weight)).toNumber()
  );
  const result = sortedWeights.slice(0, -1).map(({ lp_token, weight }) => ({
    lp_token,
    weight: new Decimal(weight).mul(k).round().div(k).toString(),
  }));

  // Calculate and set the last weight to ensure sum is 1
  const sumOthers = result.reduce(
    (acc, { weight }) => acc.add(new Decimal(weight)),
    new Decimal(0)
  );
  const lastWeight: WeightAllocationItem = {
    lp_token: getLast(sortedWeights)?.lp_token || "",
    weight: new Decimal(1).sub(sumOthers).toString(),
  };

  return [...result, lastWeight].filter((x) => Number(x.weight) && x.lp_token);
}

export function calcEstimatedDaoProfit(
  electorEssence: number,
  daoEssence: number,
  slackerEssence: number,
  electorWeights: WeightAllocationItem[],
  daoWeights: WeightAllocationItem[],
  bribes: BribesAllocationItem[],
  prices: PriceItem[]
): number {
  const ELECTOR_BASE_ESSENCE_FRACTION = 0.85;
  const ELECTOR_ADDITIONAL_ESSENCE_FRACTION = 0.68;

  const effectiveElectorEssence =
    ELECTOR_BASE_ESSENCE_FRACTION * electorEssence +
    ELECTOR_ADDITIONAL_ESSENCE_FRACTION * slackerEssence;

  const effectiveDaoEssence =
    daoEssence +
    (1 - ELECTOR_BASE_ESSENCE_FRACTION) * electorEssence +
    (1 - ELECTOR_ADDITIONAL_ESSENCE_FRACTION) * slackerEssence;

  return bribes.reduce((acc, { lp_token, rewards }) => {
    const electorWeight =
      electorWeights.find((x) => x.lp_token === lp_token)?.weight || "";
    const daoWeight =
      daoWeights.find((x) => x.lp_token === lp_token)?.weight || "";

    const electorAllocation = Number(electorWeight) * effectiveElectorEssence;
    const daoAllocation = Number(daoWeight) * effectiveDaoEssence;
    const allocation = electorAllocation + daoAllocation;

    if (!allocation) {
      return acc;
    }

    const rewardsValue = rewards.reduce((rewardAcc, { amount, symbol }) => {
      const price = prices.find((x) => x.symbol === symbol)?.price || "";
      return (
        rewardAcc +
        (Number(price) * Number(amount) * daoAllocation) / allocation
      );
    }, 0);

    return acc + floor(rewardsValue);
  }, 0);
}

export function calcOptimizedDaoWeights(
  electorEssence: number,
  daoEssence: number,
  slackerEssence: number,
  electorWeights: WeightAllocationItem[],
  bribes: BribesAllocationItem[],
  prices: PriceItem[],
  iterations: number,
  decimalPlaces: number
): WeightAllocationItem[] {
  const nPools = bribes.length;
  const initialWeight = 1 / nPools;

  // Initialize weights evenly
  let bestWeights: WeightAllocationItem[] = bribes.map(({ lp_token }) => ({
    lp_token,
    weight: initialWeight.toString(),
  }));

  let bestProfit = calcEstimatedDaoProfit(
    electorEssence,
    daoEssence,
    slackerEssence,
    electorWeights,
    bestWeights,
    bribes,
    prices
  );

  let stepSize = 0.1;
  const minStep = 0.001;

  while (stepSize >= minStep && iterations--) {
    let improved = false;

    for (let i = 0; i < nPools; i++) {
      for (let j = 0; j < nPools; j++) {
        if (i === j) continue;

        // Try transferring weight from pool i to pool j
        const testWeights = bestWeights.map((w) => ({ ...w }));
        const transferAmount = Math.min(
          stepSize,
          Number(testWeights[i].weight)
        );

        testWeights[i].weight = (
          Number(testWeights[i].weight) - transferAmount
        ).toString();
        testWeights[j].weight = (
          Number(testWeights[j].weight) + transferAmount
        ).toString();

        const testProfit = calcEstimatedDaoProfit(
          electorEssence,
          daoEssence,
          slackerEssence,
          electorWeights,
          testWeights,
          bribes,
          prices
        );

        if (testProfit > bestProfit) {
          bestWeights = testWeights;
          bestProfit = testProfit;
          improved = true;
        }
      }
    }

    if (!improved) {
      stepSize /= 2;
    }
  }

  // Normalize weights
  const totalWeight = bestWeights.reduce((acc, w) => acc + Number(w.weight), 0);
  bestWeights = bestWeights.map(({ lp_token, weight }) => ({
    lp_token,
    weight: (Number(weight) / totalWeight).toString(),
  }));

  return correctWeights(bestWeights, decimalPlaces);
}
