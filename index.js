// Discord bot for UBx account verification.
// Author: aurelien.esnard@u-bordeaux.fr

// https://discord.js.org/#/docs/main/stable/general/welcome

const Discord = require('discord.js');
// const client = new Discord.Client();
const client = new Discord.Client({ fetchAllMembers: true });
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
/*                            ROLES DATA                                 */
/* ********************************************************************* */

// Student: https://discordapi.com/permissions.html#37211712
// Teacher: https://discordapi.com/permissions.html#1677196759 | 0x00000200 (STREAM)

const unverifiedPerm = 66560;
const studentPerm = 37211712;
const teacherPerm = 1677196759 | 0x00000200;
const everyonePerm = 66560;

// main roles
const unverifiedRoleData = { name: 'unverified', color: 'YELLOW', permissions: unverifiedPerm }; // unverified 
const studentRoleData = { name: 'student', color: 'GREEN', permissions: studentPerm }; // student
const teacherRoleData = { name: 'teacher', color: 'ORANGE', permissions: teacherPerm }; // teacher

// extra roles
const l2infoRoleData = { name: 'l2info', color: 'GREEN', permissions: studentPerm }; // student
const l3infoRoleData = { name: 'l3info', color: 'GREEN', permissions: studentPerm }; // student
const l2miRoleData = { name: 'l2mi', color: 'GREEN', permissions: studentPerm }; // student
const l3miRoleData = { name: 'l3mi', color: 'GREEN', permissions: studentPerm }; // student
const l2optimRoleData = { name: 'l2optim', color: 'GREEN', permissions: studentPerm }; // student
const l3optimRoleData = { name: 'l3optim', color: 'GREEN', permissions: studentPerm }; // student
const l2isiRoleData = { name: 'l2isi', color: 'GREEN', permissions: studentPerm }; // student
const l3isiRoleData = { name: 'l3isi', color: 'GREEN', permissions: studentPerm }; // student
const delegateRoleData = { name: 'délégué', color: 'LUMINOUS_VIVID_PINK', permissions: studentPerm }; // student
// const delegateRoleData = { name: 'délégué', color: 'GREEN', permissions: studentPerm }; // student

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

function hasRole(g, member, rolename) {
    var roleid = getRoleID(g, rolename);
    if (roleid === undefined) return false; /* error */
    // member.fetch();
    return member.roles.cache.has(roleid);
}

/* ********************************************************************* */

async function addRole(g, member, rolename) {
    var roleid = getRoleID(g, rolename);
    if (roleid === undefined) return false; /* error */
    var hasrole = member.roles.cache.has(roleid);
    if (!hasrole) {
        await member.roles.add(roleid).catch(console.error);
        return true; // only if the role is updated...
    }
    return false;
}

/* ********************************************************************* */

async function setMainRole(g, member, rolename) {
    // rolename is either "student", "teacher" or "unverified"

    const unverifiedRoleID = getRoleID(g, "unverified");
    const studentRoleID = getRoleID(g, "student");
    const teacherRoleID = getRoleID(g, "teacher");

    const hasStudentRole = member.roles.cache.has(studentRoleID);
    const hasTeacherRole = member.roles.cache.has(teacherRoleID);
    const hasUnverifiedRole = member.roles.cache.has(unverifiedRoleID);

    var roleid = getRoleID(g, rolename);
    if (roleid === undefined) return false; /* error */
    var hasrole = member.roles.cache.has(roleid);

    // remove other roles if needed
    if (hasStudentRole && roleid != studentRoleID) await member.roles.remove(studentRoleID).catch(console.error);
    if (hasTeacherRole && roleid != teacherRoleID) await member.roles.remove(teacherRoleID).catch(console.error);
    if (hasUnverifiedRole && roleid != unverifiedRoleID) await member.roles.remove(unverifiedRoleID).catch(console.error);

    // add main role
    if (!hasrole) {
        await member.roles.add(roleid).catch(console.error);
        return true; // only if the role is updated...
    }

    return false;
}


/* ********************************************************************* */

function getChannel(g, name) {
    var channel = g.channels.cache.find(channel => channel.name === name);
    return channel; // or undefined if not found
}

/* ********************************************************************* */

function getStat(g) {
    var nbStudents = 0;
    var nbTeachers = 0;
    var nbUnverified = 0;
    var nbAll = 0;

    g.members.cache.forEach(member => {
        member.fetch().catch(console.error);
        nbAll++;
        if (hasRole(g, member, "student")) nbStudents++;
        if (hasRole(g, member, "teacher")) nbTeachers++;
    });

    var nbRegistered = nbStudents + nbTeachers;
    var nbUnverified = nbAll - nbRegistered;
    var msg = `Statistic of server \"${g.name}\": ${nbRegistered} registered / ${nbAll} users (students : ${nbStudents}, teachers : ${nbTeachers}, unverified : ${nbUnverified})`;
    return msg;
}

/* ********************************************************************* */

function getExtraStat(g) {

    var nbStudents = 0;
    var nbl2info = 0;
    var nbl3info = 0;
    var nbl2mi = 0;
    var nbl3mi = 0;
    var nbl2optim = 0;
    var nbl3optim = 0;
    var nbl2isi = 0;
    var nbl3isi = 0;

    g.members.cache.forEach(member => {
        member.fetch().catch(console.error);

        if (hasRole(g, member, "student")) nbStudents++;
        else return;

        if (hasRole(g, member, "l2info")) nbl2info++;
        if (hasRole(g, member, "l3info")) nbl3info++;
        if (hasRole(g, member, "l2mi")) nbl2mi++;
        if (hasRole(g, member, "l3mi")) nbl3mi++;
        if (hasRole(g, member, "l2isi")) nbl2isi++;
        if (hasRole(g, member, "l3isi")) nbl3isi++;
        if (hasRole(g, member, "l2optim")) nbl2optim++;
        if (hasRole(g, member, "l3optim")) nbl3optim++;

    });

    var nbExtra = nbl2info + nbl3info + nbl2mi + nbl3mi + nbl2optim + nbl3optim + nbl2isi + nbl3isi;
    var nbUnknown = nbStudents - nbExtra;
    var msg = `* L2 Info: ${nbl2info}\n`;
    msg += `* L3 Info: ${nbl3info}\n`;
    msg += `* L2 Math-Info: ${nbl2mi}\n`;
    msg += `* L3 Math-Info: ${nbl3mi}\n`;
    msg += `* L2 Isi: ${nbl2isi}\n`;
    msg += `* L3 Isi: ${nbl3isi}\n`;
    msg += `* L2 Optim: ${nbl2optim}\n`;
    msg += `* L3 Optim: ${nbl3optim}\n`;
    msg += `* Unknown: ${nbUnknown} / ${nbStudents}\n`;
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
    g.roles.fetch().catch(console.error);
    g.roles.cache.forEach(role => {
        console.log("role:", role.id, ",", role.name, ",", role.permissions, ",", role.position, ",", role.color);
    });
}

/* ********************************************************************* */

function printUsers(g) {
    g.members.fetch().catch(console.error);
    g.members.cache.forEach(member => {
        // member.fetch();
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

function sendPrivateMessage(member, msg) {
    if (!member) return; // FIXME: why this ???
    member.createDM().then(channel => { channel.send(msg); }).catch(console.error);
}


/* ********************************************************************* */

function sendPrivateRegisterMessage(member) { // flooding problem!
    if (!member) return; // FIXME: why this ???
    var msg = `Welcome to this official UBx server: ${member.guild.name}!\n`;
    var url = `https://lstinfo.emi.u-bordeaux.fr/discord/register.php?discordid=${member.id}`;
    msg += `You need first to register your Discord account on this page: ${url}\n`;
    msg += "This page requires authentication with your login and password from the University of Bordeaux."
    sendPrivateMessage(member, msg);
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
    g.members.fetch().catch(console.error);
    g.members.cache.forEach(member => {
        // member.fetch();
        if (member.id == g.me.id) return; // skip bot
        member.roles.set([unverifiedRoleID]).catch(console.error); // TODO: add() or set() ?
        if (member.id != g.ownerID) member.setNickname(member.user.username).catch(console.error);
    });
}

/* ********************************************************************* */

function kickUnverifiedUsers(g) {
    console.log("=> Kick all unverified users on server:", g.name);
    g.members.fetch().catch(console.error);
    g.members.cache.forEach(member => {
        // member.fetch();
        if (member.id == g.me.id) return; // skip bot
        if (member.id == g.ownerID) return; // skip owner
        const hasUnverifiedRole = hasRole(g, member, "unverified");
        if (hasUnverifiedRole) {
            var msg = `Sorry <@${member.id}>, I kick your unverified account from server \"${g.name}\"!`;
            // sendPrivateMessage(member, msg); // FIXME: not allowed because of anti-spam system!
            sendPublicMessage(g, "welcome", msg); // in channel #welcome
            console.log("=> " + msg);
            member.kick().catch(console.error);
        }
    });

}

/* ********************************************************************* */

async function updateUserMainRole(g, member, userinfo) {

    // test roles
    const hasStudentRole = hasRole(g, member, "student");
    const hasTeacherRole = hasRole(g, member, "teacher");
    const hasUnverifiedRole = hasRole(g, member, "unverified");

    // this user needs to register... (not found in listing.json)
    if (userinfo === undefined) {
        var done = await setMainRole(g, member, "unverified");
        if (done) {
            sendPublicRegisterMessage(member);
            console.log(`=> The incoming user \"${member.displayName}\" (${member.id}) move to \"unverified\" role!`);
        }

        return; // continue with next member
    }
    // this user is already registered (found in listing.json)
    else {
        var username = userinfo["username"];
        var mainrole = userinfo["mainrole"];

        if (mainrole !== "student" && mainrole !== "teacher") {
            console.log("Error: unknown registered role!");
            return;
        }

        if (mainrole === "student") {
            var done = await setMainRole(g, member, "student");
            if (done) {
                sendPublicRegisteredMessage(member);
                console.log(`=> The user \"${username}\" (${member.id}) is now registered and verified as ${mainrole}!`);
            }
        }

        if (mainrole === "teacher") {
            var done = await setMainRole(g, member, "teacher");
            if (done) {
                sendPublicRegisteredMessage(member);
                console.log(`=> The user \"${username}\" (${member.id}) is now registered and verified as ${mainrole}!`);
            }
        }

        return; // continue with next member
    }
}

/* ********************************************************************* */

async function updateUserExtraRole(g, member, userinfo) {

    if (userinfo === undefined) return;
    var username = userinfo["username"];
    var mainrole = userinfo["mainrole"];
    if (mainrole !== "student") return;

    var role = userinfo["extrarole"];
    var extraroles = role.split(",");

    extraroles.forEach(async role => {

        // handle extra role...
        if (role === "l2info") await addRole(g, member, role);
        if (role === "l3info") await addRole(g, member, role);
        if (role === "l2mi") await addRole(g, member, role);
        if (role === "l3mi") await addRole(g, member, role);
        if (role === "l2isi") await addRole(g, member, role);
        if (role === "l3isi") await addRole(g, member, role);
        if (role === "l2optim") await addRole(g, member, role);
        if (role === "l3optim") await addRole(g, member, role);
        if (role === "délégué") await addRole(g, member, role);
    });
}

/* ********************************************************************* */

async function updateUserNickname(g, member, userinfo) {

    if (userinfo === undefined) return;
    var username = userinfo["username"];

    if (hasRole(g, member, "teacher")) username += "🎓";
    if (g.name === "Licence Info") {
        if (hasRole(g, member, "l2info") || hasRole(g, member, "l2mi") ||
            hasRole(g, member, "l2isi") || hasRole(g, member, "l2optim")) username += "🥈";
        if (hasRole(g, member, "l3info") || hasRole(g, member, "l3mi") ||
            hasRole(g, member, "l3isi") || hasRole(g, member, "l3optim")) username += "🥉";
        if (hasRole(g, member, "délégué")) username += "🦄";
    }
    if (member.displayName != username) await member.setNickname(username).catch(console.error);

}

/* ********************************************************************* */

function updateUsers(g) {
    console.log("=> Update users on server:", g.name);
    console.log("* total users:", g.memberCount);
    console.log("* cached users:", g.members.cache.size);

    // load registered users
    const registeredUsers = loadRegisteredUsers(filename);

    console.log("fetching guild members");
    // g.members.fetch().catch(console.error); // FIXME: sync all with await?
    console.log("done!");

    g.members.cache.forEach(async member => {
        await member.fetch().catch(console.error);

        // check special roles (continue with next member)
        if (member.id == g.me.id) return;
        if (member.id == g.ownerID) return;
        if (member.roles.highest.position > g.me.roles.highest.position) return;

        const userinfo = registeredUsers[member.id]; // or undefined if not found
        updateUserMainRole(g, member, userinfo);
        if (g.name === "Licence Info") updateUserExtraRole(g, member, userinfo);
        updateUserNickname(g, member, userinfo);
    });

}

/* ********************************************************************* */

function initServerExtra(g) {

    // create extra roles
    var l2infoRole = initRole(g, l2infoRoleData);
    var l3infoRole = initRole(g, l3infoRoleData);
    var l2miRole = initRole(g, l2miRoleData);
    var l3miRole = initRole(g, l3miRoleData);
    var l2optimRole = initRole(g, l2optimRoleData);
    var l3optimRole = initRole(g, l3optimRoleData);
    var l2isiRole = initRole(g, l2isiRoleData);
    var l3isiRole = initRole(g, l3isiRoleData);
    var delegateRole = initRole(g, delegateRoleData);

}

/* ********************************************************************* */

function initServer(g) {

    console.log("=> Init server done for:", g.name);

    // special everyone role (some fields cannot be edited)
    var everyoneRole = g.roles.everyone;
    everyoneRole.setPermissions(everyonePerm).catch(console.error);;

    // special bot role (some fields cannot be edited)
    var botRole = g.roles.cache.find(role => role.name === botname);
    // botRole.setColor('DARK_VIVID_PINK').catch(console.error); // FIXME: not possible... try ubot as admin?

    // FIXME: how to check position of ubot > main & extra roles
    // if(botRole.position < g.roles.highest.position) { 
    //     console.error("Error: the bot position must be the highest role in server settings!");
    //     process.exit(1);
    // }

    // g.me.setNickname("ubot").catch(console.error); // 🚣

    // main roles
    var unverifiedRole = initRole(g, unverifiedRoleData);
    var studentRole = initRole(g, studentRoleData);
    var teacherRole = initRole(g, teacherRoleData);
    // FIXME: how to set position of main roles? maybe 10/20/30/...


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
    if (g.name === "Licence Info") initServerExtra(g);
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
        var msg = stat;
        if (message.guild.name === "Licence Info") {
            var extrastat = getExtraStat(message.guild);
            msg = stat + `\n` + extrastat
        }
        message.reply(msg);
    }

    if (message.content === '!update') {
        if (message.author.id == message.guild.ownerID || message.author.id == myid) {
            updateUsers(message.guild);
            message.reply('Server updated!');
        }
    }

    if (message.content === '!kickunverified') {
        if (message.author.id == message.guild.ownerID || message.author.id == myid) {
            kickUnverifiedUsers(message.guild);
            message.reply('Bang bang... Kick unverified users!');
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
