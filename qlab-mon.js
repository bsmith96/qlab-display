// @description Qlab Cue List Monitoring
// @author Ben Smith
// @link bensmithsound.uk
// @version 0.1.0
// @about Monitoring the next cue in a specified cue list in terminal


const osc = require("osc");


/*************
 * VARIABLES *
 *************/

const cueListNumber = "CLICK";
const qlabIP = "127.0.0.1";
const qlabPort = 53000;

var cueNumber = "";
var cueName = "";


/*************
 * FUNCTIONS *
 *************/

// Poll qlab for playhead of cue list

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

function getCueListPlayhead () {
  sendToQlab("/cue/" + cueListNumber + "/playhead");

  setTimeout(getCueListPlayhead, 300);
};

/****************
 * OSC Over UDP *
 ****************/

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

// default port

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
  var ipAddresses = getIPAddresses();

  console.log("qlab-mon.js | Listening for OSC over UDP.");
  ipAddresses.forEach(function (address) {
      console.log(" Host:", address + ", Port:", udpPort.options.localPort);
  });
  
  getCueListPlayhead()

});

// ready the qlab replies port

qlabReplies.on("ready", function() {
  console.log("Listening for Qlab replies!");
});

// interpret Qlab replies

qlabReplies.on("message", function(oscMessage) {
  var replyData = JSON.parse(oscMessage.args[0]); // parse JSON reply as a JSON object
  if(oscMessage.address == "/reply/settings/audio/outputChannelNames") { // get names of output channels
    var deviceOneChannelNames = replyData.data["1"];
    console.log(deviceOneChannelNames);
  } else if(oscMessage.address.startsWith("/reply") && oscMessage.address.endsWith("/displayName")) { // get name of cue at playhead
    cueName = replyData.data
    console.clear();
    //console.log({cueNumber, cueName});
    console.log(cueNumber + ": " + cueName);
  } else if(oscMessage.address == "/reply/cue/" + cueListNumber + "/playhead") {
    cueNumber = replyData.data;
    sendToQlab("/cue/" + cueNumber + "/displayName")
  };

});

// receive and also send messages on default port

udpPort.on("message", function (oscMessage) {
  var oscCommand = oscMessage.address;
  var oscArgument = oscMessage.args[0];
  console.log(oscCommand + "  |  " + oscArgument);
});

udpPort.on("error", function (err) {
  console.log(err);
});

qlabReplies.open();
udpPort.open();

