import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ArmaConfig } from './models'
import * as logger from './logger'

export class ArmaDev {
    private config : ArmaConfig;
    private configPath : string;

    static Self : ArmaDev;

    constructor() {
        this.configPath = vscode.workspace.rootPath + path.sep + ".vscode" + path.sep + "arma-dev.json";

        let disposableSave = vscode.workspace.onDidSaveTextDocument((doc) => {
            if (doc.fileName !== this.configPath) return;
            this.loadConfig(doc.getText());
        });

        if (fs.existsSync(this.configPath)) {
            this.loadConfig(fs.readFileSync(this.configPath, "UTF-8"));
        }
        
        ArmaDev.Self = this;
    }

    get Config() : ArmaConfig {
        return this.config;
    }

    public openConfig() {
        try {
            if (!fs.existsSync(this.configPath)) {
                let config = {} as ArmaConfig;
                config.title = "Your Arma 3 Extension Name";
                config.name = "ShortExtName";
                config.website = 'http://yourwebsite.tld';
                config.version = "0.0.1";
                config.buildPath = "build";
                config.privateKey = "";
                config.serverDirs = ["src/server_core", "src/server_config"];
                config.clientDirs = ["src/client"];

                let vscodeDir = path.dirname(this.configPath);

                if (!fs.existsSync(vscodeDir)) {
                    fs.mkdirSync(vscodeDir);
                }
                fs.writeFile(this.configPath, JSON.stringify(config, null, "\t"));
            }

            vscode.workspace.openTextDocument(this.configPath).then(doc => { vscode.window.showTextDocument(doc) });
        }
        catch (error) {
            logger.logError(error);
        }
    }

    public saveConfig(){
        let data = JSON.stringify(this.config, null, "\t");
        fs.writeFile(this.configPath, data);
    }

    private loadConfig(content: string) {
        this.config = JSON.parse(content);

        this.config.serverDirs.forEach((p, i) => {
            this.config.serverDirs[i] = p.replace(/\//g, "\\");
        });

        this.config.clientDirs.forEach((p, i) => {
            this.config.clientDirs[i] = p.replace(/\//g, "\\");
        });

        if (this.config.privateKey) {
            this.config.privateKey = path.normalize(this.config.privateKey);
        }
    }
}