# README

This is the public repository for a Discord bot (named `ubot`) used for account
verification against University of Bordeaux IDNum.

## Create your own bot

* First, create a Discord App: https://discord.com/developers/applications/
* Then, add a bot user, with name: *ubot* and get your bot `<TOKEN>` and `CLIENTID`.
* Also, note your Dicord account ID : `<MYID>`.
* Then, set all permissions for your bot with: https://discordapi.com/permissions.html
* And click to the link provided in order to add it to your server... Accept it!
* This link is just like this : https://discordapp.com/oauth2/authorize?client_id=CLIENTID&scope=bot
* Or like that with permissions : https://discord.com/oauth2/authorize?client_id=CLIENTID&scope=bot&permissions=2147483639 (all permissions, except admin = 2147483639)

## Program your first bot

En NodeJS :

```bash
sudo apt install npm
npm init
npm i --save discord.js
export DICORD_TOKEN="<TOKEN>"
```

Then add a file *index.js* like that...

```js
const Discord = require('discord.js');
const bot = new Discord.Client();
const token = process.env.DISCORD_TOKEN;
bot.login(token);
```

Then run it like this:

```bash
node index.js
```

Or like that through a *screen* session like that:

```bash
screen -S discord -d -m node index.js
```

To launch it on a remote server like *tesla* over SSH, I recommand a screen session like that:

```bash
export DISCORD_TOKEN="<TOKEN>"
export DISCORD_MYID="<MYID>"
screen -S discord -d -m  node index.js
...
# re-attach..
screen -r
# and detach (ctrl-a d)
```

## Server Settings

Check your server has the following settings...

* a channel: #welcome
* a role `@student` with permission `xxx`
* a role `@teacher` with permission `yyy`
* a role `@everyone` (or `@unverified`) with the lowest permission `zzz` (only
  read/write messages in `#welcome`)

*Warning*: check the *position* of each role : @everyone < @unverified < @student < @teacher < @ubot

Basically, the bot should configure this role and permissions automatically!

The account verification is just based on a HTTPS / HTACCESS account registration to map *IDNum* (UBX accout) with Dicord account (or ID).

## TODO

* add extra-roles in listing.json (@l2info, @l3info, @admin, ...)
* add command `!kickunverified`

## Documentation

* https://discord.js.org/#/docs/main/stable/class/Client (Client API)
* https://www.grafikart.fr/tutoriels/bot-discordjs-892


