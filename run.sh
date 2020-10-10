#!/bin/bash

ID="~/id.sh"

source $ID || exit 1

cp -f listing.json listing.json.bak
cp -f discord.log discord.log.bak

## start
while true ; do
    node index.js |& tee -a discord.log
    sleep 10
done