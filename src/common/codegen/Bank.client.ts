/**
 * This file was automatically generated by @cosmwasm/ts-codegen@1.9.0.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run the @cosmwasm/ts-codegen generate command to regenerate this file.
 */

import {
  CosmWasmClient,
  SigningCosmWasmClient,
  ExecuteResult,
} from "@cosmjs/cosmwasm-stargate";
import { Coin, StdFee } from "@cosmjs/amino";
import {
  Decimal,
  Uint256,
  InstantiateMsg,
  ExecuteMsg,
  Uint128,
  Binary,
  TokenUnverified,
  Cw20ReceiveMsg,
  WeightItem,
  AssetItem,
  CurrencyForTokenUnverified,
  QueryMsg,
  MigrateMsg,
  AppInfoResponse,
  AusdcInfo,
  YieldInfo,
  Token,
  Addr,
  CurrencyForToken,
  ArrayOfCurrencyForToken,
  BalancesResponse,
  Uint64,
  Config,
  ArrayOfArrayOfAssetItem,
  DistributionState,
  ArrayOfTupleOfuint32AndArrayOfTupleOfStringAndDecimal,
  StateResponse,
  StoragesResponse,
  ArrayOfTupleOfAddrAndUint32,
  UserInfoResponse,
  DcaResponse,
  UserYield,
  ArrayOfUserInfoResponse,
  UserStoragesResponse,
} from "./Bank.types";
export interface BankReadOnlyInterface {
  contractAddress: string;
  config: () => Promise<Config>;
  state: () => Promise<StateResponse>;
  distributionState: ({
    address,
  }: {
    address?: string;
  }) => Promise<DistributionState>;
  asset: ({ symbol }: { symbol: string }) => Promise<CurrencyForToken>;
  assetList: ({
    amount,
    startFrom,
  }: {
    amount: number;
    startFrom?: string;
  }) => Promise<ArrayOfCurrencyForToken>;
  ausdcPrice: () => Promise<Decimal>;
  priceSet: ({
    amount,
    startFrom,
  }: {
    amount: number;
    startFrom?: number;
  }) => Promise<ArrayOfTupleOfuint32AndArrayOfTupleOfStringAndDecimal>;
  storages: () => Promise<StoragesResponse>;
  userStorages: ({
    address,
    dca,
  }: {
    address: string;
    dca: boolean;
  }) => Promise<UserStoragesResponse>;
  appInfo: () => Promise<AppInfoResponse>;
  dbAssets: ({
    address,
  }: {
    address: string;
  }) => Promise<ArrayOfArrayOfAssetItem>;
  userInfo: ({
    address,
    ausdcPriceNext,
  }: {
    address: string;
    ausdcPriceNext?: Decimal;
  }) => Promise<UserInfoResponse>;
  userInfoList: ({
    amount,
    ausdcPriceNext,
    startFrom,
  }: {
    amount: number;
    ausdcPriceNext?: Decimal;
    startFrom?: string;
  }) => Promise<ArrayOfUserInfoResponse>;
  userCounterList: ({
    amount,
    startFrom,
  }: {
    amount: number;
    startFrom?: string;
  }) => Promise<ArrayOfTupleOfAddrAndUint32>;
  balances: ({ address }: { address: string }) => Promise<BalancesResponse>;
  blockTime: () => Promise<Uint64>;
  yieldRate: ({
    distributionPeriod,
  }: {
    distributionPeriod: number;
  }) => Promise<Decimal>;
  rewards: () => Promise<Uint256>;
}
export class BankQueryClient implements BankReadOnlyInterface {
  client: CosmWasmClient;
  contractAddress: string;
  constructor(client: CosmWasmClient, contractAddress: string) {
    this.client = client;
    this.contractAddress = contractAddress;
    this.config = this.config.bind(this);
    this.state = this.state.bind(this);
    this.distributionState = this.distributionState.bind(this);
    this.asset = this.asset.bind(this);
    this.assetList = this.assetList.bind(this);
    this.ausdcPrice = this.ausdcPrice.bind(this);
    this.priceSet = this.priceSet.bind(this);
    this.storages = this.storages.bind(this);
    this.userStorages = this.userStorages.bind(this);
    this.appInfo = this.appInfo.bind(this);
    this.dbAssets = this.dbAssets.bind(this);
    this.userInfo = this.userInfo.bind(this);
    this.userInfoList = this.userInfoList.bind(this);
    this.userCounterList = this.userCounterList.bind(this);
    this.balances = this.balances.bind(this);
    this.blockTime = this.blockTime.bind(this);
    this.yieldRate = this.yieldRate.bind(this);
    this.rewards = this.rewards.bind(this);
  }
  config = async (): Promise<Config> => {
    return this.client.queryContractSmart(this.contractAddress, {
      config: {},
    });
  };
  state = async (): Promise<StateResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      state: {},
    });
  };
  distributionState = async ({
    address,
  }: {
    address?: string;
  }): Promise<DistributionState> => {
    return this.client.queryContractSmart(this.contractAddress, {
      distribution_state: {
        address,
      },
    });
  };
  asset = async ({ symbol }: { symbol: string }): Promise<CurrencyForToken> => {
    return this.client.queryContractSmart(this.contractAddress, {
      asset: {
        symbol,
      },
    });
  };
  assetList = async ({
    amount,
    startFrom,
  }: {
    amount: number;
    startFrom?: string;
  }): Promise<ArrayOfCurrencyForToken> => {
    return this.client.queryContractSmart(this.contractAddress, {
      asset_list: {
        amount,
        start_from: startFrom,
      },
    });
  };
  ausdcPrice = async (): Promise<Decimal> => {
    return this.client.queryContractSmart(this.contractAddress, {
      ausdc_price: {},
    });
  };
  priceSet = async ({
    amount,
    startFrom,
  }: {
    amount: number;
    startFrom?: number;
  }): Promise<ArrayOfTupleOfuint32AndArrayOfTupleOfStringAndDecimal> => {
    return this.client.queryContractSmart(this.contractAddress, {
      price_set: {
        amount,
        start_from: startFrom,
      },
    });
  };
  storages = async (): Promise<StoragesResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      storages: {},
    });
  };
  userStorages = async ({
    address,
    dca,
  }: {
    address: string;
    dca: boolean;
  }): Promise<UserStoragesResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      user_storages: {
        address,
        dca,
      },
    });
  };
  appInfo = async (): Promise<AppInfoResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      app_info: {},
    });
  };
  dbAssets = async ({
    address,
  }: {
    address: string;
  }): Promise<ArrayOfArrayOfAssetItem> => {
    return this.client.queryContractSmart(this.contractAddress, {
      db_assets: {
        address,
      },
    });
  };
  userInfo = async ({
    address,
    ausdcPriceNext,
  }: {
    address: string;
    ausdcPriceNext?: Decimal;
  }): Promise<UserInfoResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      user_info: {
        address,
        ausdc_price_next: ausdcPriceNext,
      },
    });
  };
  userInfoList = async ({
    amount,
    ausdcPriceNext,
    startFrom,
  }: {
    amount: number;
    ausdcPriceNext?: Decimal;
    startFrom?: string;
  }): Promise<ArrayOfUserInfoResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      user_info_list: {
        amount,
        ausdc_price_next: ausdcPriceNext,
        start_from: startFrom,
      },
    });
  };
  userCounterList = async ({
    amount,
    startFrom,
  }: {
    amount: number;
    startFrom?: string;
  }): Promise<ArrayOfTupleOfAddrAndUint32> => {
    return this.client.queryContractSmart(this.contractAddress, {
      user_counter_list: {
        amount,
        start_from: startFrom,
      },
    });
  };
  balances = async ({
    address,
  }: {
    address: string;
  }): Promise<BalancesResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      balances: {
        address,
      },
    });
  };
  blockTime = async (): Promise<Uint64> => {
    return this.client.queryContractSmart(this.contractAddress, {
      block_time: {},
    });
  };
  yieldRate = async ({
    distributionPeriod,
  }: {
    distributionPeriod: number;
  }): Promise<Decimal> => {
    return this.client.queryContractSmart(this.contractAddress, {
      yield_rate: {
        distribution_period: distributionPeriod,
      },
    });
  };
  rewards = async (): Promise<Uint256> => {
    return this.client.queryContractSmart(this.contractAddress, {
      rewards: {},
    });
  };
}
export interface BankInterface extends BankReadOnlyInterface {
  contractAddress: string;
  sender: string;
  receive: (
    {
      amount,
      msg,
      sender,
    }: {
      amount: Uint128;
      msg: Binary;
      sender: string;
    },
    fee?: number | StdFee | "auto",
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
  depositUsdc: (
    fee?: number | StdFee | "auto",
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
  withdrawAusdc: (
    {
      ausdcAmount,
    }: {
      ausdcAmount?: Uint256;
    },
    fee?: number | StdFee | "auto",
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
  depositAusdc: (
    fee?: number | StdFee | "auto",
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
  withdrawUsdc: (
    {
      ausdcAmount,
    }: {
      ausdcAmount?: Uint256;
    },
    fee?: number | StdFee | "auto",
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
  enableDca: (
    {
      fraction,
      swaps,
      weights,
    }: {
      fraction: Decimal;
      swaps?: number;
      weights: WeightItem[];
    },
    fee?: number | StdFee | "auto",
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
  disableDca: (
    fee?: number | StdFee | "auto",
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
  claimAssets: (
    fee?: number | StdFee | "auto",
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
  claimAndSwap: (
    {
      assets,
      feeAmount,
      prices,
      rewards,
      usdcYield,
    }: {
      assets: AssetItem[];
      feeAmount: Uint256;
      prices: string[][];
      rewards: Uint256;
      usdcYield: Uint256;
    },
    fee?: number | StdFee | "auto",
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
  registerAsset: (
    {
      asset,
      price,
    }: {
      asset: CurrencyForTokenUnverified;
      price: Decimal;
    },
    fee?: number | StdFee | "auto",
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
  updateUserState: (
    {
      addresses,
    }: {
      addresses: string[];
    },
    fee?: number | StdFee | "auto",
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
  enableCapture: (
    fee?: number | StdFee | "auto",
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
  disableCapture: (
    fee?: number | StdFee | "auto",
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
  acceptAdminRole: (
    fee?: number | StdFee | "auto",
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
  updateConfig: (
    {
      admin,
      ausdc,
      controller,
      feeRate,
      totalUsdcLimit,
      usdc,
    }: {
      admin?: string;
      ausdc?: string;
      controller?: string;
      feeRate?: Decimal;
      totalUsdcLimit?: Uint256;
      usdc?: string;
    },
    fee?: number | StdFee | "auto",
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
  pause: (
    fee?: number | StdFee | "auto",
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
  unpause: (
    fee?: number | StdFee | "auto",
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
  setYieldRate: (
    {
      value,
    }: {
      value: Decimal;
    },
    fee?: number | StdFee | "auto",
    memo?: string,
    _funds?: Coin[]
  ) => Promise<ExecuteResult>;
}
export class BankClient extends BankQueryClient implements BankInterface {
  client: SigningCosmWasmClient;
  sender: string;
  contractAddress: string;
  constructor(
    client: SigningCosmWasmClient,
    sender: string,
    contractAddress: string
  ) {
    super(client, contractAddress);
    this.client = client;
    this.sender = sender;
    this.contractAddress = contractAddress;
    this.receive = this.receive.bind(this);
    this.depositUsdc = this.depositUsdc.bind(this);
    this.withdrawAusdc = this.withdrawAusdc.bind(this);
    this.depositAusdc = this.depositAusdc.bind(this);
    this.withdrawUsdc = this.withdrawUsdc.bind(this);
    this.enableDca = this.enableDca.bind(this);
    this.disableDca = this.disableDca.bind(this);
    this.claimAssets = this.claimAssets.bind(this);
    this.claimAndSwap = this.claimAndSwap.bind(this);
    this.registerAsset = this.registerAsset.bind(this);
    this.updateUserState = this.updateUserState.bind(this);
    this.enableCapture = this.enableCapture.bind(this);
    this.disableCapture = this.disableCapture.bind(this);
    this.acceptAdminRole = this.acceptAdminRole.bind(this);
    this.updateConfig = this.updateConfig.bind(this);
    this.pause = this.pause.bind(this);
    this.unpause = this.unpause.bind(this);
    this.setYieldRate = this.setYieldRate.bind(this);
  }
  receive = async (
    {
      amount,
      msg,
      sender,
    }: {
      amount: Uint128;
      msg: Binary;
      sender: string;
    },
    fee: number | StdFee | "auto" = "auto",
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        receive: {
          amount,
          msg,
          sender,
        },
      },
      fee,
      memo,
      _funds
    );
  };
  depositUsdc = async (
    fee: number | StdFee | "auto" = "auto",
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        deposit_usdc: {},
      },
      fee,
      memo,
      _funds
    );
  };
  withdrawAusdc = async (
    {
      ausdcAmount,
    }: {
      ausdcAmount?: Uint256;
    },
    fee: number | StdFee | "auto" = "auto",
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        withdraw_ausdc: {
          ausdc_amount: ausdcAmount,
        },
      },
      fee,
      memo,
      _funds
    );
  };
  depositAusdc = async (
    fee: number | StdFee | "auto" = "auto",
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        deposit_ausdc: {},
      },
      fee,
      memo,
      _funds
    );
  };
  withdrawUsdc = async (
    {
      ausdcAmount,
    }: {
      ausdcAmount?: Uint256;
    },
    fee: number | StdFee | "auto" = "auto",
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        withdraw_usdc: {
          ausdc_amount: ausdcAmount,
        },
      },
      fee,
      memo,
      _funds
    );
  };
  enableDca = async (
    {
      fraction,
      swaps,
      weights,
    }: {
      fraction: Decimal;
      swaps?: number;
      weights: WeightItem[];
    },
    fee: number | StdFee | "auto" = "auto",
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        enable_dca: {
          fraction,
          swaps,
          weights,
        },
      },
      fee,
      memo,
      _funds
    );
  };
  disableDca = async (
    fee: number | StdFee | "auto" = "auto",
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        disable_dca: {},
      },
      fee,
      memo,
      _funds
    );
  };
  claimAssets = async (
    fee: number | StdFee | "auto" = "auto",
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        claim_assets: {},
      },
      fee,
      memo,
      _funds
    );
  };
  claimAndSwap = async (
    {
      assets,
      feeAmount,
      prices,
      rewards,
      usdcYield,
    }: {
      assets: AssetItem[];
      feeAmount: Uint256;
      prices: string[][];
      rewards: Uint256;
      usdcYield: Uint256;
    },
    fee: number | StdFee | "auto" = "auto",
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        claim_and_swap: {
          assets,
          fee_amount: feeAmount,
          prices,
          rewards,
          usdc_yield: usdcYield,
        },
      },
      fee,
      memo,
      _funds
    );
  };
  registerAsset = async (
    {
      asset,
      price,
    }: {
      asset: CurrencyForTokenUnverified;
      price: Decimal;
    },
    fee: number | StdFee | "auto" = "auto",
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        register_asset: {
          asset,
          price,
        },
      },
      fee,
      memo,
      _funds
    );
  };
  updateUserState = async (
    {
      addresses,
    }: {
      addresses: string[];
    },
    fee: number | StdFee | "auto" = "auto",
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        update_user_state: {
          addresses,
        },
      },
      fee,
      memo,
      _funds
    );
  };
  enableCapture = async (
    fee: number | StdFee | "auto" = "auto",
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        enable_capture: {},
      },
      fee,
      memo,
      _funds
    );
  };
  disableCapture = async (
    fee: number | StdFee | "auto" = "auto",
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        disable_capture: {},
      },
      fee,
      memo,
      _funds
    );
  };
  acceptAdminRole = async (
    fee: number | StdFee | "auto" = "auto",
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        accept_admin_role: {},
      },
      fee,
      memo,
      _funds
    );
  };
  updateConfig = async (
    {
      admin,
      ausdc,
      controller,
      feeRate,
      totalUsdcLimit,
      usdc,
    }: {
      admin?: string;
      ausdc?: string;
      controller?: string;
      feeRate?: Decimal;
      totalUsdcLimit?: Uint256;
      usdc?: string;
    },
    fee: number | StdFee | "auto" = "auto",
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        update_config: {
          admin,
          ausdc,
          controller,
          fee_rate: feeRate,
          total_usdc_limit: totalUsdcLimit,
          usdc,
        },
      },
      fee,
      memo,
      _funds
    );
  };
  pause = async (
    fee: number | StdFee | "auto" = "auto",
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        pause: {},
      },
      fee,
      memo,
      _funds
    );
  };
  unpause = async (
    fee: number | StdFee | "auto" = "auto",
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        unpause: {},
      },
      fee,
      memo,
      _funds
    );
  };
  setYieldRate = async (
    {
      value,
    }: {
      value: Decimal;
    },
    fee: number | StdFee | "auto" = "auto",
    memo?: string,
    _funds?: Coin[]
  ): Promise<ExecuteResult> => {
    return await this.client.execute(
      this.sender,
      this.contractAddress,
      {
        set_yield_rate: {
          value,
        },
      },
      fee,
      memo,
      _funds
    );
  };
}
