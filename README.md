# README

This is the public repository for a Discord bot (named `ubot`) used for account
verification against University of Bordeaux IDNum.

## Create your Discord server with your own bot

* First, create a Discord Server, named `<MYSERVER>` as for instance "Licence Info"
* Then, create a Discord App: https://discord.com/developers/applications/
* Add a bot user, with name: *ubot* and get your bot `<TOKEN>` and `<CLIENTID>`.
* Check the two options *Privileged Gateway Intents* in the Bot section of
  your App : *Presence Intent* & *Server Members Intent*.
* Also, note your Dicord account ID : `<MYID>`.
* Then, set all permissions for your bot with:
  https://discordapi.com/permissions.html. And click to the link provided in
  order to add it to your server... Accept it! This link is just like this :
  https://discordapp.com/oauth2/authorize?client_id=CLIENTID&scope=bot or like
  that with permissions :
  https://discord.com/oauth2/authorize?client_id=CLIENTID&scope=bot&permissions=2147483639
  (all permissions, except admin = 2147483639)

* In the Discord settings of your server, check the role position of your bot,
  that must be higher than other role...
* Run the bot server with `./run.sh` (or `./startbot.sh` for a persistent *screen* session)

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

In pratice, you must first create by yourself a channel: `#welcome`, to welcome
all incoming users that are not yet verified...

The following roles are automatically created/updated with the right permissions...

* a role `@student`
* a role `@teacher`
* a role `@unverified` with few permissions (only read/write messages in
  `#welcome`)
* a temporary role `@everyone` with same permissions as `@unverified`

Finally, you must check the *position* of each role : ```@everyone < @unverified
< @student < @teacher < @ubot < @admin``` and move them if needed.

The account verification is just based on a HTTPS / HTACCESS account
registration to map *IDNum* (UBx account) with Dicord account (or ID). Each new
user will automatically receive a *private* registration  message from *ubot*...
but it is also possible to ask this message explicitly with command `!register`
in the channel `#welcome`.

## TODO

* the bot should configure all channels, roles and permissions automatically...
  but it will require *admin* privilege...

## Documentation

* https://discord.js.org/#/docs/main/stable/class/Client (Client API)
* https://www.grafikart.fr/tutoriels/bot-discordjs-892
