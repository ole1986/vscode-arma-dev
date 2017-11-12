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

export class DialogControl {
    public type: string;
    public name: string;
    public idd: number;
    public idc: number;

    public x: string;
    public y: string;

    public h: string;
    public w: string;

    private factorX: number;
    private factorY: number;

    constructor() {
        this.factorX = 2200;
        this.factorY = 1500;
    }

    public hasProperty(name: string) {
        return ['type', 'name', 'idc', 'idd', 'x', 'y', 'h', 'w'].indexOf(name) !== -1 ? true : false;
    }

    public getX() {
        return this.parseNumber(this.x, this.factorX);
    }

    public getY() {
        return this.parseNumber(this.y, this.factorY);
    }

    public getWidth() {
        return this.parseNumber(this.w, this.factorX);
    }

    public getHeight() {
        return this.parseNumber(this.h, this.factorY);
    }

    private parseNumber(value: string, factor: number = 1000): number {
        let m = value.match(/([\d\.]+)/);
        return (parseFloat(m[1]) * factor);
    }
}