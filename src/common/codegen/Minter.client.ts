/**
* This file was automatically generated by @cosmwasm/ts-codegen@1.9.0.
* DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
* and run the @cosmwasm/ts-codegen generate command to regenerate this file.
*/

import { CosmWasmClient, SigningCosmWasmClient, ExecuteResult } from "@cosmjs/cosmwasm-stargate";
import { Coin, StdFee } from "@cosmjs/amino";
import { InstantiateMsg, ExecuteMsg, Logo, EmbeddedLogo, Binary, Uint128, InstantiateMarketingInfo, Metadata, DenomUnit, Cw20ReceiveMsg, QueryMsg, MigrateMsg, ArrayOfTupleOfUint128AndString, Addr, Config, Token, CurrencyInfo, CurrencyForToken, ArrayOfCurrencyInfo, FaucetConfig, Uint64, ArrayOfTupleOfAddrAndUint16 } from "./Minter.types";
export interface MinterReadOnlyInterface {
  contractAddress: string;
  config: () => Promise<Config>;
  faucetConfig: ({
    denomOrAddress
  }: {
    denomOrAddress: string;
  }) => Promise<FaucetConfig>;
  currencyInfo: ({
    denomOrAddress
  }: {
    denomOrAddress: string;
  }) => Promise<CurrencyInfo>;
  currencyInfoList: ({
    amount,
    startAfter
  }: {
    amount: number;
    startAfter?: string;
  }) => Promise<ArrayOfCurrencyInfo>;
  currencyInfoListByOwner: ({
    amount,
    owner,
    startAfter
  }: {
    amount: number;
    owner: string;
    startAfter?: string;
  }) => Promise<ArrayOfCurrencyInfo>;
  tokenCountList: ({
    amount,
    startAfter
  }: {
    amount: number;
    startAfter?: string;
  }) => Promise<ArrayOfTupleOfAddrAndUint16>;
  lastClaimDate: ({
    denomOrAddress,
    user
  }: {
    denomOrAddress: string;
    user: string;
  }) => Promise<Uint64>;
  balances: ({
    account
  }: {
    account: string;
  }) => Promise<ArrayOfTupleOfUint128AndString>;
}
export class MinterQueryClient implements MinterReadOnlyInterface {
  client: CosmWasmClient;
  contractAddress: string;
  constructor(client: CosmWasmClient, contractAddress: string) {
    this.client = client;
    this.contractAddress = contractAddress;
    this.config = this.config.bind(this);
    this.faucetConfig = this.faucetConfig.bind(this);
    this.currencyInfo = this.currencyInfo.bind(this);
    this.currencyInfoList = this.currencyInfoList.bind(this);
    this.currencyInfoListByOwner = this.currencyInfoListByOwner.bind(this);
    this.tokenCountList = this.tokenCountList.bind(this);
    this.lastClaimDate = this.lastClaimDate.bind(this);
    this.balances = this.balances.bind(this);
  }
  config = async (): Promise<Config> => {
    return this.client.queryContractSmart(this.contractAddress, {
      config: {}
    });
  };
  faucetConfig = async ({
    denomOrAddress
  }: {
    denomOrAddress: string;
  }): Promise<FaucetConfig> => {
    return this.client.queryContractSmart(this.contractAddress, {
      faucet_config: {
        denom_or_address: denomOrAddress
      }
    });
  };
  currencyInfo = async ({
    denomOrAddress
  }: {
    denomOrAddress: string;
  }): Promise<CurrencyInfo> => {
    return this.client.queryContractSmart(this.contractAddress, {
      currency_info: {
        denom_or_address: denomOrAddress
      }
    });
  };
  currencyInfoList = async ({
    amount,
    startAfter
  }: {
    amount: number;
    startAfter?: string;
  }): Promise<ArrayOfCurrencyInfo> => {
    return this.client.queryContractSmart(this.contractAddress, {
      currency_info_list: {
        amount,
        start_after: startAfter
      }
    });
  };
  currencyInfoListByOwner = async ({
    amount,
    owner,
    startAfter
  }: {
    amount: number;
    owner: string;
    startAfter?: string;
  }): Promise<ArrayOfCurrencyInfo> => {
    return this.client.queryContractSmart(this.contractAddress, {
      currency_info_list_by_owner: {
        amount,
        owner,
        start_after: startAfter
      }
    });
  };
  tokenCountList = async ({
    amount,
    startAfter
  }: {
    amount: number;
    startAfter?: string;
  }): Promise<ArrayOfTupleOfAddrAndUint16> => {
    return this.client.queryContractSmart(this.contractAddress, {
      token_count_list: {
        amount,
        start_after: startAfter
      }
    });
  };
  lastClaimDate = async ({
    denomOrAddress,
    user
  }: {
    denomOrAddress: string;
    user: string;
  }): Promise<Uint64> => {
    return this.client.queryContractSmart(this.contractAddress, {
      last_claim_date: {
        denom_or_address: denomOrAddress,
        user
      }
    });
  };
  balances = async ({
    account
  }: {
    account: string;
  }): Promise<ArrayOfTupleOfUint128AndString> => {
    return this.client.queryContractSmart(this.contractAddress, {
      balances: {
        account
      }
    });
  };
}
export interface MinterInterface extends MinterReadOnlyInterface {
  contractAddress: string;
  sender: string;
  acceptAdminRole: (fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
  acceptTokenOwnerRole: (fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
  pause: (fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
  unpause: (fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
  updateConfig: ({
    admin,
    cw20CodeId,
    maxTokensPerOwner,
    permissionlessTokenCreation,
    permissionlessTokenRegistration,
    whitelist
  }: {
    admin?: string;
    cw20CodeId?: number;
    maxTokensPerOwner?: number;
    permissionlessTokenCreation?: boolean;
    permissionlessTokenRegistration?: boolean;
    whitelist?: string[];
  }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
  createNative: ({
    decimals,
    owner,
    permissionlessBurning,
    subdenom,
    whitelist
  }: {
    decimals?: number;
    owner?: string;
    permissionlessBurning?: boolean;
    subdenom: string;
    whitelist?: string[];
  }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
  createCw20: ({
    cw20CodeId,
    decimals,
    marketing,
    name,
    owner,
    permissionlessBurning,
    symbol,
    whitelist
  }: {
    cw20CodeId?: number;
    decimals?: number;
    marketing?: InstantiateMarketingInfo;
    name: string;
    owner?: string;
    permissionlessBurning?: boolean;
    symbol: string;
    whitelist?: string[];
  }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
  registerNative: ({
    decimals,
    denom,
    owner,
    permissionlessBurning,
    whitelist
  }: {
    decimals?: number;
    denom: string;
    owner?: string;
    permissionlessBurning?: boolean;
    whitelist?: string[];
  }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
  registerCw20: ({
    address,
    cw20CodeId,
    decimals,
    owner,
    permissionlessBurning,
    whitelist
  }: {
    address: string;
    cw20CodeId?: number;
    decimals?: number;
    owner?: string;
    permissionlessBurning?: boolean;
    whitelist?: string[];
  }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
  updateCurrencyInfo: ({
    denomOrAddress,
    owner,
    permissionlessBurning,
    whitelist
  }: {
    denomOrAddress: string;
    owner?: string;
    permissionlessBurning?: boolean;
    whitelist?: string[];
  }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
  updateMetadataNative: ({
    denom,
    metadata
  }: {
    denom: string;
    metadata: Metadata;
  }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
  updateMetadataCw20: ({
    address,
    description,
    logo,
    project
  }: {
    address: string;
    description?: string;
    logo?: Logo;
    project?: string;
  }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
  excludeNative: ({
    denom
  }: {
    denom: string;
  }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
  excludeCw20: ({
    address
  }: {
    address: string;
  }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
  updateFaucetConfig: ({
    claimCooldown,
    claimableAmount,
    denomOrAddress
  }: {
    claimCooldown?: number;
    claimableAmount?: Uint128;
    denomOrAddress: string;
  }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
  mint: ({
    amount,
    denomOrAddress,
    recipient
  }: {
    amount: Uint128;
    denomOrAddress: string;
    recipient?: string;
  }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
  mintMultiple: ({
    accountAndAmountList,
    denomOrAddress
  }: {
    accountAndAmountList: string[][];
    denomOrAddress: string;
  }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
  burn: (fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
  claim: ({
    denomOrAddress
  }: {
    denomOrAddress: string;
  }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
  receive: ({
    amount,
    msg,
    sender
  }: {
    amount: Uint128;
    msg: Binary;
    sender: string;
  }, fee?: number | StdFee | "auto", memo?: string, _funds?: Coin[]) => Promise<ExecuteResult>;
}
export class MinterClient extends MinterQueryClient implements MinterInterface {
  client: SigningCosmWasmClient;
  sender: string;
  contractAddress: string;
  constructor(client: SigningCosmWasmClient, sender: string, contractAddress: string) {
    super(client, contractAddress);
    this.client = client;
    this.sender = sender;
    this.contractAddress = contractAddress;
    this.acceptAdminRole = this.acceptAdminRole.bind(this);
    this.acceptTokenOwnerRole = this.acceptTokenOwnerRole.bind(this);
    this.pause = this.pause.bind(this);
    this.unpause = this.unpause.bind(this);
    this.updateConfig = this.updateConfig.bind(this);
    this.createNative = this.createNative.bind(this);
    this.createCw20 = this.createCw20.bind(this);
    this.registerNative = this.registerNative.bind(this);
    this.registerCw20 = this.registerCw20.bind(this);
    this.updateCurrencyInfo = this.updateCurrencyInfo.bind(this);
    this.updateMetadataNative = this.updateMetadataNative.bind(this);
    this.updateMetadataCw20 = this.updateMetadataCw20.bind(this);
    this.excludeNative = this.excludeNative.bind(this);
    this.excludeCw20 = this.excludeCw20.bind(this);
    this.updateFaucetConfig = this.updateFaucetConfig.bind(this);
    this.mint = this.mint.bind(this);
    this.mintMultiple = this.mintMultiple.bind(this);
    this.burn = this.burn.bind(this);
    this.claim = this.claim.bind(this);
    this.receive = this.receive.bind(this);
  }
  acceptAdminRole = async (fee: number | StdFee | "auto" = "auto", memo?: string, _funds?: Coin[]): Promise<ExecuteResult> => {
    return await this.client.execute(this.sender, this.contractAddress, {
      accept_admin_role: {}
    }, fee, memo, _funds);
  };
  acceptTokenOwnerRole = async (fee: number | StdFee | "auto" = "auto", memo?: string, _funds?: Coin[]): Promise<ExecuteResult> => {
    return await this.client.execute(this.sender, this.contractAddress, {
      accept_token_owner_role: {}
    }, fee, memo, _funds);
  };
  pause = async (fee: number | StdFee | "auto" = "auto", memo?: string, _funds?: Coin[]): Promise<ExecuteResult> => {
    return await this.client.execute(this.sender, this.contractAddress, {
      pause: {}
    }, fee, memo, _funds);
  };
  unpause = async (fee: number | StdFee | "auto" = "auto", memo?: string, _funds?: Coin[]): Promise<ExecuteResult> => {
    return await this.client.execute(this.sender, this.contractAddress, {
      unpause: {}
    }, fee, memo, _funds);
  };
  updateConfig = async ({
    admin,
    cw20CodeId,
    maxTokensPerOwner,
    permissionlessTokenCreation,
    permissionlessTokenRegistration,
    whitelist
  }: {
    admin?: string;
    cw20CodeId?: number;
    maxTokensPerOwner?: number;
    permissionlessTokenCreation?: boolean;
    permissionlessTokenRegistration?: boolean;
    whitelist?: string[];
  }, fee: number | StdFee | "auto" = "auto", memo?: string, _funds?: Coin[]): Promise<ExecuteResult> => {
    return await this.client.execute(this.sender, this.contractAddress, {
      update_config: {
        admin,
        cw20_code_id: cw20CodeId,
        max_tokens_per_owner: maxTokensPerOwner,
        permissionless_token_creation: permissionlessTokenCreation,
        permissionless_token_registration: permissionlessTokenRegistration,
        whitelist
      }
    }, fee, memo, _funds);
  };
  createNative = async ({
    decimals,
    owner,
    permissionlessBurning,
    subdenom,
    whitelist
  }: {
    decimals?: number;
    owner?: string;
    permissionlessBurning?: boolean;
    subdenom: string;
    whitelist?: string[];
  }, fee: number | StdFee | "auto" = "auto", memo?: string, _funds?: Coin[]): Promise<ExecuteResult> => {
    return await this.client.execute(this.sender, this.contractAddress, {
      create_native: {
        decimals,
        owner,
        permissionless_burning: permissionlessBurning,
        subdenom,
        whitelist
      }
    }, fee, memo, _funds);
  };
  createCw20 = async ({
    cw20CodeId,
    decimals,
    marketing,
    name,
    owner,
    permissionlessBurning,
    symbol,
    whitelist
  }: {
    cw20CodeId?: number;
    decimals?: number;
    marketing?: InstantiateMarketingInfo;
    name: string;
    owner?: string;
    permissionlessBurning?: boolean;
    symbol: string;
    whitelist?: string[];
  }, fee: number | StdFee | "auto" = "auto", memo?: string, _funds?: Coin[]): Promise<ExecuteResult> => {
    return await this.client.execute(this.sender, this.contractAddress, {
      create_cw20: {
        cw20_code_id: cw20CodeId,
        decimals,
        marketing,
        name,
        owner,
        permissionless_burning: permissionlessBurning,
        symbol,
        whitelist
      }
    }, fee, memo, _funds);
  };
  registerNative = async ({
    decimals,
    denom,
    owner,
    permissionlessBurning,
    whitelist
  }: {
    decimals?: number;
    denom: string;
    owner?: string;
    permissionlessBurning?: boolean;
    whitelist?: string[];
  }, fee: number | StdFee | "auto" = "auto", memo?: string, _funds?: Coin[]): Promise<ExecuteResult> => {
    return await this.client.execute(this.sender, this.contractAddress, {
      register_native: {
        decimals,
        denom,
        owner,
        permissionless_burning: permissionlessBurning,
        whitelist
      }
    }, fee, memo, _funds);
  };
  registerCw20 = async ({
    address,
    cw20CodeId,
    decimals,
    owner,
    permissionlessBurning,
    whitelist
  }: {
    address: string;
    cw20CodeId?: number;
    decimals?: number;
    owner?: string;
    permissionlessBurning?: boolean;
    whitelist?: string[];
  }, fee: number | StdFee | "auto" = "auto", memo?: string, _funds?: Coin[]): Promise<ExecuteResult> => {
    return await this.client.execute(this.sender, this.contractAddress, {
      register_cw20: {
        address,
        cw20_code_id: cw20CodeId,
        decimals,
        owner,
        permissionless_burning: permissionlessBurning,
        whitelist
      }
    }, fee, memo, _funds);
  };
  updateCurrencyInfo = async ({
    denomOrAddress,
    owner,
    permissionlessBurning,
    whitelist
  }: {
    denomOrAddress: string;
    owner?: string;
    permissionlessBurning?: boolean;
    whitelist?: string[];
  }, fee: number | StdFee | "auto" = "auto", memo?: string, _funds?: Coin[]): Promise<ExecuteResult> => {
    return await this.client.execute(this.sender, this.contractAddress, {
      update_currency_info: {
        denom_or_address: denomOrAddress,
        owner,
        permissionless_burning: permissionlessBurning,
        whitelist
      }
    }, fee, memo, _funds);
  };
  updateMetadataNative = async ({
    denom,
    metadata
  }: {
    denom: string;
    metadata: Metadata;
  }, fee: number | StdFee | "auto" = "auto", memo?: string, _funds?: Coin[]): Promise<ExecuteResult> => {
    return await this.client.execute(this.sender, this.contractAddress, {
      update_metadata_native: {
        denom,
        metadata
      }
    }, fee, memo, _funds);
  };
  updateMetadataCw20 = async ({
    address,
    description,
    logo,
    project
  }: {
    address: string;
    description?: string;
    logo?: Logo;
    project?: string;
  }, fee: number | StdFee | "auto" = "auto", memo?: string, _funds?: Coin[]): Promise<ExecuteResult> => {
    return await this.client.execute(this.sender, this.contractAddress, {
      update_metadata_cw20: {
        address,
        description,
        logo,
        project
      }
    }, fee, memo, _funds);
  };
  excludeNative = async ({
    denom
  }: {
    denom: string;
  }, fee: number | StdFee | "auto" = "auto", memo?: string, _funds?: Coin[]): Promise<ExecuteResult> => {
    return await this.client.execute(this.sender, this.contractAddress, {
      exclude_native: {
        denom
      }
    }, fee, memo, _funds);
  };
  excludeCw20 = async ({
    address
  }: {
    address: string;
  }, fee: number | StdFee | "auto" = "auto", memo?: string, _funds?: Coin[]): Promise<ExecuteResult> => {
    return await this.client.execute(this.sender, this.contractAddress, {
      exclude_cw20: {
        address
      }
    }, fee, memo, _funds);
  };
  updateFaucetConfig = async ({
    claimCooldown,
    claimableAmount,
    denomOrAddress
  }: {
    claimCooldown?: number;
    claimableAmount?: Uint128;
    denomOrAddress: string;
  }, fee: number | StdFee | "auto" = "auto", memo?: string, _funds?: Coin[]): Promise<ExecuteResult> => {
    return await this.client.execute(this.sender, this.contractAddress, {
      update_faucet_config: {
        claim_cooldown: claimCooldown,
        claimable_amount: claimableAmount,
        denom_or_address: denomOrAddress
      }
    }, fee, memo, _funds);
  };
  mint = async ({
    amount,
    denomOrAddress,
    recipient
  }: {
    amount: Uint128;
    denomOrAddress: string;
    recipient?: string;
  }, fee: number | StdFee | "auto" = "auto", memo?: string, _funds?: Coin[]): Promise<ExecuteResult> => {
    return await this.client.execute(this.sender, this.contractAddress, {
      mint: {
        amount,
        denom_or_address: denomOrAddress,
        recipient
      }
    }, fee, memo, _funds);
  };
  mintMultiple = async ({
    accountAndAmountList,
    denomOrAddress
  }: {
    accountAndAmountList: string[][];
    denomOrAddress: string;
  }, fee: number | StdFee | "auto" = "auto", memo?: string, _funds?: Coin[]): Promise<ExecuteResult> => {
    return await this.client.execute(this.sender, this.contractAddress, {
      mint_multiple: {
        account_and_amount_list: accountAndAmountList,
        denom_or_address: denomOrAddress
      }
    }, fee, memo, _funds);
  };
  burn = async (fee: number | StdFee | "auto" = "auto", memo?: string, _funds?: Coin[]): Promise<ExecuteResult> => {
    return await this.client.execute(this.sender, this.contractAddress, {
      burn: {}
    }, fee, memo, _funds);
  };
  claim = async ({
    denomOrAddress
  }: {
    denomOrAddress: string;
  }, fee: number | StdFee | "auto" = "auto", memo?: string, _funds?: Coin[]): Promise<ExecuteResult> => {
    return await this.client.execute(this.sender, this.contractAddress, {
      claim: {
        denom_or_address: denomOrAddress
      }
    }, fee, memo, _funds);
  };
  receive = async ({
    amount,
    msg,
    sender
  }: {
    amount: Uint128;
    msg: Binary;
    sender: string;
  }, fee: number | StdFee | "auto" = "auto", memo?: string, _funds?: Coin[]): Promise<ExecuteResult> => {
    return await this.client.execute(this.sender, this.contractAddress, {
      receive: {
        amount,
        msg,
        sender
      }
    }, fee, memo, _funds);
  };
}