import express from "express";
import { ROUTE } from "../constants";
import { getAverageEntryPrice, getProfit } from "../controllers/api";

const router = express.Router();

router
  .get(ROUTE.GET_AVERAGE_ENTRY_PRICE, getAverageEntryPrice)
  .get(ROUTE.GET_PROFIT, getProfit);

export { router as api, ROUTE };
