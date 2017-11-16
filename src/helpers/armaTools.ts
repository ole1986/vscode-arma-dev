import * as vscode from 'vscode';
import * as path from 'path';
import { spawn, exec } from 'child_process';
import * as fs from 'fs';
import * as logger from '../logger';

import { getSteamPath } from './getSteamPath';
import { ArmaDev } from '../armadev';
import { ArmaConfig } from '../models';

const Arma3Tools = path.join('steamapps', 'common', 'Arma 3 Tools');
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

        if (!fs.existsSync( path.join(workingDir, config.buildPath))) {
            fs.mkdirSync( path.join(workingDir, config.buildPath));
        }

        config.serverDirs.forEach(p => {
            packWithFileBank(p, withPrefix).catch(reject);
        });

        // make sure client folder exist
        let clientPath = path.join(workingDir, config.buildPath, ArmaDev.Self.ModClientName);
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

    let cfgconvertPath = path.join(steamPath, Arma3Tools, 'CfgConvert', 'CfgConvert.exe');

    let extName = path.extname(filePath);
    let destPath = path.join(path.dirname(filePath), path.basename(filePath, extName) + '.bin');

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

    let cfgconvertPath = path.join(steamPath, Arma3Tools, 'CfgConvert', 'CfgConvert.exe');
    let extName = path.extname(filePath);
    let destPath = path.join(path.dirname(filePath), path.basename(filePath, extName) + '.cpp');

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

        if (!fs.existsSync(fileBankPath)) {
            reject('FileBank not found');
            return;
        }

        let prefixValue = getPrefixFromFile(folderDir);
        if (withPrefix && prefixValue === '') {
            reject('No $PBOPREFIX$ file found');
            return;
        }

        logger.logInfo('Packing ' + folderDir + ' using FileBank (prefix: ' + prefixValue + ')');
        spawn(fileBankPath, ['-property', 'prefix=' + prefixValue, '-dst', path.join(config.buildPath,  ArmaDev.Self.ModServerName, 'addons'), folderDir],  { cwd: workingDir });
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
        }

        logger.logInfo('Packing ' + folderDir + ' using AddonBuilder');
        spawn(addonBuilderPath, args, {cwd: workingDir }).on('error', reject);
    });
}

export function getPrefixFromFile(folderDir: string): string {
    let prefixFile = path.join(workingDir, folderDir, '$PBOPREFIX$');

    if (!fs.existsSync(prefixFile)) {
        return '';
    }

    return fs.readFileSync(prefixFile, 'UTF-8');
}

async function addModInfo(modDir: string) {
    let config = ArmaDev.Self.Config;
    let destPath = path.join(modDir, 'mod.cpp');
    let data: string = '';

    data += 'name = "' + config.title + ' [v' + config.version + ']";\n';
    data += 'author = "' + config.author + '";\n';

    if (config.website) {
        data += 'actionName = "Website";\n';
        data += 'action = "' + config.website + '";\n';
    }
    fs.writeFile(destPath, data);
}