var qlabDisplay = qlabDisplay || {};

var cueNumber = "";
var cueName = "";

(function () {
  "use strict";

  qlabDisplay.OscReplies = function () {
    this.oscPort = new osc.WebSocketPort({
      url: "ws://localhost:8081"
    });

    this.listen();
    this.oscPort.open();

    this.oscPort.socket.onmessage = function (e) {
      console.log("message", e);
    };
  };

  qlabDisplay.OscReplies.prototype.listen = function () {
    this.oscPort.on("message", this.mapMessage.bind (this));
    this.oscPort.on("message", function (msg) {
      console.log("message", msg);
    });
    this.oscPort.on("close", this.pause.bind(this));
  };

  qlabDisplay.OscReplies.prototype.pause = function () {
    this.synth.pause();
  }

  qlabDisplay.OscReplies.prototype.mapMessage = function (oscMessage) {
    //$("#message").text(fluid.prettyPrintJSON(oscMessage));

    var address = oscMessage.address;
    var value = oscMessage.args[0];

    // INTERPRET QLAB REPLIES
    var replyData = JSON.parse(value); // parse JSON reply as a JSON object

    if(address.startsWith("/reply") && address.endsWith("/displayName")) {
      cueName = replyData.data;
      $("#cuename").text(replyData.data);
    } else if(address.startsWith("/reply") && address.endsWith("/number")) {
      cueNumber = replyData.data;
      $("#cuenumber").text(replyData.data);
    };

    $("#cuenumber").text(cueNumber);
    $("#cuename").text(cueName);

  };
}());