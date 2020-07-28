import * as vscode from 'vscode';
import * as path from 'path';
import { spawn, exec, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as logger from '../logger';

import { getSteamPath } from './getSteamPath';
import { ArmaDev } from '../armadev';

const Arma3Tools = path.join('steamapps', 'common', 'Arma 3 Tools');
let workingDir: string = vscode.workspace.workspaceFolders[0].uri.fsPath;
let steamPath: string;

/**
 * method to pack folders into pbo files
 * It uses the FileBank to pack server folders defined in config.serverDirs (incl. prefix property).
 * For clientDirs it uses the AddonBuilder to pack only and sign the pbo files
 * @param withPrefix include the prefix ($PREFIX$ or $PBOPREFIX$)
 */
export async function packFolder(withPrefix: boolean): Promise<any> {
    steamPath = await getSteamPath();
    if (steamPath === undefined) return;
    let config = ArmaDev.Self.Config;

    if (config === undefined) {
        return Promise.reject('No configuration found');
    }

    if (!fs.existsSync( path.join(workingDir, config.buildPath))) {
        fs.mkdirSync( path.join(workingDir, config.buildPath));
    }

    let promises = [];

    if (config.serverDirs !== undefined) {
        config.serverDirs.forEach(p => {
            promises.push( packWithFileBank(p, withPrefix));
        });
    }

    // make sure client folder exist
    let clientPath = path.join(workingDir, config.buildPath, ArmaDev.Self.ModClientName);
    if (!fs.existsSync(clientPath)) {
        fs.mkdirSync(clientPath);
    }

    if (config.clientDirs !== undefined) {
        config.clientDirs.forEach(p => {
            promises.push( packWithAddonBuilder(p, false, true));
        });
    }

    addModInfo(clientPath);

    return Promise.all(promises);
}

/**
 * Binarize a file using CfgConvert and output as *.bin in the same folder
 * @param filePath the file to be binarize
 */
export async function binarizeConfig(filePath: string): Promise<boolean> {
    steamPath = await getSteamPath();
    if (steamPath === undefined) return;

    let config = ArmaDev.Self.Config;

    let cfgconvertPath = path.join(steamPath, Arma3Tools, 'CfgConvert', 'CfgConvert.exe');

    let extName = path.extname(filePath);
    let destPath = path.join(path.dirname(filePath), path.basename(filePath, extName) + '.bin');

    return new Promise<boolean>((resolve, reject) => {
        if (extName !== '.cpp') {
            reject('Only cpp files supported');
            return;
        }
        spawn(cfgconvertPath, ['-bin', '-dst', destPath, filePath]).on('error', reject).on('close', (code) => {
            resolve(code === 0);
        });
    });
}

/**
 * Unbinarize a file using CfgConvert and output as *.cpp in the same folder
 * @param filePath the file to be unbinarized
 */
export async function unbinarizeConfig(filePath: string): Promise<boolean> {
    steamPath = await getSteamPath();
    if (steamPath === undefined) return;

    let cfgconvertPath = path.join(steamPath, Arma3Tools, 'CfgConvert', 'CfgConvert.exe');
    let extName = path.extname(filePath);
    let destPath = path.join(path.dirname(filePath), path.basename(filePath, extName) + '.cpp');

    return new Promise<boolean>((resolve, reject) => {
        let firstBytes = new Buffer([0x00, 0x00, 0x00, 0x00]);

        let f = fs.openSync(filePath, 'r');
        fs.readSync(f, firstBytes, 0, 4, 0);
        fs.closeSync(f);

        if (firstBytes.toString() !== '\x00\x72\x61\x50' ) {
            reject(path.basename(filePath) + ' is not a valid ArmaA binary file');
            return;
        }

        spawn(cfgconvertPath, ['-txt', '-dst', destPath, filePath]).on('error', reject).on('close', (code) => {
            resolve(code === 0);
        });
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

        if (fs.existsSync( path.join(workingDir, possiblePrivateKey))) {
            vscode.window.showInformationMessage('PrivateKey already exist');
            return;
        }

        let dsCreatePath = path.join(steamPath, Arma3Tools, 'DSSignFile', 'DSCreateKey.exe');
        spawn(dsCreatePath, [possiblePrivateKey], { cwd: workingDir }).on('error', reject).on('exit', (code) => {
            resolve(code === 0);
        });
    });
}

async function packWithFileBank(folderDir: string, withPrefix: boolean): Promise<boolean> {
    let config = ArmaDev.Self.Config;
    let fileBankPath = path.join(steamPath, Arma3Tools, 'FileBank', 'FileBank.exe');

    return new Promise<boolean>((resolve, reject) => {
        let prefixFile;
        let destinationPath = path.join(config.buildPath,  ArmaDev.Self.ModServerName, 'addons');
        let fileName = path.basename(folderDir) + '.pbo';

        if (!fs.existsSync(fileBankPath)) {
            reject('FileBank not found');
            return;
        }

        let prefixValue = getPrefixFromFile(folderDir);
        if (withPrefix && prefixValue === '') {
            reject('No $PBOPREFIX$ file found');
            return;
        }

        if (fs.existsSync(path.join(workingDir, destinationPath, fileName))) {
            fs.unlinkSync(path.join(workingDir, destinationPath, fileName));
        }

        logger.logDebug('Packing ' + folderDir + ' using FileBank (prefix: ' + prefixValue + ')');

        spawn(fileBankPath, ['-property', 'prefix=' + prefixValue, '-dst', destinationPath, folderDir],  { cwd: workingDir }).on('error', reject).on('close', (code) => {
            resolve(code === 0);
        });
    });
}

async function packWithAddonBuilder(folderDir: string, binarize: boolean, sign: boolean ): Promise<boolean> {
    let config = ArmaDev.Self.Config;
    let addonBuilderPath = path.join(steamPath, Arma3Tools, 'AddonBuilder', 'AddonBuilder.exe');
    let privateKey = config.privateKey.toLowerCase();
    let fullFolderPath: string = path.join(workingDir , folderDir);
    let fullBuildPath: string = path.join(workingDir, config.buildPath, ArmaDev.Self.ModClientName, 'addons');
    let fullPrivateKeyPath: string = path.join(workingDir, privateKey);

    return new Promise<boolean>((resolve, reject) => {
        if (!fs.existsSync(addonBuilderPath)) {
            reject('AddonBuilder not found');
            return;
        }

        let prefixValue = getPrefixFromFile(folderDir);
        if (prefixValue === '') {
            reject('No $PBOPREFIX$ file found');
            return;
        }

        let args = [];

        args.push(fullFolderPath, fullBuildPath);
        args.push('-clear');
        args.push('-packonly');
        args.push('-prefix=' + prefixValue);

        if (sign && privateKey && fs.existsSync(fullPrivateKeyPath)) {
            args.push('-sign=' + fullPrivateKeyPath);
        } else {
            vscode.window.showWarningMessage('No private key found.\nCheck the privateKey path in arma-dev.json or use "Arma 3: Generate Key"');
        }

        logger.logDebug('Packing ' + folderDir + ' using AddonBuilder');

        spawn(addonBuilderPath, args, {cwd: workingDir }).on('error', (err) => reject(err.message)).on('close', (code) => {
            resolve(code === 0);
        });
    });
}

export function getPrefixFromFile(relPath: string): string {
    let prefixFile = path.join(workingDir, relPath, '$PBOPREFIX$');

    if (!fs.existsSync(prefixFile)) {
        return '';
    }

    return fs.readFileSync(prefixFile, 'UTF-8');
}

function addModInfo(modDir: string) {
    let config = ArmaDev.Self.Config;
    let destPath = path.join(modDir, 'mod.cpp');
    let data: string = '';

    data += 'name = "' + config.title + ' [v' + config.version + ']";\n';
    data += 'author = "' + config.author + '";\n';

    if (config.website) {
        data += 'actionName = "Website";\n';
        data += 'action = "' + config.website + '";\n';
    }
    fs.writeFile(destPath, data, (err) => { logger.logError(err); });
}