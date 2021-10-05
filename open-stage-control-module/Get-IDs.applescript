-- @description Get Unique IDs for Open Stage Control monitoring
-- @author Ben Smith
-- @link bensmithsound.uk
-- @version 1.0
-- @testedmacos 10.14.6
-- @testedqlab 4.6.10
-- @about Run this script on your Qlab mac, with Qlab open on the cue list you wish to monitor remotely. Paste the result into the "workspaceID" and "cueListID" fields of open-stage-control-config.json.

-- @changelog
--   v1.0  + init


tell application id "com.figure53.Qlab.4" to tell front workspace
	
	-- get unique IDs
	set workspaceID to unique id
	set cueListID to uniqueID of current cue list
	
	-- write text to paste in config file
	set jsonString to "\"workspaceID\":\"" & workspaceID & "\",
  \"cueListID\": \"" & cueListID & "\","
	
	-- copy the text
	set the clipboard to jsonString
	
	-- confirm
	display dialog jsonString with title "Copied to clipboard!"
	
end tell
