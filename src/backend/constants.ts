export const CHAIN_ID = "pion-1"; // TODO:  "neutron-1"
export const REWARDS_DISTRIBUTION_PERIOD = 180; // days
export const REWARDS_REDUCTION_MULTIPLIER = 0.99;
export const SECONDS_PER_DAY = 24 * 3_600;
export const MS_PER_SECOND = 1_000;
export const REPLENISHED_INITIALLY = 3_100_000 * 1e6;

export const BANK = {
  PAGINATION_AMOUNT: 15,
  DISTRIBUTION_PERIOD: 2 * 60, // seconds
  CYCLE_PERIOD_MIN: 10, // seconds
};

export const SNAPSHOT = {
  STAKERS: "stakers",
  LOCKERS: "lockers",
  STAKING_ESSENCE: "staking-essence",
  LOCKING_ESSENCE: "locking-essence",
  VOTERS: "voters",
};

export const ROUTE = {
  GET_FILE_DATES: "/get-file-dates",
  GET_STAKERS: "/get-stakers",
  GET_LOCKERS: "/get-lockers",
  GET_DISTRIBUTED_REWARDS: "/get-distributed-rewards",
  GET_STAKING_ESSENCE: "/get-staking-essence",
  GET_LOCKING_ESSENCE: "/get-locking-essence",
  GET_ESSENCE: "/get-essence",
  GET_VOTERS: "/get-voters",
};
