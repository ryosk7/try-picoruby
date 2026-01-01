// Type definitions for PicoRuby packages

declare module '@picoruby/wasm-wasi' {
  export const version: string;
  export function createPicoRuby(): Promise<any>;
  // Additional exports will be defined as the API is discovered
}

declare module 'fatfs-wasm' {
  export class FatFS {
    format(options: {
      size: number;
      sectorSize: number;
      fatType: number;
      label?: string;
    }): Promise<void>;

    mkdir(path: string): Promise<void>;
    writeFile(path: string, data: Uint8Array): Promise<void>;
    export(): Uint8Array;
    getStats(): any;
  }
}