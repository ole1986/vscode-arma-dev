import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as logger from './logger'
import { ArmaDev } from './armadev'
import { binarizeConfig, unbinarizeConfig, packFolder } from './helpers/armaTools'
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
            "armadev.unbinarizeFile"
        ]
        this.registerCommands();
    }

    private registerCommands() {
        this.commandList.forEach((cmd => {
            let disposable = vscode.commands.registerCommand(cmd, (args) => { this.runCommand(cmd, args) })
            this.ctx.subscriptions.push(disposable);
        }));
    }

    private runCommand(cmdName: string, args: any){
        switch(cmdName) {
            case "armadev.binarizeFile":
                binarizeConfig(args.fsPath).catch(this.onException);
            break;
            case "armadev.unbinarizeFile":
                unbinarizeConfig(args.fsPath).catch(this.onException);
            break;
            case "armadev.packFolders":
                packFolder(true).catch(this.onException);
            break;
            case "armadev.runClientAndLog":
                runClient(true);
            case "armadev.runClient":
                runClient(false);
            case "armadev.setupConfig":
                ArmaDev.Self.openConfig();
            break
        }
    }

    private onException(reason : any) {
        logger.logError(reason);
    }
}