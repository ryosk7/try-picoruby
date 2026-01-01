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

// fatfs-wasm already has proper TypeScript definitions