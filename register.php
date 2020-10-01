<?php

// debug mode

ini_set('display_startup_errors', 1);
ini_set('display_errors', 1);
error_reporting(-1);

// functions

function getrole($userid)
{
    $groups = shell_exec('groups ' . $userid);
    //    echo "<pre> groups: " . $groups . "</pre>";
    if (strpos($groups, "student") !== false) return "student";
    if (strpos($groups, "teacher") !== false) return "teacher";
    if (strpos($groups, "cremiadmin") !== false) return "teacher";
    return "student"; // default role
}

// I try to map discord ID with UBx user ID
function checkuser(&$array, $discordid, $userid, $username, $userrole) // pass $array by reference using &
{
    if (!isset($array)) return false;

    $check = true;
    // $toremove = array();

    // for all registered accounts rdiscordid <---> ruserid in listing.json
    foreach ($array as $idx => $userinfo) {
        $rdiscordid = $userinfo[0];
        $ruserid = $userinfo[1];
        // 1) this discord id is already registered with the same user id... 
        if (($discordid === $rdiscordid) and ($userid === $ruserid)) {
            echo '<pre>⚠ Warning: this Discord account ' . $discordid . ' is already registered by yourself!</pre>';
            // array_splice($array, $idx, 1); // remove it, before to update it...
            unset($array[$idx]);
            // do nothing...
        }
        // this discord id is already registered, but with another user id... 
        else if (($discordid === $rdiscordid) and ($userid !== $ruserid)) {
            echo '<pre>⚠ Error: this Discord account ' . $discordid . ' is already registered by another user!</pre>';
            // do nothing...
            $check = false;
        }
        // this user id is already registred with another discord id...
        else if (($userid === $ruserid) and ($discordid !== $rdiscordid)) {
            echo '<pre>⚠ Warning: you are already registered with another Discord account! I will overwrite it...</pre>';
            // only a single Discord account is allowed
            // array_splice($array, $idx, 1); // remove it, before to update it...
            unset($array[$idx]);
            // return true; 
        }

    }

    // to remove...

    $array = array_values($array); // remove keys (because of unset)

    return $check;
}


function adduser($filename, $discordid, $userid, $username, $userrole)
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
        $array = json_decode($contents);
    }

    // check user
    $check = checkuser($array, $discordid, $userid, $username, $userrole);

    // add it at the end of array
    if ($check) {
        $newuser = array($discordid, $userid, $username, $userrole);
        array_push($array, $newuser); // $array[] = $newuser;
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
$userrole = getrole($userid);
// TODO: how to find role using ldap or groups

// add user in json file
$filename = 'listing.json';

// adduser($filename, '648990209681129483', 'auesnard', 'Aurelien Esnard', "teacher");
// adduser($filename, '623112996956405761', 'pwacreni', 'Pierre-Andre Wacrenier', "teacher");
// adduser($filename, '689504272517431308', 'aguermou', 'Abdou Guermouche', "teacher");
$done = adduser($filename, $discordid, $userid, $username, $userrole);

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
    <pre><?php echo "User Role: $userrole"; ?></pre>

    <?php
    if ($done)
        echo "<pre>✅ Done!</pre>";
    else
        echo "<pre>❌ Error: please contact administrator (aurelien.esnard@u-bordeaux.fr).</pre>";
    ?>
</body>

</html>