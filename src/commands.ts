import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as logger from './logger';

import { TextDocumentContentProvider } from './providers/dialogProvider';
import { Command } from './models';
import { ArmaDev } from './armadev';
import * as armaTools from './helpers/armaTools';
import { runClient, runServer } from './helpers/runArma';
import { transferFiles } from './helpers/ftpTransfer';
import { DialogViewer } from './dialogViewer';
import { clearJuncFolders, createJuncFolders } from './helpers/juncFolder';

export class ArmaDevCommands {
    private commandList: string[];
    private ctx: vscode.ExtensionContext;
    private dialogProvider: TextDocumentContentProvider;
    private terminal: vscode.Terminal = vscode.window.createTerminal();

    constructor(context: vscode.ExtensionContext) {
        this.ctx = context;

        let extPackage = path.join(context.extensionPath, 'package.json');
        let data = fs.readFileSync(extPackage, 'UTF-8');
        let packageJson = JSON.parse(data);
        let cmdList: Command[] = packageJson.contributes.commands;

        cmdList.forEach((value) => {
            this.registerCommand(value.command);
        });

        this.registerProvider();
        this.registerCommand('armadev.previewControlOption');
        this.registerCommand('armadev.previewControlJump');
    }

    private registerProvider() {
        this.dialogProvider = new TextDocumentContentProvider();
        let registration = vscode.workspace.registerTextDocumentContentProvider(ArmaDev.Schema, this.dialogProvider);
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
                    this.dialogProvider.setPath(args.fsPath);
                    vscode.commands.executeCommand('vscode.previewHtml', ArmaDev.Schema + '://authority/arma-dev', vscode.ViewColumn.One, 'Dialog ' + fileName);
                    break;
                case 'armadev.previewControlOption':
                    this.dialogProvider.setMode(args.mode);
                    this.dialogProvider.Reload();
                    break;
                case 'armadev.previewControlJump':
                    vscode.workspace.openTextDocument(this.dialogProvider.getPath() ).then((doc) => {
                        let pos = doc.positionAt(args.offset);

                        vscode.window.showTextDocument(doc).then((editor) => {
                            editor.selection = new vscode.Selection(pos, pos);
                            editor.revealRange(editor.selection);
                        });
                    });
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
                case 'armadev.runServer':
                    await runServer();
                    break;
                case 'armadev.transferFiles':
                    ok = await transferFiles();
                    if (ok) {
                        vscode.window.showInformationMessage('All files transfered to ' + ArmaDev.Self.Config.ftpConnection.host);
                    }
                    break;
                case 'armadev.codeLive':
                    if (ArmaDev.Self.Config.codeLive) {
                        await clearJuncFolders();
                        vscode.window.showInformationMessage('Arma 3: Code Live is now disabled and the PBO file used');
                    } else {
                        await createJuncFolders(true);
                        vscode.window.showInformationMessage('Arma 3: Code Live is now enabled - You can edit the source now while Arma is running');
                    }
                    ArmaDev.Self.Config.codeLive = !ArmaDev.Self.Config.codeLive;
                    ArmaDev.Self.saveConfig();
                    break;
                case 'armadev.setupConfig':
                    ArmaDev.Self.openConfig();
                    break;
            }
            // post process any registered command (if exist in configuration)
            this.postProcessCall(cmdName);
        } catch (e) {
            logger.logError(e);
        }
    }

    private postProcessCall(cmdName) {
        if (ArmaDev.Self.Config.postProcess === undefined) return;
        let postProcess = ArmaDev.Self.Config.postProcess;
        cmdName = cmdName.replace('armadev.', '');
        if (postProcess[cmdName] === undefined) return;

        this.terminal.show();
        this.terminal.sendText(postProcess[cmdName]);
    }
}