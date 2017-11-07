import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as logger from '../logger'
import { packFolder } from '../helpers/armaTools'

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('armadev.packFolders', () => {
        run();
    });

    context.subscriptions.push(disposable);
}

export async function run() {
    packFolder(true).catch((reason) => logger.logError(reason));
}