const fs = require("fs");

console.log("load extra.json");
var extra = JSON.parse(fs.readFileSync("extra.json", "utf8")); // a single map (object)
// console.log(extra);

console.log("load listing.json");
var listing = JSON.parse(fs.readFileSync("listing.json", "utf8")); // array of objetcs

listing.forEach(userinfo => {
    // console.log(userinfo["userid"]);
    var userid = userinfo["userid"];
    var extrarole = userinfo["extrarole"]; // in listing
    if(extrarole != "") return; // don't owerwrite extrarole in listing.json
    var theextrarole = extra[userid];
    if (theextrarole == undefined) theextrarole = "";
    userinfo["extrarole"] = theextrarole;
    // console.log(userid, "->", theextrarole);

});

console.log(listing);

fs.writeFileSync("listing2.json", JSON.stringify(listing, null, 4), "utf8");

