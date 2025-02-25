import { EssenceModel, VoteResultsModel, VotersModel } from "./models";
import { IEssence, IVoteResults, IVoters } from "./types";

export async function addEssence(essence: IEssence) {
  const model = new EssenceModel({
    essence,
  });

  return await model.save();
}

export async function getEssence() {
  return await EssenceModel.find();
}

export async function getEssenceByLatestDate() {
  return await EssenceModel.findOne().sort({ createdAt: -1 });
}

export async function getEssenceInDateRange(from: Date, to: Date = new Date()) {
  return await EssenceModel.find({
    createdAt: {
      $gte: from,
      $lte: to,
    },
  });
}

export async function addVoters(
  voters: IVoters,
  epochId: number,
  createdAt: Date = new Date()
) {
  try {
    const model = new VotersModel({
      voters,
      epoch_id: epochId,
      createdAt,
    });

    return await model.save();
  } catch (error) {
    if ((error as any).code === 11_000) {
      throw new Error(`Data for epoch ${epochId} already exists`);
    }
    throw error;
  }
}

export async function getVoters() {
  return await VotersModel.find();
}

export async function getVotersByLatestDate() {
  return await VotersModel.findOne().sort({ createdAt: -1 });
}

export async function getVotersInDateRange(from: Date, to: Date = new Date()) {
  return await VotersModel.find({
    createdAt: {
      $gte: from,
      $lte: to,
    },
  });
}

export async function getVotersByEpoch(epochId: number) {
  return await VotersModel.findOne({ epoch_id: epochId });
}

export async function getVotersByLatestEpoch() {
  return await VotersModel.findOne().sort({ epoch_id: -1 }).limit(1);
}

export async function getVotersInEpochRange(from: number, to: number) {
  return await VotersModel.find({
    epochId: {
      $gte: from,
      $lte: to,
    },
  }).sort({ epoch_id: 1 });
}

export async function addVoteResults(voteResults: IVoteResults) {
  try {
    const model = new VoteResultsModel(voteResults);
    return await model.save();
  } catch (error) {
    if ((error as any).code === 11000) {
      throw new Error(
        `Vote results for epoch ${voteResults.epoch_id} already exist`
      );
    }
    throw error;
  }
}

export async function getVoteResults() {
  return await VoteResultsModel.find();
}

export async function getVoteResultsByLatestDate() {
  return await VoteResultsModel.findOne().sort({ createdAt: -1 });
}

export async function getVoteResultsInDateRange(
  from: Date,
  to: Date = new Date()
) {
  return await VoteResultsModel.find({
    createdAt: {
      $gte: from,
      $lte: to,
    },
  });
}

export async function getVoteResultsByEpoch(epochId: number) {
  return await VoteResultsModel.findOne({ epoch_id: epochId });
}

export async function getVoteResultsByLatestEpoch() {
  return await VoteResultsModel.findOne().sort({ epoch_id: -1 }).limit(1);
}

export async function getVoteResultsInEpochRange(from: number, to: number) {
  return await VoteResultsModel.find({
    epochId: {
      $gte: from,
      $lte: to,
    },
  }).sort({ epoch_id: 1 });
}
