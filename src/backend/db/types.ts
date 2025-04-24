import { Document, SchemaOptions } from "mongoose";

export type AssetPrice = {
  asset: string;
  price: number;
};

export type AssetAmount = {
  asset: string;
  amount: number;
};

export type TimestampData = {
  timestamp: Date | number;
  assetList: AssetAmount[];
};

export interface IAppDataSchema {
  timestamp: Date;
  counter: number;
  assetPrices: AssetPrice[];
}
export interface IAppDataDocument extends IAppDataSchema, Document {}

export interface IUserDataSchema {
  asset: string;
  amount: number;
  timestamp: Date;
  address: string;
}
export interface IUserDataDocument extends IUserDataSchema, Document {}

export interface ILogEntrySchema {
  timestamp: Date;
  source: string;
  entries: any[];
  rawContent: string;
  // use a fixed ID to always update the same record
  recordId: string;
}
export interface ILogEntryDocument extends ILogEntrySchema, Document {}

export function getSchemaOptions(collection: string): SchemaOptions {
  return {
    minimize: true,
    strict: true,
    collection,
  };
}
