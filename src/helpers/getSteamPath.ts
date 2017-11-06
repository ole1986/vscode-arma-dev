import * as vscode from 'vscode';
import * as path from 'path';
import { spawn, exec } from 'child_process';
import * as fs from 'fs';
import * as logger from '../logger'

let steamPath: string;

export async function getSteamPath(): Promise<string> {
    if (steamPath !== undefined) {
        return Promise.resolve(steamPath);
    }

    return new Promise<string>((resolve, reject) => {
        let regCallback = function (error: any, stdout: any, stderr: any) {
            if (error && error.code !== 0) {
                error.stdout = stdout.toString();
                error.stderr = stderr.toString();
                reject(error);
                return;
            }

            let installPath : string;
            installPath = stdout.toString().match(/SteamPath\s+REG_SZ\s+([^\r\n]+)\s*\r?\n/i)[1];
          
            if (installPath) {
                steamPath = installPath.replace(/\//g, "\\");
                logger.logDebug("Steam installation found in " + steamPath);
                resolve(steamPath);
            } else {
                reject();
            }
        };

        exec("reg query HKCU\\Software\\Valve\\Steam /v SteamPath", regCallback);
    });
}

