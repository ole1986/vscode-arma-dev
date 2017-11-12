import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as logger from './logger';

import { TextDocumentContentProvider } from './providers/dialogProvider';
import { Command } from './models';
import { ArmaDev } from './armadev';
import * as armaTools from './helpers/armaTools';
import { runClient } from './helpers/runClient';
import { transferFiles } from './helpers/ftpTransfer';
import { DialogViewer } from './dialogViewer';

export class ArmaDevCommands {
    private schema = 'arma-dev';
    private commandList: string[];
    private ctx: vscode.ExtensionContext;
    constructor(context: vscode.ExtensionContext) {
        this.ctx = context;

        let extPackage = context.extensionPath + path.sep + 'package.json';
        let data = fs.readFileSync(extPackage, 'UTF-8');
        let packageJson = JSON.parse(data);
        let cmdList: Command[] = packageJson.contributes.commands;

        cmdList.forEach((value) => {
            this.registerCommand(value.command);
        });

        this.registerProvider();
    }

    private registerProvider() {
        let provider = new TextDocumentContentProvider();
        let registration = vscode.workspace.registerTextDocumentContentProvider(this.schema, provider);
        this.ctx.subscriptions.push(registration);
    }

    private registerCommand(cmd) {
        let disposable = vscode.commands.registerCommand(cmd, (args) => { this.runCommand(cmd, args); });
        this.ctx.subscriptions.push(disposable);
    }

    private async runCommand(cmdName: string, args: any) {
        let ok = false;

        try {
            switch (cmdName) {
                case 'armadev.binarizeFile':
                    if (!args) {
                        vscode.window.showInformationMessage('Please run this command from explorer context menu');
                        return;
                    }
                    await armaTools.binarizeConfig(args.fsPath);
                    break;
                case 'armadev.unbinarizeFile':
                    if (!args) {
                        vscode.window.showInformationMessage('Please run this command from explorer context menu');
                        return;
                    }
                    await armaTools.unbinarizeConfig(args.fsPath);
                    break;
                case 'armadev.previewControl':
                    if (!args) {
                        vscode.window.showInformationMessage('Please run this command from explorer context menu');
                        return;
                    }
                    let fileName = path.basename(args.fsPath);
                    vscode.commands.executeCommand('vscode.previewHtml', this.schema + '://authority/arma-dev?path=' + encodeURI(args.fsPath), vscode.ViewColumn.One, 'Dialog ' + fileName);
                    break;
                case 'armadev.packFolders':
                    await armaTools.packFolder(true);
                    break;
                case 'armadev.generateKey':
                    ok = await armaTools.generateKey();
                    if (ok) {
                        vscode.window.showQuickPick(['Yes', 'No'], { placeHolder: 'Save privateKey into configuration?' }).then((value) => {
                            if (value === 'Yes') {
                                ArmaDev.Self.Config.privateKey = ArmaDev.Self.Config.name + '.biprivatekey';
                                ArmaDev.Self.saveConfig();
                            }
                        });
                    }
                    break;
                case 'armadev.runClientAndLog':
                    await runClient(true);
                    break;
                case 'armadev.runClient':
                    await runClient(false);
                    break;
                case 'armadev.transferFiles':
                    ok = await transferFiles();
                    if (ok) {
                        vscode.window.showInformationMessage('All files transfered to ' + ArmaDev.Self.Config.ftpConnection.host);
                    }
                    break;
                case 'armadev.setupConfig':
                    ArmaDev.Self.openConfig();
                    break;
            }
        } catch (e) {
            logger.logError(e);
        }
    }
}