import { Document, SchemaOptions } from "mongoose";
import {
  UserListResponseItem,
  VoteResults,
} from "../../common/codegen/Voter.types";

export type IEssence = [string, number][];
export interface IEssenceSchema {
  essence: IEssence;
}
export interface IEssenceDocument extends Document {
  essence: IEssence;
}

export type IVoters = UserListResponseItem[];
export interface IVotersSchema {
  voters: IVoters;
  epoch_id: number;
}
export interface IVotersDocument extends IVotersSchema, Document {}

export type IVoteResults = VoteResults;
export interface IVoteResultsDocument extends IVoteResults, Document {}

// to validate string numbers: Uint128, Decimal
export function isStringNumber(value: string): boolean {
  return !isNaN(Number(value));
}

export function getSchemaOptions(collection: string): SchemaOptions {
  return {
    timestamps: { createdAt: true, updatedAt: false },
    minimize: true,
    strict: true,
    collection,
  };
}
