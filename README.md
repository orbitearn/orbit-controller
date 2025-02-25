### Project Description

***equinox-voter-controller*** is a script running Express.js server to send `PushByAdmin` msg to voter contract every minute, rebalance delegation DAO weights sending `PlaceVoteAsDao` msg to voter contract every hour (if the condition is met), provide REST API for data from Eclipse Fi core contracts and store historical data in MongoDB


### Settings (Ubuntu 22.04)

1) Connect to server over SSH
```
ssh root@<server_ip>
```

2) Install required system updates and components
```
sudo apt update && sudo apt -y upgrade
sudo apt-get install -y curl
sudo apt-get install git
```

3) Install and check Node.js 20, yarn
```
curl -fsSL https://deb.nodesource.com/setup_20.x -o nodesource_setup.sh
sudo -E bash nodesource_setup.sh
sudo apt-get install -y nodejs
node -v

npm install --global yarn
yarn -v
```

4) Clone the project repositiry and install dependencies

```
git clone https://github.com/EclipsePad/equinox-voter-controller.git
cd equinox-voter-controller && yarn
```

5) Create env file and specify seed phrase for account sending messages to voter contract

```
touch config.env && chmod 600 ./config.env
nano ./config.env
```

Enter actual values (replace placeholders <_>)

```
PORT=<port>
SEED=<your_seed_phrase>
BASE_URL=http://<server_ip>:<port>
MONGODB=<MongoDB_URI>
```

Save the file (Ctrl+X, then Y, then Enter)

6) Replenish the account balance with several amount of NTRN

7) Specify the account address in address config of the voter contract

```
{
  "update_address_config": {
    "controller": "<address>"
  }
}
```

8) Enable restarting server on schedule and running script on system start

Create a systemd service file for the application
```
nano /etc/systemd/system/voter.service
```

Add this content
```
[Unit]
Description=Equinox Voter Controller
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/equinox-voter-controller
ExecStart=/root/equinox-voter-controller/run.sh
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start the service
```
sudo systemctl daemon-reload
sudo systemctl enable voter.service
sudo systemctl start voter.service
```

Open the crontab for root
```
sudo crontab -e
```

Add this line to restart the service every day at 8 pm UTC
```
0 20 * * * /sbin/reboot
```

Verify service status
```
sudo systemctl status voter.service
```

9) Run the service
```
sudo systemctl daemon-reload && sudo systemctl restart voter.service
```

10) Note: to find and kill uncompleted process use
```
sudo systemctl stop voter.service && sudo systemctl disable voter.service && sudo systemctl daemon-reload && sudo systemctl reset-failed
```
Optionally
```
sudo lsof -i :<port>
sudo kill -9 <PID>
```

### Updating the Codebase

To update the codebase:

1) Update snapshots, commit and push changes via `./capture.sh` locally 
2) Stop the service
```
sudo systemctl stop voter.service && sudo systemctl disable voter.service && sudo systemctl daemon-reload && sudo systemctl reset-failed
```
3) Fetch updates
```
cd equinox-voter-controller && git fetch origin && git reset --hard origin/main && yarn
```
4) Restart the service
```
sudo systemctl daemon-reload && sudo systemctl enable voter.service && sudo systemctl restart voter.service
```


## REST API

Base URL is `http://<server_ip>:<port>/api`

GET requests:

`/get-file-dates` - returns last update date for all snapshot files

`/get-stakers` - returns actual (captured in [SNAPSHOT_PERIOD](#snapshot-period)* ago) staker address and info list [[Addr, StakerInfo][]](https://github.com/EclipsePad/equinox-voter-controller/blob/main/src/common/codegen/Staking.types.ts#L266)

`/get-lockers` - returns actual (captured in [SNAPSHOT_PERIOD](#snapshot-period)* ago) locker address and info list [[Addr, LockerInfo[]][]](https://github.com/EclipsePad/equinox-voter-controller/blob/main/src/common/codegen/Staking.types.ts#L232)

`/get-distributed-rewards` - returns actual (captured in [SNAPSHOT_PERIOD](#snapshot-period)* ago) info about distributed and recommended to replenish ECLIP rewards for staking contract [DistributedRewards](https://github.com/EclipsePad/equinox-voter-controller/blob/main/src/common/interfaces/index.ts#L5)

`/get-staking-essence` - returns actual (captured in [SNAPSHOT_PERIOD](#snapshot-period)* ago) staking essence list [QueryEssenceListResponseItem[]](https://github.com/EclipsePad/equinox-voter-controller/blob/main/src/common/codegen/Staking.types.ts#L237)

`/get-locking-essence` - returns actual (captured in [SNAPSHOT_PERIOD](#snapshot-period)* ago) locking essence list [QueryEssenceListResponseItem[]](https://github.com/EclipsePad/equinox-voter-controller/blob/main/src/common/codegen/Staking.types.ts#L237)

`/get-essence` - returns actual (captured in [SNAPSHOT_PERIOD](#snapshot-period)* ago) list of user address and staking plus locking essence value `[string, number][]`

`/get-voters` - returns previous epoch [UserListResponseItem[]](https://github.com/EclipsePad/eclipse-contracts-core/blob/main/scripts/src/interfaces/Voter.types.ts#L277)


<a id="snapshot-period"></a> *[SNAPSHOT_PERIOD](https://github.com/EclipsePad/equinox-voter-controller/blob/main/src/backend/constants.ts#L10)


## Historical Data

The script creates `equinox_voter_controller` database in MongoDB with following collections:

`essence` - uses `/get-essence` request data and updates it once per day at [DB_ESSENCE_SNAPSHOT_HOUR](https://github.com/EclipsePad/equinox-voter-controller/blob/main/src/backend/constants.ts#L11)

`vote_results` - stores previos epoch vote results as [VoteResults](https://github.com/EclipsePad/eclipse-contracts-core/blob/main/scripts/src/interfaces/Voter.types.ts#L295) once per epoch

`voters` - uses `/get-voters` request data and updates it once per epoch
