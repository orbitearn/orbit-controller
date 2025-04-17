export const CHAIN_ID = "pion-1"; // TODO:  "neutron-1"
export const REWARDS_DISTRIBUTION_PERIOD = 180; // days
export const REWARDS_REDUCTION_MULTIPLIER = 0.99;
export const SECONDS_PER_DAY = 24 * 3_600;
export const REPLENISHED_INITIALLY = 3_100_000 * 1e6;
export const DECIMALS_DEFAULT = 6;

// test config
export const BANK = {
  PAGINATION: {
    USER_INFO: 50,
    USER_COUNTER: 200,
    ASSET_LIST: 100,
  },
  MAX_COUNTER_DIFF: 21, // 1 week for 8h distribution period
  UPDATE_STATE_LIST: {
    MIN: 1, // lower threshold
    LIMIT: 5, // limit per tx
  },
  UPDATE_STATE_TIME_MARGIN: 30, // seconds
  DISTRIBUTION_PERIOD: 10 * 60, // seconds
  START_DATE_MINUTES: 0,
  CYCLE_COOLDOWN: 5, // seconds
};

// debug config
// export const BANK = {
//   PAGINATION: {
//     USER_INFO: 50,
//     USER_COUNTER: 200,
//     ASSET_LIST: 100,
//   },
//   MAX_COUNTER_DIFF: 2, // 1 week for 8h distribution period
//   UPDATE_STATE_LIST: {
//     MIN: 1, // lower threshold
//     LIMIT: 5, // limit per tx
//   },
//   UPDATE_STATE_TIME_MARGIN: 30, // seconds
//   DISTRIBUTION_PERIOD: 5 * 60, // seconds
//   START_DATE_MINUTES: 10,
//   CYCLE_COOLDOWN: 5, // seconds
// };

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
