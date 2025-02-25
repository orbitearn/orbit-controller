import { model } from "mongoose";
import {
  IEssenceDocument,
  IVoteResultsDocument,
  IVotersDocument,
} from "./types";
import { EssenceSchema, VoteResultsSchema, VotersSchema } from "./schemas";

export const EssenceModel = model<IEssenceDocument>(
  "essence_model",
  EssenceSchema
);

export const VotersModel = model<IVotersDocument>("voters_model", VotersSchema);

export const VoteResultsModel = model<IVoteResultsDocument>(
  "vote_results_model",
  VoteResultsSchema
);
