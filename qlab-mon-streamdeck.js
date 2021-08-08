/**
 * @description Qlab Cue list Monitoring with Streamdeck
 * @author Ben Smith
 * @link bensmithsound.uk
 * @version 1.0.0
 * @about Monitoring the next cue in a specific cue list on a Streamdeck
 * 
 * @changelog
 *   v1.0.0  - add ability to set variables from command line
 *           - streamline interpretation of Qlab replies
 *           - remove logging of replies
 */


const osc = require("osc"); // for working with OSC messages
const yargs = require("yargs"); // for optional setting variables by command line


/*************
 * VARIABLES *
 *************/

var cueListNumber = "CLICK";
var qlabIP = "127.0.0.1";
var qlabPort = 53000;
var companionIP = "127.0.0.1";
var companionPort = 12321;
var companionPage = 19;
var companionQNumButton = 15;
var companionQNameButton = 16;

var cueNumber = "";
var cueName = "";


/**********************************************
 * SET VARIABLES FROM COMMAND LINE (OPTIONAL) *
 **********************************************/

 const argv = yargs
 .option('cuelist', {
   alias: 'q',
   description: 'Cue number of the cue list whose playhead position you want to monitor',
   type: 'string',
 })
 .option('qlabip', {
   alias: 'qi',
   description: 'Remote IP address of the computer running Qlab',
   type: 'string',
 })
 .option('qlabport', {
   alias: 'qp',
   description: 'Port to send OSC messages to Qlab',
   type: 'number'
 })
 .option('displayip', {
   alias: 'di',
   description: 'Remote IP address of the computer to display information',
   type: 'string',
 })
 .option('displayport', {
   alias: 'd',
   description: 'Port to send OSC commands to display',
   type: 'number',
 })
 .option('companionpage', {
   alias: 'cp',
   description: 'Which streamdeck page on Bitfocus Companion to display the information on',
   type: 'number',
 })
 .option('cuenumberbutton', {
   alias: 'cqnum',
   description: 'Which button on your streamdeck to display the cue number',
   type: 'number',
 })
 .option('cuenamebutton', {
   alias: 'cqname',
   description: 'Which button on your streamdeck to display the cue name',
   type: 'number',
 })
 .help()
 .alias('help', 'h')
 .argv;

if (argv.cuelist) {
 cueListNumber = argv.cuelist
};

if (argv.qlabip) {
 qlabIP = argv.qlabip
};

if (argv.qlabport) {
 qlabPort = argv.qlabport
};

if (argv.displayip) {
 companionIP = argv.displayip
};

if (argv.displayport) {
 companionPort = argv.displayport
};

if (argv.companionpage) {
  companionPage = argv.companionpage
};

if (argv.cuenumberbutton) {
  companionQNumButton = argv.cuenumberbutton
};

if (argv.cuenamebutton) {
  companionQNameButton = argv.cuenamebutton
};


/*************
 * FUNCTIONS *
 *************/

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
    }, qlabIP, qlabPort)
  }
}

// Send an OSC message to Bitfocus Companion
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

// Poll Qlab for the current playhead position of cueListNumber (main loop)
function getCueListPlayhead () {
  sendToQlab("/cue/" + cueListNumber + "/playheadId");

  setTimeout(getCueListPlayhead, 300);
};

/****************
 * MAIN ROUTINE *
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

// ready the qlab replies port
qlabReplies.on("ready", function() {
  var ipAddresses = getIPAddresses();

  console.log("  STREAMDECK\nListening for OSC over UDP.");
  ipAddresses.forEach(function (address) {
    console.log(" Host:", address + ", Port:", qlabReplies.options.localPort);
  });
  console.log("Close this command line instance to exit")
});

// INTERPRET QLAB REPLIES
qlabReplies.on("message", function(oscMessage) {
  var replyData = JSON.parse(oscMessage.args[0]); // parse JSON reply as a JSON object
  
  // playhead position, cue id
  if(oscMessage.address.startsWith("/reply") && oscMessage.address.endsWith("/playheadId")) {
    cueID = replyData.data;
    if (cueID !== "none") {
      sendToQlab("/cue_id/" + cueID + "/number");
      sendToQlab("/cue_id/" + cueID + "/displayName");
    } else {
      sendToCompanion("/style/text/" + companionPage + "/" + companionQNumButton, "none");
      sendToCompanion("/style/text/" + companionPage + "/" + companionQNameButton, "no cue standing by");
    }
  // cue name response
  } else if(oscMessage.address.startsWith("/reply") && oscMessage.address.endsWith("/displayName")) {
    cueName = replyData.data;
    sendToCompanion("/style/text/" + companionPage + "/" + companionQNameButton, cueName);
  // cue number response
  } else if(oscMessage.address.startsWith("/reply") && oscMessage.address.endsWith("/number")) {
    cueNumber = replyData.data;
    sendToCompanion("/style/text/" + companionPage + "/" + companionQNumButton, cueNumber);
  };

});

// receive and also send messages on default port
udpPort.on("message", function (oscMessage) {
  var oscCommand = oscMessage.address;
  var oscArgument = oscMessage.args[0];
  console.log(oscCommand + "  |  " + oscArgument);
});

// catch errors
udpPort.on("error", function (err) {
  console.log(err);
});

qlabReplies.on("error", function(err) {
  console.log(err);
});

// open the ports
qlabReplies.open();
udpPort.open();
