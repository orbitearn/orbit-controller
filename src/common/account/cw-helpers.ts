import { BankQueryClient } from "../codegen/Bank.client";
import { BankMsgComposer } from "../codegen/Bank.message-composer";

import { MinterMsgComposer } from "../codegen/Minter.message-composer";
import { MinterQueryClient } from "../codegen/Minter.client";

import CONFIG_JSON from "../config/config.json";
import {
  decimalFrom,
  getLast,
  getPaginationAmount,
  l,
  logAndReturn,
  numberFrom,
} from "../utils";
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
import {
  InstantiateMarketingInfo,
  Logo,
  Metadata,
} from "../codegen/Minter.types";

function addSingleTokenToComposerObj(
  obj: MsgExecuteContractEncodeObject,
  amount: math.BigNumber,
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
  amount?: math.BigNumber,
  token?: TokenUnverified
) {
  // get msg without funds
  if (!(token && amount)) {
    return getExecuteContractMsg(contractAddress, senderAddress, msg, []);
  }

  // get msg with native token
  if ("native" in token) {
    return getExecuteContractMsg(contractAddress, senderAddress, msg, [
      coin(amount.toFixed(), token.native.denom),
    ]);
  }

  // get msg with CW20 token
  const cw20SendMsg: Cw20SendMsg = {
    send: {
      contract: contractAddress,
      amount: amount.toFixed(),
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
  let MINTER_CONTRACT: ContractInfo | undefined;

  try {
    BANK_CONTRACT = getContractByLabel(contracts, "bank");
  } catch (error) {
    l(error);
  }

  try {
    MINTER_CONTRACT = getContractByLabel(contracts, "minter");
  } catch (error) {
    l(error);
  }

  return {
    BANK_CONTRACT,
    MINTER_CONTRACT,
  };
}

export async function getCwExecHelpers(
  chainId: string,
  rpc: string,
  owner: string,
  signer: (OfflineSigner & OfflineDirectSigner) | DirectSecp256k1HdWallet
) {
  const CHAIN_CONFIG = CONFIG_JSON as ChainConfig;
  const {
    OPTION: { CONTRACTS },
  } = getChainOptionById(CHAIN_CONFIG, chainId);

  const { BANK_CONTRACT, MINTER_CONTRACT } = getContracts(CONTRACTS);

  const cwClient = await getCwClient(rpc, owner, signer);
  if (!cwClient) throw new Error("cwClient is not found!");

  const signingClient = cwClient.client as SigningCosmWasmClient;
  const _signAndBroadcast = signAndBroadcastWrapper(signingClient, owner);

  const bankMsgComposer = new BankMsgComposer(
    owner,
    BANK_CONTRACT?.ADDRESS || ""
  );

  const minterMsgComposer = new MinterMsgComposer(
    owner,
    MINTER_CONTRACT?.ADDRESS || ""
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
    usdcAmount: math.BigNumber,
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

  async function cwWithdrawAusdc(
    { ausdcAmount }: { ausdcAmount?: math.BigNumber },
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [bankMsgComposer.withdrawAusdc({ ausdcAmount: ausdcAmount?.toFixed() })],
      gasPrice
    );
  }

  async function cwDepositAusdc(
    ausdcAmount: math.BigNumber,
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

  async function cwWithdrawUsdc(
    { ausdcAmount }: { ausdcAmount?: math.BigNumber },
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [bankMsgComposer.withdrawUsdc({ ausdcAmount: ausdcAmount?.toFixed() })],
      gasPrice
    );
  }

  async function cwEnableDca(
    fraction: math.BigNumber,
    weights: WeightItem[],
    { swaps }: { swaps?: number },
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [
        bankMsgComposer.enableDca({
          fraction: decimalFrom(fraction),
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
    rewards: math.BigNumber,
    usdcYield: math.BigNumber,
    assets: AssetItem[],
    feeAmount: math.BigNumber,
    prices: [string, math.BigNumber][], // [symbol, price][]
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [
        bankMsgComposer.claimAndSwap({
          rewards: rewards.toFixed(),
          usdcYield: usdcYield.toFixed(),
          assets,
          feeAmount: feeAmount.toFixed(),
          prices: prices.map(([symbol, price]) => [symbol, decimalFrom(price)]),
        }),
      ],
      gasPrice
    );
  }

  async function cwRegisterAsset(
    token: TokenUnverified,
    decimals: number,
    price: math.BigNumber,
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [
        bankMsgComposer.registerAsset({
          asset: { token, decimals },
          price: decimalFrom(price),
        }),
      ],
      gasPrice
    );
  }

  async function cwUpdateUserState(addresses: string[], gasPrice: string) {
    return await _msgWrapperWithGasPrice(
      [bankMsgComposer.updateUserState({ addresses })],
      gasPrice
    );
  }

  async function cwEnableCapture(gasPrice: string) {
    return await _msgWrapperWithGasPrice(
      [bankMsgComposer.enableCapture()],
      gasPrice
    );
  }

  async function cwDisableCapture(gasPrice: string) {
    return await _msgWrapperWithGasPrice(
      [bankMsgComposer.disableCapture()],
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
      totalUsdcLimit?: math.BigNumber;
    },
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [
        bankMsgComposer.updateConfig({
          totalUsdcLimit: totalUsdcLimit?.toFixed(),
          admin,
          controller,
          usdc,
          ausdc,
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

  async function cwSetYieldRate(value: math.BigNumber, gasPrice: string) {
    return await _msgWrapperWithGasPrice(
      [bankMsgComposer.setYieldRate({ value: decimalFrom(value) })],
      gasPrice
    );
  }

  // minter

  async function cwMinterAcceptAdminRole(gasPrice: string) {
    return await _msgWrapperWithGasPrice(
      [minterMsgComposer.acceptAdminRole()],
      gasPrice
    );
  }

  async function cwMinterAcceptTokenOwnerRole(gasPrice: string) {
    return await _msgWrapperWithGasPrice(
      [minterMsgComposer.acceptTokenOwnerRole()],
      gasPrice
    );
  }

  async function cwMinterPause(gasPrice: string) {
    return await _msgWrapperWithGasPrice([minterMsgComposer.pause()], gasPrice);
  }

  async function cwMinterUnpause(gasPrice: string) {
    return await _msgWrapperWithGasPrice(
      [minterMsgComposer.unpause()],
      gasPrice
    );
  }

  async function cwMinterUpdateConfig(
    {
      admin,
      cw20CodeId,
      maxTokensPerOwner,
      permissionlessTokenCreation,
      permissionlessTokenRegistration,
      whitelist,
    }: {
      admin?: string;
      cw20CodeId?: number;
      maxTokensPerOwner?: number;
      permissionlessTokenCreation?: boolean;
      permissionlessTokenRegistration?: boolean;
      whitelist?: string[];
    },
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [
        minterMsgComposer.updateConfig({
          admin,
          cw20CodeId,
          maxTokensPerOwner,
          permissionlessTokenCreation,
          permissionlessTokenRegistration,
          whitelist,
        }),
      ],
      gasPrice
    );
  }

  async function cwUpdateFaucetConfig(
    {
      claimCooldown,
      claimableAmount,
      denomOrAddress,
    }: {
      claimCooldown?: number;
      claimableAmount?: number;
      denomOrAddress: string;
    },
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [
        minterMsgComposer.updateFaucetConfig({
          claimCooldown,
          claimableAmount: claimableAmount?.toString(),
          denomOrAddress,
        }),
      ],
      gasPrice
    );
  }

  async function cwCreateNative(
    subdenom: string,
    {
      decimals,
      owner,
      permissionlessBurning,
      whitelist,
    }: {
      decimals?: number;
      owner?: string;
      permissionlessBurning?: boolean;
      whitelist?: string[];
    },
    paymentAmount: math.BigNumber,
    paymentDenom: string,
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [
        addSingleTokenToComposerObj(
          minterMsgComposer.createNative({
            subdenom,
            decimals,
            owner,
            permissionlessBurning,
            whitelist,
          }),
          paymentAmount,
          {
            native: { denom: paymentDenom },
          }
        ),
      ],
      gasPrice
    );
  }

  async function cwCreateCw20(
    name: string,
    symbol: string,
    {
      cw20CodeId,
      decimals,
      marketing,
      owner,
      permissionlessBurning,
      whitelist,
    }: {
      cw20CodeId?: number;
      decimals?: number;
      marketing?: InstantiateMarketingInfo;
      owner?: string;
      permissionlessBurning?: boolean;
      whitelist?: string[];
    },
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [
        minterMsgComposer.createCw20({
          name,
          symbol,
          cw20CodeId,
          decimals,
          marketing,
          owner,
          permissionlessBurning,
          whitelist,
        }),
      ],
      gasPrice
    );
  }

  async function cwRegisterNative(
    denom: string,
    {
      decimals,
      owner,
      permissionlessBurning,
      whitelist,
    }: {
      decimals?: number;
      owner?: string;
      permissionlessBurning?: boolean;
      whitelist?: string[];
    },
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [
        minterMsgComposer.registerNative({
          denom,
          decimals,
          owner,
          permissionlessBurning,
          whitelist,
        }),
      ],
      gasPrice
    );
  }

  async function cwRegisterCw20(
    address: string,
    {
      cw20CodeId,
      decimals,
      owner,
      permissionlessBurning,
      whitelist,
    }: {
      cw20CodeId?: number;
      decimals?: number;
      owner?: string;
      permissionlessBurning?: boolean;
      whitelist?: string[];
    },
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [
        minterMsgComposer.registerCw20({
          address,
          cw20CodeId,
          decimals,
          owner,
          permissionlessBurning,
          whitelist,
        }),
      ],
      gasPrice
    );
  }

  async function cwUpdateCurrencyInfo(
    denomOrAddress: string,
    {
      owner,
      permissionlessBurning,
      whitelist,
    }: {
      owner?: string;
      permissionlessBurning?: boolean;
      whitelist?: string[];
    },
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [
        minterMsgComposer.updateCurrencyInfo({
          denomOrAddress,
          owner,
          permissionlessBurning,
          whitelist,
        }),
      ],
      gasPrice
    );
  }

  async function cwUpdateMetadataNative(
    denom: string,
    metadata: Metadata,
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [
        minterMsgComposer.updateMetadataNative({
          denom,
          metadata,
        }),
      ],
      gasPrice
    );
  }

  async function cwUpdateMetadataCw20(
    address: string,
    {
      description,
      logo,
      project,
    }: {
      description?: string;
      logo?: Logo;
      project?: string;
    },
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [
        minterMsgComposer.updateMetadataCw20({
          address,
          description,
          logo,
          project,
        }),
      ],
      gasPrice
    );
  }

  async function cwExcludeNative(denom: string, gasPrice: string) {
    return await _msgWrapperWithGasPrice(
      [minterMsgComposer.excludeNative({ denom })],
      gasPrice
    );
  }

  async function cwExcludeCw20(address: string, gasPrice: string) {
    return await _msgWrapperWithGasPrice(
      [minterMsgComposer.excludeCw20({ address })],
      gasPrice
    );
  }

  async function cwMint(
    amount: number | string,
    denomOrAddress: string,
    recipient: string | undefined = undefined,
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [
        minterMsgComposer.mint({
          denomOrAddress,
          amount: numberFrom(amount).toFixed(),
          recipient,
        }),
      ],
      gasPrice
    );
  }

  async function cwMintMultiple(
    denomOrAddress: string,
    accountAndAmountList: [string, math.BigNumber][],
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [
        minterMsgComposer.mintMultiple({
          denomOrAddress,
          accountAndAmountList: accountAndAmountList.map(
            ([account, amount]) => [account, amount.toFixed()]
          ),
        }),
      ],
      gasPrice
    );
  }

  async function cwBurn(
    amount: math.BigNumber,
    token: TokenUnverified,
    gasPrice: string
  ) {
    return await _msgWrapperWithGasPrice(
      [addSingleTokenToComposerObj(minterMsgComposer.burn(), amount, token)],
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
      cwUpdateUserState,
      cwEnableCapture,
      cwDisableCapture,
      cwAcceptAdminRole,
      cwUpdateConfig,
      cwPause,
      cwUnpause,
      cwSetYieldRate,
    },
    minter: {
      cwAcceptAdminRole: cwMinterAcceptAdminRole,
      cwAcceptTokenOwnerRole: cwMinterAcceptTokenOwnerRole,
      cwMinterPause: cwMinterPause,
      cwMinterUnpause: cwMinterUnpause,
      cwUpdateConfig: cwMinterUpdateConfig,
      cwUpdateFaucetConfig,
      cwCreateNative,
      cwCreateCw20,
      cwRegisterNative,
      cwRegisterCw20,
      cwUpdateCurrencyInfo,
      cwUpdateMetadataNative,
      cwUpdateMetadataCw20,
      cwExcludeNative,
      cwExcludeCw20,
      cwMint,
      cwMintMultiple,
      cwBurn,
    },
  };
}

export async function getCwQueryHelpers(chainId: string, rpc: string) {
  const CHAIN_CONFIG = CONFIG_JSON as ChainConfig;
  const {
    OPTION: { CONTRACTS },
  } = getChainOptionById(CHAIN_CONFIG, chainId);

  const { BANK_CONTRACT, MINTER_CONTRACT } = getContracts(CONTRACTS);

  const cwClient = await getCwClient(rpc);
  if (!cwClient) throw new Error("cwClient is not found!");

  const cosmwasmQueryClient: CosmWasmClient = cwClient.client;

  const bankQueryClient = new BankQueryClient(
    cosmwasmQueryClient,
    BANK_CONTRACT?.ADDRESS || ""
  );

  const minterQueryClient = new MinterQueryClient(
    cosmwasmQueryClient,
    MINTER_CONTRACT?.ADDRESS || ""
  );

  // bank

  async function cwQueryConfig(isDisplayed: boolean = false) {
    const res = await bankQueryClient.config();
    return logAndReturn(res, isDisplayed);
  }

  async function cwQueryState(isDisplayed: boolean = false) {
    const res = await bankQueryClient.state();
    return logAndReturn(res, isDisplayed);
  }

  async function cwQueryDistributionState(
    { address }: { address?: string },
    isDisplayed: boolean = false
  ) {
    const res = await bankQueryClient.distributionState({ address });
    return logAndReturn(res, isDisplayed);
  }

  async function cwQueryDistributionStateList(
    addressList: string[],
    isDisplayed: boolean = false
  ) {
    const res = await bankQueryClient.distributionStateList({
      addresses: addressList,
    });
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

      const temp = getLast(listResponse);
      lastItem = temp ? getSymbol(temp.token) : "";
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
    return logAndReturn(numberFrom(res).toNumber(), isDisplayed);
  }

  async function cwQueryAppInfo(isDisplayed: boolean = false) {
    const res = await bankQueryClient.appInfo();
    return logAndReturn(res, isDisplayed);
  }

  async function cwQueryDbAssets(
    address: string,
    isDisplayed: boolean = false
  ) {
    const res = await bankQueryClient.dbAssets({ address });
    return logAndReturn(res, isDisplayed);
  }

  async function cwQueryDbAssetsList(
    addressList: string[],
    isDisplayed: boolean = false
  ) {
    const res = await bankQueryClient.dbAssetsList({ addresses: addressList });
    return logAndReturn(res, isDisplayed);
  }

  async function cwQueryUserInfo(
    address: string,
    { ausdcPriceNext }: { ausdcPriceNext?: math.BigNumber },
    isDisplayed: boolean = false
  ) {
    const res = await bankQueryClient.userInfo({
      ausdcPriceNext: ausdcPriceNext ? decimalFrom(ausdcPriceNext) : undefined,
      address,
    });
    return logAndReturn(res, isDisplayed);
  }

  async function pQueryUserInfoList(
    { ausdcPriceNext }: { ausdcPriceNext?: math.BigNumber },
    maxPaginationAmount: number,
    maxCount: number = 0,
    isDisplayed: boolean = false
  ) {
    const paginationAmount = getPaginationAmount(maxPaginationAmount, maxCount);
    const ausdcPriceNextDec = ausdcPriceNext
      ? decimalFrom(ausdcPriceNext)
      : undefined;

    let allItems: UserInfoResponse[] = [];
    let lastItem: string | undefined = undefined;
    let count: number = 0;

    while (lastItem !== "" && count < (maxCount || count + 1)) {
      const listResponse: UserInfoResponse[] =
        await bankQueryClient.userInfoList({
          ausdcPriceNext: ausdcPriceNextDec,
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

  async function pQueryUserCounterList(
    maxPaginationAmount: number,
    maxCount: number = 0,
    isDisplayed: boolean = false
  ) {
    const paginationAmount = getPaginationAmount(maxPaginationAmount, maxCount);

    let allItems: [string, number][] = [];
    let lastItem: string | undefined = undefined;
    let count: number = 0;

    while (lastItem !== "" && count < (maxCount || count + 1)) {
      const listResponse: [string, number][] =
        await bankQueryClient.userCounterList({
          amount: paginationAmount,
          startFrom: lastItem,
        });

      lastItem = getLast(listResponse)?.[0] || "";
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

  // minter

  async function cwMinterQueryConfig(isDisplayed: boolean = false) {
    const res = await minterQueryClient.config();
    return logAndReturn(res, isDisplayed);
  }

  async function cwQueryCurrencyInfo(
    denomOrAddress: string,
    isDisplayed: boolean = false
  ) {
    const res = await minterQueryClient.currencyInfo({ denomOrAddress });
    return logAndReturn(res, isDisplayed);
  }

  async function cwQueryCurrencyInfoList(
    amount: number = 100,
    startAfter: string | undefined = undefined,
    isDisplayed: boolean = false
  ) {
    const res = await minterQueryClient.currencyInfoList({
      amount,
      startAfter,
    });
    return logAndReturn(res, isDisplayed);
  }

  async function cwQueryCurrencyInfoListByOwner(
    owner: string,
    amount: number = 100,
    startAfter: string | undefined = undefined,
    isDisplayed: boolean = false
  ) {
    const res = await minterQueryClient.currencyInfoListByOwner({
      owner,
      amount,
      startAfter,
    });
    return logAndReturn(res, isDisplayed);
  }

  async function cwQueryTokenCountList(
    amount: number = 100,
    startAfter: string | undefined = undefined,
    isDisplayed: boolean = false
  ) {
    const res = await minterQueryClient.tokenCountList({
      amount,
      startAfter,
    });
    return logAndReturn(res, isDisplayed);
  }

  async function cwMinterQueryBalances(
    account: string,
    isDisplayed: boolean = false
  ) {
    const res = await minterQueryClient.balances({ account });
    return logAndReturn(res, isDisplayed);
  }

  return {
    bank: {
      cwQueryConfig,
      cwQueryState,
      cwQueryDistributionState,
      cwQueryDistributionStateList,
      cwQueryAsset,
      pQueryAssetList,
      cwQueryAusdcPrice,
      cwQueryAppInfo,
      cwQueryDbAssets,
      cwQueryDbAssetsList,
      cwQueryUserInfo,
      pQueryUserInfoList,
      pQueryUserCounterList,
      cwQueryBalances,
      cwQueryBlockTime,
      cwQueryYieldRate,
      cwQueryRewards,
    },
    minter: {
      cwQueryConfig: cwMinterQueryConfig,
      cwQueryCurrencyInfo,
      cwQueryCurrencyInfoList,
      cwQueryCurrencyInfoListByOwner,
      cwQueryTokenCountList,
      cwQueryBalances: cwMinterQueryBalances,
    },
  };
}
