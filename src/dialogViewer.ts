import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as logger from './logger';

import { DialogControl } from './models';

const T_DISPLAY = 0;
const T_CLASS = 1;
const T_PROPERTY_D = 2;
const T_PROPERTY = 3;


export class DialogViewer {
    private token = T_DISPLAY;
    private content: string;
    private openBrackets: number = 0;

    private display: DialogControl;
    private ctrl: DialogControl;

    private ctrlList: DialogControl[] = [];

    constructor(filePath: string) {
        this.content = fs.readFileSync(filePath, 'UTF-8');
        this.parse();
    }

    public Output(): string {
        return `<div style='position: relative'>${this.outputControls()}</div>`;
    }

    private outputControls() {
        let result: string = '';
        this.ctrlList.forEach((val) => {
            result += `<div style="position: absolute; font-size: 12px; border: 1px dashed white; left: ${val.getX()}px; top: ${val.getY()}px; width: ${val.getWidth()}px; height: ${val.getHeight()}px;">${val.name}</div>`;
        });
        return result;
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
                this.parseDescriptor(part);
                this.openBrackets++;
                i += m + 1;
            } else if (this.token === T_PROPERTY || this.token === T_PROPERTY_D) {
                if (this.token === T_PROPERTY_D) {
                    if (this.parseDescriptor(part)) {
                        i += this.content.substr(i).indexOf('{') + 1;
                        continue;
                    }
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

    private parseDescriptor(content: string) {
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