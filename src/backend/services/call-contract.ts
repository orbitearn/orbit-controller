import { getSigner } from "../account/signer";
import { floor, getLast, l, li, Request, wait } from "../../common/utils";
import { readFile } from "fs/promises";
import { ChainConfig } from "../../common/interfaces";
import { ENCODING, PATH_TO_CONFIG_JSON } from "./utils";
import { getChainOptionById } from "../../common/config/config-utils";
import { MONGODB, ORBIT_CONTROLLER, USER_SEED, BASE_URL } from "../envs";
import { getDbHandlerWrapper } from "../helpers";
import { DatabaseClient } from "../db/client";
import { ROUTE } from "../constants";
import {
  getSgQueryHelpers,
  getSgExecHelpers,
} from "../../common/account/sg-helpers";
import {
  getCwExecHelpers,
  getCwQueryHelpers,
} from "../../common/account/cw-helpers";

const dbClient = new DatabaseClient(MONGODB, ORBIT_CONTROLLER);
const req = new Request({ baseURL: BASE_URL + "/api" });

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

    const params = {
      address: owner,
      from: 1742700000,
      to: 1742838234,
    };
    const d = await req.get(ROUTE.GET_AVERAGE_ENTRY_PRICE, { params });
    li(d);
    return;

    // const { usdc } = await bank.cwQueryConfig();
    // await h.bank.cwDepositUsdc(
    //   10_000 * 1e6,
    //   { native: { denom: usdc } },
    //   gasPrice
    // );

    // await h.bank.cwEnableDca(
    //   0.5,
    //   [
    //     {
    //       symbol:
    //         "factory/neutron1lh2w8ne2scnc7jve38ymr3xelyw5gt2l34flxf8mpeptwg3u575setmke6/axlWBTC",
    //       weight: "0.75",
    //     },
    //     {
    //       symbol:
    //         "factory/neutron1lh2w8ne2scnc7jve38ymr3xelyw5gt2l34flxf8mpeptwg3u575setmke6/wstETH",
    //       weight: "0.25",
    //     },
    //   ],
    //   { swaps: 5 },
    //   gasPrice
    // );
    // await bank.cwQueryUserInfo(owner, {}, true);

    // every user action must be wrapped with dbHandlerWrapper
    const dbHandlerWrapper = await getDbHandlerWrapper(
      dbClient,
      chainId,
      RPC,
      owner
    );

    // get args for cwWithdrawUsdc to withdraw 1/2 of available usdc
    const {
      ausdc: { minted },
    } = await bank.cwQueryUserInfo(owner, {}, true);
    const ausdcAmount = floor(Number(minted) / 2);
    // const { usdc } = await bank.cwQueryConfig();
    // const ausdcAmount = floor(Number(minted));

    // example of wrapped user action
    const txRes = await dbHandlerWrapper(
      async () => await h.bank.cwClaimAssets(gasPrice)
    );

    // const txRes = await dbHandlerWrapper(
    //   async () => await h.bank.cwWithdrawUsdc({ ausdcAmount }, gasPrice)
    // );

    // const txRes = await dbHandlerWrapper(
    //   async () =>
    //     await h.bank.cwDepositUsdc(
    //       10_000 * 1e6,
    //       { native: { denom: usdc } },
    //       gasPrice
    //     )
    // );

    // check user state
    await bank.cwQueryUserInfo(owner, {}, true);
  } catch (error) {
    l(error);
  }
}

main();
