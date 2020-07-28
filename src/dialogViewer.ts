import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as logger from './logger';

import { DialogControl, DialogOptions } from './models';
import { INSPECT_MAX_BYTES } from 'buffer';
import { ArmaDev } from './armadev';

enum TokenType {
    T_DISPLAY = 0,
    T_CLASS = 1,
    T_PROPERTY_D = 2,
    T_PROPERTY = 3,
}

export class DialogViewer extends vscode.Disposable {
    private token: TokenType = TokenType.T_DISPLAY;
    private content: string;
    private openBrackets: number = 0;

    private display: DialogControl;
    private ctrl: DialogControl;

    private ctrlList: DialogControl[] = [];
    private ctx: vscode.ExtensionContext;
    private webview: vscode.Webview;
    private resources: Map<string, vscode.Uri[]>;
    private options: DialogOptions;
    private watcher: vscode.FileSystemWatcher;

    constructor(context: vscode.ExtensionContext, webview: vscode.Webview, options: DialogOptions) {
        super(() => this.watcher.dispose());

        this.ctx = context;
        this.webview = webview;
        this.options = options;

        webview.onDidReceiveMessage(this.onMessageReceived.bind(this));

        this.watcher = vscode.workspace.createFileSystemWatcher(options.path);
        this.watcher.onDidChange(this.OutputHtml.bind(this));

        this.loadResources();
    }

    private loadResources() {
        const cssRessource = this.webview.asWebviewUri(vscode.Uri.file(
            path.join(this.ctx.extensionPath, 'resources', 'css', 'dialog-viewer.css')
        ));

        const jsResource = this.webview.asWebviewUri(vscode.Uri.file(
            path.join(this.ctx.extensionPath, 'resources', 'js', 'dialog-viewer.js')
        ));

        this.resources = new Map<string, vscode.Uri[]> ([
            ['css', [cssRessource]],
            ['js', [jsResource]]
        ]);
    }

    public async OutputHtml(): Promise<void> {
        let ts = Math.floor(new Date().getTime() / 1000);

        await this.openFile();

        return new Promise<void>((resolve, reject) => {
            let result = '';
            this.ctrlList.forEach((val) => {
                result += `<a href="javascript:void(0)" onclick="runCommand('jump', {offset: ${val.offset}})"><div class="RscBase ${val.type}" style="left: ${val.getX()}px; top: ${val.getY()}px; width: ${val.getWidth()}px; height: ${val.getHeight()}px;">${val.name}<br />idc=${val.idc}</div></a>`;
            });

            this.webview.html = `<!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta http-equiv="Content-Security-Policy" content="default-src 'self' vscode-resource: 'unsafe-inline' 'unsafe-eval'; img-src * vscode-resource:" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    ${this.resources.get('css').map(x => '<link rel="stylesheet" href="' + x + '?' + ts + '" />')}
                    ${this.resources.get('js').map(x => '<script defer src="' + x + '?' + ts + '"></script>')}
                </head>
                <body>
                    ${this.showOptions()}
                    <div class="dialog-preview">${result}</div>
                </body>
            </html>`;
            resolve();
        });
    }

    private onMessageReceived(message: any) {
        switch (message.command) {
            case 'options':
                Object.assign(this.options, message.args);
                break;
            case 'jump':
                vscode.commands.executeCommand('armadev.previewControlJump', { offset: message.args.offset, path: this.options.path });
                break;
        }

        this.OutputHtml();
    }

    private showOptions() {
        return `
        <div class="dialog-options">
            Axis:&nbsp;
            <a href="javascript:void(0)" onclick="runCommand('options', {mode: 0})" target="_self">Truncated</a>
            <a href="javascript:void(0)" onclick="runCommand('options', {mode: 1})" target="_self">Original</a>
            &nbsp; The default behavior can be configured with 'arma-dev.dialogAxisMode'
        </div>
        `;
    }

    private async openFile() {
        this.token = TokenType.T_DISPLAY;
        this.content = fs.readFileSync(this.options.path, 'UTF-8');

        this.display = this.ctrl = undefined;
        this.ctrlList = [];
        this.parse();

        this.ctrlList.forEach((val) => {
            val.parseNumbers();
        });

        if (this.options.mode <= 0) {
            this.fixMargins();
        }
    }

    private fixMargins() {
        let minX = Math.min.apply(Math, this.ctrlList.map((value) => value.getX() ));
        let minY = Math.min.apply(Math, this.ctrlList.map((value) => value.getY() ));

        this.ctrlList.forEach((val) => {
            val.setX(val.getX() - minX);
            val.setY(val.getY() - minY);
        });
    }

    private parse() {
        let len = this.content.length;
        let i = 0;
        let n = 0;
        let m = -1;

        while (i < len) {
            let m: any;

            switch (this.token) {
                case TokenType.T_DISPLAY:
                case TokenType.T_CLASS:
                m = this.content.substr(i).indexOf('{');
                break;
                case TokenType.T_PROPERTY_D:
                case TokenType.T_PROPERTY:
                m = this.content.substr(i).indexOf(';');
                break;
            }

            if (m === -1) break;

            let part = this.content.substr(i, m);

            if (this.token <= 1 && this.openBrackets <= 2) {
                this.parseDescriptor(part, i);
                this.openBrackets++;
                i += m + 1;
            } else if (this.token === TokenType.T_PROPERTY || this.token === TokenType.T_PROPERTY_D) {
                if (this.token === TokenType.T_PROPERTY_D && this.openBrackets === 1 && this.parseDescriptor(part, i)) {
                    i += this.content.substr(i).indexOf('{') + 1;
                    continue;
                }
                let ok = this.parseProperty(part);
                if (!ok) {
                    let eoc = part.substr( part.length - 1 );
                    if (eoc === '}') {
                        this.openBrackets--;
                        if (this.ctrl !== undefined) {
                            this.ctrlList.push(this.ctrl);
                        }
                        this.ctrl = undefined;
                        this.token = TokenType.T_CLASS;
                    }
                }
                i += m + 1;
            } else if (this.openBrackets > 0) {
                i += this.content.substr(i).indexOf('}') + 1;
                this.openBrackets--;
            }
        }
    }

    private parseDescriptor(content: string, pos: number) {
        let m = content.match(/class\s+?(\w+):?\s?(\w+)/);
        if (!m) return false;

        if (this.token < TokenType.T_CLASS) {
            // it is the display control (idd)
            this.display = new DialogControl();
            this.display.name = m[1];
            this.token = TokenType.T_PROPERTY_D;
            return true;
        }
        this.ctrl = new DialogControl();

        this.ctrl.offset = pos + m.index;
        this.ctrl.name = m[1];
        this.ctrl.type = m[2];
        this.token = TokenType.T_PROPERTY;
        return true;
    }

    private parseProperty(content: string): boolean {
        if (this.token === TokenType.T_PROPERTY_D && !this.display) return false;
        if (this.token === TokenType.T_PROPERTY && !this.ctrl) return false;

        let ctrl = (this.token === TokenType.T_PROPERTY) ? this.ctrl : this.display;

        let m = content.match(/([\w\[\]]+)\s?=\s?([\s\S]+)/);
        if (!m) return false;

        if (ctrl.hasProperty(m[1])) {
            ctrl[m[1]] = m[2];
        }
        return true;
    }
}