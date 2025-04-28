import * as fs from "fs-extra";
import * as path from "path";
import * as chokidar from "chokidar";
import { AssetItem } from "../../common/codegen/Bank.types";
import { getLast, l } from "../../common/utils";
import { toDate } from "../services/utils";
import { AppDataModel, UserDataModel, LogEntryModel } from "./models";
import {
  AssetPrice,
  IAppDataDocument,
  IUserDataDocument,
  TimestampData,
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
  ): Promise<IUserDataDocument | undefined> {
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

  static async addDataList(
    address: string,
    dataList: TimestampData[]
  ): Promise<IUserDataDocument[]> {
    try {
      const documentsToInsert: Array<{
        address: string;
        asset: string;
        amount: number;
        timestamp: Date;
      }> = [];

      for (const { timestamp, assetList } of dataList) {
        const dateTimestamp = toDate(timestamp);

        for (const { asset, amount } of assetList) {
          documentsToInsert.push({
            address,
            asset,
            amount,
            timestamp: dateTimestamp,
          });
        }
      }

      return await UserDataModel.insertMany(documentsToInsert);
    } catch (error) {
      throw error;
    }
  }

  static async addMultipleDataList(
    addressAndDataList: [string, TimestampData[]][]
  ): Promise<IUserDataDocument[]> {
    try {
      const documentsToInsert: Array<{
        address: string;
        asset: string;
        amount: number;
        timestamp: Date;
      }> = [];

      for (const [address, dataList] of addressAndDataList) {
        for (const { timestamp, assetList } of dataList) {
          const dateTimestamp = toDate(timestamp);

          for (const { asset, amount } of assetList) {
            documentsToInsert.push({
              address,
              asset,
              amount,
              timestamp: dateTimestamp,
            });
          }
        }
      }

      return await UserDataModel.insertMany(documentsToInsert);
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
    to: Date | number,
    excludeAsset?: string
  ): Promise<IUserDataDocument[]> {
    const query: any = {
      address,
      timestamp: {
        $gte: toDate(from),
        $lte: toDate(to),
      },
    };

    if (excludeAsset) {
      query.asset = { $ne: excludeAsset };
    }

    return await UserDataModel.find(query).sort({ timestamp: 1 });
  }

  static async getFirstData(
    address: string
  ): Promise<IUserDataDocument | null> {
    return await UserDataModel.findOne({ address })
      .sort({ timestamp: 1 })
      .limit(1);
  }
}

export class LogWatcher {
  private filePath: string;
  private updateTimer: NodeJS.Timeout | null = null;
  private lastUploadedContent: string = "";
  private collectionName: string;
  private readonly RECORD_ID = "current_log"; // Fixed ID for the single record

  constructor(filePath: string, collectionName: string = "server_logs") {
    this.filePath = filePath;
    this.collectionName = collectionName;
  }

  /**
   * Initialize the log watcher
   */
  public initialize(): void {
    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(this.filePath);
      fs.ensureDirSync(dir);

      // Create empty log file if it doesn't exist
      if (!fs.existsSync(this.filePath)) {
        fs.writeFileSync(this.filePath, "", "utf8");
      }

      // Start watching the file
      this.startWatching();
    } catch (err) {
      l("Failed to initialize LogWatcher:", err);
    }
  }

  /**
   * Start watching the log file for changes
   */
  private startWatching(): void {
    // Create a watcher with chokidar
    const watcher = chokidar.watch(this.filePath, {
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });

    watcher.on("change", () => this.handleFileChange());
    l(`Started watching log file: ${this.filePath}`);
  }

  /**
   * Handle file change event
   */
  private handleFileChange(): void {
    l(`Log file changed: ${this.filePath}`);

    // Reset the timer if it's already running
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    // Set a new timer for 30 seconds
    this.updateTimer = setTimeout(() => {
      this.uploadToMongoDB();
    }, 30000); // 30 seconds
  }

  /**
   * Upload log content to MongoDB, replacing previous record
   */
  private async uploadToMongoDB(): Promise<void> {
    try {
      // Read the log file
      const fileContent = await fs.readFile(this.filePath, "utf8");

      // Only upload if there's new content
      if (fileContent !== this.lastUploadedContent && fileContent.trim()) {
        // Parse log entries if they're in JSON format
        let logEntries: any[] = [];
        try {
          // Split by newline and parse each line as JSON
          logEntries = fileContent
            .split("\n")
            .filter((line) => line.trim())
            .map((line) => {
              try {
                return JSON.parse(line);
              } catch (e) {
                return { raw: line, timestamp: new Date() };
              }
            });
        } catch (e) {
          // If parsing fails, store as raw text
          logEntries = [
            {
              raw: fileContent,
              timestamp: new Date(),
              parseError: (e as Error).message,
            },
          ];
        }

        // Create log entry data
        const logData = {
          timestamp: new Date(),
          source: path.basename(this.filePath),
          entries: logEntries,
          rawContent: fileContent,
          recordId: this.RECORD_ID,
        };

        // Update or create the log entry using findOneAndUpdate with upsert
        await LogEntryModel.findOneAndUpdate(
          { recordId: this.RECORD_ID },
          logData,
          { upsert: true, new: true }
        );

        l(`Updated log data in MongoDB collection: ${this.collectionName}`);
        this.lastUploadedContent = fileContent;
      } else {
        l("No new content to upload");
      }
    } catch (err) {
      l("Error uploading logs to MongoDB:", err);
    }
  }

  /**
   * Stop watching and clean up resources
   */
  public stop(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
  }
}
