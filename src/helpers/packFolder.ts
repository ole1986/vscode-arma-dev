import * as vscode from 'vscode';
import * as path from 'path';
import { spawn, exec } from 'child_process';
import * as fs from 'fs';
import { getSteamPath } from './getSteamPath'
import { getConfig } from '../commands/setupConfig'
import { ArmaConfig } from '../models'
import * as logger from '../logger'

const Arma3Tools = path.sep + 'steamapps' + path.sep + 'common' + path.sep + 'Arma 3 Tools';

let steamPath : string;
let config : ArmaConfig;

export async function packFolder(withPrefix: boolean): Promise<string> {
    steamPath = await getSteamPath();
    config = getConfig();

    return new Promise<string>((resolve, reject) => {
        if(steamPath == '') {
            reject('No Steam found');
            return;
        }

        if(config === undefined) {
            reject('No configuration found');
            return;
        }

        config.serverDirs.forEach(p => {
            packWithFileBank(vscode.workspace.rootPath + path.sep + p, withPrefix).catch(reject);
        });
    });
}

async function packWithFileBank(folderDir: string, withPrefix: boolean) : Promise<boolean> {
    let fileBankPath = steamPath + Arma3Tools + path.sep + "FileBank" + path.sep + "FileBank.exe";

    return new Promise<boolean>((resolve, reject) => {
        let prefixFile;

        if(withPrefix) {
            ["$PBOPREFIX$", "$PREFIX$"].forEach(p => {
                let found = fs.existsSync(folderDir + path.sep + p);
                if(found) {
                    prefixFile = p;
                    return;
                }
            });
            
            if(prefixFile === undefined) {
                reject('No prefix file found in ' + folderDir);
                return;
            }

        } 

        let prefixValue = fs.readFileSync(folderDir + path.sep + prefixFile, "UTF-8");

        logger.logInfo("Packing " + folderDir + " using FileBank (prefix: "+prefixValue+")");
        exec("\"" + fileBankPath + "\" -property prefix=" + prefixValue + " -dst \"" + vscode.workspace.rootPath + path.sep + config.buildPath + path.sep + "@" + config.name + "Server" + path.sep + "addons\" \"" + folderDir + "\"");
    });
}

async function  packWithAddonBuilder(folderDir: string, signFile: string ) {
    
}