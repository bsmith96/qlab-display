-- @description Create Open Stage Control server setup
-- @author Ben Smith
-- @link bensmithsound.uk
-- @version 2.0
-- @testedmacos 10.14.6
-- @testedqlab 4.6.10
-- @about Creates a file to open/load in Open Stage Control, with settings required to start the server.

-- @changelog
--   v2.0  + change filenames


---- DECLARATIONS -------------------------

use framework "Foundation"
use scripting additions

property ca : a reference to current application
property NSData : a reference to ca's NSData
property NSDictionary : a reference to ca's NSDictionary
property NSJSONSerialization : a reference to ca's NSJSONSerialization
property NSString : a reference to ca's NSString
property NSUTF8StringEncoding : a reference to 4


---- RUN SCRIPT ---------------------------

set qlabConfig to getConfig()

set configFile to ((getRootFolder() as text) & "qlab-display.config")

set configContents to "{"

if useTCP of control of qlabConfig is true then
	set configContents to configContents & "\"tcp-port\":53001,\"tcp-targets\":[\""
	
	set configContents to configContents & |ip| of QlabMain of qlabConfig & ":53000\""
	
	if QlabCount of qlabConfig is 2 then
		set configContents to configContents & ",\"" & |ip| of QlabBackup of qlabConfig & ":53000\""
	end if
	
	set configContents to configContents & "],"
	
end if

set rootFolder to getRootFolder()
set rootFolder to rootFolder as text
set rootFolder to POSIX path of alias rootFolder

set configContents to configContents & "\"load\":\"" & rootFolder & "qlab-display_layout.json\",\"custom-module\":\"" & rootFolder & "qlab-display_module.js\""

if useTCP of control of qlabConfig is false then
	set configContents to configContents & ",\"osc-port\":53001"
end if

set configContents to configContents & "}"


writeToFile((configContents as text), configFile, false)



-- FUNCTIONS ------------------------------

on JSONtoRecord from fp
	local fp
	
	set JSONdata to NSData's dataWithContentsOfFile:fp
	
	set [x, E] to (NSJSONSerialization's Â
		JSONObjectWithData:JSONdata Â
			options:0 Â
			|error|:(reference))
	
	if E ­ missing value then error E
	
	tell x to if its isKindOfClass:NSDictionary then Â
		return it as record
	
	x as list
end JSONtoRecord

on getConfig()
	set qlabConfigFile to ((getRootFolder() as text) & "qlab-info-config.json")
	set qlabConfigPOSIX to POSIX path of qlabConfigFile
	set qlabConfig to JSONtoRecord from qlabConfigPOSIX
	return qlabConfig
end getConfig

on getRootFolder()
	set thePath to path to me
	
	tell application "Finder"
		set thePath to parent of thePath
	end tell
end getRootFolder

on writeToFile(thisData, targetFile, appendData) -- (string, file path as string, boolean)
	try
		set the targetFile to the targetFile as text
		set the openTargetFile to Â
			open for access file targetFile as Çclass furlÈ with write permission
		if appendData is false then Â
			set eof of the openTargetFile to 0
		write thisData to the openTargetFile starting at eof
		close access the openTargetFile
		return true
	on error
		try
			close access file targetFile
		end try
		return false
	end try
end writeToFile

on readFile(theFile)
	try
		set theFile to theFile as text
		set fileContents to paragraphs of (read file theFile)
		
		return fileContents
	on error
		return "error"
	end try
end readFile

on splitString(theString, theDelimiter)
	-- save delimiters to restore old settings
	set oldDelimiters to AppleScript's text item delimiters
	-- set delimiters to delimiter to be used
	set AppleScript's text item delimiters to theDelimiter
	-- create the array
	set theArray to every text item of theString
	-- restore old setting
	set AppleScript's text item delimiters to oldDelimiters
	-- return the array
	return theArray
end splitString