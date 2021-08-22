/**
 * @description Qlab Cue list Monitoring
 * @author Ben Smith
 * @link bensmithsound.uk
 * @version 1.0.0
 * @about Monitoring the next cue in a specific cue list in terminal
 * 
 * @changelog
 *   v1.0.0  - Initial version for web server
 */

var osc = require("osc"),
  express = require("express"),
  WebSocket = require("ws");


/*******************************************
 ***************  VARIABLES  ***************
 *******************************************/

//const config = require('../config.json');

var cueListNumber = "CLICK";
var qlabIP = "192.168.68.122";
var qlabPort = 53000;

var cueNumber = "";
var cueName = "";


/*******************************************
 ***************  FUNCTIONS  ***************
 *******************************************/

// Send an OSC message to Qlab
function sendToQlab (theAddress, theArgs = "") {
  if (theArgs == "") {
    udpPort.send({
      address: theAddress
    }, qlabIP, qlabPort);
  } else {
    udpPort.send({
      address: theAddress,
      args: [
        theArgs
      ]
    }, )
  }
}

// Poll Qlab for the current playhead position of cueListNumber (main loop)
function getCueListPlayhead () {
  sendToQlab("/cue/" + cueListNumber + "/playheadId");

  setTimeout(getCueListPlayhead, 300);
};


/**********************************************
 ***************  MAIN ROUTINE  ***************
 **********************************************/

var getIPAddresses = function () {
 var os = require("os"),
     interfaces = os.networkInterfaces(),
     ipAddresses = [];

 for (var deviceName in interfaces) {
     var addresses = interfaces[deviceName];
     for (var i = 0; i < addresses.length; i++) {
         var addressInfo = addresses[i];
         if (addressInfo.family === "IPv4" && !addressInfo.internal) {
             ipAddresses.push(addressInfo.address);
         }
     }
 }

 return ipAddresses;
};

// Bind to a UDP socket to listen for incoming OSC events.
// default port, for sending OSC messages
var udpPort = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: 57121
});

// port for listening for replies from Qlab
var qlabReplies = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: 53001
});

// ready the default port for listening and sending
udpPort.on("ready", function () {  
  getCueListPlayhead() // start the loop to retrieve the playhead position once ready
});
 //console.log("To start the demo, go to http://localhost:8081 in your web browser.");

// ready the qlab replies port
qlabReplies.on("ready", function() {
  var ipAddresses = getIPAddresses();

  //console.log("  COMMAND LINE    -    " + config.production.name + "  <-  " + config.production.cuelistname);
  ipAddresses.forEach(function (address) {
    console.log(" Listening for Qlab replies at:    " + address + ":", qlabReplies.options.localPort);
  });
  console.log(" Sending to Qlab at:               " + qlabIP + ":", qlabPort);
  console.log("Close this command line instance to exit");
});

// INTERPRET QLAB REPLIES
qlabReplies.on("message", function(oscMessage) {
  var replyData = JSON.parse(oscMessage.args[0]); // parse JSON reply as a JSON object

  //playhead position, cue id
  if(oscMessage.address.startsWith("/reply") && oscMessage.address.endsWith("/playheadId")) {
    cueID = replyData.data;
    if (cueID !== "none") {
      sendToQlab("/cue_id/" + cueID + "/number");
      sendToQlab("/cue_id/" + cueID + "/displayName");
    } else {
      // no cue standing by
    }
  // cue name response
  } else if (oscMessage.address.startsWith("/reply") && oscMessage.address.endsWith("/displayName")) {
    cueName = replyData.data;
  // cue number response
  } else if (oscMessage.address.startsWith("/reply") && oscMessage.address.endsWith("/number")) {
    cueNumber = replyData.data;
  };
});

udpPort.open();
qlabReplies.open();

// Create an Express-based Web Socket server to which OSC messages will be relayed.
var appResources = __dirname + "/html",
 app = express(),
 server = app.listen(8081),
 wss = new WebSocket.Server({
     server: server
 });

app.use("/", express.static(appResources));
wss.on("connection", function (socket) {
 console.log("A Web Socket connection has been established!");
 var socketPort = new osc.WebSocketPort({
     socket: socket
 });

 var relay = new osc.Relay(qlabReplies, socketPort, {
     raw: true
 });
});
