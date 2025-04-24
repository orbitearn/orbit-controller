import express from "express";
import { ROUTE } from "../constants";
import {
  getAverageEntryPrice,
  getProfit,
  getTest,
  getUserFirstData,
  getApr,
  updateUserAssets,
  getAppDataInTimestampRange,
  getUserDataInTimestampRange,
} from "../controllers/api";

const router = express.Router();

router
  .get(ROUTE.GET_TEST, getTest)
  .get(ROUTE.GET_AVERAGE_ENTRY_PRICE, getAverageEntryPrice)
  .get(ROUTE.GET_PROFIT, getProfit)
  .get(ROUTE.GET_FIRST_DATA, getUserFirstData)
  .get(ROUTE.GET_APR, getApr)
  .get(ROUTE.GET_APP_DATA_IN_TIMESTAMP_RANGE, getAppDataInTimestampRange)
  .get(ROUTE.GET_USER_DATA_IN_TIMESTAMP_RANGE, getUserDataInTimestampRange)

  .post(ROUTE.UPDATE_USER_ASSETS, updateUserAssets);

export { router as api, ROUTE };
