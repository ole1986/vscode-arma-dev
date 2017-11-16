# Arma Dev

Building Arma 3 mod made easier using the Arma Dev tooling extension
This Visual Studio Code extensions will optimize your workflow on building and signing pbo's, preview dialog controls and automate execution and installation.

![Getting Started](https://raw.githubusercontent.com/ole1986/vscode-arma-dev/master/images/arma-dev.gif)
![DialogControl preview](https://raw.githubusercontent.com/ole1986/vscode-arma-dev/master/images/arma-dev-dialog.gif)

## Features

* Build your extension or add existing into the Arma-Dev configuration
* Pack server and client pbo files (incl. signing) with a single command
* Preview Dialog control files (*.hpp)
* Generate private keys
* Install the client mod into the correct game directory
* Run and debug (using *.RPT file) on the fly

## Usage

Before using the Arma Dev extension, please make sure you have properly installed the Arma 3 Tools from Steam.

Open your existing Arma (server / client) and run the `Arma 3: Configure` command to setup the project.
Please refer to the **Configuration** section for further details

Below you can find all available commands

* `Arma 3: Configure`: to setup the project
* `Arma 3: Pack`: to pack pbos defined in your configuration file
* `Arma 3: Binarize`: binarize cpp files from explorer context menu
* `Arma 3: UnBinarize`: Unbinarize bin files from explorer context menu
* `Arma 3: Run`: to start the game from your local computer
* `Arma 3: Run (With Logging)`: to start the game and display the logfile
* `Arma 3: Generate Key`: generate a private key to sign the client pbo's
* `Arma 3: Transfer Files`: transfer server pbos to destination server using SFTP
* `Arma 3: Toggle Code Live`: please read the below "Toggle Code Live" section for further details

## Configuration

The configuration file is located in `.vscode/arma-dev.json` and contains the following options.

* `title`: The title of your project (no used yet)
* `name`: The short name of the addon (this name is used as output folder)
* `author`: author name
* `buildPath`: destination folder of all pbo files being generated
* `privateKey`: the private key path being used to sign the client addon
* `serverDir`: all server directories a pbo files should be created for (E.g. core and core_config)
* `clientDirs`: all client directories a pbo files should be created for (ussualy its one or none)
* `clientMods`: additional client mods being loaded when running arma 3
* `version`: a version number to track possible changes (not immplemented)
* `ftpConnection`: setup SFTP connection using host, username and password (optionally path)
* `ftpConnectionFile`: setup SFTP connection by using a separate file
* `postProcess`: run some additional scripts once a command has been successfully executed - see "Post Processing"

## Toggle Code Live

Code live is taking advantage of using symbolic links refering to the source code instead of using a PBO file.
This allows you to immediately apply changes in game.

BE AWARE: Some code need to be reloaded differently, some are blocked from being reloaded (E.g. the use of `compileFinal`)

Also, to enable the use of folders inside the addons directory it is required to execute the game with `-filePatching` [startup parameter](https://community.bistudio.com/wiki/Arma_3_Startup_Parameters).
When running the command `Arma 3: Run` this extension is taking care of all parameters.

## Post Processing

The post processing option (defined in `.vscode/arma-dev.json`) can be helpful to run additional tasks once a command has been successfully executed.
An example of running a script when for instance *all files are transfered to the remote* can look the following:

```
"postProcess": { 
    "transferFiles": "./restart-server.ps1"
}
```

Please note these commands are always executed locally

## Requirements

* Arma 3 Tools (http://store.steampowered.com/app/233800/Arma_3_Tools/)
* Visual Studio Code

PLEASE MAKE SURE STEAM IS RUNNING AS IT IS REQUIRED FOR PACKING

## Extension Settings

* `arma-dev.logLevel`: setup the log level (Info | Debug | Error)
* `arma-dev.dialogAxisMode`: How to display the dialog control axis (0 = truncated, 1 = original) **restart required**

## TODO

* implement installation command for client / server
* allow remote file transfer of unencrypted connections

## Release Notes

A new feature "Toggle Code Live" implemented to immediately apply code changes while Arma is running.
Please read the section "Toggle Code Live" for further details

### 0.0.8

* new feature: "Toggle Code Live" to edit source while arma is running

### 0.0.7

* implemented a "post processing" option to run additional scripts - see Post Processing for more details

### 0.0.6

* truncate the dialog control x and y axis (but configurable / see Extension Settings)
* goto to line when dialog control is clicked from the preview

### 0.0.5

* implemented a DialogControl previewer (only works on proper formated *.hpp files / tested with safeZone only)

### 0.0.4

* hotfix `Arma 3: Configure` was broken at start
* command title correction

### 0.0.3

* implemented SFTP connection to transfer files to server
* fixed binarize commands when executed from non-context

### 0.0.2

* run arma with mods included (configurable / default: current project)
* fixed AddonBuilder when building client pbo files (packonly mode with signing)

### 0.0.1

* Initial release