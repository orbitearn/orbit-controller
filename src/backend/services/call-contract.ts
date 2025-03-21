import { getSigner } from "../account/signer";
import { getLast, l, li, wait } from "../../common/utils";
import { readFile, writeFile } from "fs/promises";
import { ChainConfig } from "../../common/interfaces";
import { ENCODING, PATH_TO_CONFIG_JSON, writeSnapshot } from "./utils";
import { getChainOptionById } from "../../common/config/config-utils";
import { MONGODB, rootPath, USER_SEED } from "../envs";
import {
  getSgQueryHelpers,
  getSgExecHelpers,
} from "../../common/account/sg-helpers";
import {
  getCwExecHelpers,
  getCwQueryHelpers,
} from "../../common/account/cw-helpers";
import { extractPrices, getAllPrices } from "../helpers";
import { BANK } from "../constants";
import { AssetItem } from "../../common/codegen/Bank.types";
import { calcAusdcPrice, calcClaimAndSwapData } from "../helpers/math";
import { UserRequest } from "../db/requests";
import { AssetPrice } from "../db/types";
import { DatabaseClient } from "../db/client";

const dbClient = new DatabaseClient(MONGODB, "orbit_controller");

async function main() {
  try {
    const chainId = "pion-1"; // TODO:  const chainId = "neutron-1";
    const configJsonStr = await readFile(PATH_TO_CONFIG_JSON, {
      encoding: ENCODING,
    });
    const CHAIN_CONFIG: ChainConfig = JSON.parse(configJsonStr);
    const {
      PREFIX,
      OPTION: {
        RPC_LIST: [RPC],
        DENOM,
        GAS_PRICE_AMOUNT,
      },
    } = getChainOptionById(CHAIN_CONFIG, chainId);

    const gasPrice = `${GAS_PRICE_AMOUNT}${DENOM}`;

    // local interchain alice: neutron1q5u23ppwrf7jvns33u9rm2xu8u37wyy64xj4zs
    const { signer, owner } = await getSigner(PREFIX, USER_SEED);

    const sgQueryHelpers = await getSgQueryHelpers(RPC);
    const sgExecHelpers = await getSgExecHelpers(RPC, owner, signer);

    const { bank } = await getCwQueryHelpers(chainId, RPC);
    const h = await getCwExecHelpers(chainId, RPC, owner, signer);

    const { getBalance, getAllBalances } = sgQueryHelpers;
    const { sgMultiSend, sgSend } = sgExecHelpers;
    console.clear();

    // const { usdc } = await bank.cwQueryConfig();
    // await h.bank.cwDepositUsdc(
    //   10_000 * 1e6,
    //   { native: { denom: usdc } },
    //   gasPrice
    // );

    const blockTime = await bank.cwQueryBlockTime();
    const userInfo = await bank.cwQueryUserInfo(owner, {});
    // userInfo.user_yield.pending.assets.map(x => x.)

    await dbClient.connect();
    try {
      await UserRequest.addData(owner, [], blockTime);
      l("Prices are stored in DB");
    } catch (_) {}
    await dbClient.disconnect();

    // await h.bank.cwWithdrawUsdc({}, gasPrice);

    await bank.cwQueryUserInfo(owner, {}, true);

    // TODO: add [asset, amount, timestamp][] per user DB request
  } catch (error) {
    l(error);
  }
}

main();
