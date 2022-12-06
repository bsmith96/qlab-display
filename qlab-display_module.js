/**
 * @description Open Stage Control - Custom Module to retrieve Qlab playhead in a certain cue list
 * @author Ben Smith
 * @link bensmithsound.uk
 * @version 4.3.0-b.2022.12.06
 * @about Asks for updates from Qlab, then interprets the appropriate replies and displays the results.
 * 
 * @changelog
 *   v4.3.0-b.2022.12.06  + display currently playing from a different cue list to the triggers
 *                        + panic transport triggers the playback cue list
 *                        # BUG if the playhead goes empty after the final click, currently playing cue will not display
 */


/*******************************************
 ***************  VARIABLES  ***************
 *******************************************/

var config = loadJSON("qlab-info-config.json");

var nameAddress = config.control.address.name;
var numAddress = config.control.address.number;
var useTCP = config.control.useTCP;
var displayTransport = config.control.displayTransport;

if (config.QlabCount == 1) {
  var qlabIP = config.QlabMain.ip;
  var workspaceID = config.QlabMain.workspaceID;
  var cueListID = config.QlabMain.cueListID;
  var cueListPlayingID = config.QlabMain.cueListPlayingID;
} else if (config.QlabCount == 2) {
  var qlabIP = config.QlabMain.ip;
  var workspaceID = config.QlabMain.workspaceID;
  var cueListID = config.QlabMain.cueListID;
  var qlabIP_B = config.QlabBackup.ip;
  var workspaceID_B = config.QlabBackup.workspaceID;
  var cueListID_B = config.QlabBackup.cueListID;
  var cueListPlayingID_B = config.QlabBackup.cueListPlayingID;
};

// arrays for functions
var qlabMain = [workspaceID, cueListID, qlabIP, cueListPlayingID];
var qlabBackup = [workspaceID_B, cueListID_B, qlabIP_B, cueListPlayingID_B];
var qlabOnly = [workspaceID, cueListID, qlabIP, cueListPlayingID];

// variable for backup changeover
if (config.QlabCount == 1) {
  var whichQlab = 'ONLY'
} else if (config.QlabCount == 2) {
  var whichQlab = 'MAIN'
}

// global variables
var cueListChildren = [];


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

  var [theWorkspace, theCueList, theIP, theCueListPlaying] = qlab;

  // ask for updates
  send(theIP, 53000, '/workspace/' + theWorkspace + '/updates', 1);

  // ask for current position
  send(theIP, 53000, '/workspace/' + theWorkspace + '/cue_id/' + theCueList + '/playheadId');

  // get list of IDs in this cue list
  send(theIP, 53000, '/workspace/' + theWorkspace + '/cue_id/' + theCueListPlaying + '/children');

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
  receive('/EDIT', 'REFRESH', {'css':'width: 130rem; left: calc(98% - 130rem);'});
  receive('/SESSION/SAVE');
}

// Show transport controls if required
function showTransport() {
  receive('/EDIT', '<<', {'visible':true, 'interaction': true, 'bypass': false, 'css':'font-size: 200%;\nheight: 100rem;\nwidth: 30%;\nborder-radius: 10rem;'});
  receive('/EDIT', '>>', {'visible':true, 'interaction': true, 'bypass': false, 'css':'font-size: 200%;\nheight: 100rem;\nwidth: 30%;\nleft: 68%;\nborder-radius: 10rem;'});
  receive('/EDIT', 'GO', {'visible':true, 'interaction': true, 'bypass': false});
  receive('/EDIT', 'PANIC', {'visible':true, 'interaction': true, 'bypass': false});
  receive('/SESSION/SAVE');
}

function hideTransport() {
  receive('/EDIT', '<<', {'visible':false, 'interaction': false, 'bypass': true});
  receive('/EDIT', '>>', {'visible':false, 'interaction': false, 'bypass': true});
  receive('/EDIT', 'GO', {'visible':false, 'interaction': false, 'bypass': true});
  receive('/EDIT', 'PANIC', {'visible':false, 'interaction': false, 'bypass': true});
  receive('/SESSION/SAVE');
}

function showReducedTransport() {
  receive('/EDIT', '<<', {'visible':true, 'interaction': true, 'bypass': false, 'css':'font-size: 200%;\nheight: 100rem;\nwidth: 48%;\nborder-radius: 10rem;'});
  receive('/EDIT', '>>', {'visible':true, 'interaction': true, 'bypass': false, 'css':'font-size: 200%;\nheight: 100rem;\nwidth: 48%;\nleft: 50%;\nborder-radius: 10rem;'});
  receive('/EDIT', 'GO', {'visible':false, 'interaction': false, 'bypass': true});
  receive('/EDIT', 'PANIC', {'visible':false, 'interaction': false, 'bypass': true});
  receive('/SESSION/SAVE');
}

// Refresh qlab
function onRefresh(qlab) {

  var [theWorkspace, theCueList, theIP, theCueListPlaying] = qlab;

  // ask for updates
  send(theIP, 53000, '/workspace/' + theWorkspace + '/updates', 1);

  // ask for current position
  send(theIP, 53000, '/workspace/' + theWorkspace + '/cue_id/' + theCueList + '/playheadId');

  // get list of IDs in this cue list
  cueListChildren = [];
  send(theIP, 53000, '/workspace/' + theWorkspace + '/cue_id/' + theCueListPlaying + '/children');

  getActive(qlab);

}

// Transport to both QLab computers simultaneously
function sendTransport(theAddress, qlab_A, qlab_B) {

  var [theWorkspace_A, theCueList_A, theIP_A, theCueListPlaying_A] = qlab_A;
  var [theWorkspace_B, theCueList_B, theIP_B, theCueListPlaying_B] = qlab_B;

  // ##FIXME##: can't by default move the playhead of a particular cue list -- NOT AN ISSUE? IT DOES WORK?

  if (theAddress === '/panic') {
    send(theIP_A, 53000, '/workspace/' + theWorkspace_A + '/cue_id/' + theCueListPlaying_A + theAddress);
    send(theIP_B, 53000, '/workspace/' + theWorkspace_B + '/cue_id/' + theCueListPlaying_B + theAddress);
  } else {
    send(theIP_A, 53000, '/workspace/' + theWorkspace_A + '/cue_id/' + theCueList_A + theAddress);
    send(theIP_B, 53000, '/workspace/' + theWorkspace_B + '/cue_id/' + theCueList_B + theAddress);
  }
}

// Get list of active cues
function getActive(qlab) {

  var [theWorkspace, theCueList, theIP, theCueListPlaying] = qlab;

  const theAddress = '/workspace/' + theWorkspace + '/cue_id/' + theCueList;

  send(theIP, 53000, '/workspace/' + theWorkspace + '/runningCues/shallow');

}

// Interpret incoming messages
function interpretIncoming(data, qlab) {

  var {address, args, host, port} = data;
  var [theWorkspace, theCueList, theIP, theCueListPlaying] = qlab;

  // when receiving an update with the playhead's cue id, ask for name and number
  // does not pass this message on to the server
  if (address === '/update/workspace/' + theWorkspace + '/cueList/' + theCueList + '/playbackPosition') { // updates
    if (args == "") {
      receive(nameAddress, "")
      receive(numAddress, "")
      return
    }
    send(host, 53000, '/cue_id/' + args[0].value + '/displayName');
    send(host, 53000, '/cue_id/' + args[0].value + '/number');
    getActive(qlab);
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
    } else if (address.endsWith('/runningCues/shallow')) {
      var json = decodeQlabReply(args);

      for (cue of json) {
        if (cueListChildren.includes(cue.uniqueID)) {
          receive(host, 53001, '/active/name', cue.listName);
          receive(host, 53001, '/active/num', cue.number);
        }
      }

      send(host, 53000, '/cue_id/' + theCueListPlaying + '/isRunning');
    } else if (address.endsWith('children')) {
      var json = decodeQlabReply(args);
  
      for (cue of json) {
        cueListChildren.push(cue.uniqueID);
      }
    } else if (address.endsWith('isRunning')) {

      setTimeout(function(){
        send(host, 53000, '/cue_id/' + theCueListPlaying + '/isRunning')
      }, 1000);

      var result = decodeQlabReply(args);
      if (result === false) {
        receive('/active/name', "");
        receive('/active/num', "");
      }
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

      setTimeout(function(){
        if (displayTransport === "full") {
          showTransport();
        } else if (displayTransport === "reduced"){
          showReducedTransport();
        } else if (displayTransport === "false") {
          hideTransport();
        }
      }, 100)
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

    
    // Transport controls
    if (whichQlab == "ONLY") {
      if (address == '/transport/next') {
        sendTransport('/playhead/next', qlabOnly, qlabBackup)
      } else if (address == '/transport/previous') {
        sendTransport('/playhead/previous', qlabOnly, qlabBackup)
      } else if (address === '/transport/go') {
        sendTransport('/go', qlabOnly, qlabBackup)
      } else if (address === '/transport/panic', qlabOnly, qlabBackup) {
        sendTransport('/panic', qlabOnly, qlabBackup)
      }
    } else if (whichQlab == 'MAIN' || whichQlab === 'BACKUP') {
      if (address === '/transport/next') {
        sendTransport('/playhead/next', qlabMain, qlabBackup)
      } else if (address === '/transport/previous') {
        sendTransport('/playhead/previous', qlabMain, qlabBackup) 
      } else if (address === '/transport/go') {
        sendTransport('/go', qlabMain, qlabBackup)
      } else if (address === '/transport/panic') {
        sendTransport('/panic', qlabMain, qlabBackup)
      }
    }

    return {address, args, host, port} 
  }
}