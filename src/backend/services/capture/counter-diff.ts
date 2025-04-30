import { l, numberFrom } from "../../../common/utils";
import { readFile, writeFile } from "fs/promises";
import { ChainConfig, ChainType } from "../../../common/interfaces";
import { getChainOptionById } from "../../../common/config/config-utils";
import { getCwQueryHelpers } from "../../../common/account/cw-helpers";
import { ENCODING, PATH_TO_CONFIG_JSON, parseStoreArgs } from "../utils";
import { BANK, CHAIN_ID } from "../../constants";
import { rootPath } from "../../envs";

const PAGINATION_QUERY_AMOUNT = 10;

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
      const userCounterList = await bank.pQueryUserCounterList(
        PAGINATION_QUERY_AMOUNT
      );
      const { counter: appCounter } = await bank.cwQueryDistributionState({});
      const counterDiffList: [string, number][] = userCounterList.map(
        ([user, cnt]) => [user, appCounter - cnt]
      );

      // write files
      await writeFile(
        getSnapshotPath(NAME, TYPE, "counter-diff.json"),
        JSON.stringify(counterDiffList, null, 2),
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
