import { AssetItem } from "../../common/codegen/Bank.types";
import { getLast } from "../../common/utils";
import { AppDataModel, UserDataModel } from "./models";
import {
  AssetPrice,
  IAppDataDocument,
  IUserDataDocument,
  toDate,
} from "./types";

export class AppRequest {
  static async addDataItem(
    timestamp: Date | number,
    counter: number,
    assetPrices: AssetPrice[]
  ): Promise<IAppDataDocument> {
    try {
      const model = new AppDataModel({
        timestamp: toDate(timestamp),
        counter,
        assetPrices,
      });

      return await model.save();
    } catch (error) {
      if ((error as any).code === 11000) {
        throw new Error(
          `App data for timestamp ${timestamp} or counter ${counter} already exists`
        );
      }
      throw error;
    }
  }

  static async getDataByTimestamp(
    timestamp: Date | number
  ): Promise<IAppDataDocument | null> {
    return await AppDataModel.findOne({ timestamp: toDate(timestamp) });
  }

  static async getDataByCounter(
    counter: number
  ): Promise<IAppDataDocument | null> {
    return await AppDataModel.findOne({ counter });
  }

  static async getDataByLastCounter(): Promise<IAppDataDocument | null> {
    return await AppDataModel.findOne().sort({ counter: -1 }).limit(1);
  }

  static async getDataInTimestampRange(
    from: Date | number,
    to: Date | number
  ): Promise<IAppDataDocument[]> {
    return await AppDataModel.find({
      timestamp: {
        $gte: toDate(from),
        $lte: toDate(to),
      },
    }).sort({ timestamp: 1 });
  }

  static async getDataInCounterRange(
    from: number,
    to: number
  ): Promise<IAppDataDocument[]> {
    return await AppDataModel.find({
      counter: {
        $gte: from,
        $lte: to,
      },
    }).sort({ counter: 1 });
  }
}

export class UserRequest {
  static async addDataItem(
    address: string,
    asset: string,
    amount: number,
    timestamp: Date | number
  ): Promise<IUserDataDocument> {
    try {
      const model = new UserDataModel({
        address,
        asset,
        amount,
        timestamp: toDate(timestamp),
      });

      return await model.save();
    } catch (error) {
      throw error;
    }
  }

  static async addData(
    address: string,
    assetList: AssetItem[],
    timestamp: Date | number
  ): Promise<IUserDataDocument> {
    try {
      const date = toDate(timestamp);
      const documents = assetList.map(({ symbol, amount }) => ({
        address,
        asset: symbol,
        amount,
        timestamp: date,
      }));
      const result = await UserDataModel.insertMany(documents);

      return getLast(result);
    } catch (error) {
      throw error;
    }
  }

  static async getDataByTimestamp(
    address: string,
    timestamp: Date | number
  ): Promise<IUserDataDocument | null> {
    return await UserDataModel.findOne({
      address,
      timestamp: toDate(timestamp),
    });
  }

  static async getDataInTimestampRange(
    address: string,
    from: Date | number,
    to: Date | number
  ): Promise<IUserDataDocument[]> {
    return await UserDataModel.find({
      address,
      timestamp: {
        $gte: toDate(from),
        $lte: toDate(to),
      },
    }).sort({ timestamp: 1 });
  }
}
