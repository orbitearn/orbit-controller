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
git clone https://github.com/EclipsePad/orbit-controller.git
cd orbit-controller && yarn
```

5) Create env file and specify seed phrase for account sending messages to orbit contract

```
touch config.env && chmod 600 ./config.env
nano ./config.env
```

Enter actual values (replace placeholders <_>)

```
PORT=<port>
SEED=<your_seed_phrase>
USER_SEED=<your_seed_phrase>
BASE_URL=http://<server_ip>:<port>
MONGODB=<MongoDB_URI>
ORBIT_CONTROLLER=<orbit_controller_db_name>
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

`/average-entry-price` - returns captured in [DISTRIBUTION_PERIOD](#distribution-period)* ago list of user's asset and it's average price `[string, number][]`. Request parameters: `address` (required, string) - user's wallet, `from` (required, number) - start timestamp of the calculation period, `to` (required, number) - end timestamp of the calculation period

`/profit` - returns captured in [DISTRIBUTION_PERIOD](#distribution-period)* ago list of user's asset and profit based it's current price `[string, number][]`. Request parameters: `address` (required, string) - user's wallet, `from` (required, number) - start timestamp of the calculation period, `to` (required, number) - end timestamp of the calculation period

`/first-data` - returns first user's data DB record. Request parameters: `address` (required, string) - user's wallet

POST requests:

`/update-user-assets` - writes to DB users assets bought in streaming (calculated dynamically). If there is no assets to add it will handle corresponding error preserving successful response. Request parameters: `address` (required, string) - user's wallet

<a id="distribution-period"></a> *[DISTRIBUTION_PERIOD](https://github.com/EclipsePad/orbit-controller/blob/main/src/backend/constants.ts#L10)


## Historical Data

The script creates `orbit_controller` database in MongoDB with following collections:

`app_data` - stores all asset prices (including aUSDC) captured on each distribution with timestamp and app distribution counter

`user_data` - stores user asset amounts bought on each distribution with timestamp
