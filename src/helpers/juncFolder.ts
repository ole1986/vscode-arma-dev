import * as vscode from 'vscode';
import * as path from 'path';
import { spawn, exec, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as logger from '../logger';

import { ArmaDev } from '../armadev';
import { ArmaConfig } from '../models';

let workingDir: string = vscode.workspace.workspaceFolders[0].uri.fsPath;

export async function juncBuildFolders(removePbo: boolean): Promise<void> {
    let config = ArmaDev.Self.Config;
    let clientAddonsFolder = path.join(workingDir, config.buildPath, ArmaDev.Self.ModClientName, 'addons');
    let serverAddonsFolder = path.join(workingDir, config.buildPath, ArmaDev.Self.ModServerName, 'addons');

    return new Promise<void>((resolve, reject) => {
        let success = true;

        config.clientDirs.forEach((value) => {
            let pboName = path.basename(value);
            let pboFile = path.join(clientAddonsFolder, pboName + '.pbo');

            if (removePbo && fs.existsSync( pboFile)) fs.unlink(pboFile);

            if (isJuncFolder( path.join(clientAddonsFolder, pboName))) return;
            let p = spawnSync('cmd', ['/c', 'mklink', '/J', pboName, path.join(workingDir, value)], { cwd: clientAddonsFolder });
            if (p.error) success = false;
        });

        config.serverDirs.forEach((value) => {
            let pboName = path.basename(value);
            let pboFile = path.join(serverAddonsFolder, pboName + '.pbo');

            if (removePbo && fs.existsSync(pboFile)) fs.unlink(pboFile);

            if (isJuncFolder(path.join(serverAddonsFolder, pboName))) return;
            let p = spawnSync('cmd', ['/c', 'mklink', '/J', pboName, path.join(workingDir, value)], { cwd: serverAddonsFolder });
            if (p.error) success = false;
        });

        if(success)
            resolve();
        else
            reject('Error while creating junction folders');
    });
}

export async function unjuncBuildFolders(): Promise<void> {
    let config = ArmaDev.Self.Config;
    let addonFolders = [
        path.join(workingDir, config.buildPath, ArmaDev.Self.ModClientName, 'addons'), 
        path.join(workingDir, config.buildPath, ArmaDev.Self.ModServerName, 'addons')
    ];

    return new Promise<void>((resolve, reject) => {
        let success = true;

        addonFolders.forEach((folder) => {
            let juncDirs = fs.readdirSync(folder).map(name => path.join(folder, name)).filter(isJuncFolder);
            juncDirs.forEach((value) => {
                let p = spawnSync('cmd', ['/c', 'rmdir', value]);
                if (p.error) success = false;
            });
        });

        if (success)
            resolve();
        else
            reject('Error while removing junction folders');
    });
}

function isJuncFolder(pathToCheck: string): boolean {
    if(!fs.existsSync(pathToCheck)) return false;
    let stat = fs.lstatSync(pathToCheck);
    return stat.isSymbolicLink();
}

