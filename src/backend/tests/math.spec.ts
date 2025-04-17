import { IAppDataSchema, IUserDataSchema } from "../db/types";
import { numberFrom } from "../../common/utils";
import { getUpdateStateList } from "../helpers";
import {
  dateStringToEpochUTC,
  epochToDateStringUTC,
  toDate,
} from "../services/utils";
import {
  calcAverageEntryPriceList,
  calcProfit,
  calcYieldRate,
} from "../helpers/math";

const TOKEN = {
  BTC: "BTC",
  ATOM: "ATOM",
  ETH: "ETH",
  aUSDC: "aUSDC",
};

const appData: IAppDataSchema[] = [
  {
    counter: 1,
    timestamp: toDate(dateStringToEpochUTC("15.04.2025 12:00:00")),
    assetPrices: [
      { asset: TOKEN.aUSDC, price: 1 },
      { asset: TOKEN.BTC, price: 82_000 },
      { asset: TOKEN.ATOM, price: 5.2 },
      { asset: TOKEN.ETH, price: 1_200 },
    ],
  },
  {
    counter: 2,
    timestamp: toDate(dateStringToEpochUTC("15.04.2025 13:00:00")),
    assetPrices: [
      { asset: TOKEN.aUSDC, price: 1.1 },
      { asset: TOKEN.BTC, price: 80_000 },
      { asset: TOKEN.ATOM, price: 5 },
      { asset: TOKEN.ETH, price: 1_000 },
    ],
  },
  {
    counter: 3,
    timestamp: toDate(dateStringToEpochUTC("15.04.2025 14:00:00")),
    assetPrices: [
      { asset: TOKEN.aUSDC, price: 1.32 },
      { asset: TOKEN.BTC, price: 87_000 },
      { asset: TOKEN.ATOM, price: 5.7 },
      { asset: TOKEN.ETH, price: 1_700 },
    ],
  },
  {
    counter: 4,
    timestamp: toDate(dateStringToEpochUTC("15.04.2025 15:00:00")),
    assetPrices: [
      { asset: TOKEN.aUSDC, price: 1.386 },
      { asset: TOKEN.BTC, price: 82_000 },
      { asset: TOKEN.ATOM, price: 5.2 },
      { asset: TOKEN.ETH, price: 1_200 },
    ],
  },
  {
    counter: 5,
    timestamp: toDate(dateStringToEpochUTC("15.04.2025 16:00:00")),
    assetPrices: [
      { asset: TOKEN.aUSDC, price: 1.5246 },
      { asset: TOKEN.BTC, price: 83_000 },
      { asset: TOKEN.ATOM, price: 5.3 },
      { asset: TOKEN.ETH, price: 1_300 },
    ],
  },
];

describe("UI data math", () => {
  test("calcAverageEntryPriceList default", () => {
    const expected: [string, number][] = [
      [TOKEN.BTC, 83_000],
      [TOKEN.ATOM, 5.7],
    ];

    const userData: IUserDataSchema[] = [
      {
        address: "",
        timestamp: toDate(dateStringToEpochUTC("15.04.2025 13:00:00")),
        amount: 0.001,
        asset: TOKEN.BTC,
      },
      {
        address: "",
        timestamp: toDate(dateStringToEpochUTC("15.04.2025 14:00:00")),
        amount: 0.001,
        asset: TOKEN.BTC,
      },
      {
        address: "",
        timestamp: toDate(dateStringToEpochUTC("15.04.2025 14:00:00")),
        amount: 1,
        asset: TOKEN.ATOM,
      },
      {
        address: "",
        timestamp: toDate(dateStringToEpochUTC("15.04.2025 15:00:00")),
        amount: 0.001,
        asset: TOKEN.BTC,
      },
    ];

    const averageEntryPriceList = calcAverageEntryPriceList(appData, userData);

    expect(averageEntryPriceList).toStrictEqual(expected);
  });

  test("calcAverageEntryPriceList no user data", () => {
    const expected: [string, number][] = [];
    const userData: IUserDataSchema[] = [];
    const averageEntryPriceList = calcAverageEntryPriceList(appData, userData);

    expect(averageEntryPriceList).toStrictEqual(expected);
  });

  test("calcProfit default", () => {
    // btc: (90-80) + (90-87) + (90-82) = 21
    // atom: (6-5.7) = 0.3
    const expected: [string, number][] = [
      [TOKEN.BTC, 21],
      [TOKEN.ATOM, 0.3],
    ];

    const userData: IUserDataSchema[] = [
      {
        address: "",
        timestamp: toDate(dateStringToEpochUTC("15.04.2025 13:00:00")),
        amount: 0.001,
        asset: TOKEN.BTC,
      },
      {
        address: "",
        timestamp: toDate(dateStringToEpochUTC("15.04.2025 14:00:00")),
        amount: 0.001,
        asset: TOKEN.BTC,
      },
      {
        address: "",
        timestamp: toDate(dateStringToEpochUTC("15.04.2025 14:00:00")),
        amount: 1,
        asset: TOKEN.ATOM,
      },
      {
        address: "",
        timestamp: toDate(dateStringToEpochUTC("15.04.2025 15:00:00")),
        amount: 0.001,
        asset: TOKEN.BTC,
      },
    ];

    const currentPriceList: [string, math.BigNumber][] = [
      [TOKEN.BTC, numberFrom(90_000)],
      [TOKEN.ATOM, numberFrom(6)],
    ];

    const profit = calcProfit(currentPriceList, appData, userData);

    expect(profit).toStrictEqual(expected);
  });

  test("calcProfit no user data", () => {
    const expected: [string, number][] = [];

    const userData: IUserDataSchema[] = [];
    const currentPriceList: [string, math.BigNumber][] = [
      [TOKEN.BTC, numberFrom(90_000)],
      [TOKEN.ATOM, numberFrom(6)],
    ];

    const profit = calcProfit(currentPriceList, appData, userData);

    expect(profit).toStrictEqual(expected);
  });

  test("calcProfit no prices", () => {
    const expected: [string, number][] = [
      [TOKEN.BTC, 0],
      [TOKEN.ATOM, 0],
    ];

    const userData: IUserDataSchema[] = [
      {
        address: "",
        timestamp: toDate(dateStringToEpochUTC("15.04.2025 13:00:00")),
        amount: 0.001,
        asset: TOKEN.BTC,
      },
      {
        address: "",
        timestamp: toDate(dateStringToEpochUTC("15.04.2025 14:00:00")),
        amount: 0.001,
        asset: TOKEN.BTC,
      },
      {
        address: "",
        timestamp: toDate(dateStringToEpochUTC("15.04.2025 14:00:00")),
        amount: 1,
        asset: TOKEN.ATOM,
      },
      {
        address: "",
        timestamp: toDate(dateStringToEpochUTC("15.04.2025 15:00:00")),
        amount: 0.001,
        asset: TOKEN.BTC,
      },
    ];

    const currentPriceList: [string, math.BigNumber][] = [];
    const profit = calcProfit(currentPriceList, appData, userData);

    expect(profit).toStrictEqual(expected);
  });

  test("calcYieldRate default", () => {
    const expected: [number, string][] = [
      [0.1, "15.04.2025 13:00:00"],
      [0.2, "15.04.2025 14:00:00"],
      [0.05, "15.04.2025 15:00:00"],
      [0.1, "15.04.2025 16:00:00"],
    ];

    const yieldRate: [number, string][] = calcYieldRate(
      TOKEN.aUSDC,
      appData
    ).map(([y, t]) => [y, epochToDateStringUTC(t)]);

    expect(yieldRate).toStrictEqual(expected);
  });

  test("calcYieldRate with period", () => {
    const period = 7_200; // 2 distributions
    const expected: [number, string][] = [
      [0.32, "15.04.2025 14:00:00"],
      [0.155, "15.04.2025 16:00:00"],
    ];

    const yieldRate: [number, string][] = calcYieldRate(
      TOKEN.aUSDC,
      appData,
      period
    ).map(([y, t]) => [y, epochToDateStringUTC(t)]);

    expect(yieldRate).toStrictEqual(expected);
  });

  test("calcYieldRate no app data", () => {
    const expected: [number, string][] = [];
    const yieldRate: [number, string][] = calcYieldRate(TOKEN.aUSDC, []).map(
      ([y, t]) => [y, epochToDateStringUTC(t)]
    );

    expect(yieldRate).toStrictEqual(expected);
  });

  test("getUpdateStateList default", () => {
    const appCounter: number = 6;
    const maxCounterDiff: number = 3;
    const maxUpdateStateList: number = 2;
    const userCounterList: [string, number][] = [
      ["alice", 2],
      ["bob", 1],
      ["john", 0],
      ["kate", 4],
    ];

    const expected: string[] = ["john", "bob"];

    const updateStateList = getUpdateStateList(
      appCounter,
      maxCounterDiff,
      maxUpdateStateList,
      userCounterList
    );

    expect(updateStateList).toStrictEqual(expected);
  });
});
