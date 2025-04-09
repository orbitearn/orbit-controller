export const CHAIN_ID = "pion-1"; // TODO:  "neutron-1"
export const REWARDS_DISTRIBUTION_PERIOD = 180; // days
export const REWARDS_REDUCTION_MULTIPLIER = 0.99;
export const SECONDS_PER_DAY = 24 * 3_600;
export const MS_PER_SECOND = 1_000;
export const REPLENISHED_INITIALLY = 3_100_000 * 1e6;

export const BANK = {
  PAGINATION_AMOUNT: 5, // 3 for 530 ausdc set length
  DISTRIBUTION_PERIOD: 60 * 60, // seconds
  CYCLE_PERIOD_MIN: 10, // seconds
};

export const ROUTE = {
  GET_TEST: "/test",
  GET_AVERAGE_ENTRY_PRICE: "/average-entry-price",
  GET_PROFIT: "/profit",
  GET_FIRST_DATA: "/first-data",
  GET_YIELD_RATE: "/yield-rate",
  GET_APP_DATA_IN_TIMESTAMP_RANGE: "/app-data-in-timestamp-range",
  GET_USER_DATA_IN_TIMESTAMP_RANGE: "/user-data-in-timestamp-range",

  UPDATE_USER_ASSETS: "/update-user-assets",
};
