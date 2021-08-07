// @description Qlab Cue List Monitoring with Streamdeck
// @author Ben Smith
// @link bensmithsound.uk
// @version 0.1.0
// @about Monitoring the next cue in a specified cue list using buttons on a Streamdeck


const osc = require("osc");


/*************
 * VARIABLES *
 *************/

const cueListNumber = "CLICK";
const qlabIP = "127.0.0.1";
const qlabPort = 53000;
const companionIP = "127.0.0.1";
const companionPort = 12321;
const companionPage = 19;
const companionQNumButton = 15;
const companionQNameButton = 16;

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
    }, qlabIP, qlabPort)
  }
}

function sendToCompanion (theAddress, theArgs = "") {
  if (theArgs == "") {
    udpPort.send({
      address: theAddress
    }, companionIP, companionPort);
  } else {
    udpPort.send({
      address: theAddress,
      args: [
        theArgs
      ]
    }, companionIP, companionPort)
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
    sendToCompanion("/style/text/" + companionPage + "/" + companionQNameButton, cueName);
    console.clear();
    //console.log({cueNumber, cueName});
    console.log(cueNumber + ": " + cueName);
  } else if(oscMessage.address == "/reply/cue/" + cueListNumber + "/playhead") {
    cueNumber = replyData.data;
    if (cueNumber !== "none") {
      sendToCompanion("/style/text/" + companionPage + "/" + companionQNumButton, cueNumber);
      sendToQlab("/cue/" + cueNumber + "/displayName");
    } else {
      sendToCompanion("/style/text/" + companionPage + "/" + companionQNumButton, "none");
      sendToCompanion("/style/text/" + companionPage + "/" + companionQNameButton, "no click standing by");
      console.clear();
      console.log("No cue");
    }
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

