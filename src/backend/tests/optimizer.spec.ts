import {
  BribesAllocationItem,
  WeightAllocationItem,
} from "../../common/codegen/Voter.types";
import {
  PriceItem,
  calcEstimatedDaoProfit,
  calcOptimizedDaoWeights,
} from "../helpers/math";

const POOL = {
  ECLIP_ATOM: "eclip_atom",
  NTRN_ATOM: "ntrn_atom",
  ASTRO_ATOM: "astro_atom",
};

const TOKEN = {
  ASTRO: "astro",
  ATOM: "atom",
  ECLIP: "eclip",
  NTRN: "ntrn",
};

const electorEssence = 3_000_000;
const daoEssence = 2_000_000;
const slackerEssence = 1_000_000;

const electorWeights: WeightAllocationItem[] = [
  { lp_token: POOL.ECLIP_ATOM, weight: "0.1" },
  { lp_token: POOL.NTRN_ATOM, weight: "0.9" },
];

const bribes: BribesAllocationItem[] = [
  {
    lp_token: POOL.ECLIP_ATOM,
    rewards: [
      { amount: "100", symbol: TOKEN.ATOM },
      { amount: "100", symbol: TOKEN.ECLIP },
    ],
  },
  {
    lp_token: POOL.NTRN_ATOM,
    rewards: [
      { amount: "200", symbol: TOKEN.NTRN },
      { amount: "120", symbol: TOKEN.ATOM },
    ],
  },
  {
    lp_token: POOL.ASTRO_ATOM,
    rewards: [{ amount: "100", symbol: TOKEN.NTRN }],
  },
];

const prices: PriceItem[] = [
  { price: "0.02", symbol: TOKEN.ASTRO },
  { price: "5", symbol: TOKEN.ATOM },
  { price: "0.01", symbol: TOKEN.ECLIP },
  { price: "0.25", symbol: TOKEN.NTRN },
];

describe("Delegation DAO rewards optimization", () => {
  const ITERATIONS = 50;
  const DECIMAL_PLACES = 5;

  test("calcOptimizedDaoWeights default", () => {
    const expected: WeightAllocationItem[] = [
      { lp_token: POOL.ASTRO_ATOM, weight: "0.00208" },
      { lp_token: POOL.ECLIP_ATOM, weight: "0.38333" },
      { lp_token: POOL.NTRN_ATOM, weight: "0.61459" },
    ];

    const daoWeights = calcOptimizedDaoWeights(
      electorEssence,
      daoEssence,
      slackerEssence,
      electorWeights,
      bribes,
      prices,
      ITERATIONS,
      DECIMAL_PLACES
    );

    expect(daoWeights).toStrictEqual(expected);
  });

  test("calcEstimatedDaoProfit best option", () => {
    const daoWeights: WeightAllocationItem[] = [
      { lp_token: POOL.ECLIP_ATOM, weight: "0.38333" },
      { lp_token: POOL.NTRN_ATOM, weight: "0.61459" },
      { lp_token: POOL.ASTRO_ATOM, weight: "0.00208" },
    ];

    const expected = 649;

    const daoProfit = calcEstimatedDaoProfit(
      electorEssence,
      daoEssence,
      slackerEssence,
      electorWeights,
      daoWeights,
      bribes,
      prices
    );

    expect(daoProfit).toStrictEqual(expected);
  });

  test("calcEstimatedDaoProfit other options", () => {
    expect(
      calcEstimatedDaoProfit(
        electorEssence,
        daoEssence,
        slackerEssence,
        electorWeights,
        [
          { lp_token: POOL.ECLIP_ATOM, weight: "0.38333" },
          { lp_token: POOL.NTRN_ATOM, weight: "0.61459" },
          { lp_token: POOL.ASTRO_ATOM, weight: "0.00208" },
        ],
        bribes,
        prices
      )
    ).toStrictEqual(649);

    expect(
      calcEstimatedDaoProfit(
        electorEssence,
        daoEssence,
        slackerEssence,
        electorWeights,
        [
          { lp_token: POOL.ECLIP_ATOM, weight: "0.38413" },
          { lp_token: POOL.NTRN_ATOM, weight: "0.61587" },
        ],
        bribes,
        prices
      )
    ).toStrictEqual(624);

    expect(
      calcEstimatedDaoProfit(
        electorEssence,
        daoEssence,
        slackerEssence,
        electorWeights,
        [
          { lp_token: POOL.ECLIP_ATOM, weight: "0.37" },
          { lp_token: POOL.NTRN_ATOM, weight: "0.63" },
        ],
        bribes,
        prices
      )
    ).toStrictEqual(623);

    expect(
      calcEstimatedDaoProfit(
        electorEssence,
        daoEssence,
        slackerEssence,
        electorWeights,
        [
          { lp_token: POOL.ECLIP_ATOM, weight: "0.39" },
          { lp_token: POOL.NTRN_ATOM, weight: "0.61" },
        ],
        bribes,
        prices
      )
    ).toStrictEqual(623);
  });

  test("calcOptimizedDaoWeights more dao essence", () => {
    const expected: WeightAllocationItem[] = [
      { lp_token: POOL.ASTRO_ATOM, weight: "0.00208" },
      { lp_token: POOL.ECLIP_ATOM, weight: "0.24583" },
      { lp_token: POOL.NTRN_ATOM, weight: "0.75209" },
    ];

    const daoWeights = calcOptimizedDaoWeights(
      electorEssence,
      10 * daoEssence,
      slackerEssence,
      electorWeights,
      bribes,
      prices,
      ITERATIONS,
      DECIMAL_PLACES
    );

    expect(daoWeights).toStrictEqual(expected);
  });

  test("calcOptimizedDaoWeights proper rounding", () => {
    const electorEssence = 0;
    const daoEssence = 1_000;
    const slackerEssence = 0;

    const electorWeights: WeightAllocationItem[] = [];

    const bribes: BribesAllocationItem[] = [
      {
        lp_token: "a",
        rewards: [
          {
            amount: "1000",
            symbol: TOKEN.ECLIP,
          },
        ],
      },
      {
        lp_token: "b",
        rewards: [
          {
            amount: "1000",
            symbol: TOKEN.ECLIP,
          },
        ],
      },
      {
        lp_token: "c",
        rewards: [
          {
            amount: "1000",
            symbol: TOKEN.ECLIP,
          },
        ],
      },
      {
        lp_token: "d",
        rewards: [
          {
            amount: "1000",
            symbol: TOKEN.ECLIP,
          },
        ],
      },
      {
        lp_token: "e",
        rewards: [
          {
            amount: "1000",
            symbol: TOKEN.ECLIP,
          },
        ],
      },
    ];

    const prices: PriceItem[] = [
      { price: "0.02", symbol: TOKEN.ASTRO },
      { price: "5", symbol: TOKEN.ATOM },
      { price: "0.01", symbol: TOKEN.ECLIP },
      { price: "0.25", symbol: TOKEN.NTRN },
    ];

    const expected: WeightAllocationItem[] = [
      { lp_token: "a", weight: "0.2" },
      { lp_token: "b", weight: "0.2" },
      { lp_token: "c", weight: "0.2" },
      { lp_token: "d", weight: "0.2" },
      { lp_token: "e", weight: "0.2" },
    ];

    const daoWeights = calcOptimizedDaoWeights(
      electorEssence,
      daoEssence,
      slackerEssence,
      electorWeights,
      bribes,
      prices,
      ITERATIONS,
      DECIMAL_PLACES
    );

    expect(daoWeights).toStrictEqual(expected);
  });

  test("calcOptimizedDaoWeights no data", () => {
    const electorEssence = 0;
    const daoEssence = 1_000;
    const slackerEssence = 0;

    const electorWeights: WeightAllocationItem[] = [];
    const bribes: BribesAllocationItem[] = [];

    const prices: PriceItem[] = [
      { price: "0.02", symbol: TOKEN.ASTRO },
      { price: "5", symbol: TOKEN.ATOM },
      { price: "0.01", symbol: TOKEN.ECLIP },
      { price: "0.25", symbol: TOKEN.NTRN },
    ];

    const expected: WeightAllocationItem[] = [];

    const daoWeights = calcOptimizedDaoWeights(
      electorEssence,
      daoEssence,
      slackerEssence,
      electorWeights,
      bribes,
      prices,
      ITERATIONS,
      DECIMAL_PLACES
    );

    expect(daoWeights).toStrictEqual(expected);
  });
});
