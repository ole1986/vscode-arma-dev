import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as logger from '../logger';
import { ArmaDev } from '../armadev';
import * as fs from 'fs';

let steamPath: string;

/**
 * Get the steam path by requesting the installation path from registry using reg query
 */
export async function getSteamPath(): Promise<string> {
    let globalSteamPath = ArmaDev.Self.Config.steamPath;

    if (globalSteamPath == null || globalSteamPath === '') {
        globalSteamPath = vscode.workspace.getConfiguration('arma-dev').get('steamPath');
    }

    if (globalSteamPath !== null && globalSteamPath !== '') {
        if (fs.existsSync(globalSteamPath) && fs.lstatSync(globalSteamPath).isDirectory()) {
            return Promise.resolve(globalSteamPath);
        }
        return Promise.reject('Invalid steam path: ' + globalSteamPath);
    }

    if (steamPath !== undefined) {
        return Promise.resolve(steamPath);
    }

    return new Promise<string>((resolve, reject) => {
        let regCallback = function (error: any, stdout: any, stderr: any) {
            let m = stdout.toString().match(/SteamPath\s+REG_SZ\s+([^\r\n]+)\s*\r?\n/i);

            if (!m) {
                vscode.window.showErrorMessage('No Steam installation found in registry');
                reject('No steam installation found');
            } else {
                steamPath = m[1].replace(/\//g, '\\');
                logger.logDebug('Steam installation found in ' + steamPath);
                resolve(steamPath);
            }
        };

        exec('reg query HKCU\\Software\\Valve\\Steam /v SteamPath', regCallback);
    });
}

