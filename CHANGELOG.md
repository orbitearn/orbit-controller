
## v0.7.0

#### Pausing replaced with enabling capture mode

Previos workflow: Pause -> query and process all users data -> CalimAndSwap (with internal unpausing). Pausing blocks the contract to prevent any state changes affecting distribution results
New workflow: EnableCapture -> query and process all users data -> CalimAndSwap (with internal disabling capture mode). Capture mode allows to store previous state (the last one before capture mode) to use it for yield calculations and not to block user actions same time

#### Supported different decimals

Previously only 6 decimals was used. Now it's possible to use assets with decimals up to 18 (higher one isn't tested). Contract stores amounts as atomics (regular amounts multiplied by decimals power of 10). Supporting 18 decimals required moving from Uint128 to Uint256 (and Decimal256 internally) type to avoid overflow in calculations. BE code uses hybrid big number decimal type for convenience relying on mathjs lib

Important notes:
- technically there is no way to handle more than (2**128 - 1) tokens amount even with powerfull BE types
- DB contains token amounts in human readable form (decimals are applied)

#### Improved rounding for user_info response fields

Standard CosmWasm lib supports only floor and ceil but regular rounding to nearest integer was implemented to get rid off decreasing USDC amounts on each distribution and get more intuitive amount values in general

#### Added separate deposited_usdc storages to not depend on aUSDC amount and price rounding

All contract calculations are aUSDC based and as long we have price/amount rounding error it affects on everything. Especially it hits hard on deposited usdc amount where a user can track this issue easily. That why separate storage were added to make this values are immutable unless deposit/withdraw will be applied

#### Added USDC yield in user DB assets

Previously DB was storing only assets in user data which was inherited from yield calculation logic. As long as UI requires data not only on bought assets but distributed USDC yield as well these values were added

#### Added updating user state by controller

The more difference between app counter and user counter, the harder user info calculations. Eventually this query can fail due to gas limit error. Normally user counter is updated on any user action but if user dosn't interact with the app long time it becomes a problem. To solve it was added controller permissioned function to update a state for list of users. The controller periodically queries users info and if he found problematic users (its amount must exceed a threshold to reduce gas costs for the app) he will update their counters which is completely safe. The controller updates their DB data as well to avoid writing large amount of data at once in the future

#### Updated update_user_assets request parameters

As long the controller can update multiple users state data same requirement was provided to storing DB data request. Now update_user_assets POST request uses list of addresses instead of single address

#### Added synchronizing distribution dates with DB data

To allow easier distribution date prediction on FE the controller synchronization was switched from contract app update state date to DB last app data item date. It provides precise bounding to specified time. I.e. it's possible to set initial distribution date 00:30 with period 8h and get 00:30, 08:30, 16:30, 00:30, etc. distribution dates without floating by seconds
