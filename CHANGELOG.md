# Release Notes

Use `Arma 3: Run Server` to start an arma3server instance locally.
It is shipped with a default server configuration (server.cfg) and mission file (mission.sqm)

* server.cfg located in `%APPDATA%\Arma 3\ArmaDevServer\server.cfg`
* mission.sqp located in `<GameDir>\mpmissions\ArmaDev.VR`

The server parameters are properly set by default, you only need to run it.
Of course, the logfile will be opened, too

All done to make `Arma 3: Code Live` work more smoothly

## 0.0.12

* support for 32bit arma3server (configurable)
* fixed fileWatcher to open the *.rpt log files only when running server / client
* fixed Arma 3 client launch when noch clientDirs defined

## 0.0.11

* use 64bit arma3server
* always overwrite the `config.cfg` and `mission.sqm` when running with `Arma 3: Run Server`

## 0.0.10

* include symlinks for server related source when using "Code Live"
* added `serverMods` setting and `Arma 3: Run Server` command
* added resource files (`server.cfg` and `mission.sqm`) to configure a "default" server

## 0.0.9

* Updated Readme only

## 0.0.8

* new feature: "Toggle Code Live" to edit source while arma is running

## 0.0.7

* implemented a "post processing" option to run additional scripts - see Post Processing for more details

## 0.0.6

* truncate the dialog control x and y axis (but configurable / see Extension Settings)
* goto to line when dialog control is clicked from the preview

## 0.0.5

* implemented a DialogControl previewer (only works on proper formated *.hpp files / tested with safeZone only)

## 0.0.4

* hotfix `Arma 3: Configure` was broken at start
* command title correction

## 0.0.3

* implemented SFTP connection to transfer files to server
* fixed binarize commands when executed from non-context

## 0.0.2

* run arma with mods included (configurable / default: current project)
* fixed AddonBuilder when building client pbo files (packonly mode with signing)

## 0.0.1

* Initial release