import * as vscode from 'vscode';
import * as path from 'path';
import { spawn, exec, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as logger from '../logger';

import { ArmaDev } from '../armadev';
import { ArmaConfig } from '../models';

let workingDir: string = vscode.workspace.workspaceFolders[0].uri.fsPath;

export async function juncClientFolders(): Promise<boolean> {
    let config = ArmaDev.Self.Config;
    let addonsFolder = path.join(workingDir, config.buildPath, ArmaDev.Self.ModClientName, 'addons');

    return new Promise<boolean>((resolve, reject) => {
        config.clientDirs.forEach((value) => {
            let pboName = path.basename(value);
            let pboFile = path.join(addonsFolder, pboName + '.pbo');

            if (fs.existsSync( pboFile)) {
                fs.unlink(pboFile);
            }

            if(isJuncFolder(addonsFolder + path.sep + pboName)) return;
            spawn('cmd', ['/c', 'mklink', '/J', pboName, workingDir + path.sep + value], { cwd: addonsFolder });
        });
    });
}

export async function unjuncClientFolders(): Promise<boolean> {
    let config = ArmaDev.Self.Config;
    let addonsFolder = path.join(workingDir, config.buildPath, ArmaDev.Self.ModClientName, 'addons');

    return new Promise<boolean>((resolve, reject) => {
        let juncDirs = fs.readdirSync(addonsFolder).map(name => path.join(addonsFolder, name)).filter(isJuncFolder);
        juncDirs.forEach((value) => {
            spawn('cmd', ['/c', 'rmdir', value]);
        });
    });
}

function isJuncFolder(pathToCheck: string): boolean {
    if(!fs.existsSync(pathToCheck)) return false;
    let stat = fs.lstatSync(pathToCheck);
    return stat.isSymbolicLink();
}

