// Discord bot for UBx account verification.
// Author: aurelien.esnard@u-bordeaux.fr

// https://discord.js.org/#/docs/main/stable/general/welcome

const Discord = require('discord.js');
const client = new Discord.Client();
const fs = require("fs");

/* ********************************************************************* */
/*                            GLOBALS                                    */
/* ********************************************************************* */

// Register your bot at https://discord.com/developers/applications/

const botname = 'ubot'
const filename = "listing.json";

const token = process.env.DISCORD_TOKEN; // This bot yoken is required!
if (!token) { console.log("Error: variable DISCORD_TOKEN not set in process env."); process.exit(1); }

const myid = process.env.DISCORD_MYID;   // This user ID is required!
if (!myid) { console.log("Error: variable DISCORD_MYID not set in process env."); process.exit(1); }

/* ********************************************************************* */
/*                          BASIC ROUTINES                               */
/* ********************************************************************* */

function getRoleID(g, rolename) {
    if (!g.roles) {
        console.error(`Error: roles are null!`); // FIXME: why this?
        return undefined;
    }
    var role = g.roles.cache.find(role => role.name === rolename);
    if (role === undefined) {
        console.error(`Error: role ${rolename} not found!`);
        return undefined;
    }
    return role.id;
}

/* ********************************************************************* */

function initRole(g, roledata) {
    // create role (if needed)
    var role = g.roles.cache.find(role => role.name === roledata.name);
    if (role === undefined) {
        role = g.roles.create({ data: roledata }).catch(console.error);
    }
    // update role
    else {
        role.edit(roledata).catch(console.error);
    }
    return role;
}

/* ********************************************************************* */

function getChannel(g, name) {
    var channel = g.channels.cache.find(channel => channel.name === name);
    return channel; // or undefined if not found
}

/* ********************************************************************* */

function getStat(g) {

    // const unverifiedRoleID = getRoleID(g, "unverified");
    const studentRoleID = getRoleID(g, "student");
    const teacherRoleID = getRoleID(g, "teacher");

    var nbStudents = 0;
    var nbTeachers = 0;
    var nbUnverified = 0;
    var nbAll = 0;

    g.members.cache.forEach(member => {
        member.fetch();

        var hasStudentRole = member.roles.cache.has(studentRoleID);
        var hasTeacherRole = member.roles.cache.has(teacherRoleID);
        // var hasUnverifiedRole = member.roles.cache.has(unverifiedRoleID);

        nbAll++;
        if (hasStudentRole) nbStudents++;
        if (hasTeacherRole) nbTeachers++;
    });

    var nbRegistered = nbStudents + nbTeachers;
    var nbUnverified = nbAll - nbRegistered;
    var msg = `Statistic of server \"${g.name}\": ${nbRegistered} registered / ${nbAll} users (students : ${nbStudents}, teachers : ${nbTeachers}, unverified : ${nbUnverified})`;
    return msg;
}

/* ********************************************************************* */
/*                              LISTING                                  */
/* ********************************************************************* */

function loadRegisteredUsers(filename) {
    const array = JSON.parse(fs.readFileSync(filename, "utf8")); // array of objects
    var map = {};
    for (var item of array) {
        var key = item["discordid"];
        map[key] = item;
    }
    return map;
}

/* ********************************************************************* */
/*                              PRINT                                    */
/* ********************************************************************* */

function printRegisteredUsers(g, filename) {
    listing = loadRegisteredUsers(filename);
    listing.forEach(value => { console.log(value); });
}

/* ********************************************************************* */

function printRoles(g) {
    g.roles.fetch();
    g.roles.cache.forEach(role => {
        console.log("role:", role.id, ",", role.name, ",", role.permissions, ",", role.position, ",", role.color);
    });
}

/* ********************************************************************* */

function printUsers(g) {
    g.members.fetch();
    g.members.cache.forEach(member => {
        member.fetch();
        console.log("user:", member.id, ",", member.displayName, ",", member.roles.highest.name);
    });
}

/* ********************************************************************* */

function printStat(g) {
    var msg = getStat(g);
    console.log(msg);
}

/* ********************************************************************* */
/*                             SEND MESSAGES                             */
/* ********************************************************************* */

function sendPublicMessage(g, channelname, msg) {
    const channel = getChannel(g, channelname);
    if (!channel) { console.error("Error: channel not found!"); return; }
    channel.send(msg).catch(console.error);
}

/* ********************************************************************* */

function sendPrivateRegisterMessage(member) { // flooding problem!
    if (!member) return; // FIXME: why this ???
    // console.log("=> Send a private register message to :", member.user.username); FIXME: why user is NULL?
    member.createDM().then(channel => {
        var msg = `Welcome to this official UBx server: ${member.guild.name}!\n`;
        var url = `https://lstinfo.emi.u-bordeaux.fr/discord/register.php?discordid=${member.id}`;
        msg += `You need first to register your Discord account on this page: ${url}\n`;
        msg += "This page requires authentication with your login and password from the University of Bordeaux."
        channel.send(msg);
    }).catch(console.error);
}

/* ********************************************************************* */

// https://discordjs.guide/miscellaneous/parsing-mention-arguments.html#how-discord-mentions-work
function sendPublicRegisterMessage(member) {
    if (!member) return; // FIXME: why this ???
    console.log("=> Send a public register message to :", member.user.username);
    const channel = getChannel(member.guild, "welcome");
    if (!channel) { console.log("Error: #welcome channel not found!"); return; }
    var msg = `Hi <@${member.id}>! Please, register your Discord account by typing the command: !register`;
    channel.send(msg).catch(console.error);
}

/* ********************************************************************* */

function sendPublicRegisteredMessage(member) {
    if (!member) return; // FIXME: why this ???
    console.log("=> Send a public verified message to :", member.user.username);
    const channel = getChannel(member.guild, "welcome");
    if (!channel) { console.log("Error: #welcome channel not found!"); return; }
    var msg = `Congratulations <@${member.id}>, your account is now verified... Enjoy!`;
    channel.send(msg).catch(console.error);
}

/* ********************************************************************* */
/*                               COMMANDS                                */
/* ********************************************************************* */

function resetUsers(g) {
    console.log("=> Reset users on server:", g.name);
    g.members.fetch();
    g.members.cache.forEach(member => {
        member.fetch();
        if (member.id == g.me.id) return; // skip bot
        member.roles.set([unverifiedRoleID]).catch(console.error); // TODO: add() or set() ?
        if (member.id != g.ownerID) member.setNickname(member.user.username).catch(console.error);
    });
}

/* ********************************************************************* */


function updateUsers(g) {
    console.log("=> Update users on server:", g.name);

    // load registered users
    const registeredUsers = loadRegisteredUsers(filename);

    // get role IDs
    const unverifiedRoleID = getRoleID(g, "unverified");
    const studentRoleID = getRoleID(g, "student");
    const teacherRoleID = getRoleID(g, "teacher");

    g.members.fetch();
    g.members.cache.forEach(async member => {

        await member.fetch();

        const hasStudentRole = member.roles.cache.has(studentRoleID);
        const hasTeacherRole = member.roles.cache.has(teacherRoleID);
        const hasUnverifiedRole = member.roles.cache.has(unverifiedRoleID);

        // check special roles (continue with next member)
        if (member.id == g.me.id) return;
        if (member.id == g.ownerID) return;
        if (member.roles.highest.position > g.me.roles.highest.position) return;

        const userinfo = registeredUsers[member.id]; // or undefined if not found

        // this user needs to register... (not found in listing.json)
        if (userinfo === undefined) {
            // console.log(`=> The user \"${member.displayName}\" needs to register...`);
            // reset teacher and student roles (if not yet registered)
            if (hasStudentRole) await member.roles.remove(studentRoleID).catch(console.error);
            if (hasTeacherRole) await member.roles.remove(teacherRoleID).catch(console.error);
            // add unverified role (if not yet already set) and send register message
            if (!hasUnverifiedRole) {
                await member.roles.add(unverifiedRoleID).catch(console.error);
                // username += "⚠";
                // if (member.displayName != username) await member.setNickname(username).catch(console.error);
                sendPublicRegisterMessage(member);
                var username = userinfo["username"];
                console.log(`=> The incoming user \"${username}\" (${member.id}) move to \"unverified\" role!`);
            }
            return; // continue with next member
        }
        // this user is already registered (found in listing.json)
        else {
            var username = userinfo["username"];
            var mainrole = userinfo["mainrole"];
            var extrarole = userinfo["extrarole"];

            if (mainrole !== "student" && mainrole !== "teacher") {
                console.log("Error: unknown registered role!");
                return;
            }

            if (mainrole === "student") {
                if (hasUnverifiedRole) await member.roles.remove(unverifiedRoleID).catch(console.error);
                if (hasTeacherRole) await member.roles.remove(teacherRoleID).catch(console.error);
                if (member.displayName != username) await member.setNickname(username).catch(console.error);
                if (extrarole === "l2info") username += "🥈";   // ⚁ 2️⃣
                if (extrarole === "l3info") username += "🥉";   // ⚂ 3️⃣
                if (member.displayName != username) await member.setNickname(username).catch(console.error);
                if (!hasStudentRole) {
                    await member.roles.add(studentRoleID).catch(console.error);
                    sendPublicRegisteredMessage(member);
                    console.log(`=> The user \"${username}\" (${member.id}) is now registered and verified as ${mainrole}!`);
                }
            }

            if (mainrole === "teacher") {
                if (hasUnverifiedRole) await member.roles.remove(unverifiedRoleID).catch(console.error);
                if (hasStudentRole) await member.roles.remove(studentRoleID).catch(console.error);
                username += "🎓";
                if (member.displayName != username) await member.setNickname(username).catch(console.error);
                if (!hasTeacherRole) {
                    await member.roles.add(teacherRoleID).catch(console.error);
                    sendPublicRegisteredMessage(member);
                    console.log(`=> The user \"${username}\" (${member.id}) is now registered and verified as ${mainrole}!`);
                }
            }

            return; // continue with next member
        }
    });

}

/* ********************************************************************* */

function initServer(g) {

    // Student: https://discordapi.com/permissions.html#37211712
    // Teacher: https://discordapi.com/permissions.html#1677196759 | 0x00000200 (STREAM)

    // set roles
    const unverifiedRoleData = { name: 'unverified', color: 'YELLOW', permissions: 66560, position: 1 }; // unverified 
    const studentRoleData = { name: 'student', color: 'GREEN', permissions: 37211712, position: 2 }; // student
    const teacherRoleData = { name: 'teacher', color: 'ORANGE', permissions: 1677196759 | 0x00000200, position: 3 }; // teacher

    // special everyone role (some fields cannot be edited)
    var everyoneRole = g.roles.everyone;
    everyoneRole.setPermissions(66560).catch(console.error);;

    // basic roles
    var unverifiedRole = initRole(g, unverifiedRoleData);
    var studentRole = initRole(g, studentRoleData);
    var teacherRole = initRole(g, teacherRoleData);

    // special bot role (some fields cannot be edited)
    var botRole = g.roles.cache.find(role => role.name === botname);
    // botRole.setPosition(5).catch(console.error); // TODO: don't work... do it by hand!

    // update bot nickname
    // g.me.setNickname("ubot").catch(console.error); // 🚣

    // TODO: create channel #welcome (if needed)
    // const welcomeChannel = getChannel(g,"welcome");
    // if (!welcomeChannel) {
    //     console.log("=> create #welcome channel!");
    //     // https://discordapi.com/permissions.html#3072 (Read Messages | View Channel | Send Messages)
    //     const welcomePermission = 3072;
    //     // lire les messages (y compris les anciens) et écrire...
    //     guild.channels.create('welcome', { type: 'text', reason: 'hello world!', permissionOverwrites: { id: everyoneRoleID, allow: welcomePermission } })
    //         .catch(console.error);
    // }

    console.log("=> Init server done for:", g.name);
}


/* ********************************************************************* */

function update() {
    client.guilds.cache.forEach(updateUsers);
}

/* ********************************************************************* */

function reset() {
    client.guilds.cache.forEach(resetUsers);
}

/* ********************************************************************* */

function startBot(g) {
    console.log("=> Start bot on server:", g.name);
    initServer(g);
    sendPublicMessage(g, "welcome", "Ubot est dans la place !");
    updateUsers(g);
    printStat(g);
}

/* ********************************************************************* */

function start() {
    client.guilds.cache.forEach(startBot);
    // https://nodejs.org/docs/latest/api/fs.html#fs_fs_watchfile_filename_options_listener
    fs.watchFile(filename, { interval: 10000 }, (curr, prev) => {
        console.log(`=> Watch file ${filename}, last modification at ${curr.mtime}`);
        update();
    });
}

/* ********************************************************************* */
/*                             EVENTS                                    */
/* ********************************************************************* */

client.on('message', message => {

    if (message.content === '!ping') {
        message.reply('pong!')
    }

    if (message.content === '!register') {
        sendPrivateRegisterMessage(message.member);
        message.reply('I send you a private message to verify your account...');
    }

    if (message.content === '!stat') {
        var stat = getStat(message.guild);
        message.reply(stat);
    }

    if (message.content === '!update') {
        if (message.author.id == message.guild.ownerID || message.author.id == myid) {
            updateUsers(message.guild);
            message.reply('Server updated!');
        }
    }

    if (message.content === '!die') {
        console.log("=> Stop bot.");
        if (message.author.id == message.guild.ownerID || message.author.id == myid) {
            message.reply('I leave this world in peace...').then(() => { process.exit(0); });
            // client.destroy(); // FIXME: how to use that?
        }
    }

    // if (message.content === '!clear') {
    //     console.log("=> Clear messages in current channel.");
    //     message.channel.bulkDelete(100).then(() => {
    //         message.channel.send("Deleted 100 messages.").then(msg => msg.delete(3000));
    //     });
    // }

    // if (message.content === '!reset') {
    //     if (message.author.id == message.guild.ownerID) {
    //         reset();
    //         message.channel.send('reset users!');
    //     }
    // }

})

/* ********************************************************************* */

client.on('guildMemberAdd', member => {
    sendPrivateRegisterMessage(member);
    sendPublicRegisterMessage(member);
})

/* ********************************************************************* */

client.on('ready', function () {
    start();
})

/* ********************************************************************* */
/*                             MAIN                                      */
/* ********************************************************************* */

client.login(token)  // TODO: use process.env.DISCORD_TOKEN instead
// bot.setInterval(update, 60000); // every 1 minute

// EOF
