import * as vscode from 'vscode';
import * as path from 'path';
import { spawn, exec } from 'child_process';
import * as fs from 'fs';
import { getSteamPath } from './getSteamPath';
import { ArmaDev } from '../armadev';
import { ArmaConfig } from '../models';
import * as logger from '../logger';

const Arma3Folder = path.sep + 'steamapps' + path.sep + 'common' + path.sep + 'Arma 3';
const Arma3AppData = process.env.LOCALAPPDATA + path.sep + 'Arma 3';
let fsWatcher: fs.FSWatcher;

/**
 * Run the Arma client from its local machine
 * @param withLogging open the arma logfile in vscode
 */
export async function runClient(withLogging?: boolean): Promise<string> {
    let steamPath = await getSteamPath();
    if (steamPath === undefined) return;

    let config = ArmaDev.Self.Config;
    let clientModPath = path.normalize(vscode.workspace.rootPath + path.sep + config.buildPath + path.sep + '@' + config.name);

    if (fsWatcher === undefined && withLogging) {
        logger.logDebug('Watching for arma3 log files');
        fsWatcher = fs.watch(Arma3AppData, openClientLog);
    }

    return new Promise<string>((resolve, reject) => {
        let Arma3BattleyeExe = steamPath + Arma3Folder + path.sep + 'arma3battleye.exe';

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
        
        spawn(Arma3BattleyeExe, args);
    });
}

async function openClientLog(event: string , fileName: string): Promise<void> {
    fsWatcher.close();
    fsWatcher = undefined;
    logger.logInfo('Opening Arma3 logfile: ' + Arma3AppData + path.sep + fileName);
    vscode.workspace.openTextDocument( Arma3AppData + path.sep + fileName).then((doc) => vscode.window.showTextDocument(doc));
}
