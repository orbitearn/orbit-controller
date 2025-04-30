import { l, numberFrom } from "../../../common/utils";
import { readFile, writeFile } from "fs/promises";
import { ChainConfig, ChainType } from "../../../common/interfaces";
import { getChainOptionById } from "../../../common/config/config-utils";
import { getCwQueryHelpers } from "../../../common/account/cw-helpers";
import { ENCODING, PATH_TO_CONFIG_JSON, parseStoreArgs } from "../utils";
import { BANK, CHAIN_ID } from "../../constants";
import { rootPath } from "../../envs";

const PAGINATION_QUERY_AMOUNT = 3;

function getSnapshotPath(name: string, chainType: ChainType, fileName: string) {
  return rootPath(
    `./src/backend/services/snapshots/${name}/${chainType}net/${fileName}`
  );
}

async function main() {
  const configJsonStr = await readFile(PATH_TO_CONFIG_JSON, {
    encoding: ENCODING,
  });
  const CHAIN_CONFIG: ChainConfig = JSON.parse(configJsonStr);
  const {
    NAME,
    OPTION: {
      RPC_LIST: [RPC],
      TYPE,
    },
  } = getChainOptionById(CHAIN_CONFIG, CHAIN_ID);

  const { bank } = await getCwQueryHelpers(CHAIN_ID, RPC);

  const writeUserInfo = async () => {
    try {
      const ausdcPrice = await bank.cwQueryAusdcPrice();
      const ausdcPriceNext = numberFrom(1.1 * ausdcPrice);
      const userInfoList = await bank.pQueryUserInfoList(
        { ausdcPriceNext },
        PAGINATION_QUERY_AMOUNT
      );

      // write files
      await writeFile(
        getSnapshotPath(NAME, TYPE, "user-info.json"),
        JSON.stringify(userInfoList, null, 2),
        {
          encoding: ENCODING,
        }
      );
    } catch (error) {
      l(error);
    }
  };

  await writeUserInfo();
}

main();
