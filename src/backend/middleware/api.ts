import { floor, li } from "../../common/utils";
import { MONGODB, ORBIT_CONTROLLER } from "../envs";
import { DatabaseClient } from "../db/client";
import { AppRequest, UserRequest } from "../db/requests";
import { dateToTimestamp } from "../db/types";
import { extractPrices, getAllPrices } from "../helpers";

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

    averagePriceList = assetList.map((asset) => {
      const [amountSum, productSum] = userData.reduce(
        ([amountAcc, productAcc], cur) => {
          if (cur.asset === asset) {
            const timestamp = dateToTimestamp(cur.timestamp);
            const priceList =
              appData.find((x) => dateToTimestamp(x.timestamp) === timestamp)
                ?.assetPrices || [];
            const price =
              priceList.find((x) => x.asset === cur.asset)?.price || 0;

            if (price) {
              amountAcc += cur.amount;
              productAcc += cur.amount * price;
            }
          }

          return [amountAcc, productAcc];
        },
        [0, 0]
      );

      return [asset, floor(productSum / amountSum, 6)];
    });
  } catch (_) {}

  return averagePriceList;
}

// profit = sum(amount_i * (price - price_i))
export async function getProfit(
  address: string,
  from: number,
  to: number
): Promise<[string, number][]> {
  let profitList: [string, number][] = [];

  try {
    await dbClient.connect();
    const userData = await UserRequest.getDataInTimestampRange(
      address,
      from,
      to
    );
    const appData = await AppRequest.getDataInTimestampRange(from, to);
    await dbClient.disconnect();

    const currentPriceList: [string, number][] = extractPrices(
      await getAllPrices()
    );
    const assetList: string[] = [...new Set(userData.map((x) => x.asset))];

    profitList = assetList.map((asset) => {
      const productSum = userData.reduce((acc, cur) => {
        if (cur.asset === asset) {
          const timestamp = dateToTimestamp(cur.timestamp);
          const priceList =
            appData.find((x) => dateToTimestamp(x.timestamp) === timestamp)
              ?.assetPrices || [];
          const price =
            priceList.find((x) => x.asset === cur.asset)?.price || 0;
          const currentPrice =
            currentPriceList.find(([symbol]) => symbol === asset)?.[1] || 0;

          if (price && currentPrice) {
            acc += cur.amount * (currentPrice - price);
          }
        }

        return acc;
      }, 0);

      return [asset, floor(productSum, 6)];
    });
  } catch (_) {}

  return profitList;
}
