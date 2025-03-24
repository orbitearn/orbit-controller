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
import { AppRequest, UserRequest } from "../db/requests";
import { AssetAmount, AssetPrice, TimestampData } from "../db/types";
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

    const dbAssets = await bank.cwQueryDbAssets(owner);

    const userDistributionState = await bank.cwQueryDistributionState({
      address: owner,
    });
    const distributionState = await bank.cwQueryDistributionState({});

    const dateTo = distributionState.update_date;
    const dateFrom =
      (
        await AppRequest.getDataByCounter(userDistributionState.counter)
      )?.timestamp?.getSeconds() || dateTo;

    const appData = await AppRequest.getDataInTimestampRange(dateFrom, dateTo);
    if (appData.length !== dbAssets.length) {
      throw new Error("Unequal data arrays!");
    }

    const dataList: TimestampData[] = dbAssets.map((assets, i) => {
      const { timestamp } = appData[i];
      const assetList: AssetAmount[] = assets.map(({ amount, symbol }) => ({
        asset: symbol,
        amount: Number(amount),
      }));

      return { timestamp, assetList };
    });

    // user action
    await h.bank.cwWithdrawUsdc({}, gasPrice);

    if (dataList.length) {
      await dbClient.connect();
      try {
        await UserRequest.addDataList(owner, dataList);
        l("Prices are stored in DB");
      } catch (_) {}
      await dbClient.disconnect();
    }

    await bank.cwQueryUserInfo(owner, {}, true);
  } catch (error) {
    l(error);
  }
}

main();
