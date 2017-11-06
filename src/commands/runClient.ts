import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as logger from '../logger'
import { runClient } from '../helpers/runClient'

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('armadev.runClient', () => {
        run();
    });
    let disposable2 = vscode.commands.registerCommand('armadev.runClientAndLog', () => {
        run(true);
    });

    context.subscriptions.push(disposable);
    context.subscriptions.push(disposable2);
}

export async function run(withLogging?: boolean) {
    runClient(withLogging);
    //packFolder(true).catch((reason) => logger.logError(reason));
}