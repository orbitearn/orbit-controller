import { BankQueryClient } from "../codegen/Bank.client";
import { BankMsgComposer } from "../codegen/Bank.message-composer";

import CONFIG_JSON from "../config/config.json";
import { getLast, getPaginationAmount, l, logAndReturn } from "../utils";
import { toBase64, fromUtf8, toUtf8 } from "@cosmjs/encoding";
import {
  MsgMigrateContract,
  MsgUpdateAdmin,
} from "cosmjs-types/cosmwasm/wasm/v1/tx";
import { getChainOptionById, getContractByLabel } from "../config/config-utils";
import {
  getCwClient,
  signAndBroadcastWrapper,
  getExecuteContractMsg,
} from "./clients";
import {
  SigningCosmWasmClient,
  CosmWasmClient,
  MsgExecuteContractEncodeObject,
  MsgUpdateAdminEncodeObject,
  MsgMigrateContractEncodeObject,
} from "@cosmjs/cosmwasm-stargate";
import {
  DirectSecp256k1HdWallet,
  OfflineSigner,
  OfflineDirectSigner,
  coin,
} from "@cosmjs/proto-signing";
import {
  Cw20SendMsg,
  TokenUnverified,
  ChainConfig,
  ContractInfo,
} from "../interfaces";
import {
  AssetItem,
  CurrencyForToken,
  Token,
  UserInfoResponse,
  WeightItem,
} from "../codegen/Bank.types";

function addSingleTokenToComposerObj(
  obj: MsgExecuteContractEncodeObject,
  amount: number,
  token: TokenUnverified
): MsgExecuteContractEncodeObject {
  const {
    value: { contract, sender, msg },
  } = obj;

  if (!(contract && sender && msg)) {
    throw new Error(`${msg} parameters error!`);
  }

  return getSingleTokenExecMsg(
    contract,
    sender,
    JSON.parse(fromUtf8(msg)),
    amount,
    token
  );
}

function getSingleTokenExecMsg(
  contractAddress: string,
  senderAddress: string,
  msg: any,
  amount?: number,
  token?: TokenUnverified
) {
  // get msg without funds
  if (!(token && amount)) {
    return getExecuteContractMsg(contractAddress, senderAddress, msg, []);
  }

  // get msg with native token
  if ("native" in token) {
    return getExecuteContractMsg(contractAddress, senderAddress, msg, [
      coin(amount, token.native.denom),
    ]);
  }

  // get msg with CW20 token
  const cw20SendMsg: Cw20SendMsg = {
    send: {
      contract: contractAddress,
      amount: `${amount}`,
      msg: toBase64(msg),
    },
  };

  return getExecuteContractMsg(
    token.cw20.address,
    senderAddress,
    cw20SendMsg,
    []
  );
}

function getSymbol(token: Token) {
  return "native" in token ? token.native.denom : token.cw20.address;
}

function getContracts(contracts: ContractInfo[]) {
  let BANK_CONTRACT: ContractInfo | undefined;

  try {
    BANK_CONTRACT = getContractByLabel(contracts, "bank");
  } catch (error) {
    l(error);
  }

  return {
    BANK_CONTRACT,
  };
}

async function getCwExecHelpers(
  chainId: string,
  rpc: string,
  owner: string,
  signer: (OfflineSigner & OfflineDirectSigner) | DirectSecp256k1HdWallet
) {
  const CHAIN_CONFIG = CONFIG_JSON as ChainConfig;
  const {
    OPTION: { CONTRACTS },
  } = getChainOptionById(CHAIN_CONFIG, chainId);

  const { BANK_CONTRACT } = getContracts(CONTRACTS);

  const cwClient = await getCwClient(rpc, owner, signer);
  if (!cwClient) throw new Error("cwClient is not found!");

  const signingClient = cwClient.client as SigningCosmWasmClient;
  const _signAndBroadcast = signAndBroadcastWrapper(signingClient, owner);

  const bankMsgComposer = new BankMsgComposer(
    owner,
    BANK_CONTRACT?.ADDRESS || ""
  );

  async function _msgWrapperWithGasPrice(
    msgs: MsgExecuteContractEncodeObject[],
    gasPrice: string,
    gasAdjustment: number = 1,
    memo?: string
  ) {
    const tx = await _signAndBroadcast(msgs, gasPrice, gasAdjustment, memo);
    l("\n", tx, "\n");
    return tx;
  }

  // utils

  async function cwTransferAdmin(
    contract: string,
    newAdmin: string,
    gasPrice: string,
    gasAdjustment: number = 1
  ) {
    const msg: MsgUpdateAdminEncodeObject = {
      typeUrl: "/cosmwasm.wasm.v1.MsgUpdateAdmin",
      value: MsgUpdateAdmin.fromPartial({
        sender: owner,
        contract,
        newAdmin,
      }),
    };

    const tx = await _signAndBroadcast([msg], gasPrice, gasAdjustment);
    l("\n", tx, "\n");
    return tx;
  }

  async function cwMigrateMultipleContracts(
    contractList: string[],
    codeId: number,
    migrateMsg: any,
    gasPrice: string,
    gasAdjustment: number = 1
  ) {
    const msgList: MsgMigrateContractEncodeObject[] = contractList.map(
      (contract) => ({
        typeUrl: "/cosmwasm.wasm.v1.MsgMigrateContract",
        value: MsgMigrateContract.fromPartial({
          sender: owner,
          contract,
          codeId: BigInt(codeId),
          msg: toUtf8(JSON.stringify(migrateMsg)),
        }),
      })
    );

    const tx = await _signAndBroadcast(msgList, gasPrice, gasAdjustment);
    l("\n", tx, "\n");
    return tx;
  }

  // bank

  async function cwDepositUsdc(
    usdcAmount: number,
    token: TokenUnverified,
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [
        addSingleTokenToComposerObj(
          bankMsgComposer.depositUsdc(),
          usdcAmount,
          token
        ),
      ],
      gasPrice
    );
  }

  async function cwWithdrawAusdc(ausdcAmount: number, gasPrice: string) {
    return await _msgWrapperWithGasPrice(
      [bankMsgComposer.withdrawAusdc({ ausdcAmount: ausdcAmount?.toString() })],
      gasPrice
    );
  }

  async function cwDepositAusdc(
    ausdcAmount: number,
    token: TokenUnverified,
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [
        addSingleTokenToComposerObj(
          bankMsgComposer.depositAusdc(),
          ausdcAmount,
          token
        ),
      ],
      gasPrice
    );
  }

  async function cwWithdrawUsdc(ausdcAmount: number, gasPrice: string) {
    return await _msgWrapperWithGasPrice(
      [bankMsgComposer.withdrawUsdc({ ausdcAmount: ausdcAmount?.toString() })],
      gasPrice
    );
  }

  async function cwEnableDca(
    fraction: number,
    weights: WeightItem[],
    { swaps }: { swaps?: number },
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [
        bankMsgComposer.enableDca({
          fraction: fraction?.toString(),
          weights,
          swaps,
        }),
      ],
      gasPrice
    );
  }

  async function cwDisableDca(gasPrice: string) {
    return await _msgWrapperWithGasPrice(
      [bankMsgComposer.disableDca()],
      gasPrice
    );
  }

  async function cwClaimAssets(gasPrice: string) {
    return await _msgWrapperWithGasPrice(
      [bankMsgComposer.claimAssets()],
      gasPrice
    );
  }

  async function cwClaimAndSwap(
    rewards: number,
    usdcYield: number,
    assets: AssetItem[],
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [
        bankMsgComposer.claimAndSwap({
          rewards: rewards.toString(),
          usdcYield: usdcYield.toString(),
          assets,
        }),
      ],
      gasPrice
    );
  }

  async function cwRegisterAsset(
    token: TokenUnverified,
    decimals: number,
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [bankMsgComposer.registerAsset({ token, decimals })],
      gasPrice
    );
  }

  async function cwAcceptAdminRole(gasPrice: string) {
    return await _msgWrapperWithGasPrice(
      [bankMsgComposer.acceptAdminRole()],
      gasPrice
    );
  }

  async function cwUpdateConfig(
    {
      admin,
      controller,
      usdc,
      ausdc,
      totalUsdcLimit,
    }: {
      admin?: string;
      controller?: string;
      usdc?: string;
      ausdc?: string;
      totalUsdcLimit?: number;
    },
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [
        bankMsgComposer.updateConfig({
          admin,
          controller,
          usdc,
          ausdc,
          totalUsdcLimit: totalUsdcLimit?.toString(),
        }),
      ],
      gasPrice
    );
  }

  async function cwPause(gasPrice: string) {
    return await _msgWrapperWithGasPrice([bankMsgComposer.pause()], gasPrice);
  }

  async function cwUnpause(gasPrice: string) {
    return await _msgWrapperWithGasPrice([bankMsgComposer.unpause()], gasPrice);
  }

  async function cwSetYieldRate(value: number, gasPrice: string) {
    return await _msgWrapperWithGasPrice(
      [bankMsgComposer.setYieldRate({ value: value.toString() })],
      gasPrice
    );
  }

  return {
    utils: { cwTransferAdmin, cwMigrateMultipleContracts },
    bank: {
      cwDepositUsdc,
      cwWithdrawAusdc,
      cwDepositAusdc,
      cwWithdrawUsdc,
      cwEnableDca,
      cwDisableDca,
      cwClaimAssets,
      cwClaimAndSwap,
      cwRegisterAsset,
      cwAcceptAdminRole,
      cwUpdateConfig,
      cwPause,
      cwUnpause,
      cwSetYieldRate,
    },
  };
}

async function getCwQueryHelpers(chainId: string, rpc: string) {
  const CHAIN_CONFIG = CONFIG_JSON as ChainConfig;
  const {
    OPTION: { CONTRACTS },
  } = getChainOptionById(CHAIN_CONFIG, chainId);

  const { BANK_CONTRACT } = getContracts(CONTRACTS);

  const cwClient = await getCwClient(rpc);
  if (!cwClient) throw new Error("cwClient is not found!");

  const cosmwasmQueryClient: CosmWasmClient = cwClient.client;

  const bankQueryClient = new BankQueryClient(
    cosmwasmQueryClient,
    BANK_CONTRACT?.ADDRESS || ""
  );

  // bank

  async function cwQueryConfig(isDisplayed: boolean = false) {
    const res = await bankQueryClient.config();
    return logAndReturn(res, isDisplayed);
  }

  async function cwQueryPauseState(isDisplayed: boolean = false) {
    const res = await bankQueryClient.pauseState();
    return logAndReturn(res, isDisplayed);
  }

  async function cwQueryDistributionState(
    { address }: { address?: string },
    isDisplayed: boolean = false
  ) {
    const res = await bankQueryClient.distributionState({ address });
    return logAndReturn(res, isDisplayed);
  }

  async function cwQueryAsset(symbol: string, isDisplayed: boolean = false) {
    const res = await bankQueryClient.asset({ symbol });
    return logAndReturn(res, isDisplayed);
  }

  async function pQueryAssetList(
    maxPaginationAmount: number,
    maxCount: number = 0,
    isDisplayed: boolean = false
  ) {
    const paginationAmount = getPaginationAmount(maxPaginationAmount, maxCount);

    let allItems: CurrencyForToken[] = [];
    let lastItem: string | undefined = undefined;
    let count: number = 0;

    while (lastItem !== "" && count < (maxCount || count + 1)) {
      const listResponse: CurrencyForToken[] = await bankQueryClient.assetList({
        amount: paginationAmount,
        startFrom: lastItem,
      });

      lastItem = getSymbol(getLast(listResponse)?.token) || "";
      allItems = [...allItems, ...listResponse];
      count += listResponse.length;
    }

    if (maxCount) {
      allItems = allItems.slice(0, maxCount);
    }

    return logAndReturn(allItems, isDisplayed);
  }

  async function cwQueryAusdcPrice(isDisplayed: boolean = false) {
    const res = await bankQueryClient.ausdcPrice();
    return logAndReturn(Number(res), isDisplayed);
  }

  async function cwQueryAppInfo(isDisplayed: boolean = false) {
    const res = await bankQueryClient.appInfo();
    return logAndReturn(res, isDisplayed);
  }

  async function cwQueryUserInfo(
    address: string,
    { ausdcPriceNext }: { ausdcPriceNext?: number },
    isDisplayed: boolean = false
  ) {
    const res = await bankQueryClient.userInfo({
      address,
      ausdcPriceNext: ausdcPriceNext?.toString(),
    });
    return logAndReturn(res, isDisplayed);
  }

  async function pQueryUserInfoList(
    maxPaginationAmount: number,
    maxCount: number = 0,
    isDisplayed: boolean = false
  ) {
    const paginationAmount = getPaginationAmount(maxPaginationAmount, maxCount);

    let allItems: UserInfoResponse[] = [];
    let lastItem: string | undefined = undefined;
    let count: number = 0;

    while (lastItem !== "" && count < (maxCount || count + 1)) {
      const listResponse: UserInfoResponse[] =
        await bankQueryClient.userInfoList({
          amount: paginationAmount,
          startFrom: lastItem,
        });

      lastItem = getLast(listResponse)?.address || "";
      allItems = [...allItems, ...listResponse];
      count += listResponse.length;
    }

    if (maxCount) {
      allItems = allItems.slice(0, maxCount);
    }

    return logAndReturn(allItems, isDisplayed);
  }

  async function cwQueryBalances(
    address: string,
    isDisplayed: boolean = false
  ) {
    const res = await bankQueryClient.balances({ address });
    return logAndReturn(res, isDisplayed);
  }

  async function cwQueryBlockTime(isDisplayed: boolean = false) {
    const res = await bankQueryClient.blockTime();
    return logAndReturn(res, isDisplayed);
  }

  async function cwQueryYieldRate(
    distributionPeriod: number,
    isDisplayed: boolean = false
  ) {
    const res = await bankQueryClient.yieldRate({ distributionPeriod });
    return logAndReturn(res, isDisplayed);
  }

  async function cwQueryRewards(isDisplayed: boolean = false) {
    const res = await bankQueryClient.rewards();
    return logAndReturn(res, isDisplayed);
  }

  return {
    bank: {
      cwQueryConfig,
      cwQueryPauseState,
      cwQueryDistributionState,
      cwQueryAsset,
      pQueryAssetList,
      cwQueryAusdcPrice,
      cwQueryAppInfo,
      cwQueryUserInfo,
      pQueryUserInfoList,
      cwQueryBalances,
      cwQueryBlockTime,
      cwQueryYieldRate,
      cwQueryRewards,
    },
  };
}

export { getCwExecHelpers, getCwQueryHelpers };
