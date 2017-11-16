import * as vscode from 'vscode';
import * as path from 'path';
import { spawn, exec, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as logger from '../logger';

import { ArmaDev } from '../armadev';
import { ArmaConfig } from '../models';

let workingDir: string = vscode.workspace.workspaceFolders[0].uri.fsPath;

export async function juncFolder(relativePath: string, destinationFolder: string): Promise<boolean> {
    let juncPath = workingDir + path.sep + relativePath;

    return new Promise<boolean>((resolve, reject) => {
        if (!fs.existsSync(destinationFolder)) {
            reject('Destination folder not found');
            return;
        }

        if (!isJuncFolder(juncPath)) {
            spawnSync('rmdir', [juncPath]);
            spawn('mklink', ['/J', path.basename(juncPath), ], { cwd: path.dirname(juncPath) });
        }
    });
}

export function isJuncFolder(pathToCheck: string): boolean {
    let stat = fs.statSync(pathToCheck);
    return stat.isSymbolicLink();
}

export async function unjuncFolder(relativePath: string): Promise<boolean> {
    let juncPath = workingDir + path.sep + relativePath;

    return new Promise<boolean>((resolve, reject) => {
        let juncPath = workingDir + path.sep + relativePath;
        if (fs.existsSync(juncPath) && isJuncFolder(juncPath)) {
            spawn('rmdir', [juncPath]);
        }
    });
}