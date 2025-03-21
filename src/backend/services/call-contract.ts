import { getSigner } from "../account/signer";
import { getLast, l, li, wait } from "../../common/utils";
import { readFile, writeFile } from "fs/promises";
import { ChainConfig } from "../../common/interfaces";
import { ENCODING, PATH_TO_CONFIG_JSON, writeSnapshot } from "./utils";
import { getChainOptionById } from "../../common/config/config-utils";
import { rootPath, SEED } from "../envs";
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

    const { signer, owner } = await getSigner(PREFIX, SEED);

    const sgQueryHelpers = await getSgQueryHelpers(RPC);
    const sgExecHelpers = await getSgExecHelpers(RPC, owner, signer);

    const { bank } = await getCwQueryHelpers(chainId, RPC);
    const h = await getCwExecHelpers(chainId, RPC, owner, signer);

    const { getBalance, getAllBalances } = sgQueryHelpers;
    const { sgMultiSend, sgSend } = sgExecHelpers;
    console.clear();

    const getNextAusdcPrice = async () => {
      const appInfo = await bank.cwQueryAppInfo();
      const rewards = await bank.cwQueryRewards();
      const ausdcPrice = await bank.cwQueryAusdcPrice();
      const nextAusdcPrice = calcAusdcPrice(
        Number(appInfo.usdc_net) + Number(rewards),
        Number(appInfo.ausdc.minted)
      );

      return Math.min(nextAusdcPrice, ausdcPrice);
    };

    const priceList = await getAllPrices();
    const prices = extractPrices(priceList);
    li(prices);
  } catch (error) {
    l(error);
  }
}

main();
