/**
* This file was automatically generated by @cosmwasm/ts-codegen@1.9.0.
* DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
* and run the @cosmwasm/ts-codegen generate command to regenerate this file.
*/

export type Decimal = string;
export type Uint256 = string;
export interface InstantiateMsg {
  ausdc: string;
  controller?: string | null;
  fee_rate?: Decimal | null;
  total_usdc_limit?: Uint256 | null;
  usdc?: string | null;
}
export type ExecuteMsg = {
  receive: Cw20ReceiveMsg;
} | {
  deposit_usdc: {};
} | {
  withdraw_ausdc: {
    ausdc_amount?: Uint256 | null;
  };
} | {
  deposit_ausdc: {};
} | {
  withdraw_usdc: {
    ausdc_amount?: Uint256 | null;
  };
} | {
  enable_dca: {
    fraction: Decimal;
    swaps?: number | null;
    weights: WeightItem[];
  };
} | {
  disable_dca: {};
} | {
  claim_assets: {};
} | {
  claim_and_swap: {
    assets: AssetItem[];
    fee_amount: Uint256;
    prices: [string, Decimal][];
    rewards: Uint256;
    usdc_yield: Uint256;
  };
} | {
  register_asset: {
    asset: CurrencyForTokenUnverified;
    price: Decimal;
  };
} | {
  update_user_state: {
    addresses: string[];
  };
} | {
  enable_capture: {};
} | {
  disable_capture: {};
} | {
  accept_admin_role: {};
} | {
  update_config: {
    admin?: string | null;
    ausdc?: string | null;
    controller?: string | null;
    fee_rate?: Decimal | null;
    total_usdc_limit?: Uint256 | null;
    usdc?: string | null;
  };
} | {
  pause: {};
} | {
  unpause: {};
} | {
  set_yield_rate: {
    value: Decimal;
  };
};
export type Uint128 = string;
export type Binary = string;
export type TokenUnverified = {
  native: {
    denom: string;
  };
} | {
  cw20: {
    address: string;
  };
};
export interface Cw20ReceiveMsg {
  amount: Uint128;
  msg: Binary;
  sender: string;
}
export interface WeightItem {
  symbol: string;
  weight: Decimal;
}
export interface AssetItem {
  amount: Uint256;
  symbol: string;
}
export interface CurrencyForTokenUnverified {
  decimals: number;
  token: TokenUnverified;
}
export type QueryMsg = {
  config: {};
} | {
  state: {};
} | {
  distribution_state: {
    address?: string | null;
  };
} | {
  distribution_state_list: {
    addresses: string[];
  };
} | {
  asset: {
    symbol: string;
  };
} | {
  asset_list: {
    amount: number;
    start_from?: string | null;
  };
} | {
  ausdc_price: {};
} | {
  price_set: {
    amount: number;
    start_from?: number | null;
  };
} | {
  storages: {};
} | {
  user_storages: {
    address: string;
    dca: boolean;
  };
} | {
  app_info: {};
} | {
  db_assets: {
    address: string;
  };
} | {
  db_assets_list: {
    addresses: string[];
  };
} | {
  user_info: {
    address: string;
    ausdc_price_next?: Decimal | null;
  };
} | {
  user_info_list: {
    amount: number;
    ausdc_price_next?: Decimal | null;
    start_from?: string | null;
  };
} | {
  user_counter_list: {
    amount: number;
    start_from?: string | null;
  };
} | {
  balances: {
    address: string;
  };
} | {
  block_time: {};
} | {
  yield_rate: {
    distribution_period: number;
  };
} | {
  rewards: {};
};
export interface MigrateMsg {
  version: string;
}
export interface AppInfoResponse {
  ausdc: AusdcInfo;
  deposited_usdc: Uint256;
  usdc_gross: Uint256;
  usdc_net: Uint256;
  yield_accumulated: YieldInfo;
}
export interface AusdcInfo {
  balance: Uint256;
  minted: Uint256;
  unclaimed: Uint256;
}
export interface YieldInfo {
  assets: AssetItem[];
  total: Uint256;
  usdc: Uint256;
}
export type Token = {
  native: {
    denom: string;
  };
} | {
  cw20: {
    address: Addr;
  };
};
export type Addr = string;
export interface CurrencyForToken {
  decimals: number;
  token: Token;
}
export type ArrayOfCurrencyForToken = CurrencyForToken[];
export interface BalancesResponse {
  ausdc: Uint256;
  usdc: Uint256;
}
export type Uint64 = number;
export interface Config {
  admin: Addr;
  ausdc: string;
  controller: Addr;
  fee_rate: Decimal;
  total_usdc_limit: Uint256;
  usdc: string;
}
export type ArrayOfArrayOfAssetItem = AssetItem[][];
export type ArrayOfTupleOfAddrAndArrayOfArrayOfAssetItem = [Addr, AssetItem[][]][];
export interface DistributionState {
  ausdc_price: Decimal;
  counter: number;
  update_date: number;
}
export type ArrayOfTupleOfAddrAndDistributionState = [Addr, DistributionState][];
export type ArrayOfTupleOfuint32AndArrayOfTupleOfStringAndDecimal = [number, [string, Decimal][]][];
export interface StateResponse {
  capture_mode: boolean;
  is_paused: boolean;
}
export interface StoragesResponse {
  ausdc_minted: Uint256;
  ausdc_minted_pre: Uint256;
  usdc_pool_gross: Uint256;
  usdc_pool_net: Uint256;
  usdc_pool_net_pre: Uint256;
}
export type ArrayOfTupleOfAddrAndUint32 = [Addr, number][];
export interface UserInfoResponse {
  address: Addr;
  ausdc: AusdcInfo;
  dca: DcaResponse;
  deposited_usdc: Uint256;
  fee_next: Uint256;
  usdc: Uint256;
  user_yield: UserYield;
}
export interface DcaResponse {
  fraction: Decimal;
  initial_swaps: number;
  remaining_swaps: number;
  weights: WeightItem[];
}
export interface UserYield {
  accumulated_plus_pending: YieldInfo;
  last: YieldInfo;
  next: YieldInfo;
  pending: YieldInfo;
}
export type ArrayOfUserInfoResponse = UserInfoResponse[];
export interface UserStoragesResponse {
  ausdc_minted: Uint256;
  ausdc_minted_pre: Uint256;
  dca_pre?: DcaResponse | null;
}