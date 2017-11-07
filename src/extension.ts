'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { getSteamPath } from './helpers/getSteamPath';
import * as setupConfig from './commands/setupConfig';
import * as packFolders from './commands/packFolders';
import * as runClient from './commands/runClient';
import * as binarizeFile from './commands/binarizeFile';
import * as bin from './commands/runClient';


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    setupConfig.activate(context);
    packFolders.activate(context);
    runClient.activate(context);
    binarizeFile.activate(context);
}

// this method is called when your extension is deactivated
export function deactivate() {
}