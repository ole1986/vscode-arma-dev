import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as logger from '../logger';

import { DialogViewer } from '../dialogViewer';

export class TextDocumentContentProvider implements vscode.TextDocumentContentProvider {
    constructor() {}
    public async provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): Promise<string> {
        try {
            let path = this.getPathFromURI(uri);
            if (path === '') throw 'No path defined';

            let parser = new DialogViewer(path);
            return parser.Output();
        }
        catch (error) {
            return 'ERROR: ' + error;
        }
    }

    private getPathFromURI(uri: vscode.Uri): string {
        if (uri.query.length > 0) {
            let re = uri.query.match(/path=(.*)/i);
            return (re) ? decodeURI(re[1]) : '';
        } else {
            return '';
        }
    }
}