import { Schema } from "mongoose";
import {
  getSchemaOptions,
  IAppDataSchema,
  ILogEntrySchema,
  IUserDataSchema,
} from "./types";

const AssetPriceSchema = new Schema(
  {
    asset: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      validate: {
        validator: (value: number) => value >= 0,
        message: "Price must be a non-negative number",
      },
    },
  },
  { _id: false }
);

export const AppDataSchema = new Schema<IAppDataSchema>(
  {
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    counter: {
      type: Number,
      required: true,
      validate: {
        validator: (value: number) => Number.isInteger(value) && value >= 0,
        message: "Counter must be a non-negative integer",
      },
    },
    assetPrices: {
      type: [AssetPriceSchema],
      required: true,
      default: [],
    },
  },
  getSchemaOptions("app_data")
)
  .index({ timestamp: 1 }, { unique: true })
  .index({ counter: 1 }, { unique: true });

export const UserDataSchema = new Schema<IUserDataSchema>(
  {
    asset: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      validate: {
        validator: (value: number) => value >= 0,
        message: "Amount must be a non-negative number",
      },
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    address: {
      type: String,
      required: true,
    },
  },
  getSchemaOptions("user_data")
).index({ timestamp: 1 });
UserDataSchema.index({ address: 1, timestamp: 1 });

export const LogEntrySchema = new Schema<ILogEntrySchema>(
  {
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    source: {
      type: String,
      required: true,
    },
    entries: {
      type: [Schema.Types.Mixed],
      required: true,
    },
    rawContent: {
      type: String,
      required: true,
    },
    recordId: {
      type: String,
      required: true,
      default: "current_log",
      index: true,
    },
  },
  getSchemaOptions("server_logs")
);
