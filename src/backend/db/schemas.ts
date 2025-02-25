import { Schema } from "mongoose";
import {
  getSchemaOptions,
  IEssence,
  IEssenceSchema,
  isStringNumber,
  IVoteResults,
  IVotersSchema,
} from "./types";

export const EssenceSchema = new Schema<IEssenceSchema>(
  {
    essence: {
      type: [[{ type: Schema.Types.Mixed }]],
      required: true,
      validate: {
        validator: function (v: any[]): v is IEssence {
          return v.every(
            (item) =>
              Array.isArray(item) &&
              item.length === 2 &&
              typeof item[0] === "string" &&
              typeof item[1] === "number"
          );
        },
        message: "Essence must be an array of [string, number] tuples",
      },
    },
  },
  getSchemaOptions("essence")
);

const RewardsItemSchema = new Schema(
  {
    amount: {
      type: String,
      required: true,
      validate: {
        validator: isStringNumber,
        message: "amount must be a string representation of a number",
      },
    },
    symbol: {
      type: String,
      required: true,
    },
  },
  {
    _id: false,
    timestamps: false,
  }
);

const RewardsInfoSchema = new Schema(
  {
    last_update_epoch: {
      type: Number,
      required: true,
    },
    value: {
      type: [RewardsItemSchema],
      required: true,
      default: [],
    },
  },
  {
    _id: false,
    timestamps: false,
  }
);

const EssenceInfoSchema = new Schema(
  {
    locking_amount: {
      type: String,
      required: true,
      validate: {
        validator: isStringNumber,
        message: "locking_amount must be a string representation of a number",
      },
    },
    staking_components: {
      type: [String],
      required: true,
      validate: {
        validator: (value: string[]) =>
          value.length === 2 && value.every(isStringNumber),
        message: "staking_components must be an array of two string numbers",
      },
    },
  },
  {
    _id: false,
    timestamps: false,
  }
);

const WeightAllocationItemSchema = new Schema(
  {
    lp_token: {
      type: String,
      required: true,
    },
    weight: {
      type: String,
      required: true,
      validate: {
        validator: isStringNumber,
        message: "weight must be a string representation of a decimal",
      },
    },
  },
  {
    _id: false,
    timestamps: false,
  }
);

const UserResponseSchema = new Schema(
  {
    essence_info: {
      type: EssenceInfoSchema,
      required: true,
    },
    essence_value: {
      type: String,
      required: true,
      validate: {
        validator: isStringNumber,
        message: "essence_value must be a string representation of a number",
      },
    },
    rewards: {
      type: RewardsInfoSchema,
      required: true,
    },
    user_type: {
      type: String,
      required: true,
      enum: ["elector", "delegator", "slacker"],
    },
    weights: {
      type: [WeightAllocationItemSchema],
      required: true,
      default: [],
    },
  },
  {
    _id: false,
    timestamps: false,
  }
);

const UserListResponseItemSchema = new Schema(
  {
    address: {
      type: String,
      required: true,
    },
    user_info: {
      type: [UserResponseSchema],
      required: true,
      default: [],
    },
  },
  {
    _id: false,
    timestamps: false,
  }
);

export const VotersSchema = new Schema<IVotersSchema>(
  {
    voters: {
      type: [UserListResponseItemSchema],
      required: true,
      default: [],
    },
    epoch_id: {
      type: Number,
      required: true,
      validate: {
        validator: (value: number) => value > 0 && Number.isInteger(value),
        message: "epoch_id must be a positive integer",
      },
      default: 1,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  getSchemaOptions("voters")
).index({ epoch_id: 1 }, { unique: true });

const PoolInfoItemSchema = new Schema(
  {
    lp_token: {
      type: String,
      required: true,
    },
    rewards: {
      type: [RewardsItemSchema],
      required: true,
      default: [],
    },
    weight: {
      type: String,
      required: true,
      validate: {
        validator: isStringNumber,
        message: "weight must be a string representation of a decimal",
      },
    },
  },
  { _id: false, timestamps: false }
);

export const VoteResultsSchema = new Schema<IVoteResults>(
  {
    dao_delegators_rewards: {
      type: [RewardsItemSchema],
      required: true,
      default: [],
    },
    dao_essence: {
      type: String,
      required: true,
      validate: {
        validator: isStringNumber,
        message: "dao_essence must be a string representation of a number",
      },
    },
    dao_treasury_rewards: {
      type: [RewardsItemSchema],
      required: true,
      default: [],
    },
    dao_weights: {
      type: [WeightAllocationItemSchema],
      required: true,
      default: [],
    },
    elector_essence: {
      type: String,
      required: true,
      validate: {
        validator: isStringNumber,
        message: "elector_essence must be a string representation of a number",
      },
    },
    elector_weights: {
      type: [WeightAllocationItemSchema],
      required: true,
      default: [],
    },
    end_date: {
      type: Number,
      required: true,
      validate: {
        validator: (value: number) => value > 0,
        message: "end_date must be a positive number",
      },
    },
    epoch_id: {
      type: Number,
      required: true,
      validate: {
        validator: (value: number) => value > 0 && Number.isInteger(value),
        message: "epoch_id must be a positive integer",
      },
    },
    pool_info_list: {
      type: [PoolInfoItemSchema],
      required: true,
      default: [],
    },
    slacker_essence: {
      type: String,
      required: true,
      validate: {
        validator: isStringNumber,
        message: "slacker_essence must be a string representation of a number",
      },
    },
  },
  getSchemaOptions("vote_results")
).index({ epoch_id: 1 }, { unique: true });
