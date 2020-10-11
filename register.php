<?php

// debug mode

ini_set('display_startup_errors', 1);
ini_set('display_errors', 1);
error_reporting(-1);

// functions

function getmainrole($userid)
{
    $groups = shell_exec('groups ' . $userid);
    //    echo "<pre> groups: " . $groups . "</pre>";
    if (strpos($groups, "student") !== false) return "student";
    if (strpos($groups, "teacher") !== false) return "teacher";
    if (strpos($groups, "cremiadmin") !== false) return "teacher";
    return "student"; // default role
}


function getextrarole($userid)
{
    $fp = fopen("extra.json", 'r');
    if ($fp === false) return "";
    $contents = fread($fp, filesize("extra.json"));
    // var_dump($contents);
    if ($contents === false) return "";
    // $contents = '{"hfranco":"l3info", "other":"l2info"}';
    // var_dump($contents);
    $array = json_decode($contents, true); // true => decode as array (not object)
    if ($array === null) echo '<pre>⚠ Warning: fail to decode extra.json! </pre>';
    fclose($fp);
    if(array_key_exists($userid, $array))
      return $array[$userid];
    return ""; // default
}

// I try to map Discord ID with User ID... 
// Rule: "only a single Discord account is allowed for each User account"
// Mapping 1-1 discordid <-> userid
// If <userid> is already registered in JSON with another <discordid>, overwrite it
// If <discordid> is already registered in JSON with another <userid>, do nothing!
function checkuser(&$array, $discordid, $userid) // pass $array by reference using &
{
    if (!isset($array)) return false;

    $check = true;
    // $toremove = array();

    // for all registered accounts rdiscordid <---> ruserid in listing.json
    foreach ($array as $idx => $userinfo) {
        $rdiscordid = $userinfo['discordid'];
        $ruserid = $userinfo['userid'];
        // 1) this <discordid> is already registered with the same <userid>...
        if (($discordid === $rdiscordid) and ($userid === $ruserid)) {
            echo '<pre>⚠ Warning: this Discord account ' . $discordid . ' is already registered by yourself!</pre>';
            // array_splice($array, $idx, 1); // remove it, before to update it...
            unset($array[$idx]);
            // do nothing...
        }
        // this <discordid> is already registered, but with another <userid>...
        else if (($discordid === $rdiscordid) and ($userid !== $ruserid)) {
            echo '<pre>⚠ Error: this Discord account ' . $discordid . ' is already registered by another user!</pre>';
            // do nothing...
            $check = false;
        }
        // this <userid> is already registred with another <discordid>...
        else if (($userid === $ruserid) and ($discordid !== $rdiscordid)) {
            echo '<pre>⚠ Warning: you are already registered with another Discord account! I will overwrite it...</pre>';
            // only a single Discord account is allowed
            // array_splice($array, $idx, 1); // remove it, before to update it...
            unset($array[$idx]);
            // return true; 
        }
    }

    $array = array_values($array); // remove all keys (because of unset) => implicit keys

    return $check;
}


function adduser($filename, $discordid, $userid, $username, $mainrole, $extrarole)
{
    $array = array();
    $fp = fopen($filename, 'c+');
    $lock = flock($fp, LOCK_EX);
    if (!$lock) {
        fclose($fp);
        echo '<pre>❌ Error: fail to lock file!</pre>';
        return false;
    }

    // rewind($fp); // not require...

    // get all users from file
    clearstatcache(); // require before to use filesize()
    if (filesize($filename) > 0) {
        $contents = fread($fp, filesize($filename));
        $array = json_decode($contents, true); // true => decode as array (not object)
    }

    // check user
    $check = checkuser($array, $discordid, $userid);
    // $check = true;

    // add it at the end of array
    if ($check) {
        $newuser = array(
            'discordid' => $discordid,
            'userid' => $userid,
            'username' => $username,
            'mainrole' => $mainrole,
            'extrarole' => $extrarole,
        );
        array_push($array, $newuser); // $array[] = $newuser; // add at the end...
        // $array[$discordid] = $newuser; // replace it...
    }

    // save all users in file
    ftruncate($fp, 0); // erase file
    rewind($fp);
    if (isset($array)) fwrite($fp, json_encode($array, JSON_PRETTY_PRINT));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    // var_dump($array); // debug
    unset($array);
    return $check;
}


// input parameters
$discordid = "";
if (isset($_REQUEST["discordid"])) $discordid =  $_REQUEST["discordid"];
if (empty($discordid)) die("❌ Error: missing Discord ID parameter in request!\n");
$userid = $_SERVER['PHP_AUTH_USER'];
if (empty($userid)) die("❌ Error: unknown User ID at CREMI!\n");
$userinfo = posix_getpwnam($userid);
$username = $userinfo['gecos'];
if (empty($username)) die("❌ Error: unknown User Name at CREMI!\n");
$mainrole = getmainrole($userid);
$extrarole = getextrarole($userid);
// TODO: how to find role using ldap or groups

// add user in json file
$filename = 'listing.json';

$done = adduser($filename, $discordid, $userid, $username, $mainrole, $extrarole);

?>

<!-- ****************************************************************************** -->

<!DOCTYPE html>
<html>

<head>
    <!-- <link rel="stylesheet" type="text/css" href="ranking.css"> -->
    <!-- <meta http-equiv="refresh" content="30" /> -->
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />
</head>

<body>
    <h1>Register to Discord Server</h1>
    <pre><?php echo "Discord ID: $discordid"; ?></pre>
    <pre><?php echo "User ID: $userid"; ?></pre>
    <pre><?php echo "User Name: $username"; ?></pre>
    <pre><?php echo "Main Role: $mainrole"; ?></pre>
    <pre><?php echo "Extra Role: $extrarole"; ?></pre>

    <?php
    if ($done)
        echo "<pre>✅ Done!</pre>";
    else
        echo "<pre>❌ Error: please contact administrator (aurelien.esnard@u-bordeaux.fr).</pre>";
    ?>
</body>

</html>