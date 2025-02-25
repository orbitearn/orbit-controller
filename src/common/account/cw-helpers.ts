import { StakingQueryClient } from "../codegen/Staking.client";
import { VoterMsgComposer } from "../codegen/Voter.message-composer";
import { VoterQueryClient } from "../codegen/Voter.client";

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
  UserListResponse,
  UserListResponseItem,
  WeightAllocationItem,
} from "../codegen/Voter.types";
import {
  Addr,
  LockerInfo,
  QueryEssenceListResponseItem,
  StakerInfo,
} from "../codegen/Staking.types";

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

function getContracts(contracts: ContractInfo[]) {
  let STAKING_CONTRACT: ContractInfo | undefined;
  let VOTER_CONTRACT: ContractInfo | undefined;

  try {
    STAKING_CONTRACT = getContractByLabel(contracts, "staking");
  } catch (error) {
    l(error);
  }

  try {
    VOTER_CONTRACT = getContractByLabel(contracts, "voter");
  } catch (error) {
    l(error);
  }

  return {
    STAKING_CONTRACT,
    VOTER_CONTRACT,
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

  const { VOTER_CONTRACT } = getContracts(CONTRACTS);

  const cwClient = await getCwClient(rpc, owner, signer);
  if (!cwClient) throw new Error("cwClient is not found!");

  const signingClient = cwClient.client as SigningCosmWasmClient;
  const _signAndBroadcast = signAndBroadcastWrapper(signingClient, owner);

  const voterMsgComposer = new VoterMsgComposer(
    owner,
    VOTER_CONTRACT?.ADDRESS || ""
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

  // voter

  async function cwPushByAdmin(gasPrice: string) {
    return await _msgWrapperWithGasPrice(
      [voterMsgComposer.pushByAdmin()],
      gasPrice,
      1.5
    );
  }

  async function cwPlaceVoteAsDao(
    weightAllocation: WeightAllocationItem[],
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [voterMsgComposer.placeVoteAsDao({ weightAllocation })],
      gasPrice,
      1.5
    );
  }

  return {
    utils: { cwTransferAdmin, cwMigrateMultipleContracts },
    voter: { cwPushByAdmin, cwPlaceVoteAsDao },
  };
}

async function getCwQueryHelpers(chainId: string, rpc: string) {
  const CHAIN_CONFIG = CONFIG_JSON as ChainConfig;
  const {
    OPTION: { CONTRACTS },
  } = getChainOptionById(CHAIN_CONFIG, chainId);

  const { STAKING_CONTRACT, VOTER_CONTRACT } = getContracts(CONTRACTS);

  const cwClient = await getCwClient(rpc);
  if (!cwClient) throw new Error("cwClient is not found!");

  const cosmwasmQueryClient: CosmWasmClient = cwClient.client;

  const stakingQueryClient = new StakingQueryClient(
    cosmwasmQueryClient,
    STAKING_CONTRACT?.ADDRESS || ""
  );

  const voterQueryClient = new VoterQueryClient(
    cosmwasmQueryClient,
    VOTER_CONTRACT?.ADDRESS || ""
  );

  // staking

  async function cwQueryConfig(isDisplayed: boolean = false) {
    const res = await stakingQueryClient.queryConfig();
    return logAndReturn(res, isDisplayed);
  }

  async function cwQueryBalances(isDisplayed: boolean = false) {
    const res = await stakingQueryClient.queryBalances();
    return logAndReturn(res, isDisplayed);
  }

  async function cwQueryRewardsReductionInfo(isDisplayed: boolean = false) {
    const res = await stakingQueryClient.queryRewardsReductionInfo();
    return logAndReturn(res, isDisplayed);
  }

  async function pQueryStakerList(
    maxPaginationAmount: number,
    maxCount: number = 0,
    isDisplayed: boolean = false
  ): Promise<[Addr, StakerInfo][]> {
    const paginationAmount = getPaginationAmount(maxPaginationAmount, maxCount);

    let allItems: [Addr, StakerInfo][] = [];
    let lastItem: string | undefined = undefined;
    let count: number = 0;

    while (lastItem !== "" && count < (maxCount || count + 1)) {
      const stakerListResponse: [Addr, StakerInfo][] =
        await stakingQueryClient.queryStakerInfoList({
          amount: paginationAmount,
          startFrom: lastItem,
        });

      lastItem = getLast(stakerListResponse)?.[0] || "";
      allItems = [...allItems, ...stakerListResponse];
      count += stakerListResponse.length;
      l({ count });
    }

    if (maxCount) {
      allItems = allItems.slice(0, maxCount);
    }

    return logAndReturn(allItems, isDisplayed);
  }

  async function pQueryLockerList(
    maxPaginationAmount: number,
    maxCount: number = 0,
    isDisplayed: boolean = false
  ): Promise<[Addr, LockerInfo[]][]> {
    const paginationAmount = getPaginationAmount(maxPaginationAmount, maxCount);

    let allItems: [Addr, LockerInfo[]][] = [];
    let lastItem: string | undefined = undefined;
    let count: number = 0;

    while (lastItem !== "" && count < (maxCount || count + 1)) {
      const lockerListResponse: [Addr, LockerInfo[]][] =
        await stakingQueryClient.queryLockerInfoList({
          amount: paginationAmount,
          startFrom: lastItem,
        });

      lastItem = getLast(lockerListResponse)?.[0] || "";
      allItems = [...allItems, ...lockerListResponse];
      count += lockerListResponse.length;
      l({ count });
    }

    if (maxCount) {
      allItems = allItems.slice(0, maxCount);
    }

    return logAndReturn(allItems, isDisplayed);
  }

  async function pQueryStakingEssenceList(
    blockTime: number,
    maxPaginationAmount: number,
    maxCount: number = 0,
    isDisplayed: boolean = false
  ): Promise<QueryEssenceListResponseItem[]> {
    const paginationAmount = getPaginationAmount(maxPaginationAmount, maxCount);

    let allItems: QueryEssenceListResponseItem[] = [];
    let lastItem: string | undefined = undefined;
    let count: number = 0;

    while (lastItem !== "" && count < (maxCount || count + 1)) {
      const stakingEssenceList: QueryEssenceListResponseItem[] =
        await stakingQueryClient.queryStakingEssenceList({
          blockTime,
          amount: paginationAmount,
          startFrom: lastItem,
        });

      lastItem = getLast(stakingEssenceList)?.user || "";
      allItems = [...allItems, ...stakingEssenceList];
      count += stakingEssenceList.length;
      l({ count });
    }

    if (maxCount) {
      allItems = allItems.slice(0, maxCount);
    }

    return logAndReturn(allItems, isDisplayed);
  }

  async function pQueryLockingEssenceList(
    maxPaginationAmount: number,
    maxCount: number = 0,
    isDisplayed: boolean = false
  ): Promise<QueryEssenceListResponseItem[]> {
    const paginationAmount = getPaginationAmount(maxPaginationAmount, maxCount);

    let allItems: QueryEssenceListResponseItem[] = [];
    let lastItem: string | undefined = undefined;
    let count: number = 0;

    while (lastItem !== "" && count < (maxCount || count + 1)) {
      const lockingEssenceList: QueryEssenceListResponseItem[] =
        await stakingQueryClient.queryLockingEssenceList({
          amount: paginationAmount,
          startFrom: lastItem,
        });

      lastItem = getLast(lockingEssenceList)?.user || "";
      allItems = [...allItems, ...lockingEssenceList];
      count += lockingEssenceList.length;
      l({ count });
    }

    if (maxCount) {
      allItems = allItems.slice(0, maxCount);
    }

    return logAndReturn(allItems, isDisplayed);
  }

  // voter

  async function cwQueryEstimatedRewards(
    user?: string,
    isDisplayed: boolean = false
  ) {
    const res = await voterQueryClient.estimatedRewards({ user });
    return logAndReturn(res, isDisplayed);
  }

  async function cwQueryOptimizationData(isDisplayed: boolean = false) {
    const res = await voterQueryClient.optimizationData();
    return logAndReturn(res, isDisplayed);
  }

  async function cwQueryOperationStatus(isDisplayed: boolean = false) {
    const res = await voterQueryClient.operationStatus();
    return logAndReturn(res, isDisplayed);
  }

  async function cwQueryEpochInfo(isDisplayed: boolean = false) {
    const res = await voterQueryClient.epochInfo();
    return logAndReturn(res, isDisplayed);
  }

  async function cwQueryVoterInfo(isDisplayed: boolean = false) {
    const res = await voterQueryClient.voterInfo({});
    return logAndReturn(res, isDisplayed);
  }

  async function pQueryUserList(
    maxPaginationAmount: number,
    maxCount: number = 0,
    isDisplayed: boolean = false
  ): Promise<UserListResponseItem[]> {
    const paginationAmount = getPaginationAmount(maxPaginationAmount, maxCount);

    let allItems: UserListResponseItem[] = [];
    let lastItem: string | undefined = undefined;
    let count: number = 0;

    while (lastItem !== "" && count < (maxCount || count + 1)) {
      const userListResponse: UserListResponse =
        await voterQueryClient.userList({
          amount: paginationAmount,
          startFrom: lastItem,
        });

      lastItem = getLast(userListResponse.list)?.address || "";
      allItems = [...allItems, ...userListResponse.list];
      count += userListResponse.list.length;
      l({ count });
    }

    if (maxCount) {
      allItems = allItems.slice(0, maxCount);
    }

    return logAndReturn(allItems, isDisplayed);
  }

  return {
    staking: {
      cwQueryConfig,
      cwQueryBalances,
      cwQueryRewardsReductionInfo,
      pQueryStakerList,
      pQueryLockerList,
      pQueryStakingEssenceList,
      pQueryLockingEssenceList,
    },
    voter: {
      cwQueryEstimatedRewards,
      cwQueryOptimizationData,
      cwQueryOperationStatus,
      cwQueryEpochInfo,
      cwQueryVoterInfo,
      pQueryUserList,
    },
  };
}

export { getCwExecHelpers, getCwQueryHelpers };
