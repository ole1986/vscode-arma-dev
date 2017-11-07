# Arma Dev

Building Arma 3 mod made easier using the Arma Dev tooling extension
This Visual Studio Code extensions will optimize your workflow on building and singing pbo's, automate execution and installations.

## Features

* Build your extension or add existing into the Arma-Dev configuration
* Generate private keys
* Pack server and client pbo files (incl. signing) with a single command
* Install the client mod into the correct game directory
* Run and debug (using *.RPT file) on the fly

## Usage

Before using the Arma Dev please make sure you have properly installed the Arma 3 Tools.
Open your existing Arma (server / client) and run the `Arma 3: Configure` command the setup the project.

Please refer to the **Configuration** section for further details

Below you can find all available commands

* `Arma 3: Configure`: to setup the project
* `Arma 3: Pack`: to pack pbos defined in your configuration file
* `Arma 3: Binarize`: binarize cpp files from explorer context menu
* `Arma 3: UnBinarize`: Unbinarize bin files from explorer context menu
* `Arma 3: Run`: to start the game from your local computer
* `Arma 3: Run (With Logging)`: to start the game and display the logfile
* `Arma 3: Install Client`: to install the client addon into your local game directory

## Configuration

The configuration file is located in `.vscode/arma-dev.json` and contains the following options.

* `title`: The title of your project (no used yet)
* `name`: The short name of the addon (this name is used as output folder)
* `buildPath`: destination folder of all pbo files being generated
* `privateKey`: the private key path being used to sign the client addon
* `serverDir`: all server directories a pbo files should be created for (E.g. core and core_config)
* `clientDirs`: all client directories a pbo files should be created for (ussualy its one or none)
* `version`: a version number to track possible changes (not immplemented)

## Requirements

* Arma 3 Tools (http://store.steampowered.com/app/233800/Arma_3_Tools/?l=german)
* Visual Studio Code

PLEASE MAKE SURE STEAM IS RUNNING AS IT IS REQUIRED FOR PACKING

## Extension Settings

* `arma-dev.logLevel`: setup the log level (Info | Debug | Error)

## Release Notes

Very first release of Arma Dev

### 0.0.1

Initial release