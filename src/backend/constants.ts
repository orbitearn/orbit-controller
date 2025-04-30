export const CHAIN_ID = "pion-1"; // TODO:  "neutron-1"
export const DECIMALS_DEFAULT = 6;

// test config
export const BANK = {
  PAGINATION: {
    USER_INFO: 10, // from 50
    USER_COUNTER: 200,
    ASSET_LIST: 100,
  },
  MAX_COUNTER_DIFF: 10, // from 21
  UPDATE_STATE_LIST: {
    MIN: 1, // lower threshold
    LIMIT: 5, // limit per tx
  },
  UPDATE_STATE_TIME_MARGIN: 60, // seconds
  DISTRIBUTION_PERIOD: 15 * 60, // seconds
  START_DATE_MINUTES: 30,
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
  GET_APR: "/apr",
  GET_APP_DATA_IN_TIMESTAMP_RANGE: "/app-data-in-timestamp-range",
  GET_USER_DATA_IN_TIMESTAMP_RANGE: "/user-data-in-timestamp-range",

  UPDATE_USER_ASSETS: "/update-user-assets",
};
