// Type definitions for PicoRuby packages

declare module '@picoruby/wasm-wasi' {
  export const version: string;
  export function createPicoRuby(): Promise<any>;
  // Additional exports will be defined as the API is discovered
}

// fatfs-wasm already has proper TypeScript definitions