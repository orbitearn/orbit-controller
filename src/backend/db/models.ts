import { model } from "mongoose";
import { AppDataSchema, LogEntrySchema, UserDataSchema } from "./schemas";
import {
  IAppDataDocument,
  ILogEntryDocument,
  IUserDataDocument,
} from "./types";

export const AppDataModel = model<IAppDataDocument>(
  "app_data_model",
  AppDataSchema
);

export const UserDataModel = model<IUserDataDocument>(
  "user_data_model",
  UserDataSchema
);

export const LogEntryModel = model<ILogEntryDocument>(
  "log_entry_model",
  LogEntrySchema
);
