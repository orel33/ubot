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

// Student: https://discordapi.com/permissions.html#37211712
// Teacher: https://discordapi.com/permissions.html#1677196759 | 0x00000200 (STREAM)

const unverifiedPerm = 66560;
const studentPerm = 37211712;
const teacherPerm = 1677196759 | 0x00000200;

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

async function updateUser(g, member, userinfo) {

    // get role IDs
    const unverifiedRoleID = getRoleID(g, "unverified");
    const studentRoleID = getRoleID(g, "student");
    const teacherRoleID = getRoleID(g, "teacher");

    // test roles
    const hasStudentRole = member.roles.cache.has(studentRoleID);
    const hasTeacherRole = member.roles.cache.has(teacherRoleID);
    const hasUnverifiedRole = member.roles.cache.has(unverifiedRoleID);

    // this user needs to register... (not found in listing.json)
    if (userinfo === undefined) {
        // console.log(`=> The user \"${member.displayName}\" needs to register...`);
        // reset teacher and student roles (if not yet registered)
        if (hasStudentRole) await member.roles.remove(studentRoleID).catch(console.error);
        if (hasTeacherRole) await member.roles.remove(teacherRoleID).catch(console.error);
        // add unverified role (if not yet already set) and send register message
        if (!hasUnverifiedRole) {
            await member.roles.add(unverifiedRoleID).catch(console.error);
            sendPublicRegisterMessage(member);
            console.log(`=> The incoming user \"${member.displayName}\" (${member.id}) move to \"unverified\" role!`);
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
}

/* ********************************************************************* */

async function updateUserExtra(g, member, userinfo) {

    if (userinfo === undefined) return;

    // get extra roles
    const l2infoRoleID = getRoleID(g, "l2info");
    const l3infoRoleID = getRoleID(g, "l3info");
    const l2miRoleID = getRoleID(g, "l2mi");
    const l3miRoleID = getRoleID(g, "l3mi");
    const l2isiRoleID = getRoleID(g, "l2isi");
    const l3isiRoleID = getRoleID(g, "l3isi");
    const l2optimRoleID = getRoleID(g, "l2optim");
    const l3optimRoleID = getRoleID(g, "l3optim");

    const hasl2infoRole = member.roles.cache.has(l2infoRoleID);
    const hasl3infoRole = member.roles.cache.has(l3infoRoleID);
    const hasl2miRole = member.roles.cache.has(l2miRoleID);
    const hasl3miRole = member.roles.cache.has(l3miRoleID);
    const hasl2isiRole = member.roles.cache.has(l2isiRoleID);
    const hasl3isiRole = member.roles.cache.has(l3isiRoleID);
    const hasl2optimRole = member.roles.cache.has(l2optimRoleID);
    const hasl3optimRole = member.roles.cache.has(l3optimRoleID);

    var username = userinfo["username"];
    var mainrole = userinfo["mainrole"];
    var extrarole = userinfo["extrarole"];

    if (mainrole === "student") {
        // TODO: todo
        // if (extrarole === "l2info") username += "🥈";
        // if (extrarole === "l3info") username += "🥉";
        // if (member.displayName != username) await member.setNickname(username).catch(console.error);

        // handle extra role...
        if (extrarole === "l2info" && !hasl2infoRole) await member.roles.add(l2infoRoleID).catch(console.error);
        if (extrarole === "l3info" && !hasl3infoRole) await member.roles.add(l3infoRoleID).catch(console.error);
        if (extrarole === "l2mi" && !hasl2miRole) await member.roles.add(l2miRoleID).catch(console.error);
        if (extrarole === "l3mi" && !hasl3miRole) await member.roles.add(l3miRoleID).catch(console.error);
        if (extrarole === "l2isi" && !hasl2isiRole) await member.roles.add(l2isiRoleID).catch(console.error);
        if (extrarole === "l3isi" && !hasl3isiRole) await member.roles.add(l3isiRoleID).catch(console.error);
        if (extrarole === "l2optim" && !hasl2optimRole) await member.roles.add(l2optimRoleID).catch(console.error);
        if (extrarole === "l3optim" && !hasl3optimRole) await member.roles.add(l3optimRoleID).catch(console.error);
    }

}

/* ********************************************************************* */

function updateUsers(g) {
    console.log("=> Update users on server:", g.name);

    // load registered users
    const registeredUsers = loadRegisteredUsers(filename);

    g.members.fetch();
    g.members.cache.forEach(async member => {
        await member.fetch();

        // check special roles (continue with next member)
        if (member.id == g.me.id) return;
        if (member.id == g.ownerID) return;
        if (member.roles.highest.position > g.me.roles.highest.position) return;

        const userinfo = registeredUsers[member.id]; // or undefined if not found
        updateUser(g, member, userinfo);
        // updateUserExtra(g, member, userinfo);
    });

}

/* ********************************************************************* */

function initServerExtra(g) {

    // create extra roles
    const l2infoRoleData = { name: 'l2info', color: 'GREEN', permissions: studentPerm }; // student
    const l3infoRoleData = { name: 'l3info', color: 'GREEN', permissions: studentPerm }; // student
    const l2miRoleData = { name: 'l2mi', color: 'GREEN', permissions: studentPerm }; // student
    const l3miRoleData = { name: 'l3mi', color: 'GREEN', permissions: studentPerm }; // student
    const l2optimRoleData = { name: 'l2optim', color: 'GREEN', permissions: studentPerm }; // student
    const l3optimRoleData = { name: 'l3optim', color: 'GREEN', permissions: studentPerm }; // student
    const l2isiRoleData = { name: 'l2isi', color: 'GREEN', permissions: studentPerm }; // student
    const l3isiRoleData = { name: 'l3isi', color: 'GREEN', permissions: studentPerm }; // student

    var l2infoRole = initRole(g, l2infoRoleData);
    var l3infoRole = initRole(g, l3infoRoleData);
    var l2miRole = initRole(g, l2miRoleData);
    var l3miRole = initRole(g, l3miRoleData);
    var l2optimRole = initRole(g, l2optimRoleData);
    var l3optimRole = initRole(g, l3optimRoleData);
    var l2isiRole = initRole(g, l2isiRoleData);
    var l3isiRole = initRole(g, l3isiRoleData);

}

/* ********************************************************************* */

function initServer(g) {

    // set roles
    const unverifiedRoleData = { name: 'unverified', color: 'YELLOW', permissions: unverifiedPerm }; // unverified 
    const studentRoleData = { name: 'student', color: 'GREEN', permissions: studentPerm }; // student
    const teacherRoleData = { name: 'teacher', color: 'ORANGE', permissions: teacherPerm }; // teacher

    // special everyone role (some fields cannot be edited)
    var everyoneRole = g.roles.everyone;
    everyoneRole.setPermissions(66560).catch(console.error);;

    // main roles
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
    initServerExtra(g);
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
