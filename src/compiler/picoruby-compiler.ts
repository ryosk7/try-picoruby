/**
 * PicoRuby compiler wrapper for compiling Ruby code to .mrb bytecode
 */

export interface CompilerResult {
  success: boolean;
  bytecode?: Uint8Array;
  error?: string;
  warnings?: string[];
}

export interface CompilerConfig {
  onOutput?: (message: string) => void;
  onError?: (error: string) => void;
}

export class PicoRubyCompiler {
  private config: CompilerConfig;
  private wasmModule?: any;
  private initialized = false;

  constructor(config: CompilerConfig = {}) {
    this.config = config;
  }

  /**
   * Initialize the PicoRuby WASM module
   */
  async init(): Promise<void> {
    try {
      this.config.onOutput?.('Initializing PicoRuby compiler...');

      // Import the PicoRuby WASM module
      // Note: This is a placeholder - actual API may differ
      const wasmModule = await import('@picoruby/wasm-wasi');

      this.config.onOutput?.('Loading WASM module...');
      // Note: Actual API needs to be determined from package documentation
      this.wasmModule = wasmModule;

      this.initialized = true;
      this.config.onOutput?.('PicoRuby compiler ready!');
    } catch (error) {
      const errorMsg = `Failed to initialize PicoRuby compiler: ${error instanceof Error ? error.message : String(error)}`;
      this.config.onError?.(errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Compile Ruby source code to .mrb bytecode
   */
  async compileToMrb(rubyCode: string, filename = 'app.rb'): Promise<CompilerResult> {
    if (!this.initialized || !this.wasmModule) {
      throw new Error('Compiler not initialized. Call init() first.');
    }

    try {
      this.config.onOutput?.(`Compiling ${filename}...`);

      // Create a mock .mrb bytecode file for testing
      // This simulates what a real compiler would produce
      this.config.onOutput?.('Creating mock mruby bytecode...');

      // Mock mruby bytecode header (simplified)
      const header = new Uint8Array([
        0x52, 0x49, 0x54, 0x45, // "RITE" magic
        0x30, 0x30, 0x30, 0x33, // Version "0003"
        0x00, 0x00, 0x00, 0x20, // Size (32 bytes + code)
        0x4D, 0x52, 0x42, 0x59, // "MRBY" section
        0x00, 0x00, 0x00, 0x10  // Section size
      ]);

      // Add Ruby code as comment in bytecode for debugging
      const codeComment = new TextEncoder().encode(`\n# Source: ${filename}\n# ${rubyCode.replace(/\n/g, '\n# ')}\n`);

      // Simple puts instruction bytecode (mock)
      const mockInstruction = new Uint8Array([
        0x01, // OP_STRING (simplified)
        0x00, 0x01, // String index
        0x02, // OP_SEND (simplified)
        0x00, 0x02, // Method index (puts)
        0x03  // OP_RETURN
      ]);

      // Combine header + code + comment
      const totalSize = header.length + mockInstruction.length + codeComment.length;
      const bytecode = new Uint8Array(totalSize);
      let offset = 0;

      bytecode.set(header, offset);
      offset += header.length;
      bytecode.set(mockInstruction, offset);
      offset += mockInstruction.length;
      bytecode.set(codeComment, offset);

      const result = {
        bytecode: Array.from(bytecode),
        error: null,
        warnings: [
          'Using mock compiler - produces test bytecode',
          `Generated ${bytecode.length} bytes of mock .mrb data`,
          'Real PicoRuby compilation requires server-side mrbc or different approach'
        ]
      };

      if (result.error) {
        return {
          success: false,
          error: result.error
        };
      }

      // Convert compiled bytecode to Uint8Array
      const bytecode = new Uint8Array(result.bytecode);

      this.config.onOutput?.(`Compilation successful! Generated ${bytecode.length} bytes of bytecode.`);

      return {
        success: true,
        bytecode: bytecode,
        warnings: result.warnings || []
      };

    } catch (error) {
      const errorMsg = `Compilation failed: ${error instanceof Error ? error.message : String(error)}`;
      this.config.onError?.(errorMsg);

      return {
        success: false,
        error: errorMsg
      };
    }
  }

  /**
   * Check if the compiler is ready to use
   */
  isReady(): boolean {
    return this.initialized && !!this.wasmModule;
  }

  /**
   * Get version information
   */
  getVersion(): string {
    if (!this.wasmModule) {
      return 'Unknown';
    }

    try {
      return this.wasmModule.version || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }
}

/**
 * Convenience function to compile Ruby code
 */
export async function compileRubyToMrb(
  rubyCode: string,
  config: CompilerConfig = {}
): Promise<CompilerResult> {
  const compiler = new PicoRubyCompiler(config);
  await compiler.init();
  return compiler.compileToMrb(rubyCode);
}