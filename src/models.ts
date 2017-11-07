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
}

export interface Command {
    command: string;
    title: string;
}