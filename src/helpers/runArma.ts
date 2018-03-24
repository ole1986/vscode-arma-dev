import * as vscode from 'vscode';
import * as path from 'path';
import { spawn, exec, spawnSync } from 'child_process';
import * as fs from 'fs';
import { getSteamPath } from './getSteamPath';
import { ArmaDev } from '../armadev';
import { ArmaConfig } from '../models';
import * as logger from '../logger';
import { resolve } from 'path';
import { IsJuncConfigured } from './juncFolder';

const Arma3Folder = path.join('steamapps', 'common', 'Arma 3');
const Arma3AppData = path.join(process.env.LOCALAPPDATA, 'Arma 3');
const Arma3ServerAppData = path.join(Arma3AppData, 'ArmaDevServer');

let fsWatcher: fs.FSWatcher;
let fsWatcherSrv: fs.FSWatcher;

/**
 * Run the Arma client from its local machine
 * @param withLogging open the arma logfile in vscode
 */
export async function runClient(withLogging?: boolean): Promise<void> {
    let steamPath = await getSteamPath();
    if (steamPath === undefined) return;

    let config = ArmaDev.Self.Config;
    let clientModPath = path.normalize( path.join(vscode.workspace.rootPath, config.buildPath, ArmaDev.Self.ModClientName) );

    if (withLogging) {
        logger.logDebug('Watching for arma3 log file');
        watchClientLog(Arma3AppData);
    }

    return new Promise<void>((resolve, reject) => {
        let Arma3BattleyeExe = path.join(steamPath, Arma3Folder, 'arma3battleye.exe');

        logger.logInfo('Running Arma3 using its battleye exe');

        let additionalMods = '';
        if (config.clientMods && config.clientMods.length > 0) {
            additionalMods = ';' + config.clientMods.join(';');
        }

        let args = [
            '2', '1', '0', '-exe', 'arma3_x64.exe', // arma3 call through battleye
            '-mod=' + clientModPath + additionalMods,
            '-nosplash',
            '-world empty',
            '-skipIntro'
        ];

        IsJuncConfigured().then(status => {
            if (status === 1) {
                args.push('-filePatching');
            }
            spawn(Arma3BattleyeExe, args).on('exit', (code) => {
                if (code !== 0) {
                    reject('Failed to run Arma client');
                } else {
                    resolve();
                }
            });
        });
    });
}

export async function prepareServer(ctx: vscode.ExtensionContext, forceOverwrite: boolean = true): Promise<void> {
    let steamPath = await getSteamPath();
    if (steamPath === undefined) return;

    let serverCfgRes = path.join(ctx.extensionPath, 'resources', 'server.cfg');
    let missionFileRes = path.join(ctx.extensionPath, 'resources', 'mission.sqm');

    let serverCfgDest = path.join(Arma3ServerAppData, 'server.cfg');
    let missionFolderDest =  path.join(steamPath, Arma3Folder, 'mpmissions', 'ArmaDev.VR');
    let missionFileDest = path.join(missionFolderDest, 'mission.sqm');

    return new Promise<void>((resolve, reject) => {
        if (!forceOverwrite && fs.existsSync(serverCfgDest) && fs.existsSync(missionFileDest) ) {
            resolve();
            return;
        }

        // make sure Arma3 server profile exists by always creating the directories
        let proc = spawnSync('cmd', ['/c', 'mkdir', Arma3ServerAppData]);
        if (proc.error) {
            reject('Failed to create Arma3 profile directory' + Arma3ServerAppData);
            return;
        }
        // write the server.cfg into Arma3 Server profile
        fs.createReadStream(serverCfgRes).pipe(fs.createWriteStream(serverCfgDest));

        proc = spawnSync('cmd', ['/c', 'mkdir', missionFolderDest]);
        if (proc.error) {
            reject('Failed to create mission directory ' + missionFolderDest);
            return;
        }
        // write the mission.sqm into mpmission folder located in <GameFolder>\mpmission
        fs.createReadStream(missionFileRes).pipe(fs.createWriteStream(missionFileDest));
        resolve();
    });
}

export async function runServer(): Promise<void> {
    let steamPath = await getSteamPath();
    if (steamPath === undefined) return;

    let config = ArmaDev.Self.Config;
    let serverModPath = path.normalize(path.join(vscode.workspace.rootPath, config.buildPath, ArmaDev.Self.ModServerName));

    logger.logDebug('Watching for arma3server log file');
    watchServerLog(Arma3ServerAppData);

    return new Promise<void>((resolve, reject) => {
        let armaExe = config.serverUse32bit ? 'arma3server.exe' : 'arma3server_x64.exe';
        let Arma3ServerExe = '"' + path.join(steamPath, Arma3Folder, armaExe) + '"';

        let serverModStr = serverModPath;
        if (config.serverMods && config.serverMods.length > 0) {
            serverModStr += ';' + config.serverMods.join(';');
        }

        let args = '-autoInit  "-profiles=' + Arma3ServerAppData + '" "-config=' + path.join(Arma3ServerAppData, 'server.cfg') + '" -serverMod=' + serverModStr;

        if (config.serverParams) {
            args += ' ' + config.serverParams;
        }

        logger.logInfo('Running Arma3Server: ' + args);

        exec(Arma3ServerExe + ' ' + args).on('exit', (code, signal) => {
            if (code !== 0) {
                reject('Failed to run Arma3Server');
            } else {
                resolve();
            }
        });
    });
}

/**
 * Watch a directory for a newly added file we assume its the actual log file being created
 * and display it in vscode
 * @param fullPath the folder path to watch for new file(s)
 */
async function watchClientLog(fullPath: string): Promise<void> {
    if (fsWatcher !== undefined) return;

    fsWatcher = fs.watch(fullPath, (event, fileName) => {
        let logfile = path.join(fullPath, fileName);
        logger.logInfo('Opening Arma3 logfile: ' + logfile);
        fsWatcher.close();
        fsWatcher = undefined;
        vscode.workspace.openTextDocument(logfile).then((doc) => vscode.window.showTextDocument(doc, vscode.ViewColumn.Three));
    });
}

async function watchServerLog(fullPath: string): Promise<void> {
    if (fsWatcherSrv !== undefined) return;

    fsWatcherSrv = fs.watch(fullPath, (event, fileName) => {
        let logfile = path.join(fullPath, fileName);
        logger.logInfo('Opening Arma3 logfile: ' + logfile);
        fsWatcherSrv.close();
        fsWatcherSrv = undefined;
        vscode.workspace.openTextDocument(logfile).then((doc) => vscode.window.showTextDocument(doc, vscode.ViewColumn.One));
    });
}

