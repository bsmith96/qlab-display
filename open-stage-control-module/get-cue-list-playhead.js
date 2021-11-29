/**
 * @description Open Stage Control - Custom Module to retrieve Qlab playhead in a certain cue list
 * @author Ben Smith
 * @link bensmithsound.uk
 * @version 3.1.0-beta1
 * @about Asks for updates from Qlab, then interprets the appropriate replies and displays the results.
 * 
 * @changelog
 *   v3.1.0-beta1  - moves "useTCP" definition from this file to config document
 */


/*******************************************
 ***************  VARIABLES  ***************
 *******************************************/

var config = loadJSON("qlab-info-config.json");

var nameAddress = config.control.address.name;
var numAddress = config.control.address.number;
var useTCP = config.control.useTCP;

console.log(useTCP);

if (config.QlabCount == 1) {
  var qlabIP = config.QlabMain.ip;
  var workspaceID = config.QlabMain.workspaceID;
  var cueListID = config.QlabMain.cueListID;
} else if (config.QlabCount == 2) {
  var qlabIP = config.QlabMain.ip;
  var workspaceID = config.QlabMain.workspaceID;
  var cueListID = config.QlabMain.cueListID;
  var qlabIP_B = config.QlabBackup.ip;
  var workspaceID_B = config.QlabBackup.workspaceID;
  var cueListID_B = config.QlabBackup.cueListID;
};

// arrays for functions
var qlabMain = [workspaceID, cueListID, qlabIP];
var qlabBackup = [workspaceID_B, cueListID_B, qlabIP_B];
var qlabOnly = [workspaceID, cueListID, qlabIP];

// variable for backup changeover
if (config.QlabCount == 1) {
  var whichQlab = 'ONLY'
} else if (config.QlabCount == 2) {
  var whichQlab = 'MAIN'
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
  const thump = '/workspace/' + id + '/thump';

  setInterval(function(){
    send(ip, 53000, thump);
  }, 20000);
}

// Initial function on module load
function onInit(qlab) {

  var [theWorkspace, theCueList, theIP] = qlab;

  // ask for updates
  send(theIP, 53000, '/workspace/' + theWorkspace + '/updates', 1);

  // ask for current position
  send(theIP, 53000, '/workspace/' + theWorkspace + '/cue_id/' + theCueList + '/playheadId');

  // activate heartbeat if required
  if (useTCP == false) {
    sendThump(theWorkspace, theIP);
  };

};

// Hide backup button if using only a single Qlab Machine
function deactivateBackup() {
  receive('/EDIT', 'BACKUP', {'visible':false});
  receive('/EDIT', 'REFRESH', {'css':'width: 260rem; left: calc(98% - 260rem);'});
  receive('/SESSION/SAVE');
}

function activateBackup() {
  receive('/EDIT', 'BACKUP', {'visible':true});
  receive('/EDIT', 'REFRESH', {'css':'width: 130rem; left: calc(98% - 260rem);'});
  receive('/SESSION/SAVE');
}

// Refresh qlab
function onRefresh(qlab) {

  var [theWorkspace, theCueList, theIP] = qlab;

  // ask for updates
  send(theIP, 53000, '/workspace/' + theWorkspace + '/updates', 1);

  // ask for current position
  send(theIP, 53000, '/workspace/' + theWorkspace + '/cue_id/' + theCueList + '/playheadId');

}

// Interpret incoming messages
function interpretIncoming(data, qlab) {

  var {address, args, host, port} = data;
  var [theWorkspace, theCueList, theIP] = qlab;

  // when receiving an update with the playhead's cue id, ask for name and number
  // does not pass this message on to the server
  if (address === '/update/workspace/' + theWorkspace + '/cueList/' + theCueList + '/playbackPosition') { // updates
    send(host, 53000, '/cue_id/' + args[0].value + '/displayName');
    send(host, 53000, '/cue_id/' + args[0].value + '/number');
    return
  } else if (address.endsWith('/playheadId')) { // replies to direct requests (startup, refresh, and changeover)
    var returnedValue = decodeQlabReply(args);
    send(host, 53000, '/cue_id/' + returnedValue + '/displayName');
    send(host, 53000, '/cue_id/' + returnedValue + '/number');
    return
  }
  
  // when receiving a reply with the name, interpret and send to server
  if (address.startsWith('/reply')) {
    var returnedValue = decodeQlabReply(args); // decode the reply to get the value requested
    if (address.endsWith('/displayName')) {
      receive(host, 53001, nameAddress, returnedValue) // send the name to the server
    } else if (address.endsWith('/number')) {
      receive(host, 53001, numAddress, returnedValue) // send the number to the server
    }
    return
  }

  // notify if Qlab disconnects from a TCP connection
  if (address.endsWith('/disconnect')) {
    receive(host, 53001, '/NOTIFY', 'Qlab is disconnected');
    receive(host, 53001, nameAddress, 'QLAB IS DISCONNECTED');
    receive(host, 53001, numAddress, '');
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
      if (whichQlab === 'ONLY') {
        onInit(qlabOnly);
        deactivateBackup();
      } else if (whichQlab === 'MAIN') {
        onInit(qlabMain);
        onInit(qlabBackup);
        activateBackup();
      }
    }, 2000)

  },

  // FILTER ALL INCOMING MESSAGES
  oscInFilter:function(data){

      var {address, args, host, port} = data;

      if (whichQlab === 'MAIN' && host === qlabIP) {
        interpretIncoming(data, qlabMain);
        return
      } else if (whichQlab === 'BACKUP' && host === qlabIP_B) {
        interpretIncoming(data, qlabBackup);
        return
      } else if (whichQlab === 'ONLY' && host === qlabIP) {
        interpretIncoming(data, qlabOnly);
        return
      }

      return {address, args, host, port}

  },

  // FILTER ALL OUTGOING MESSAGES
  oscOutFilter:function(data){

    var {address, args, host, port, clientId} = data;
    
    // Refresh button - does NOT restart heartbeat, as it presumes this is still running from startup
    if (address === '/module/refresh') {
      if (whichQlab === "ONLY") {
        onRefresh(qlabOnly);
      } else if (whichQlab === 'MAIN' || whichQlab === 'BACKUP') {
        onRefresh(qlabMain);
        onRefresh(qlabBackup);
      }
      return
    };

    // Switch Qlab button
    if (address === '/module/changeover') {
      whichQlab = args[0].value

      // go blank for 0.1 seconds -- this allows you to visually see that a new (usually identical) value has been successfully retrieved
      receive(qlabIP, 53001, numAddress, "");
      receive(qlabIP, 53001, nameAddress, "");

      // retrieve current playhead position
      setTimeout(() => {if (whichQlab === 'MAIN') {
        send(qlabIP, 53000, '/workspace/' + workspaceID + '/cue_id/' + cueListID + '/playheadId');
      } else if (whichQlab === 'BACKUP') {
        send(qlabIP_B, 53000, '/workspace/' + workspaceID_B + '/cue_id/' + cueListID_B + '/playheadId');
      }}, 75);
      return
    }

    return {address, args, host, port}
  }

}
