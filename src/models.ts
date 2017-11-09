export interface ArmaConfig {
    title: string;
    name: string;
    author: string;
    website: string;
    version: string;
    buildPath: string;
    serverDirs: string[];
    clientDirs: string[];
    clientMods: string[];
    privateKey: string;
    ftpConnection: FtpConnection;
    ftpConnectionFile: string;
}

export interface Command {
    command: string;
    title: string;
}

export interface FtpConnection {
    host: string;
    username: string;
    password: string;
    path: string;
    isSecure: boolean;
}