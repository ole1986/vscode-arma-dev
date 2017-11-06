import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ArmaConfig } from '../models'
import * as logger from '../logger'   

let configPath;
let config : ArmaConfig;

export function activate(context: vscode.ExtensionContext) {
    configPath = vscode.workspace.rootPath + path.sep + ".vscode" + path.sep + "arma-dev.json";

    let disposable = vscode.commands.registerCommand('armadev.setupConfig', () => {
        run();
    });

    let disposableSave = vscode.workspace.onDidSaveTextDocument((doc) => {
        if(doc.fileName !== configPath) return;
        updateConfig(doc.getText());
    });

    if(fs.existsSync(configPath)) {
        updateConfig( fs.readFileSync(configPath, "UTF-8") );
    }

    context.subscriptions.push(disposable);
    context.subscriptions.push(disposableSave);
}

export async function run() {
    try {
        
        if(!fs.existsSync(configPath)) {
            let config = {} as ArmaConfig;
            config.title = "Your Arma 3 Extension Name";
            config.name = "ShortExtName";
            config.buildPath = "build";
            config.privateKey = "";
            config.serverDirs = ["src/server_core", "src/server_config"];
            config.clientDirs = ["src/client"];
            config.version = 1;
            fs.writeFile(configPath, JSON.stringify(config, null, "\t"));
        }

        vscode.workspace.openTextDocument(configPath).then(doc => { vscode.window.showTextDocument(doc) });
    }
    catch (error) {
        logger.logError(error);
    }
}

export function getConfig() : ArmaConfig {
    return config;
}

export function updateConfig(content : string) {
    config = JSON.parse(content);

    config.serverDirs.forEach((p, i) => {
        config.serverDirs[i] = p.replace(/\//g, "\\");
    });

    config.clientDirs.forEach((p, i) => {
        config.clientDirs[i] = p.replace(/\//g, "\\");
    });
}