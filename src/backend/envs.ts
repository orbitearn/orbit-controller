import dotenv from "dotenv";
import path from "path";
import fs from "fs";

export function rootPath(dir: string) {
  return path.resolve(__dirname, "../../", dir);
}

const envPath = rootPath("./config.env");

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}
const e = process.env as { [key: string]: string };

export const IS_PRODUCTION = e.IS_PRODUCTION === "true",
  PORT = e.PORT,
  SEED = e.SEED,
  BASE_URL = e.BASE_URL,
  MONGODB = e.MONGODB;
