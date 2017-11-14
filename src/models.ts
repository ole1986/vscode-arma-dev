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

export interface DialogOptions {
    path: string;
    mode: number;
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

    private posX: number;
    private posY: number;
    private width: number;
    private height: number;


    constructor() {
        this.factorX = 2200;
        this.factorY = 1500;
    }

    public parseNumbers(){
        this.posX = this.parseNumber(this.x, this.factorX);
        this.posY = this.parseNumber(this.y, this.factorY);
        this.width = this.parseNumber(this.w, this.factorX);
        this.height = this.parseNumber(this.h, this.factorY);
    }

    public hasProperty(name: string) {
        return ['type', 'name', 'idc', 'idd', 'x', 'y', 'h', 'w'].indexOf(name) !== -1 ? true : false;
    }

    public getX() {
        return this.posX;
    }

    public getY() {
        return this.posY;
    }

    public setX(x: number){
        this.posX = x;
    }

    public setY(y: number) {
        this.posY = y;
    }

    public getWidth() {
        return this.width;
    }

    public getHeight() {
        return this.height;
    }

    private parseNumber(value: string, factor: number = 1000): number {
        let m = value.match(/([\d\.]+)/);
        return (parseFloat(m[1]) * factor);
    }
}