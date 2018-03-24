import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ArmaConfig, FtpConnection } from './models';
import * as logger from './logger';

export class ArmaDev {
    private config: ArmaConfig;
    private configPath: string;
    static Schema: string = 'arma-dev';
    static Self: ArmaDev;

    constructor() {
        this.configPath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.vscode', 'arma-dev.json');

        let disposableSave = vscode.workspace.onDidSaveTextDocument((doc) => {
            if (doc.fileName !== this.configPath) return;
            this.loadConfig(doc.getText());
        });

        if (fs.existsSync(this.configPath)) {
            this.loadConfig(fs.readFileSync(this.configPath, 'UTF-8'));
        }

        ArmaDev.Self = this;
    }

    /**
     * return the current ArmaDev configuration settings
     */
    get Config(): ArmaConfig {
        return this.config;
    }

    get ModServerName(): string {
        return '@' + this.config.name + 'Server';
    }

    get ModClientName(): string {
        return '@' + this.config.name;
    }

    /**
     * open (or create on initial call) the configuration in textEditor
     */
    public openConfig() {
        try {
            if (!fs.existsSync(this.configPath)) {
                let config = {} as ArmaConfig;
                config.title = 'Your Arma 3 Extension Name';
                config.name = 'ShortExtName';
                config.author = 'yourName';
                config.website = 'http://yourwebsite.tld';
                config.version = '0.0.1';
                config.buildPath = 'build';
                config.privateKey = '';
                config.serverDirs = ['src/server_core', 'src/server_config'];
                config.serverUse32bit = false;
                config.clientDirs = ['src/client'];
                config.clientMods = [];
                config.ftpConnection = {} as FtpConnection;

                let vscodeDir = path.dirname(this.configPath);

                if (!fs.existsSync(vscodeDir)) {
                    fs.mkdirSync(vscodeDir);
                }
                fs.writeFile(this.configPath, JSON.stringify(config, null, '\t'));
            }

            vscode.workspace.openTextDocument(this.configPath).then(doc => { vscode.window.showTextDocument(doc); });
        }
        catch (error) {
            logger.logError(error);
        }
    }
    /**
     * save the changes to its configuration file
     */
    public saveConfig() {
        if (this.config.ftpConnectionFile && this.config.ftpConnectionFile !== '') {
            // do not save the ftp info when a file is defined
            delete this.config.ftpConnection;
        }
        let data = JSON.stringify(this.config, null, '\t');
        fs.writeFile(this.configPath, data);
    }

    /**
     * load or update new changes being made to the configuration into its variable
     * @param content config file content
     */
    private loadConfig(content: string) {
        this.config = JSON.parse(content);

        if (this.config.serverDirs !== undefined) {
            this.config.serverDirs.forEach((p, i) => {
                this.config.serverDirs[i] = p.replace(/\//g, '\\');
            });
        }

        if (this.config.clientDirs !== undefined) {
            this.config.clientDirs.forEach((p, i) => {
                this.config.clientDirs[i] = p.replace(/\//g, '\\');
            });
        }

        if (this.config.privateKey) {
            this.config.privateKey = path.normalize(this.config.privateKey);
        }

        if (this.config.ftpConnectionFile) {
            let ftpConfigFile = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.vscode', path.normalize(this.config.ftpConnectionFile));
            if (fs.existsSync(ftpConfigFile)) {
                let ftpConfigStr = fs.readFileSync(ftpConfigFile, 'UTF-8');
                this.config.ftpConnection = JSON.parse(ftpConfigStr);
            }
        }
    }
}