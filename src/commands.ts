import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as logger from './logger';

import { Command } from './models';
import { ArmaDev } from './armadev';
import * as armaTools from './helpers/armaTools';
import { runClient, runServer, prepareServer } from './helpers/runArma';
import { transferFiles } from './helpers/ftpTransfer';
import { DialogViewer } from './dialogViewer';
import { clearJuncFolders, createJuncFolders, IsJuncConfigured } from './helpers/juncFolder';

export class ArmaDevCommands {
    private ctx: vscode.ExtensionContext;
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

        this.registerCommand('armadev.previewControlOption');
        this.registerCommand('armadev.previewControlJump');
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
                        vscode.window.showInformationMessage('Run this command from explorer context for *.cpp files');
                        return;
                    }
                    await armaTools.binarizeConfig(args.fsPath);
                    vscode.window.showInformationMessage(path.basename(args.fsPath) + ' successfully binarized');
                    break;
                case 'armadev.unbinarizeFile':
                    if (!args) {
                        vscode.window.showInformationMessage('Run this command from explorer context for *.bin files');
                        return;
                    }
                    await armaTools.unbinarizeConfig(args.fsPath);
                    vscode.window.showInformationMessage(path.basename(args.fsPath) + ' successfully unbinarized');
                    break;
                case 'armadev.previewControl':
                    if (!args) {
                        vscode.window.showInformationMessage('Please run this command from explorer context menu');
                        return;
                    }

                    const filename = path.basename(args.fsPath);
                    const panel = vscode.window.createWebviewPanel(
                        'armadevPreview',
                        `Arma 3: ${filename}`,
                        vscode.ViewColumn.One,
                        {
                            enableScripts: true,
                            retainContextWhenHidden: true
                        }
                      );

                      const dialogMode = <number>vscode.workspace.getConfiguration('arma-dev').get('dialogAxisMode', 0);
                      const preview = new DialogViewer(this.ctx, panel.webview, { path: args.fsPath, mode: dialogMode });
                      panel.onDidDispose(() => preview.dispose());

                      try {
                        await preview.OutputHtml();
                      } catch {
                        vscode.window.showErrorMessage('Arma 3: Preview parser failed on ' + filename);
                        panel.dispose();
                      }
                    break;
                case 'armadev.previewControlJump':
                    vscode.workspace.openTextDocument(args.path).then((doc) => {
                        let pos = doc.positionAt(args.offset);

                        vscode.window.showTextDocument(doc).then((editor) => {
                            editor.selection = new vscode.Selection(pos, pos);
                            editor.revealRange(editor.selection);
                        });
                    });
                    break;
                case 'armadev.packFolders':
                    await armaTools.packFolder(true);
                    vscode.window.showInformationMessage('Arma 3: Build completed into ' + ArmaDev.Self.Config.buildPath);
                    break;
                case 'armadev.generateKey':
                    ok = await armaTools.generateKey();
                    if (ok) {
                        vscode.window.showInformationMessage('Save the private key into configuration?',
                        { title: 'Yes', isCloseAffordance: false },
                        { title: 'No', isCloseAffordance: false }).then((value) => {
                            if (value.title !== 'Yes') return;
                            ArmaDev.Self.Config.privateKey = ArmaDev.Self.Config.name + '.biprivatekey';
                            ArmaDev.Self.saveConfig();
                        });
                        vscode.window.showInformationMessage('BI keys successfully generated');
                    }
                    break;
                case 'armadev.runClientAndLog':
                    await runClient(true);
                    break;
                case 'armadev.runClient':
                    await runClient(false);
                    break;
                case 'armadev.runServer':
                    await prepareServer(this.ctx);
                    await runServer();
                    break;
                case 'armadev.transferFiles':
                    ok = await transferFiles();
                    if (ok) {
                        vscode.window.showInformationMessage('All files transfered to ' + ArmaDev.Self.Config.ftpConnection.host);
                    }
                    break;
                case 'armadev.codeLive':
                    let status = await IsJuncConfigured();

                    if (status === 1) {
                        await clearJuncFolders();
                        vscode.window.showInformationMessage('Arma 3: Code Live is now disabled and the PBO file is being used');
                    } else if (status === 0) {
                        await createJuncFolders();
                        vscode.window.showInformationMessage('Arma 3: Code Live is now enabled - You can edit the source now while Arma is running');
                    } else {
                        vscode.window.showWarningMessage('Arma 3: Code Live failed - Check the logfile for further steps');
                        logger.logError('Please try to remove the "x\\" folder from your Game directory completely and try again');
                        logger.logError('Also make sure you hae properly configured the $PBOPREFIX$ files for your addons');
                    }
                    break;
                case 'armadev.setupConfig':
                    ArmaDev.Self.openConfig();
                    break;
            }
            // post process any registered command (if exist in configuration)
            this.postProcessCall(cmdName);
        } catch (e) {
            vscode.window.showErrorMessage(e);
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