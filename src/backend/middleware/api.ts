import { readdir, readFile, stat } from "fs/promises";
import { ChainConfig, DistributedRewards } from "../../common/interfaces";
import { getCwQueryHelpers } from "../../common/account/cw-helpers";
import { getSgQueryHelpers } from "../../common/account/sg-helpers";
import { floor, li } from "../../common/utils";
import { MONGODB, ORBIT_CONTROLLER, rootPath } from "../envs";
import { DatabaseClient } from "../db/client";
import {
  getChainOptionById,
  getContractByLabel,
} from "../../common/config/config-utils";
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
} from "../constants";
import { AppRequest, UserRequest } from "../db/requests";

const dbClient = new DatabaseClient(MONGODB, ORBIT_CONTROLLER);

// average_entry_price = sum(amount_i * price_i) / sum(amount_i)
export async function getAverageEntryPrice(
  address: string,
  from: number,
  to: number
): Promise<[string, number][]> {
  let averagePriceList: [string, number][] = [];

  try {
    await dbClient.connect();
    const userData = await UserRequest.getDataInTimestampRange(
      address,
      from,
      to
    );
    const appData = await AppRequest.getDataInTimestampRange(from, to);
    await dbClient.disconnect();

    const assetList: string[] = [...new Set(userData.map((x) => x.asset))];

    // li({
    //   appData,
    //   userData,
    // });

    averagePriceList = assetList.map((asset) => {
      const [amountSum, productSum] = userData.reduce(
        ([amountAcc, productAcc], cur) => {
          if (cur.asset === asset) {
            const priceList =
              appData.find((x) => x.timestamp === cur.timestamp)?.assetPrices ||
              [];
            const price =
              priceList.find((x) => x.asset === cur.asset)?.price || 0;

            // TODO: empty priceList
            // li({
            //   asset,
            //   priceList,
            // });

            amountAcc += cur.amount;
            productAcc += cur.amount * price;
          }

          return [amountAcc, productAcc];
        },
        [0, 0]
      );

      return [asset, floor(productSum / amountSum, 12)];
    });
  } catch (_) {}

  return averagePriceList;
}
