import { getSigner } from "../account/signer";
import { getLast, l, li, wait } from "../../common/utils";
import { readFile } from "fs/promises";
import { ChainConfig } from "../../common/interfaces";
import { ENCODING, PATH_TO_CONFIG_JSON, writeSnapshot } from "./utils";
import { getChainOptionById } from "../../common/config/config-utils";
import { SEED } from "../envs";
import {
  getSgQueryHelpers,
  getSgExecHelpers,
} from "../../common/account/sg-helpers";
import {
  getCwExecHelpers,
  getCwQueryHelpers,
} from "../../common/account/cw-helpers";
import { getAllPrices } from "../helpers";
import { BANK } from "../constants";
import { AssetItem } from "../../common/codegen/Bank.types";

function dedupVector<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function calcMergedAssetList(
  assetsA: AssetItem[],
  assetsB: AssetItem[]
): AssetItem[] {
  const rewardsSymbolList = dedupVector(
    [...assetsA, ...assetsB].map((x) => x.symbol)
  );

  return rewardsSymbolList.reduce((acc, symbol) => {
    const amountA = assetsA.find((x) => x.symbol === symbol)?.amount || "";
    const amountB = assetsB.find((x) => x.symbol === symbol)?.amount || "";
    const amount = (Number(amountA) + Number(amountB)).toString();

    if (amount) {
      acc.push({ symbol, amount });
    }

    return acc;
  }, [] as AssetItem[]);
}

function calcAusdcPrice(totalUsdcGross: number, totalAusdc: number) {
  return !totalAusdc ? 1 : totalUsdcGross / totalAusdc;
}

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

    const ausdcPriceNext = await getNextAusdcPrice();
    // const priceList = await getAllPrices();

    const userInfoList = await bank.pQueryUserInfoList(
      { ausdcPriceNext },
      BANK.PAGINATION_AMOUNT
    );

    const [rewards, usdcYield, assets] = userInfoList.reduce(
      ([rewards, usdc_yield, assets], cur) => {
        return [
          rewards + Number(cur.user_yield.next.total),
          usdc_yield + Number(cur.user_yield.next.usdc),
          calcMergedAssetList(assets, cur.user_yield.next.assets),
        ];
      },
      [0, 0, []] as [number, number, AssetItem[]]
    );
    li({ rewards, usdcYield, assets });

    //   h.bank_try_claim_and_swap(owner, rewards, usdc_yield, &assets)?;
  } catch (error) {
    l(error);
  }
}

main();
