import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as logger from './logger';

import { DialogControl, DialogOptions } from './models';
import { INSPECT_MAX_BYTES } from 'buffer';
import { ArmaDev } from './armadev';

const T_DISPLAY = 0;
const T_CLASS = 1;
const T_PROPERTY_D = 2;
const T_PROPERTY = 3;


export class DialogViewer {
    public static Self: DialogViewer;

    private token = T_DISPLAY;
    private content: string;
    private openBrackets: number = 0;

    private display: DialogControl;
    private ctrl: DialogControl;

    private ctrlList: DialogControl[] = [];
    private ctx: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.ctx = context;
        DialogViewer.Self = this;
    }

    public async OutputHtml(opt: DialogOptions): Promise<string> {
        let cssFile = this.ctx.extensionPath + path.sep + 'resources' + path.sep + 'css' + path.sep + 'dialog-viewer.css';
        let result: string = '';

        return new Promise<string>((resolve, reject) => {
            this.openFile(opt);
            this.ctrlList.forEach((val) => {
                result += `<a href="${encodeURI('command:armadev.previewControlJump?' + JSON.stringify({offset: val.offset}))}"><div class="RscBase ${val.type}" style="left: ${val.getX()}px; top: ${val.getY()}px; width: ${val.getWidth()}px; height: ${val.getHeight()}px;">${val.name}<br />idc=${val.idc}</div></a>`;
            });

            resolve(`<html>
                    <head>
                    <link rel="stylesheet" href="${cssFile}">
                    </head>
                    <body>
                        ${this.showOptions(opt)}
                        <div class="dialog-preview">${result}</div>
                    </body>
                </html>`);
        });
    }

    private showOptions(opt: DialogOptions) {
        return `
        <div class="dialog-options">
            Axis:&nbsp;
            <a href="${encodeURI('command:armadev.previewControlOption?' + JSON.stringify({mode: 0}))}" target="_self">Truncated</a>
            <a href="${encodeURI('command:armadev.previewControlOption?' + JSON.stringify({mode: 1}))}" target="_self">Original</a>
            &nbsp; The default behavior can be configured with 'arma-dev.dialogAxisMode' - A restart of vscode is requred
        </div>
        `;
    }

    private async openFile(opt: DialogOptions) {
        this.token = T_DISPLAY;
        this.content = fs.readFileSync(opt.path, 'UTF-8');

        this.display = this.ctrl = undefined;
        this.ctrlList = [];
        this.parse();

        this.ctrlList.forEach((val) => {
            val.parseNumbers();
        });

        if (opt.mode <= 0) {
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
                case T_DISPLAY:
                case T_CLASS:
                m = this.content.substr(i).indexOf('{');
                break;
                case T_PROPERTY_D:
                case T_PROPERTY:
                m = this.content.substr(i).indexOf(';');
                break;
            }

            if (m === -1) break;

            let part = this.content.substr(i, m);

            if (this.token <= 1 && this.openBrackets <= 2) {
                this.parseDescriptor(part, i);
                this.openBrackets++;
                i += m + 1;
            } else if (this.token === T_PROPERTY || this.token === T_PROPERTY_D) {
                if (this.token === T_PROPERTY_D && this.openBrackets == 1 && this.parseDescriptor(part, i)) {
                    i += this.content.substr(i).indexOf('{') + 1;
                    continue;
                }
                let ok = this.parseProperty(part);
                if (!ok) {
                    let eoc = part.substr( part.length - 1 );
                    if (eoc === '}') {
                        this.openBrackets--;
                        this.ctrlList.push(this.ctrl);
                        this.ctrl = undefined;
                        this.token = T_CLASS;
                    }
                }
                i += m + 1;
            }
        }
    }

    private parseDescriptor(content: string, pos: number) {
        let m = content.match(/class\s+?(\w+):?\s?(\w+)/);
        if (!m) return false;

        if (this.token < T_CLASS) {
            // it is the display control (idd)
            this.display = new DialogControl();
            this.display.name = m[1];
            this.token = T_PROPERTY_D;
            return true;
        }
        this.ctrl = new DialogControl();

        this.ctrl.offset = pos + m.index;
        this.ctrl.name = m[1];
        this.ctrl.type = m[2];
        this.token = T_PROPERTY;
        return true;
    }

    private parseProperty(content: string): boolean {
        if (this.token === T_PROPERTY_D && !this.display) return false;
        if (this.token === T_PROPERTY && !this.ctrl) return false;

        let ctrl = (this.token === T_PROPERTY) ? this.ctrl : this.display;

        let m = content.match(/([\w\[\]]+)\s?=\s?([\s\S]+)/);
        if (!m) return false;

        if (ctrl.hasProperty(m[1])) {
            ctrl[m[1]] = m[2];
        }
        return true;
    }
}