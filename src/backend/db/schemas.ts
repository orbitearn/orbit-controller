import { Schema } from "mongoose";
import { getSchemaOptions, IAppDataSchema, IUserDataSchema } from "./types";

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
      type: Number,
      required: true,
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
    createdAt: {
      type: Date,
      default: Date.now,
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
      type: Number,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  getSchemaOptions("user_data")
).index({ timestamp: 1 });
UserDataSchema.index({ address: 1, timestamp: 1 });
