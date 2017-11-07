import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as logger from '../logger'
import { binarizeConfig, unbinarizeConfig } from '../helpers/armaTools'

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('armadev.binarizeFile', () => {
        run();
    });

    let disposable2 = vscode.commands.registerCommand('armadev.unbinarizeFile', () => {
        run(true);
    });

    context.subscriptions.push(disposable);
    context.subscriptions.push(disposable2);
}

export async function run(unbinarize?: boolean) {
    let filePath = vscode.window.activeTextEditor.document.fileName;

    if(!unbinarize) {
        binarizeConfig(filePath).catch((reason) => logger.logError(reason));
    }else {
        unbinarizeConfig(filePath).catch((reason) => logger.logError(reason));
    }
}