var vscode = acquireVsCodeApi();

function runCommand(cmd, args) {
    vscode.postMessage({
        command: cmd,
        args
    });
}