import { Request, Response } from "express";
import {
  getAverageEntryPrice as _getAverageEntryPrice,
  getProfit as _getProfit,
  updateUserAssets as _updateUserAssets,
  getUserFirstData as _getUserFirstData,
  getYieldRate as _getYieldRate,
  getAppDataInTimestampRange as _getAppDataInTimestampRange,
  getUserDataInTimestampRange as _getUserDataInTimestampRange,
} from "../middleware/api";

export async function getTest(_req: Request, res: Response) {
  res.status(200).json({ value: 42 });
}

export async function getAverageEntryPrice(req: Request, res: Response) {
  const address = req.query.address as string;
  const from = parseInt(req.query.from as string);
  const to = parseInt(req.query.to as string);

  if (!address) {
    res.status(400).json({ error: "Address parameter is required" });
  } else if (isNaN(from) || isNaN(to)) {
    res
      .status(400)
      .json({ error: "Valid 'from' and 'to' parameters are required" });
  } else {
    const data = await _getAverageEntryPrice(address, from, to);
    res.status(200).json(data);
  }
}

export async function getProfit(req: Request, res: Response) {
  const address = req.query.address as string;
  const from = parseInt(req.query.from as string);
  const to = parseInt(req.query.to as string);

  if (!address) {
    res.status(400).json({ error: "Address parameter is required" });
  } else if (isNaN(from) || isNaN(to)) {
    res
      .status(400)
      .json({ error: "Valid 'from' and 'to' parameters are required" });
  } else {
    const data = await _getProfit(address, from, to);
    res.status(200).json(data);
  }
}

export async function getUserFirstData(req: Request, res: Response) {
  const address = req.query.address as string;

  if (!address) {
    res.status(400).json({ error: "Address parameter is required" });
  } else {
    const data = await _getUserFirstData(address);
    res.status(200).json(data);
  }
}

export async function getYieldRate(req: Request, res: Response) {
  const from = parseInt(req.query.from as string);
  const to = parseInt(req.query.to as string);
  const periodRaw = parseInt(req.query.period as any);
  const period = isNaN(periodRaw) ? 0 : periodRaw;

  if (isNaN(from) || isNaN(to)) {
    res
      .status(400)
      .json({ error: "Valid 'from' and 'to' parameters are required" });
  } else {
    const data = await _getYieldRate(from, to, period);
    res.status(200).json(data);
  }
}

export async function getAppDataInTimestampRange(req: Request, res: Response) {
  const from = parseInt(req.query.from as string);
  const to = parseInt(req.query.to as string);

  if (isNaN(from) || isNaN(to)) {
    res
      .status(400)
      .json({ error: "Valid 'from' and 'to' parameters are required" });
  } else {
    const data = await _getAppDataInTimestampRange(from, to);
    res.status(200).json(data);
  }
}

export async function getUserDataInTimestampRange(req: Request, res: Response) {
  const address = req.query.address as string;
  const from = parseInt(req.query.from as string);
  const to = parseInt(req.query.to as string);

  if (!address) {
    res.status(400).json({ error: "Address parameter is required" });
  } else if (isNaN(from) || isNaN(to)) {
    res
      .status(400)
      .json({ error: "Valid 'from' and 'to' parameters are required" });
  } else {
    const data = await _getUserDataInTimestampRange(address, from, to);
    res.status(200).json(data);
  }
}

export async function updateUserAssets(req: Request, res: Response) {
  const addressList = req.body.addressList as string[];

  if (!addressList || !addressList?.length) {
    res.status(400).json({ error: "Address parameter is required" });
  } else {
    await _updateUserAssets(addressList);
    res.status(200).json({});
  }
}
