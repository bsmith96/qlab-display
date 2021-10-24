-- @description Get Unique IDs for Open Stage Control monitoring
-- @author Ben Smith
-- @link bensmithsound.uk
-- @version 2.0
-- @testedmacos 10.14.6
-- @testedqlab 4.6.10
-- @about 
--     Store this script in the directory you will be running the Open Stage Control custom module from, on that computer
--     Using remote file accesss over the network, open and run the script in script editor on your Main and Backup Qlab macs
--     Ensure QLab is open, and the current cue list is the one you wish to monitor
--     It will write to a config file in the root location
-- @separateprocess TRUE

-- @changelog
--   v2.0  + writes config automatically


---- RUN SCRIPT ---------------------------

-- determine if this computer is MAIN or BACKUP
set thisMac to (choose from list {"Main", "Backup", "Only"} with title "Which QLab mac is this?") as string

-- get IP address of this computer
set listIPs to getIP()
set thisIP to chooseIP(listIPs)

-- get QLab and Cue List info
tell application id "com.figure53.Qlab.4" to tell front workspace
	
	-- get unique IDs
	set thisWorkspaceID to unique id
	set thisCueListID to uniqueID of current cue list
	
end tell

-- format for JSON
if thisMac is "Main" then
	set jsonString to "	\"QlabCount\": 2,
	\"QlabMain\": {
		\"ip\": \"" & thisIP & "\",
		\"workspaceID\": \"" & thisWorkspaceID & "\",
		\"cueListID\": \"" & thisCueListID & "\"
	},
"
else if thisMac is "Backup" then
	set jsonString to "\"QlabBackup\": {
		\"ip\": \"" & thisIP & "\",
		\"workspaceID\": \"" & thisWorkspaceID & "\",
		\"cueListID\": \"" & thisCueListID & "\"
	}
}"
else if thisMac is "Only" then
	set jsonString to "	\"QlabCount\": 1,
	\"QlabMain\": {
		\"ip\": \"" & thisIP & "\",
		\"workspaceID\": \"" & thisWorkspaceID & "\",
		\"cueListID\": \"" & thisCueListID & "\"
	}
}"
end if

-- write to config file
writeToConfig(jsonString)


-- FUNCTIONS ------------------------------

on getRootFolder()
	set thePath to path to me
	
	tell application "Finder"
		set thePath to parent of thePath
	end tell
end getRootFolder

on getIP()
	try
		set theReturned to (do shell script "ifconfig | grep inet | grep -v inet6 | cut -d\" \" -f2")
		set theIPs to splitString(theReturned, "")
	on error
		set theIPs to {"Can't get Local IP"}
	end try
	return theIPs
end getIP

on chooseIP(theIPs)
	set theIP to (choose from list theIPs with prompt "Choose which IP to use") as string
	return theIP
end chooseIP

on checkConfig()
	set configFile to ((getRootFolder() as text) & "qlab-info-config.json")
	set configContents to readFile(configFile)
	if configContents is "error" then
		set configPreface to ¬
			"{
	\"control\": {
		\"address\": {
			\"name\": \"/next/name\",
			\"number\": \"/next/number\"
		}
	},
"
		
		writeToFile(configPreface, configFile, false)
	end if
	return configFile
end checkConfig

on writeToConfig(theText)
	set configFile to checkConfig()
	
	writeToFile(theText, configFile, true)
end writeToConfig

on writeToFile(thisData, targetFile, appendData) -- (string, file path as string, boolean)
	try
		set the targetFile to the targetFile as text
		set the openTargetFile to ¬
			open for access file targetFile with write permission
		if appendData is false then ¬
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
