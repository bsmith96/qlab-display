/**
 * @description Open Stage Control - Custom Module to retrieve Qlab playhead in a certain cue list
 * @author Ben Smith
 * @link bensmithsound.uk
 * @version 3.0.0-beta5
 * @about Asks for updates from Qlab, then interprets the appropriate replies and displays the results.
 * 
 * @changelog
 *   v3.0.0-beta5  - split interpreting into separate function
 *                 - split init into separate function
 *                 - implement "only" qlab
 *   v3.0.0-beta4  - implementation of backup Qlab switch - manual changeover
 *                 - on startup and refresh, asks for current position (so you don't have to change it to get an update)
 *                 - when using UDP, now thumps both Qlabs rather than only the Main
 *                 - NB currently starts a TCP connection with both Qlabs permanently, not just when switched.
 *                   the switch only affects what information gets *displayed*.
 *                   due to the way OSC works, this should mean messages to a crashed computer are simply ignored.
 *                 - fix "if" statements in setting Backup info as variables
 */


/*******************************************
 ***********  USER CUSTOMISATION  **********
 *******************************************/

// Use TCP or UDP?
// If false, sends thump (heartbeat) to Qlab every 20 seconds to maintain UDP connection.
// If true, disables the thump (heartbeat) command.
const useTCP = true;


/*******************************************
 ***************  VARIABLES  ***************
 *******************************************/

var config = loadJSON("qlab-info-config.json");

var nameAddress = config.control.address.name;
var numAddress = config.control.address.number;

var qlabIP = config.QlabMain.ip;
var workspaceID = config.QlabMain.workspaceID;
var cueListID = config.QlabMain.cueListID;

if (config.QlabCount == 2) {
  var qlabIP_B = config.QlabBackup.ip;
  var workspaceID_B = config.QlabBackup.workspaceID;
  var cueListID_B = config.QlabBackup.cueListID;
};

var qlabMain = [workspaceID, cueListID, qlabIP];
var qlabBackup = [workspaceID_B, cueListID_B, qlabIP_B];
var qlabOnly = [workspaceID, cueListID, qlabIP];


if (config.QlabCount == 1) {
  var whichQlab = "ONLY"
} else if (config.QlabCount == 2) {
  var whichQlab = "MAIN"
}


/*******************************************
 ***************  FUNCTIONS  ***************
 *******************************************/

function decodeQlabReply(args) {
  var replyData = JSON.parse(args[0].value); // decode the JSON reply from Qlab
  var toReturn = replyData.data; // get the cue display name from within the JSON
  return toReturn;
}

// HEARTBEAT FUNCTION for staying connected over UDP. Not required if using TCP.
function sendThump(id, ip) {
  const thump = "/workspace/" + id + "/thump";

  setInterval(function(){
    send(ip, 53000, thump);
  }, 20000);
}

// Initial function on module load
function onInit(qlab) {

  var [theWorkspace, theCueList, theIP] = qlab;

  // ask for updates
  send(theIP, 53000, '/workspace/' + theWorkspace + '/updates', 1);

  // ask for current position, once loaded
  send(theIP, 53000, '/workspace/' + theWorkspace + '/cue_id/' + theCueList + '/playheadId');

  // activate heartbeat if required
  if (useTCP == false) {
    sendThump(theWorkspace, theIP);
  };

};

// Interpret incoming
function interpretIncoming(data, qlab) {

  var {address, args, host, port} = data;
  var [theWorkspace, theCueList, theIP] = qlab;

  // when receiving an update with the playhead's cue id, ask for name and number
  // does not pass this message on to the server
  if (address === "/update/workspace/" + theWorkspace + "/cueList/" + theCueList + "/playbackPosition") { // updates
    send(host, 53000, '/cue_id/' + args[0].value + '/displayName');
    send(host, 53000, '/cue_id/' + args[0].value + '/number');
    return
  } else if (address.endsWith('/playheadId')) { // replies to direcr requests (startup and "refresh")
    var returnedValue = decodeQlabReply(args);
    send(host, 53000, '/cue_id/' + returnedValue + '/displayName');
    send(host, 53000, '/cue_id/' + returnedValue + '/number');
    return
  }
  
  // when receiving a reply with the name, interpret and send to server
  if (address.startsWith("/reply")) {
    var returnedValue = decodeQlabReply(args); // decode the reply to get the value requested
    if (address.endsWith("/displayName")) {
      receive(host, 53001, nameAddress, returnedValue) // send the name to the server
    } else if (address.endsWith("/number")) {
      receive(host, 53001, numAddress, returnedValue) // send the number to the server
    }
    return
  }

  // notify if Qlab disconnects from a TCP connection
  if (address.endsWith("/disconnect")) {
    receive(host, 53001, "/NOTIFY", "Qlab is disconnected");
    receive(host, 53001, nameAddress, "QLAB IS DISCONNECTED");
    receive(host, 53001, numAddress, "");
    return
  }
}


/*******************************************
 **************  MAIN ROUTINE  *************
 *******************************************/

module.exports = {

  // ON START, ASK QLAB FOR UPDATES & CURRENT POSITION
  init:function(){

    setTimeout(function(){
      if (whichQlab == "ONLY") {
        onInit(qlabOnly);
      } else if (whichQlab = "MAIN") {
        onInit(qlabMain);
        onInit(qlabBackup);
      }
    }, 2000)

  },

  // FILTER ALL INCOMING MESSAGES
  oscInFilter:function(data){

      var {address, args, host, port} = data;

      if (whichQlab === "MAIN" && host === qlabIP) {
        interpretIncoming(data, qlabMain);
        return

      } else if (whichQlab === "BACKUP" && host === qlabIP_B) {

        interpretIncoming(data, qlabBackup);
        return

      } else if (whichQlab === "ONLY" && host === qlabIP) {

        interpretIncoming(data, qlabOnly);
        return

      }

      return {address, args, host, port}

  },

  // FILTER ALL OUTGOING MESSAGES
  oscOutFilter:function(data){

    var {address, args, host, port, clientId} = data;
    
    // Refresh button
    if (address === "/module/refresh") {
      // Ask for updates from both Qlabs
      send(qlabIP, 53000, '/workspace/' + workspaceID + '/updates', 1);
      send(qlabIP_B, 53000, '/workspace/' + workspaceID_B + '/updates', 1);

      // Ask for current playhead position
      send(qlabIP, 53000, '/workspace/' + workspaceID + '/cue_id/' + cueListID + '/playheadId');
      send(qlabIP_B, 53000, '/workspace/' + workspaceID_B + '/cue_id/' + cueListID_B + '/playheadId');
      return
    };

    // Switch Qlab button
    if (address === "/module/switch") {
      whichQlab = args[0].value

      if (whichQlab === "MAIN") {
        send(qlabIP, 53000, '/workspace/' + workspaceID + '/cue_id/' + cueListID + '/playheadId');
      } else if (whichQlab === "BACKUP") {
        send(qlabIP_B, 53000, '/workspace/' + workspaceID_B + '/cue_id/' + cueListID_B + '/playheadId');
      }
      return
    }

    return {address, args, host, port}
  }

}
