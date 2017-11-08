'use strict';
import * as vscode from 'vscode';
import { ArmaDev } from './armadev';
import { ArmaDevCommands } from './commands';
import * as armaTools from './helpers/armaTools';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    new ArmaDev();
    new ArmaDevCommands(context);
    // make available the armaToos for other extensions
    // Usage: vscode.extensions.getExtension('ole1986.arma-dev').exports
    return armaTools;
}
// this method is called when your extension is deactivated
export function deactivate() {
}