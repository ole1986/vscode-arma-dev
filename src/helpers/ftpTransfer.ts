import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as logger from '../logger';

import * as SFTPClient from 'sftpjs';
import { ArmaDev } from '../armadev';
import { ArmaConfig } from '../models';

let workingDir: string = vscode.workspace.workspaceFolders[0].uri.fsPath;
let ftpClient = new SFTPClient({ debug: function (e) { logger.logDebug(e); } });

export async function transferFiles(): Promise<boolean> {
    let config: ArmaConfig = ArmaDev.Self.Config;

    if (!config.ftpConnection) {
        vscode.window.showWarningMessage('No ftp connection defined yet. Please check the ArmaDev configuration');
        return;
    }
    if (!config.ftpConnection.host) {
        vscode.window.showWarningMessage('No ftp host defined in configuration');
        return;
    }
    if (!config.ftpConnection.isSecure) {
        vscode.window.showWarningMessage('Only sftp  is supported. Set isSecure = true to use it');
        return;
    }

    let modAddonServerDir = ArmaDev.Self.ModServerName + '/addons';

    if (config.ftpConnection.path) {
        modAddonServerDir = config.ftpConnection.path + '/' + modAddonServerDir;
    }

    return new Promise<boolean>((resolve, reject) => {
        ftpClient.on('ready', () => {
            ftpMakeDirs(ftpClient, modAddonServerDir).then(() => {
                let promises = preparePutFiles();

                Promise.all(promises).then((p) => {
                    resolve(true);
                }).catch(reject);
            });
        }).connect({
            host: config.ftpConnection.host,
            user: config.ftpConnection.username,
            password: config.ftpConnection.password
        });
    });
}

async function ftpMakeDirs(client, localDir: string): Promise<void> {
    let normPath = localDir.replace(/\\/g, '/');

    return new Promise<void>((resolve, reject) => {
        client.mkdir(normPath, true, (err) => {
            if (err) reject(err);
            resolve();
        });
    });
}

function walkFiles(dir) {
    let results = [];
    let list = fs.readdirSync(dir);
    list.forEach(function (file) {
        file = dir + '\\' + file;
        let stat = fs.statSync(file);
        if (stat && stat.isDirectory()) results = results.concat(walkFiles(file));
        else results.push(file);
    });
    return results;
}

function preparePutFiles() {
    let config: ArmaConfig = ArmaDev.Self.Config;
    let putPromises = [];
    let listFiles = walkFiles( path.join(workingDir, config.buildPath, ArmaDev.Self.ModServerName) );

    listFiles.forEach((filePath) => {
        let relativePath = filePath.replace( path.join(workingDir, config.buildPath), '').replace(/\\/g, '/');

        if (config.ftpConnection.path) {
            relativePath = config.ftpConnection.path + '/' + relativePath;
        }

        putPromises.push(new Promise((resolve, reject) => {
            ftpClient.put(filePath, relativePath, null, (err) => {
                if (err) {
                    reject(err);
                } else {
                    logger.logInfo('Transferred ' + relativePath);
                    resolve();
                }
            });
        }));
    });

    return putPromises;
}