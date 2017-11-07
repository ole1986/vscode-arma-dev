import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as logger from './logger'
import { ArmaDev } from './armadev'
import * as armaTools from './helpers/armaTools'
import { runClient } from './helpers/runClient'

export class ArmaDevCommands {
    private commandList : string[];
    private ctx: vscode.ExtensionContext;
    
    constructor(context: vscode.ExtensionContext) {
        this.ctx = context;
        this.commandList = [
            "armadev.setupConfig",
            "armadev.packFolders",
            "armadev.runClientAndLog",
            "armadev.runClient",
            "armadev.binarizeFile",
            "armadev.unbinarizeFile",
            "armadev.generateKey"
        ]
        this.registerCommands();
    }

    private registerCommands() {
        this.commandList.forEach((cmd => {
            let disposable = vscode.commands.registerCommand(cmd, (args) => { this.runCommand(cmd, args) })
            this.ctx.subscriptions.push(disposable);
        }));
    }

    private async runCommand(cmdName: string, args: any){
        try {
            switch (cmdName) {
                case "armadev.binarizeFile":
                    await armaTools.binarizeConfig(args.fsPath);
                    break;
                case "armadev.unbinarizeFile":
                    await armaTools.unbinarizeConfig(args.fsPath);
                    break;
                case "armadev.packFolders":
                    await armaTools.packFolder(true);
                    break;
                case "armadev.generateKey":
                    let ok = await armaTools.generateKey();
                    if (!ok) {
                        vscode.window.showQuickPick(["Yes", "No"], { placeHolder: "Save privateKey into configuration?" }).then((value) => { 
                            if (value == 'Yes') {
                                ArmaDev.Self.Config.privateKey = ArmaDev.Self.Config.name + '.key';
                                ArmaDev.Self.saveConfig();
                            }
                        });
                    }
                    break;
                case "armadev.runClientAndLog":
                    await runClient(true);
                    break;
                case "armadev.runClient":
                    await runClient(false);
                    break;
                case "armadev.setupConfig":
                    ArmaDev.Self.openConfig();
                    break
            }
        } catch(e) {
            logger.logError(e);
        }
    }
}