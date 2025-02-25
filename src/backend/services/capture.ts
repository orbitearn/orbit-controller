import { l, Request } from "../../common/utils";
import { writeSnapshot } from "./utils";
import { BASE_URL } from "../envs";
import { ROUTE } from "../routes/api";
import { SNAPSHOT } from "../constants";

async function main() {
  const req = new Request({ baseURL: `${BASE_URL}/api` });

  try {
    const stakers = await req.get(ROUTE.GET_STAKERS);
    await writeSnapshot(SNAPSHOT.STAKERS, stakers);

    const lockers = await req.get(ROUTE.GET_LOCKERS);
    await writeSnapshot(SNAPSHOT.LOCKERS, lockers);
  } catch (error) {
    l("stakers, lockers aren't updated");
  }

  try {
    const stakingEssence = await req.get(ROUTE.GET_STAKING_ESSENCE);
    await writeSnapshot(SNAPSHOT.STAKING_ESSENCE, stakingEssence);

    const lockingEssence = await req.get(ROUTE.GET_LOCKING_ESSENCE);
    await writeSnapshot(SNAPSHOT.LOCKING_ESSENCE, lockingEssence);
  } catch (error) {
    l("staking, locking essence aren't updated");
  }

  try {
    const voters = await req.get(ROUTE.GET_VOTERS);
    await writeSnapshot(SNAPSHOT.VOTERS, voters);
  } catch (error) {
    l("voters aren't updated");
  }
}

main();
