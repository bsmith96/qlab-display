/**
 * @description Open Stage Control - Custom Module to retrieve Qlab playhead in a certain cue list
 * @author Ben Smith
 * @link bensmithsound.uk
 * @version 2.0.0
 * @about Asks for updates from Qlab, then interprets the appropriate replies and displays the results.
 * 
 * @changelog
 *   v2.0.0  - New method, asking for updates rather than constantly polling Qlab
 */

function decodeQlabReply(args) {
  var replyData = JSON.parse(args[0].value); // decode the JSON reply from Qlab
  var toReturn = replyData.data; // get the cue display name from within the JSON
  return toReturn;
}

var config = loadJSON("open-stage-control-config.json");

var nameAddress = config.address.name;
var numAddress = config.address.number;

var qlabIP = config.QlabMain.ip;
var workspaceID = config.QlabMain.workspaceID;
var cueListID = config.QlabMain.cueListID;

module.exports = {

  // ON START, ASK QLAB FOR UPDATES
  init:function(){
    send(qlabIP, 53000, '/workspace/' + workspaceID + '/updates', 1);
  },

  // FILTER ALL INCOMING MESSAGES
  oscInFilter:function(data){

      var {address, args, host, port} = data;

      // when receiving an update with the playhead's cue id, ask for name and number
      // does not pass this message on to the server
      if (address === "/update/workspace/" + workspaceID + "/cueList/" + cueListID + "/playbackPosition") {
          console.log(args[0].value);
          send(qlabIP, 53000, '/cue_id/' + args[0].value + '/displayName');
          send(qlabIP, 53000, '/cue_id/' + args[0].value + '/number');
          return
      }
      
      // when receiving a reply with the name, interpret and send to server
      if (address.startsWith("/reply")) {
        var returnedValue = decodeQlabReply(args); // decode the reply to get the value requested
        if (address.endsWith("/displayName")) {
          receive(qlabIP, 53001, nameAddress, returnedValue) // send the name to the server
        } else if (address.endsWith("/number")) {
          receive(qlabIP, 53001, numAddress, returnedValue) // send the number to the server
        }
        return
      }

      if (address.endsWith("/disconnect")) {
        receive(qlabIP, 53001, "/NOTIFY", "Qlab is disconnected");
      }

      return {address, args, host, port}

  },

  // FILTER ALL OUTGOING MESSAGES - LOGS FOR DEBUGGING
  oscOutFilter:function(data){

    var {address, args, host, port, clientId} = data

    console.log("Send: " + address);

    return {address, args, host, port}
  }

}
