import { ChainConfig } from "../../common/interfaces";
import { $, toJson } from "./config-utils";
import * as MinterTypes from "../codegen/Minter.types";
import * as BankTypes from "../codegen/Bank.types";

export type NetworkName = "NEUTRON";
export type Wasm = "bank.wasm" | "minter.wasm";
export type Label = "bank" | "minter";

export const ADDRESS = {
  CONTROLLER: "neutron1lwrna9hj3awewqr8ryx2wlpdc2dcgq7asd5na9",
};

export const TOKEN = {
  USDC: "factory/neutron1lh2w8ne2scnc7jve38ymr3xelyw5gt2l34flxf8mpeptwg3u575setmke6/nobleUSDC",
  aUSDC:
    "factory/neutron1lh2w8ne2scnc7jve38ymr3xelyw5gt2l34flxf8mpeptwg3u575setmke6/aUSDC",
};

/**
 * This config is used to generate `config.json` used by any script (ts, js, bash).
 * It must be filled manually. If any contract must be added it's required to include
 * it with default parameters - code is 0, address is "".
 * This config uses logs.json generated by local-interchaintest to update endpoints
 * in cofig.json.
 */
export const CHAIN_CONFIG: ChainConfig = {
  CHAINS: [
    {
      NAME: "neutron",
      PREFIX: "neutron",
      OPTIONS: [
        // TODO: NEUTRON test
        {
          TYPE: "test",
          DENOM: "untrn",
          CHAIN_ID: "pion-1",
          RPC_LIST: [
            "https://rpc.testcosmos.directory/neutrontestnet",
            "https://rpc-falcron.pion-1.ntrn.tech:443",
          ],
          GAS_PRICE_AMOUNT: 0.0053,
          STORE_CODE_GAS_MULTIPLIER: 21.5,
          CONTRACTS: [
            {
              WASM: "minter.wasm",
              LABEL: "minter",
              INIT_MSG: toJson({}),
              MIGRATE_MSG: toJson({}),
              UPDATE_MSG: toJson({}),
              CODE: 7430,
              ADDRESS:
                "neutron1lh2w8ne2scnc7jve38ymr3xelyw5gt2l34flxf8mpeptwg3u575setmke6",
            },

            {
              WASM: "bank.wasm",
              LABEL: "bank",
              INIT_MSG: toJson<BankTypes.InstantiateMsg>({
                ausdc: TOKEN.aUSDC,
                usdc: TOKEN.USDC,
                controller: ADDRESS.CONTROLLER,
              }),
              MIGRATE_MSG: toJson({}),
              UPDATE_MSG: toJson({}),
              CODE: 11275,
              ADDRESS:
                "neutron14zx2vdrnsy9shky0w865uuymgn03w96n79sskjl5958jspwp673ssrgea3",
            },
          ],
          IBC: [],
        },

        // TODO: NEUTRON main
        {
          TYPE: "main",
          DENOM: "untrn",
          CHAIN_ID: "neutron-1",
          RPC_LIST: ["https://rpc.cosmos.directory/neutron"],
          GAS_PRICE_AMOUNT: 0.0053,
          STORE_CODE_GAS_MULTIPLIER: 21.5,
          CONTRACTS: [
            {
              WASM: "bank.wasm",
              LABEL: "bank",
              INIT_MSG: toJson({}),
              MIGRATE_MSG: toJson({}),
              UPDATE_MSG: toJson({}),
              CODE: 0,
              ADDRESS: "",
            },
          ],
          IBC: [],
        },
      ],
    },
  ],
};
