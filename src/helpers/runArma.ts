import * as vscode from 'vscode';
import * as path from 'path';
import { spawn, exec } from 'child_process';
import * as fs from 'fs';
import { getSteamPath } from './getSteamPath';
import { ArmaDev } from '../armadev';
import { ArmaConfig } from '../models';
import * as logger from '../logger';
import { resolve } from 'path';

const Arma3Folder = path.join('steamapps', 'common', 'Arma 3');
const Arma3AppData = path.join(process.env.LOCALAPPDATA, 'Arma 3');
let fsWatcher: fs.FSWatcher;

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
        watchLogInFolder(Arma3AppData);
    }

    return new Promise<void>((resolve, reject) => {
        let Arma3BattleyeExe = path.join(steamPath, Arma3Folder, 'arma3battleye.exe');

        logger.logInfo('Running Arma3 using its battleye exe');

        let additionalMods = '';
        if (config.clientMods.length > 0) {
            additionalMods = ';' + config.clientMods.join(';');
        }

        let args = [
            '2', '1', '0', '-exe', 'arma3_x64.exe', // arma3 call through battleye
            '-mod=' + clientModPath + additionalMods,
            '-nosplash',
            '-world empty',
            '-skipIntro'
        ];

        if (config.codeLive) {
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
}

export async function runServer(): Promise<void> {
    let steamPath = await getSteamPath();
    if (steamPath === undefined) return;

    let config = ArmaDev.Self.Config;
    let serverModPath = path.normalize(path.join(vscode.workspace.rootPath, config.buildPath, ArmaDev.Self.ModServerName));

    return new Promise<void>((resolve, reject) => {
        let Arma3ServerExe = path.join(steamPath, Arma3Folder, 'arma3server.exe');

        logger.logInfo('Running Arma3Server locally');

        let args = [
            '-world=empty',
            '-mod=' + config.serverMods.join(';'),
            '-serverMod=' + serverModPath
        ];

        spawn(Arma3ServerExe, args).on('exit', (code) => {
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
async function watchLogInFolder(fullPath: string): Promise<void> {
    if (fsWatcher !== undefined) return;

    fsWatcher = fs.watch(fullPath, (event, fileName) => {
        let logfile = path.join(fullPath, fileName);
        logger.logInfo('Opening Arma3 logfile: ' + logfile);
        fsWatcher.close();
        fsWatcher = undefined;
        vscode.workspace.openTextDocument(logfile).then((doc) => vscode.window.showTextDocument(doc));
    });
}
