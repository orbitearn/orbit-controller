import { Request, Response } from "express";
import {
  getFileDates as _getFileDates,
  getStakers as _getStakers,
  getLockers as _getLockers,
  getDistributedRewards as _getDistributedRewards,
  getStakingEssence as _getStakingEssence,
  getLockingEssence as _getLockingEssence,
  getEssence as _getEssence,
  getVoters as _getVoters,
} from "../middleware/api";

export async function getFileDates(_req: Request, res: Response) {
  const data = await _getFileDates();
  res.json(data);
}

export async function getStakers(_req: Request, res: Response) {
  const data = await _getStakers();
  res.json(data);
}

export async function getLockers(_req: Request, res: Response) {
  const data = await _getLockers();
  res.json(data);
}

export async function getDistributedRewards(_req: Request, res: Response) {
  const data = await _getDistributedRewards();
  res.json(data);
}

export async function getStakingEssence(_req: Request, res: Response) {
  const data = await _getStakingEssence();
  res.json(data);
}

export async function getLockingEssence(_req: Request, res: Response) {
  const data = await _getLockingEssence();
  res.json(data);
}

export async function getEssence(_req: Request, res: Response) {
  const data = await _getEssence();
  res.json(data);
}

export async function getVoters(_req: Request, res: Response) {
  const data = await _getVoters();
  res.json(data);
}
