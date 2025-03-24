import express from "express";
import { ROUTE } from "../constants";
import { getAverageEntryPrice } from "../controllers/api";

const router = express.Router();

router.get(ROUTE.GET_AVERAGE_ENTRY_PRICE, getAverageEntryPrice);

export { router as api, ROUTE };
