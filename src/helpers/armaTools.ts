import * as vscode from 'vscode';
import * as path from 'path';
import { spawn, exec } from 'child_process';
import * as fs from 'fs';
import * as logger from '../logger';

import { getSteamPath } from './getSteamPath';
import { ArmaDev } from '../armadev';
import { ArmaConfig } from '../models';

const Arma3Tools = path.sep + 'steamapps' + path.sep + 'common' + path.sep + 'Arma 3 Tools';
let workingDir: string = vscode.workspace.workspaceFolders[0].uri.fsPath;

let steamPath: string;

/**
 * method to pack folders into pbo files
 * It uses the FileBank to pack server folders defined in config.serverDirs (incl. prefix property).
 * For clientDirs it uses the AddonBuilder to pack only and sign the pbo files
 * @param withPrefix include the prefix ($PREFIX$ or $PBOPREFIX$)
 */
export async function packFolder(withPrefix: boolean): Promise<string> {
    steamPath = await getSteamPath();
    if (steamPath === undefined) return;
    let config = ArmaDev.Self.Config;
    return new Promise<string>((resolve, reject) => {
        if (config === undefined) {
            reject('No configuration found');
            return;
        }

        if (!fs.existsSync(workingDir + path.sep + config.buildPath)) {
            fs.mkdirSync(workingDir + path.sep + config.buildPath);
        }

        config.serverDirs.forEach(p => {
            packWithFileBank(p, withPrefix).catch(reject);
        });

        // make sure client folder exist
        let clientPath = workingDir + path.sep + config.buildPath + path.sep + '@' + config.name;
        if (!fs.existsSync(clientPath)) {
            fs.mkdirSync(clientPath);
        }

        config.clientDirs.forEach(p => {
            packWithAddonBuilder(p, false, true).catch(reject);
        });

        addModInfo(clientPath);
    });
}

/**
 * Binarize a file using CfgConvert and output as *.bin in the same folder
 * @param filePath the file to be binarize
 */
export async function binarizeConfig(filePath: string): Promise<boolean> {
    steamPath = await getSteamPath();
    if (steamPath === undefined) return;

    let config = ArmaDev.Self.Config;

    let cfgconvertPath = steamPath + Arma3Tools + path.sep + 'CfgConvert' + path.sep + 'CfgConvert.exe';

    let extName = path.extname(filePath);
    let destPath = path.dirname(filePath) + path.sep + path.basename(filePath, extName ) + '.bin';

    return new Promise<boolean>((resolve, reject) => {
        if (extName !== '.cpp') {
            reject('Only cpp files supported');
            return;
        }
        spawn(cfgconvertPath, ['-bin', '-dst', destPath, filePath]).on('error', reject);
    });
}

/**
 * Unbinarize a file using CfgConvert and output as *.cpp in the same folder
 * @param filePath the file to be unbinarized
 */
export async function unbinarizeConfig(filePath: string): Promise<boolean> {
    steamPath = await getSteamPath();
    if (steamPath === undefined) return;

    let cfgconvertPath = steamPath + Arma3Tools + path.sep + 'CfgConvert' + path.sep + 'CfgConvert.exe';
    let extName = path.extname(filePath);
    let destPath = path.dirname(filePath) + path.sep + path.basename(filePath, extName) + '.cpp';

    return new Promise<boolean>((resolve, reject) => {
        if (extName !== '.bin') {
            reject('Only bin files supported');
            return;
        }
        spawn(cfgconvertPath, ['-txt', '-dst', destPath, filePath]).on('error', reject);
    });
}

/**
 * Generate a private BI key by using the config.name as authority
 * Two files will be generated:
 * - <authority>.bikey
 * - <authority>.biprivatekey
 */
export async function generateKey(): Promise<boolean> {
    steamPath = await getSteamPath();
    if (steamPath === undefined) return;

    let config = ArmaDev.Self.Config;

    return new Promise<boolean>((resolve, reject) => {
        let possiblePrivateKey = config.name.toLowerCase();

        if (fs.existsSync(workingDir + path.sep + possiblePrivateKey)) {
            vscode.window.showInformationMessage('PrivateKey already exist');
            return;
        }

        let dsCreatePath = steamPath + Arma3Tools + path.sep + 'DSSignFile' + path.sep + 'DSCreateKey.exe';
        spawn(dsCreatePath, [possiblePrivateKey], { cwd: workingDir }).on('error', reject).on('exit', (code) => {
            resolve(code === 0);
        });
    });
}

async function packWithFileBank(folderDir: string, withPrefix: boolean): Promise<boolean> {
    let config = ArmaDev.Self.Config;
    let fileBankPath = steamPath + Arma3Tools + path.sep + 'FileBank' + path.sep + 'FileBank.exe';

    return new Promise<boolean>((resolve, reject) => {
        let prefixFile;

        if (!fs.existsSync(fileBankPath)) {
            reject('FileBank not found');
            return;
        }

        if (withPrefix) {
            ['$PBOPREFIX$', '$PREFIX$'].forEach(p => {
                let found = fs.existsSync(workingDir + path.sep + folderDir + path.sep + p);
                if (found) {
                    prefixFile = p;
                    return;
                }
            });
            if (prefixFile === undefined) {
                reject('No prefix file found in ' + folderDir);
                return;
            }
        }

        let prefixValue = fs.readFileSync(workingDir + path.sep + folderDir + path.sep + prefixFile, 'UTF-8');

        logger.logInfo('Packing ' + folderDir + ' using FileBank (prefix: ' + prefixValue + ')');
        spawn(fileBankPath, ['-property', 'prefix=' + prefixValue, '-dst', config.buildPath + path.sep + '@' + config.name + 'Server' + path.sep + 'addons', folderDir],  { cwd: workingDir });
    });
}

async function packWithAddonBuilder(folderDir: string, binarize: boolean, sign: boolean ): Promise<boolean> {
    let config = ArmaDev.Self.Config;
    let addonBuilderPath = steamPath + Arma3Tools + path.sep + 'AddonBuilder' + path.sep + 'AddonBuilder.exe';
    let privateKey = config.privateKey.toLowerCase();
    let fullFolderPath: string = workingDir + path.sep + folderDir;
    let fullBuildPath: string = workingDir + path.sep + config.buildPath + path.sep + '@' + config.name + path.sep + 'addons';
    let fullPrivateKeyPath: string = workingDir + path.sep + privateKey;

    return new Promise<boolean>((resolve, reject) => {
        if (!fs.existsSync(addonBuilderPath)) {
            reject('AddonBuilder not found');
            return;
        }

        let args = [];

        args.push(fullFolderPath, fullBuildPath);
        args.push('-clear');
        args.push('-packonly');

        if (sign && privateKey && fs.existsSync(fullPrivateKeyPath)) {
            args.push('-sign=' + fullPrivateKeyPath);
        }

        logger.logInfo('Packing ' + folderDir + ' using AddonBuilder');
        spawn(addonBuilderPath, args, {cwd: workingDir }).on('error', reject);
    });
}

async function addModInfo(modDir: string) {
    let config = ArmaDev.Self.Config;
    let destPath = modDir + path.sep + 'mod.cpp';
    let data: string = '';

    data += 'name = "' + config.title + ' [v' + config.version + ']";\n';
    data += 'author = "' + config.author + '";\n';

    if (config.website) {
        data += 'actionName = "Website";\n';
        data += 'action = "' + config.website + '";\n';
    }
    fs.writeFile(destPath, data);
}