# Qlab Display

[![GitHub license](https://img.shields.io/github/license/bsmith96/qlab-display.svg)](https://github.com/bsmith96/qlab-display/blob/master/LICENSE)
[![GitHub release](https://img.shields.io/github/release/bsmith96/qlab-display.svg)](https://GitHub.com/bsmith96/qlab-display/releases/)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/F1F120U9I)

# Custom Module for Open Stage Control

This version runs entirely within the [Open Stage Control](http://openstagecontrol.ammd.net/) software, as a 'custom module'. It requests updates from Qlab when there are changes to the workspace, and interprets the responses appropriately - the module ignores responses which do not relate to the playhead position of the chosen cue list.

You can run the module with either a UDP or TCP connection to Qlab. I recommend using TCP, as this maintains a permanent connection to Qlab, increasing reliability, but with minimal CPU overhead. If you wish to use UDP, you must send a thump (heartbeat) message to Qlab to maintain the connection – to enable this, choose "UDP" when setting up the first applescript, or ensure `qlab-info-config.json` contains `control.useTCP = false`.

## Open Stage Control setup

- First, put the repository folder on the computer you wish to run the web-server from. Ensure the computer is on the network, and file sharing is enabled. Port 53000 (and 53001 if using UDP) must be open.
- On your Qlab computer, navigate to the above folder over the network and open '1-generate-module-config.applescript' in script editor.
  - Ensure your Qlab file is open, and the front-most Qlab workspace.
  - Run the script - this will create 'qlab-info-config.json' in the root folder.
  - The first dialog box asks you to define the Qlab computer
    - If this is your only Qlab computer, or if this is your "Main" or "A" machine, select "Main".
    - If you have a *main* and *backup* Qlab computer, ensure you run this setup process on the *main* first, then repeat the process on the *backup*, selecting "Backup", to complete the config file.
  - The second dialog box allows you to choose the cue list you wish to monitor.
  - The third dialog box asks you which local IP address you wish to use. If your computer is on multiple networks, e.g. a control network and a [Dante](https://www.audinate.com/meet-dante/what-is-dante) network, this allows you to select the correct one.
    - **NB**: 127.0.0.1 is the localhost address.
    - **NB**: If you can only see 127.0.0.1, try cmd+F "set theIPs to splitString(theReturned". Replace the line break (between the 2 quote marks) with `\r` and re-compile, and save.
- If you are running the server on a mac:
  - On the computer running the server, open '2-generate-app-config.applescript' in script editor, and run the script. This will create 'qlab-display.config'.
  - Open **Open Stage Control**.
  - Select *Load* and open 'qlab-display.config'.
  - Click start to launch the OSC & web server.
- If you are running the server on a non-mac computer:
  - Set the following settings in the launcher:
    - **load**: select the file `qlab-display_layout.json`
    - **custom-module**: select the file `qlab-display_module.js`
    - **port**: this is the port that the web server is served to. Leave this blank to use the default 8080.
    - **no-gui**: if you do not want the display open on the device which is the server, set this to true.
    - **IF USING UDP**
      - **osc-port**: set 53001. This is the port it will listen for replies from.
    - **IF USING TCP**
      - **tcp-port**: set 53001. 
      - **tcp-targets**: set \[Qlab IP\]:53000 (e.g. `127.0.0.1:53000`). Use a space to separate multiple instances, e.g. Main and Backup.
  - Now, click start to launch the OSC & web server.

My suggested setup is to run the Open Stage Control server at Front Of House (for example, on the System computer), with the local GUI active, so the Sound No. 1 can see that it is working correctly. Then, the remote display for the MD is simply a browser window.

This has the added advantage that, if the Sound No 1 has to switch to the Backup Qlab computer due to issues with the Main, or the Main computer crashing entirely, they can hit the "BACKUP" button on the viewer, which also switches it for the MD.

If you ever need to re-generate 'qlab-info-config.json', you can simply run the process again. This might happen if you bundle the workspace.

# Screenshots

## Launching Open Stage Control Module (using TCP)
![Launching Open Stage Control Module (TCP)](_images/A_Open_Stage_Control_Module_Launcher.png)

## Open Stage Control Module
![Open Stage Control Module](_images/B_Open_Stage_Control_Module.png)

## Module disconnected from Qlab
![Open Stage Control Module](_images/C_Open_Stage_Control_Disconnected.png)

