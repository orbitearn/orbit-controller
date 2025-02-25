#!/bin/bash

# update snapshots
yarn run capture

# commit changes in dev branch
git add .
git commit -m "updated snapshots"
git push origin dev

# switch to main branch and merge
git checkout main
git pull origin main
git merge dev
git push origin main

# return to dev branch
git checkout dev
