import { model } from "mongoose";
import { IAppDataDocument, IUserDataDocument } from "./types";
import { AppDataSchema, UserDataSchema } from "./schemas";

export const AppDataModel = model<IAppDataDocument>(
  "app_data_model",
  AppDataSchema
);

export const UserDataModel = model<IUserDataDocument>(
  "user_data_model",
  UserDataSchema
);
