import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as logger from '../logger';

import { DialogViewer } from '../dialogViewer';
import { DialogOptions } from '../models';

export class TextDocumentContentProvider implements vscode.TextDocumentContentProvider {
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    private url: vscode.Uri;
    private options: DialogOptions = { path: '', mode: 0 };

    constructor() {
        this.setMode(<number>vscode.workspace.getConfiguration('arma-dev').get('dialogAxisMode'));
    }
    public async provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): Promise<string> {
        this.url = uri;

        try {
            if (this.options.path === '') throw 'No path defined';
            return DialogViewer.Self.OutputHtml(this.options);
        }
        catch (error) {
            return 'ERROR: ' + error;
        }
    }

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onDidChange.event;
    }

    public setMode(data: number) {
        this.options.mode = data;
    }

    public setPath(p: string) {
        this.options.path = p;
    }

    public getPath(): string {
        return this.options.path;
    }

    public Reload() {
        this._onDidChange.fire(this.url);
    }
}