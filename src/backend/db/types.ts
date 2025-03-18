import { Document, SchemaOptions } from "mongoose";

export type AssetPrice = {
  asset: string;
  price: number;
};

export interface IAppDataSchema {
  timestamp: number;
  counter: number;
  assetPrices: AssetPrice[];
}
export interface IAppDataDocument extends IAppDataSchema, Document {}

export interface IUserDataSchema {
  asset: string;
  amount: number;
  timestamp: number;
  address: string;
}
export interface IUserDataDocument extends IUserDataSchema, Document {}

export function getSchemaOptions(collection: string): SchemaOptions {
  return {
    timestamps: { createdAt: true, updatedAt: false },
    minimize: true,
    strict: true,
    collection,
  };
}
