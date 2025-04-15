import { Document, SchemaOptions } from "mongoose";
import { MS_PER_SECOND } from "../constants";
import { floor } from "../../common/utils";

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

export function getSchemaOptions(collection: string): SchemaOptions {
  return {
    minimize: true,
    strict: true,
    collection,
  };
}
