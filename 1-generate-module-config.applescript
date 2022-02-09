-- @description Get Unique IDs for Open Stage Control monitoring
-- @author Ben Smith
-- @link bensmithsound.uk
-- @version 3.1-beta1
-- @testedmacos 10.14.6
-- @testedqlab 4.6.10
-- @about 
--     Store this script in the directory you will be running the Open Stage Control custom module from, on that computer
--     Using remote file accesss over the network, open and run the script in script editor on your Main and Backup Qlab macs
--     Ensure QLab is open, and the current cue list is the one you wish to monitor
--     It will write to a config file in the root location
-- @separateprocess TRUE

-- @changelog
--   v3.1 + add displayTransport options


---- RUN SCRIPT ---------------------------

-- determine if this computer is MAIN or BACKUP
set thisMac to (choose from list {"Main", "Backup"} with title "Which QLab mac is this?") as string

checkMain(thisMac)

-- get the cue list to use
set theCueLists to getCueLists()
set thisCueList to chooseOption(theCueLists, "cue list")

-- get IP address of this computer
set listIPs to getIP()
set thisIP to chooseOption(listIPs, "IP address")

-- get TCP or UDP from the user
if thisMac is "Main" then
	set useProtocol to button returned of (display dialog "Would you like to use TCP or UDP to connect to Qlab? TCP is recommended" with title "Please select protocol" buttons {"TCP", "UDP", "Cancel"} default button "TCP" cancel button "Cancel")
	set displayTransport to button returned of (display dialog "Would you like to display transport controls?" with title "Transport controls" buttons {"Yes", "No", "Cancel"} default button "No" cancel button "Cancel")
else
	set useProtocol to "not needed"
	set displayTransport to "not needed"
end if

-- get QLab and Cue List info
tell application id "com.figure53.Qlab.4" to tell front workspace
	
	-- get unique IDs
	set thisWorkspaceID to unique id
	set thisCueListID to uniqueID of (first cue list whose q name is thisCueList)
	
end tell

-- format for JSON
if thisMac is "Main" then
	set jsonString to "	\"QlabMain\": {
		\"ip\": \"" & thisIP & "\",
		\"workspaceID\": \"" & thisWorkspaceID & "\",
		\"cueListID\": \"" & thisCueListID & "\"
	},
	\"QlabCount\": 1
}"
else if thisMac is "Backup" then
	set jsonString to "\"QlabBackup\": {
		\"ip\": \"" & thisIP & "\",
		\"workspaceID\": \"" & thisWorkspaceID & "\",
		\"cueListID\": \"" & thisCueListID & "\"
	},
	\"QlabCount\": 2
}"
end if

-- write to config file
writeToConfig(jsonString, thisMac, useProtocol, displayTransport)


-- FUNCTIONS ------------------------------

on getRootFolder()
	set thePath to path to me
	
	tell application "Finder"
		set thePath to parent of thePath
	end tell
end getRootFolder

on getCueLists()
	tell application id "com.figure53.Qlab.4" to tell front workspace
		
		set theCueLists to every cue list
		
		set theCueListNames to {}
		
		repeat with eachList in theCueLists
			set end of theCueListNames to q display name of eachList
		end repeat
		
		return theCueListNames
		
	end tell
end getCueLists

on getIP()
	try
		set theReturned to (do shell script "ifconfig | grep inet | grep -v inet6 | cut -d\" \" -f2")
		set theIPs to splitString(theReturned, "")
	on error
		set theIPs to {"Can't get Local IP"}
	end try
	return theIPs
end getIP

on chooseOption(theList, theName)
	set theOption to (choose from list theList with prompt "Choose " & theName) as string
	return theOption
end chooseOption

on checkConfig(thisMac, useProtocol, displayTransport)
	set configFile to ((getRootFolder() as text) & "qlab-info-config.json")
	if thisMac is "Main" then
		set configPreface to ¬
			"{
	\"control\": {
		\"address\": {
			\"name\": \"/next/name\",
			\"number\": \"/next/number\"
		},
		\"useTCP\": "
		
		if useProtocol is "TCP" then
			set configPreface to configPreface & "true"
		else if useProtocol is "UDP" then
			set configPreface to configPreface & "false"
		end if
		
		set configPreface to configPreface & ",
		\"displayTransport\": "
		
		if displayTransport is "Yes" then
			set configPreface to configPreface & "true"
		else if displayTransport is "No" then
			set configPreface to configPreface & "false"
		end if
		
		set configPreface to configPreface & "
	},
"
		
		writeToFile(configPreface, configFile, false)
	end if
	return configFile
end checkConfig

on checkMain(thisMac)
	set configFile to ((getRootFolder() as text) & "qlab-info-config.json")
	set configContents to readFile(configFile)
	if configContents is "error" and thisMac is "Backup" then
		display dialog "Please run this script on the Main Qlab first" with title "Alert" with icon stop
		error -128
	else if item -2 of configContents is "	\"QlabCount\": 2" and thisMac is "Backup" then
		display dialog "Please run this script on the Main Qlab first, to generate an updated config file" with title "Alert" with icon stop
		error -128
	end if
	log item -2 of configContents
end checkMain

on writeToConfig(theText, thisMac, useProtocol, displayTransport)
	set configFile to checkConfig(thisMac, useProtocol, displayTransport)
	
	if thisMac is "Main" then
		writeToFile(theText, configFile, true)
	else if thisMac is "Backup" then
		writeToFile(theText, configFile, "backup")
	end if
end writeToConfig

on writeToFile(thisData, targetFile, appendData) -- (string, file path as string, boolean)
	try
		set the targetFile to the targetFile as text
		set the openTargetFile to ¬
			open for access file targetFile with write permission
		if appendData is false then ¬
			set eof of the openTargetFile to 0
		if appendData is "backup" then ¬
			set eof of the openTargetFile to ((get eof of the openTargetFile) - 16)
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
