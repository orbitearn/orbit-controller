import express from "express";
import { ROUTE } from "../constants";
import {
  getFileDates,
  getStakers,
  getLockers,
  getDistributedRewards,
  getStakingEssence,
  getLockingEssence,
  getEssence,
  getVoters,
} from "../controllers/api";

const router = express.Router();

router
  .get(ROUTE.GET_FILE_DATES, getFileDates)
  .get(ROUTE.GET_STAKERS, getStakers)
  .get(ROUTE.GET_LOCKERS, getLockers)
  .get(ROUTE.GET_DISTRIBUTED_REWARDS, getDistributedRewards)
  .get(ROUTE.GET_STAKING_ESSENCE, getStakingEssence)
  .get(ROUTE.GET_LOCKING_ESSENCE, getLockingEssence)
  .get(ROUTE.GET_ESSENCE, getEssence)
  .get(ROUTE.GET_VOTERS, getVoters);

export { router as api, ROUTE };
