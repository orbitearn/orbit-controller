import https from "https";
import { getSigner } from "../account/signer";
import { readFile } from "fs/promises";
import { ChainConfig } from "../../common/interfaces";
import { ENCODING, PATH_TO_CONFIG_JSON } from "./utils";
import { getChainOptionById } from "../../common/config/config-utils";
import { DatabaseClient } from "../db/client";
import { BANK, CHAIN_ID, ROUTE } from "../constants";
import { UserAsset } from "../helpers";
import {
  getSgQueryHelpers,
  getSgExecHelpers,
} from "../../common/account/sg-helpers";
import {
  getCwExecHelpers,
  getCwQueryHelpers,
} from "../../common/account/cw-helpers";
import {
  MONGODB,
  ORBIT_CONTROLLER,
  USER_SEED,
  BE_PROD_URL,
  BE_DEV_URL,
  IS_PROD,
} from "../envs";
import {
  floor,
  getLast,
  l,
  li,
  numberFrom,
  Request,
  wait,
} from "../../common/utils";

const dbClient = new DatabaseClient(MONGODB, ORBIT_CONTROLLER);
const baseURL = (IS_PROD ? BE_PROD_URL : BE_DEV_URL) + "/api";
const httpsAgent = IS_PROD
  ? undefined
  : new https.Agent({
      rejectUnauthorized: false,
    });
const req = new Request({ baseURL, httpsAgent });

async function main() {
  try {
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
    } = getChainOptionById(CHAIN_CONFIG, CHAIN_ID);

    const gasPrice = `${GAS_PRICE_AMOUNT}${DENOM}`;

    // local interchain alice: neutron1q5u23ppwrf7jvns33u9rm2xu8u37wyy64xj4zs
    const { signer, owner } = await getSigner(PREFIX, USER_SEED);

    const sgQueryHelpers = await getSgQueryHelpers(RPC);
    const sgExecHelpers = await getSgExecHelpers(RPC, owner, signer);

    const { bank } = await getCwQueryHelpers(CHAIN_ID, RPC);
    const h = await getCwExecHelpers(CHAIN_ID, RPC, owner, signer);

    const { getBalance, getAllBalances } = sgQueryHelpers;
    const { sgMultiSend, sgSend } = sgExecHelpers;
    console.clear();

    // const address = "neutron1m3zfzylcdcx0gwnv02kt26y8wnlhq4922t389r";
    // const from = 0;
    // const to = 2000000000;

    // const resNone: UserAsset[] = await req.get(
    //   ROUTE.GET_USER_DATA_IN_TIMESTAMP_RANGE,
    //   {
    //     params: {
    //       address,
    //       from,
    //       to,
    //       period: "none",
    //     },
    //   }
    // );

    // const resDay: UserAsset[] = await req.get(
    //   ROUTE.GET_USER_DATA_IN_TIMESTAMP_RANGE,
    //   {
    //     params: {
    //       address,
    //       from,
    //       to,
    //       period: "day",
    //     },
    //   }
    // );

    // const ethNone =
    //   resNone.find(
    //     (x) =>
    //       x.asset ===
    //       "factory/neutron1lh2w8ne2scnc7jve38ymr3xelyw5gt2l34flxf8mpeptwg3u575setmke6/wstETH"
    //   )?.samples || [];
    // const ethDay =
    //   resDay.find(
    //     (x) =>
    //       x.asset ===
    //       "factory/neutron1lh2w8ne2scnc7jve38ymr3xelyw5gt2l34flxf8mpeptwg3u575setmke6/wstETH"
    //   )?.samples || [];

    // const ethNoneSum = ethNone.reduce((acc, cur) => acc + cur.amount, 0);
    // const ethDaySum = ethDay.reduce((acc, cur) => acc + cur.amount, 0);

    // li({ ethNoneSum, ethDaySum });
    // li({ ethNone: ethNone.length, ethDay: ethDay.length });

    // li({ ethDay });

    // return;

    await req.post(ROUTE.UPDATE_USER_ASSETS, {
      addressList: [owner],
    });
    return;

    // await h.bank.cwClaimAssets(gasPrice);
    // return;

    // const bankAddress =
    //   "neutron1ckvacpufrxuulkwp9uhua2fe5k9h9l20c2ut6au56vjs5q2ae0csu5t4er";

    // const userCounterList = await bank.pQueryUserCounterList(
    //   BANK.PAGINATION.USER_COUNTER
    // );
    // const { counter: appCounter } = await bank.cwQueryDistributionState({});

    // const usersToUpdate = getUpdateStateList(
    //   appCounter,
    //   BANK.MAX_COUNTER_DIFF,
    //   BANK.UPDATE_STATE_LIST.LIMIT,
    //   userCounterList
    // );

    // await dbClient.connect();
    // await updateUserData(CHAIN_ID, RPC, usersToUpdate, bankAddress);
    // await dbClient.disconnect();
    // return;

    // const userInfoList = await bank.pQueryUserInfoList(
    //   {},
    //   BANK.PAGINATION_AMOUNT
    // );
    // li(userInfoList.length);
    // return;

    // const params = {
    //   address: owner,
    //   from: 1742700000,
    //   to: 1742838234,
    // };

    // const res = await req.get(ROUTE.GET_AVERAGE_ENTRY_PRICE, { params });
    // li(res);
    // return;

    const { usdc } = await bank.cwQueryConfig();
    await h.bank.cwDepositUsdc(
      numberFrom(10_000 * 1e6),
      { native: { denom: usdc } },
      gasPrice
    );

    await h.bank.cwEnableDca(
      numberFrom(0.5),
      [
        {
          symbol:
            "factory/neutron1lh2w8ne2scnc7jve38ymr3xelyw5gt2l34flxf8mpeptwg3u575setmke6/axlWBTC",
          weight: "0.75",
        },
        {
          symbol:
            "factory/neutron1lh2w8ne2scnc7jve38ymr3xelyw5gt2l34flxf8mpeptwg3u575setmke6/wstETH",
          weight: "0.25",
        },
      ],
      { swaps: 100 },
      gasPrice
    );
    await bank.cwQueryUserInfo(owner, {}, true);
    return;

    // // every user action must be wrapped with dbHandlerWrapper
    // const dbHandlerWrapper = await getDbHandlerWrapper(
    //   dbClient,
    //   CHAIN_ID,
    //   RPC,
    //   owner
    // );

    // // get args for cwWithdrawUsdc to withdraw 1/2 of available usdc
    // const {
    //   ausdc: { minted },
    // } = await bank.cwQueryUserInfo(owner, {}, true);
    // const ausdcAmount = floor(Number(minted) / 2);
    // // const { usdc } = await bank.cwQueryConfig();
    // // const ausdcAmount = floor(Number(minted));

    // // example of wrapped user action
    // const txRes = await dbHandlerWrapper(
    //   async () => await h.bank.cwClaimAssets(gasPrice)
    // );

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
  } catch (error) {
    l(error);
  }
}

main();
