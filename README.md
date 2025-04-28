### Project Description

***orbit-controller*** (distribution controller) is a script running Express.js server to update contract state and DB data periodically. It pauses the contract, queries estimated aUSDC price from strategy controller, collects user data, calculates expected total yield, USDC yield and assets to buy. After that it sends the tx to claim yield, swap assets and update aUSDC price in the contract (finally the contract will be unpaused automatically). Also it stores historical data in MongoDB and provides REST API for all time data 


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
git clone https://github.com/orbitearn/orbit-controller.git
cd orbit-controller && yarn
```

5) Create env file and specify seed phrase for account sending messages to orbit contract

```
touch config.env && chmod 600 ./config.env
nano ./config.env
```

Enter actual values (replace placeholders <_>)

```
SEED=<your_seed_phrase>
USER_SEED=<your_seed_phrase>

MONGODB=<MongoDB_URI>
ORBIT_CONTROLLER=<orbit_controller_db_name>

PORT=<port>

LOCAL_IP_LIST=["http://127.0.0.1","http://localhost"]
LOCAL_PORT_LIST=[3000,4000,5173]

BE_DEV_URL=http://localhost:4000
BE_TUNNEL_URL=<tunnel_server_url>
BE_PROD_URL=http://<production_server_ip>:<port>

FE_DEV_URL=<development_server_url>
FE_STAGE_URL=<staging_server_url>
FE_PROD_URL=<production_server_url>

IS_PROD=true
```

Save the file (Ctrl+X, then Y, then Enter)

6) Replenish the account balance with several amount of NTRN

7) Specify the account address in address config of the orbit bank contract

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
nano /etc/systemd/system/orbit.service
```

Add this content
```
[Unit]
Description=Orbit Controller
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/orbit-controller
ExecStart=/root/orbit-controller/run.sh
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start the service
```
sudo systemctl daemon-reload
sudo systemctl enable orbit.service
sudo systemctl start orbit.service
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
sudo systemctl status orbit.service
```

9) Run the service
```
sudo systemctl daemon-reload && sudo systemctl restart orbit.service
```

10) Note: to find and kill uncompleted process use
```
sudo systemctl stop orbit.service && sudo systemctl disable orbit.service && sudo systemctl daemon-reload && sudo systemctl reset-failed
```
Optionally
```
sudo lsof -i :<port>
sudo kill -9 <PID>
```

### Updating the Codebase

To update the codebase:

1) Stop the service
```
sudo systemctl stop orbit.service && sudo systemctl disable orbit.service && sudo systemctl daemon-reload && sudo systemctl reset-failed
```
2) Fetch updates
```
cd orbit-controller && git fetch origin && git reset --hard origin/main && yarn
```
3) Restart the service
```
sudo systemctl daemon-reload && sudo systemctl enable orbit.service && sudo systemctl restart orbit.service
```


## REST API

Base URL is `http://<server_ip>:<port>/api`

GET requests:

`/average-entry-price` - returns captured in [DISTRIBUTION_PERIOD](#distribution-period)* ago list of user's asset and it's average price `[string, number][]`. Request parameters: `address` (required, string) - user's wallet, `from` (required, number) - start timestamp of the calculation period, `to` (required, number) - end timestamp of the calculation period, `excludeAsset` (required, string) - stablecoin used to buy assets

`/profit` - returns captured in [DISTRIBUTION_PERIOD](#distribution-period)* ago list of user's asset and profit based it's current price `[string, number][]`. Request parameters: `address` (required, string) - user's wallet, `from` (required, number) - start timestamp of the calculation period, `to` (required, number) - end timestamp of the calculation period, `excludeAsset` (required, string) - stablecoin used to buy assets

`/first-data` - returns first user's data DB record. Request parameters: `address` (required, string) - user's wallet

`/apr` - returns list of APR (%) and timestamp period end as `[number, number][]`. Request parameters: `from` (required, number) - first timestamp of the list, `to` (required, number) - last timestamp of the list, `period` (required, string: "day" | "week" | "month" | "year") - timestamp period of the list

`/app-data-in-timestamp-range` - returns list of streaming asset prices and timestamps as [IAppDataDocument[]](https://github.com/orbitearn/orbit-controller/blob/main/src/backend/db/types.ts#L20-L25). Request parameters: `from` (required, number) - first timestamp of the list, `to` (required, number) - last timestamp of the list

`/user-data-in-timestamp-range` - returns list of user's bought in streaming assets and timestamp period end as [UserAsset[]](https://github.com/orbitearn/orbit-controller/blob/main/src/backend/helpers/index.ts#L227). Request parameters: `address` (required, string) - user's wallet, `from` (required, number) - first timestamp of the list, `to` (required, number) - last timestamp of the list, `period` (required, string: "none" | "day" | "week" | "month" | "year") - timestamp period of the list

POST requests:

`/update-user-assets` - writes to DB users assets bought in streaming (calculated dynamically). If there is no assets to add it will handle corresponding error preserving successful response. Request parameters: `addressList` (required, string[]) - list of users

<a id="distribution-period"></a> *[DISTRIBUTION_PERIOD](https://github.com/orbitearn/orbit-controller/blob/main/src/backend/constants.ts#L21)


## Historical Data

The script creates `orbit_controller` database in MongoDB with following collections:

`app_data` - stores all asset prices (including aUSDC) captured on each distribution with timestamp and app distribution counter

`user_data` - stores user asset amounts bought on each distribution with timestamp
