import { AppDataModel, UserDataModel } from "./models";
import { AssetPrice, IAppDataDocument, IUserDataDocument } from "./types";

export class AppRequest {
  static async addDataItem(
    timestamp: number,
    counter: number,
    assetPrices: AssetPrice[],
    createdAt: Date = new Date()
  ): Promise<IAppDataDocument> {
    try {
      const model = new AppDataModel({
        timestamp,
        counter,
        assetPrices,
        createdAt,
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
    timestamp: number
  ): Promise<IAppDataDocument | null> {
    return await AppDataModel.findOne({ timestamp });
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
    from: number,
    to: number
  ): Promise<IAppDataDocument[]> {
    return await AppDataModel.find({
      timestamp: {
        $gte: from,
        $lte: to,
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
    timestamp: number,
    createdAt: Date = new Date()
  ): Promise<IUserDataDocument> {
    try {
      const model = new UserDataModel({
        address,
        asset,
        amount,
        timestamp,
        createdAt,
      });

      return await model.save();
    } catch (error) {
      throw error;
    }
  }

  static async getDataByTimestamp(
    address: string,
    timestamp: number
  ): Promise<IUserDataDocument | null> {
    return await UserDataModel.findOne({ address, timestamp });
  }

  static async getDataInTimestampRange(
    address: string,
    from: number,
    to: number
  ): Promise<IUserDataDocument[]> {
    return await UserDataModel.find({
      address,
      timestamp: {
        $gte: from,
        $lte: to,
      },
    }).sort({ timestamp: 1 });
  }
}
