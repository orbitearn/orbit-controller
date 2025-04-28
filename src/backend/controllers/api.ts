import { Request, Response } from "express";
import {
  getAverageEntryPrice as _getAverageEntryPrice,
  getProfit as _getProfit,
  updateUserAssets as _updateUserAssets,
  getUserFirstData as _getUserFirstData,
  getApr as _getApr,
  getAppDataInTimestampRange as _getAppDataInTimestampRange,
  getUserDataInTimestampRange as _getUserDataInTimestampRange,
} from "../middleware/api";

export async function getTest(_req: Request, res: Response) {
  res.status(200).json({ value: 42 });
}

export async function getAverageEntryPrice(req: Request, res: Response) {
  const address = req.query.address as string;
  const excludeAsset = req.query.excludeAsset as string;
  const from = parseInt(req.query.from as string);
  const to = parseInt(req.query.to as string);

  if (!address) {
    res.status(400).json({ error: "Address parameter is required" });
  } else if (!excludeAsset) {
    res.status(400).json({ error: "excludeAsset parameter is required" });
  } else if (isNaN(from) || isNaN(to)) {
    res
      .status(400)
      .json({ error: "Valid 'from' and 'to' parameters are required" });
  } else {
    const data = await _getAverageEntryPrice(address, from, to, excludeAsset);
    res.status(200).json(data);
  }
}

export async function getProfit(req: Request, res: Response) {
  const address = req.query.address as string;
  const excludeAsset = req.query.excludeAsset as string;
  const from = parseInt(req.query.from as string);
  const to = parseInt(req.query.to as string);

  if (!address) {
    res.status(400).json({ error: "Address parameter is required" });
  } else if (!excludeAsset) {
    res.status(400).json({ error: "excludeAsset parameter is required" });
  } else if (isNaN(from) || isNaN(to)) {
    res
      .status(400)
      .json({ error: "Valid 'from' and 'to' parameters are required" });
  } else {
    const data = await _getProfit(address, from, to, excludeAsset);
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

export async function getApr(req: Request, res: Response) {
  const from = parseInt(req.query.from as string);
  const to = parseInt(req.query.to as string);
  const period = {
    day: 24 * 3_600,
    week: 7 * 24 * 3_600,
    month: 30 * 24 * 3_600,
    year: 365 * 24 * 3_600,
  }[req.query.period as string];

  if (isNaN(from) || isNaN(to) || typeof period === "undefined") {
    res
      .status(400)
      .json({ error: "Valid 'from', 'to', 'period' parameters are required" });
  } else {
    const data = await _getApr(from, to, period);
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
  const period = {
    none: 0,
    day: 24 * 3_600,
    week: 7 * 24 * 3_600,
    month: 30 * 24 * 3_600,
    year: 365 * 24 * 3_600,
  }[req.query.period as string];

  if (!address) {
    res.status(400).json({ error: "Address parameter is required" });
  } else if (isNaN(from) || isNaN(to) || typeof period === "undefined") {
    res
      .status(400)
      .json({ error: "Valid 'from', 'to', 'period' parameters are required" });
  } else {
    const data = await _getUserDataInTimestampRange(address, from, to, period);
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
