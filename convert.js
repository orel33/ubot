// convert listing JSON format v1 to v2

// JSON format v1 (array of array)
/*
[
  [
      "689504272517431308",
      "aguermou",
      "Abdou Guermouche",
      "teacher"
  ],
  [
      "504218107980546049",
      "nbonicho",
      "Nicolas Bonichon",
      "teacher"
  ]
]
*/

// JSON format v2.1 (object of object)
/*
{
  "689504272517431308": {
      "discordid": "689504272517431308",
      "userid": "aguermou",
      "username": "Abdou Guermouche",
      "mainrole": "teacher",
      "extrarole": ""
  },
  "504218107980546049": {
      "discordid": "504218107980546049",
      "userid": "nbonicho",
      "username": "Nicolas Bonichon",
      "mainrole": "teacher",
      "extrarole": ""
  }
}
*/

// JSON format v2.2 (array of object)
/*
[
  {
      "discordid": "689504272517431308",
      "userid": "aguermou",
      "username": "Abdou Guermouche",
      "mainrole": "teacher",
      "extrarole": ""
  },
  {
      "discordid": "504218107980546049",
      "userid": "nbonicho",
      "username": "Nicolas Bonichon",
      "mainrole": "teacher",
      "extrarole": ""
  }
}
*/


const fs = require("fs");
console.log("convert listing.json => listing2.json");

// version 2.1
var dest = {};
var source = JSON.parse(fs.readFileSync("listing.json", "utf8"));
source.forEach(userinfo => {
  dest[userinfo[0]] = {
    'discordid': userinfo[0],
    'userid': userinfo[1],
    'username': userinfo[2],
    'mainrole': userinfo[3],
    'extrarole': ""
  };
});

fs.writeFileSync("listing2.json", JSON.stringify(dest, null, 4), "utf8");

// EOF