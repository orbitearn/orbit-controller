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

export const SEED = e.SEED,
  USER_SEED = e.USER_SEED,
  MONGODB = e.MONGODB,
  ORBIT_CONTROLLER = e.ORBIT_CONTROLLER,
  PORT = e.PORT,
  LOCAL_IP_LIST = JSON.parse(e.LOCAL_IP_LIST) as string[],
  LOCAL_PORT_LIST = JSON.parse(e.LOCAL_PORT_LIST) as number[],
  BE_DEV_URL = e.BE_DEV_URL,
  BE_TUNNEL_URL = e.BE_TUNNEL_URL,
  BE_PROD_URL = e.BE_PROD_URL,
  FE_DEV_URL = e.FE_DEV_URL,
  FE_STAGE_URL = e.FE_STAGE_URL,
  FE_PROD_URL = e.FE_PROD_URL,
  FE_DEV_NEW_URL = e.FE_DEV_NEW_URL,
  FE_STAGE_NEW_URL = e.FE_STAGE_NEW_URL,
  FE_PROD_NEW_URL = e.FE_PROD_NEW_URL,
  IS_PROD = e.IS_PROD === "true";
