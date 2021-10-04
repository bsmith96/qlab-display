module.exports = {

  oscInFilter:function(data){

      var {address, args, host, port} = data;
      var otherAddress = "/cueName/is";
      console.log(address);

      if (address === "/update/workspace/141BFBC5-2966-4F87-88B2-33260C387FDA/cueList/650E7188-505F-40A1-BB0E-5C9DD95F460B/playbackPosition") {
          console.log(args[0].value);
          send("127.0.0.1", 53000, '/cue_id/' + args[0].value + '/displayName');
          return //{address, args, host, port}
      }

      if (address.startsWith("/reply") && address.endsWith("/displayName")) {
        //receive("/cueName/is", args[0]);
        console.log(args[0].value);
        var replyData = JSON.parse(args[0].value);
        console.log(replyData);
        var toReturn = replyData.data;
        console.log(replyData.data);
        receive("127.0.0.1", 53000, "/cueName/is", toReturn);
        //return {otherAddress, toReturn, host, port}
        return
      }

      return {address, args, host, port}

  },

  oscOutFilter:function(data){
    // Filter outgoing osc messages

    var {address, args, host, port, clientId} = data

    console.log("Send: " + address);

    // same as oscInFilter

    // return data if you want the message to be and sent
    return {address, args, host, port}
  }

}
