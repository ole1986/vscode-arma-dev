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
        if(!steamPath) {
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

        // make sure client folder exist
        let clientPath = vscode.workspace.rootPath + path.sep + config.buildPath + path.sep + "@" + config.name;
        if (!fs.existsSync(clientPath)) {
            fs.mkdirSync(clientPath);
        }

        config.clientDirs.forEach(p => {
            packWithAddonBuilder(vscode.workspace.rootPath + path.sep + p, false, config.privateKey);
        });

        addModInfo(clientPath);
    });
}

export async function binarizeConfig(filePath: string) : Promise<boolean> {
    steamPath = await getSteamPath();

    let cfgconvertPath = steamPath + Arma3Tools + path.sep + "CfgConvert" + path.sep + "CfgConvert.exe";

    let extName = path.extname(filePath);
    let destPath = path.dirname(filePath) + path.sep + path.basename(filePath, extName ) + ".bin";

    return new Promise<boolean>((resolve, reject) => {
        if (!steamPath) {
            reject('No Steam found');
            return;
        }

        if(extName !== '.cpp') {
            reject("Only cpp files supported");
            return;
        }
        
        spawn(cfgconvertPath, ['-bin', '-dst', destPath, filePath]).on('error', reject);
    });
}

export async function unbinarizeConfig(filePath: string) : Promise<boolean> {
    steamPath = await getSteamPath();

    let cfgconvertPath = steamPath + Arma3Tools + path.sep + "CfgConvert" + path.sep + "CfgConvert.exe";
    let extName = path.extname(filePath);
    let destPath = path.dirname(filePath) + path.sep + path.basename(filePath, extName) + ".cpp";

    return new Promise<boolean>((resolve, reject) => {
        if (!steamPath) {
            reject('No Steam found');
            return;
        }
        
        if (extName !== '.bin') {
            reject("Only bin files supported");
            return;
        }
        
        spawn(cfgconvertPath, ['-txt', '-dst', destPath, filePath]).on('error', reject);
    });
}

async function packWithFileBank(folderDir: string, withPrefix: boolean) : Promise<boolean> {
    let fileBankPath = steamPath + Arma3Tools + path.sep + "FileBank" + path.sep + "FileBank.exe";

    return new Promise<boolean>((resolve, reject) => {
        let prefixFile;

        if(fs.existsSync(fileBankPath)) {
            reject("FileBank not found");
            return;
        }

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

async function packWithAddonBuilder(folderDir: string, binarize: boolean, keyFile?: string ) : Promise<boolean> {
    let addonBuilderPath = steamPath + Arma3Tools + path.sep + "AddonBuilder" + path.sep + "AddonBuilder.exe";
    let args : string[] = [];
    let buildPath: string = vscode.workspace.rootPath + path.sep + config.buildPath + path.sep + "@" + config.name + path.sep + "addons";
    let privateKeyPath: string = vscode.workspace.rootPath + path.sep + config.privateKey;

    return new Promise<boolean>((resolve, reject) => {
        
        if (fs.existsSync(addonBuilderPath)) {
            reject("AddonBuilder not found");
            return;
        }

        args.push(folderDir, buildPath);
        args.push("-clear");

        if (keyFile && fs.existsSync(privateKeyPath)) {
            args.push("-sign=" + privateKeyPath);
        }

        logger.logInfo("Packing " + folderDir + " using AddonBuilder");
        spawn(addonBuilderPath, args).on('error', reject);
    });
}

async function addModInfo(modDir: string) {
    let destPath = modDir + path.sep + "mod.cpp";
    let data: string = "";

    data += 'name = "' + config.title + '<br /><t size=\'2\' color=\'#ffff00\'>v'+ config.version +'</t>"\n';
    if(config.website) {
        data += 'actionName = "Website"\n';
        data += 'action = "'+config.website+'"\n';
    }
    fs.writeFile(destPath, data);
}