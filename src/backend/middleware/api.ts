import { UserListResponseItem } from "../../common/codegen/Voter.types";
import { readdir, readFile, stat } from "fs/promises";
import { ChainConfig, DistributedRewards } from "../../common/interfaces";
import { getCwQueryHelpers } from "../../common/account/cw-helpers";
import { getSgQueryHelpers } from "../../common/account/sg-helpers";
import { floor } from "../../common/utils";
import { rootPath } from "../envs";
import {
  getChainOptionById,
  getContractByLabel,
} from "../../common/config/config-utils";
import {
  Addr,
  LockerInfo,
  QueryEssenceListResponseItem,
  StakerInfo,
} from "../../common/codegen/Staking.types";
import {
  ENCODING,
  epochToDateStringUTC,
  PATH_TO_CONFIG_JSON,
  readSnapshot,
} from "../services/utils";
import {
  CHAIN_ID,
  MS_PER_SECOND,
  REPLENISHED_INITIALLY,
  REWARDS_DISTRIBUTION_PERIOD,
  REWARDS_REDUCTION_MULTIPLIER,
  SECONDS_PER_DAY,
  SNAPSHOT,
} from "../constants";

// S = a * (1 - q^n) / (1 - q)
function calcGeoProgSum(a: number, q: number, n: number): number {
  return Math.ceil((a * (1 - q ** n)) / (1 - q));
}

export async function getFileDates(): Promise<{
  [k: string]: string;
}> {
  const basePath = "./src/backend/services/snapshots";
  let entries: [string, Date][] = Object.entries({});

  try {
    const fileList = await readdir(rootPath(basePath));
    for (const fileName of fileList) {
      const path = rootPath(`${basePath}/${fileName}`);
      const { mtime } = await stat(path);
      entries.push([fileName, mtime]);
    }
  } catch (_) {}

  // last updated first
  entries.sort(
    ([_keyA, dateA], [_keyB, dateB]) => dateA.getDate() - dateB.getDate()
  );

  return Object.fromEntries(
    entries.map(([file, date]) => {
      const epoch = date.getTime() / MS_PER_SECOND;
      const dateStringUTC = epochToDateStringUTC(epoch);
      return [file, dateStringUTC];
    })
  );
}

export async function getStakers(): Promise<[Addr, StakerInfo][]> {
  let stakers: [Addr, StakerInfo][] = [];

  try {
    stakers = await readSnapshot(SNAPSHOT.STAKERS, []);
  } catch (_) {}

  return stakers;
}

export async function getLockers(): Promise<[Addr, LockerInfo[]][]> {
  let lockers: [Addr, LockerInfo[]][] = [];

  try {
    lockers = await readSnapshot(SNAPSHOT.LOCKERS, []);
  } catch (_) {}

  return lockers;
}

export async function getStakingEssence(): Promise<
  QueryEssenceListResponseItem[]
> {
  let stakingEssence: QueryEssenceListResponseItem[] = [];

  try {
    stakingEssence = await readSnapshot(SNAPSHOT.STAKING_ESSENCE, []);
  } catch (_) {}

  return stakingEssence;
}

export async function getLockingEssence(): Promise<
  QueryEssenceListResponseItem[]
> {
  let lockingEssence: QueryEssenceListResponseItem[] = [];

  try {
    lockingEssence = await readSnapshot(SNAPSHOT.LOCKING_ESSENCE, []);
  } catch (_) {}

  return lockingEssence;
}

export async function getDistributedRewards(): Promise<DistributedRewards> {
  let distributedRewardsResponse: DistributedRewards = {
    staked: 0,
    locked: 0,
    claimedRewards: 0,
    unclaimedRewards: 0,
    distributedRewards: 0,
    replenished: 0,
    balance: 0,
    remainingRewards: 0,
    timeDays: 0,
    amountToReplenish: 0,
  };

  try {
    const configJsonStr = await readFile(PATH_TO_CONFIG_JSON, {
      encoding: ENCODING,
    });
    const CHAIN_CONFIG: ChainConfig = JSON.parse(configJsonStr);
    const {
      OPTION: {
        RPC_LIST: [RPC],
        CONTRACTS,
      },
    } = getChainOptionById(CHAIN_CONFIG, CHAIN_ID);

    const { staking } = await getCwQueryHelpers(CHAIN_ID, RPC);
    const { getBalance } = await getSgQueryHelpers(RPC);

    const stakingAddress = getContractByLabel(CONTRACTS, "staking").ADDRESS;

    // get contract config
    const config = await staking.cwQueryConfig();
    const eclipDenom = config.staking_token;

    // get contract balances
    const stakingBalance = Number(
      (await getBalance(stakingAddress, eclipDenom)).amount
    );
    const { eclip_per_second: eclipPerSecond } =
      await staking.cwQueryRewardsReductionInfo();

    let replenished = REPLENISHED_INITIALLY;
    try {
      replenished = Number((await staking.cwQueryBalances()).replenished);
    } catch (_) {}

    // read snapshots
    let stakers = await getStakers();
    let lockers = await getLockers();

    // remove empty records
    stakers = stakers.filter(([_address, { vaults }]) => vaults.length);
    lockers = lockers.filter(([_address, lockerInfo]) =>
      lockerInfo.reduce((acc, { vaults }) => acc + vaults.length, 0)
    );

    // calc staked, locked, unclaimed
    const [staked, unclaimedStakingRewards] = stakers.reduce(
      ([stakedAcc, unclaimedAcc], [_address, { vaults }]) => {
        vaults.forEach(({ amount, accumulated_rewards }) => {
          stakedAcc += Number(amount);
          unclaimedAcc += Number(accumulated_rewards);
        });

        return [stakedAcc, unclaimedAcc];
      },
      [0, 0]
    );

    // real locked on tiers values are not equal values from QueryState due to penalty issue in v2
    // (check SCV audit report issue #6 for details)
    let unclaimedLockingRewards = 0;
    const lockedOnTiers: number[] = lockers.reduce(
      (lockersAcc, [_address, lockerInfo]) => {
        lockerInfo.forEach(({ lock_tier, vaults }) => {
          const vaultsSum = vaults.reduce(
            (vaultsAcc, { amount, accumulated_rewards }) => {
              unclaimedLockingRewards += Number(accumulated_rewards);

              return vaultsAcc + Number(amount);
            },
            0
          );

          lockersAcc[lock_tier] += vaultsSum;
        });

        return lockersAcc;
      },
      [...Array(5)].map(() => 0)
    );

    const locked = lockedOnTiers.reduce((acc, cur) => acc + cur, 0);
    const unclaimedRewards = unclaimedStakingRewards + unclaimedLockingRewards;

    // balance = replenished + staked + locked - claimed
    // distributed = claimed + unclaimed
    const claimedRewards = replenished + staked + locked - stakingBalance;
    const distributedRewards = unclaimedRewards + claimedRewards;

    const remainingRewards =
      stakingBalance - staked - locked - unclaimedRewards;
    const timeDays = floor(
      remainingRewards / config.eclip_per_second / SECONDS_PER_DAY
    );

    // calc expected rewards to distribute for REWARDS_DISTRIBUTION_PERIOD
    const weeks = floor(REWARDS_DISTRIBUTION_PERIOD / 7);
    const firstDays = REWARDS_DISTRIBUTION_PERIOD - 7 * weeks;
    const firstDaysRewards = Math.ceil(
      eclipPerSecond * firstDays * SECONDS_PER_DAY
    );
    const firstWeekRewards = eclipPerSecond * 7 * SECONDS_PER_DAY;
    const amountToReplenish =
      firstDaysRewards +
      calcGeoProgSum(firstWeekRewards, REWARDS_REDUCTION_MULTIPLIER, weeks) -
      remainingRewards;

    distributedRewardsResponse = {
      staked,
      locked,
      claimedRewards,
      unclaimedRewards,
      distributedRewards,
      replenished,
      balance: stakingBalance,
      remainingRewards,
      timeDays,
      amountToReplenish,
    };
  } catch (_) {}

  return distributedRewardsResponse;
}

export async function getEssence(): Promise<[string, number][]> {
  let finalList: [string, number][] = [];

  try {
    // read snapshots
    const stakingData = await getStakingEssence();
    const lockingData = await getLockingEssence();

    // merge and remove duplications
    const addressList = Array.from(
      new Set([
        ...stakingData.map((x) => x.user),
        ...lockingData.map((x) => x.user),
      ])
    );

    // calc essence
    for (const address of addressList) {
      const stakingEssence = Number(
        stakingData.find((x) => x.user === address)?.essence || ""
      );
      const lockingEssence = Number(
        lockingData.find((x) => x.user === address)?.essence || ""
      );
      const essence = stakingEssence + lockingEssence;

      if (!essence) continue;
      finalList.push([address, essence]);
    }

    finalList.sort(
      ([_addressA, essenceA], [_addressB, essenceB]) => essenceB - essenceA
    );
  } catch (_) {}

  return finalList;
}

export async function getVoters(): Promise<UserListResponseItem[]> {
  let voters: UserListResponseItem[] = [];

  try {
    voters = await readSnapshot(SNAPSHOT.VOTERS, []);
  } catch (_) {}

  return voters;
}
