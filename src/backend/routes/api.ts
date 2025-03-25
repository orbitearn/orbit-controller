import express from "express";
import { ROUTE } from "../constants";
import {
  getAverageEntryPrice,
  getProfit,
  updateUserAssets,
} from "../controllers/api";

const router = express.Router();

router
  .get(ROUTE.GET_AVERAGE_ENTRY_PRICE, getAverageEntryPrice)
  .get(ROUTE.GET_PROFIT, getProfit)

  .post(ROUTE.UPDATE_USER_ASSETS, updateUserAssets);

export { router as api, ROUTE };
