// Type definitions for PicoRuby packages

declare module '@picoruby/wasm-wasi' {
  interface PicoRubyModule {
    ccall(ident: string, returnType: string, argTypes: string[], args: any[], options?: any): any;
    picorubyRun(): void;
    ready: Promise<PicoRubyModule>;
    // WASM module interface
    FS?: any;
    print?: (text: string) => void;
    printErr?: (text: string) => void;
  }

  // Default export is the module factory function
  export default function(): Promise<PicoRubyModule>;
}

// Direct module import for picoruby.js
declare module '@picoruby/wasm-wasi/picoruby.js' {
  interface PicoRubyModule {
    ready: Promise<void>;
    ccall: (name: string, returnType: string | null, argTypes: string[], args: any[]) => any;
    print?: (text: string) => void;
    printErr?: (text: string) => void;
  }

  function createModule(): Promise<PicoRubyModule>;
  export default createModule;
}

// fatfs-wasm already has proper TypeScript definitions