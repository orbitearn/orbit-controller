import express from "express";
import { ROUTE } from "../constants";
import {
  getAverageEntryPrice,
  getProfit,
  getTest,
  getUserFirstData,
  updateUserAssets,
} from "../controllers/api";

const router = express.Router();

router
  .get(ROUTE.GET_TEST, getTest)
  .get(ROUTE.GET_AVERAGE_ENTRY_PRICE, getAverageEntryPrice)
  .get(ROUTE.GET_PROFIT, getProfit)
  .get(ROUTE.GET_FIRST_DATA, getUserFirstData)

  .post(ROUTE.UPDATE_USER_ASSETS, updateUserAssets);

export { router as api, ROUTE };
