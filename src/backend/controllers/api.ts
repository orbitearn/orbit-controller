import { Request, Response } from "express";
import { getAverageEntryPrice as _getAverageEntryPrice } from "../middleware/api";

export async function getAverageEntryPrice(req: Request, res: Response) {
  const address = req.query.address as string;
  const from = parseInt(req.query.from as string);
  const to = parseInt(req.query.to as string);

  if (!address) {
    res.status(400).json({ error: "Address parameter is required" });
  }

  if (isNaN(from) || isNaN(to)) {
    res
      .status(400)
      .json({ error: "Valid 'from' and 'to' parameters are required" });
  }

  const data = await _getAverageEntryPrice(address, from, to);
  res.status(200).json(data);
}
