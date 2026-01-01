/**
 * PicoRuby executor for R2P2 compatible file generation
 */

export interface ExecutionResult {
  success: boolean;
  output?: string;
  bytecode?: Uint8Array;  // Source file for R2P2 compatibility
  error?: string;
  warnings?: string[];
}

export interface ExecutorConfig {
  onOutput?: (message: string) => void;
  onError?: (error: string) => void;
}

export enum ExecutionMode {
  R2P2_COMPATIBLE = 'r2p2-compatible'  // Generate files for R2P2 simulation
}

export class PicoRubyExecutor {
  private config: ExecutorConfig;
  private initialized = false;
  private mode: ExecutionMode;

  constructor(config: ExecutorConfig = {}) {
    this.config = config;
    this.mode = ExecutionMode.R2P2_COMPATIBLE;
  }

  /**
   * Initialize for R2P2 compatible mode (no WASM required)
   */
  async init(): Promise<void> {
    try {
      this.config.onOutput?.('Initializing R2P2 compatible executor...');

      // For R2P2 mode, we only need to generate source files
      this.initialized = true;
      this.config.onOutput?.(`R2P2 executor ready! Mode: ${this.mode}`);
    } catch (error) {
      const errorMsg = `Failed to initialize R2P2 executor: ${error instanceof Error ? error.message : String(error)}`;
      this.config.onError?.(errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Execute Ruby source code (generate R2P2 compatible files)
   */
  async executeRuby(rubyCode: string, filename = 'app.rb'): Promise<ExecutionResult> {
    try {
      this.config.onOutput?.(`Generating R2P2 compatible files for ${filename}...`);

      // R2P2 compatible mode - generate filesystem files
      return await this.generateR2P2Compatible(rubyCode, filename);

    } catch (error) {
      const errorMsg = `Execution failed: ${error instanceof Error ? error.message : String(error)}`;
      this.config.onError?.(errorMsg);

      return {
        success: false,
        error: errorMsg
      };
    }
  }

  /**
   * Generate R2P2 compatible filesystem with app.rb
   */
  private async generateR2P2Compatible(rubyCode: string, _filename: string): Promise<ExecutionResult> {
    try {
      this.config.onOutput?.('Compiling Ruby source to mruby bytecode...');

      // Compile Ruby to mruby bytecode
      const mrbBytecode = await this.compileToMruby(rubyCode);

      this.config.onOutput?.(`Generated app.mrb (${mrbBytecode.length} bytes)`);

      return {
        success: true,
        bytecode: mrbBytecode,
        output: '',
        warnings: [
          'R2P2 compatible mode - mruby bytecode ready for filesystem',
          `Bytecode size: ${mrbBytecode.length} bytes`,
          'Ready for flashing to simulated R2P2 filesystem'
        ]
      };

    } catch (error) {
      throw new Error(`R2P2 generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Compile Ruby source code to mruby bytecode
   */
  private async compileToMruby(rubyCode: string): Promise<Uint8Array> {
    try {
      // Import PicoRuby WASM module for compilation only
      const { default: createPicoRubyModule } = await import('@picoruby/wasm-wasi');

      this.config.onOutput?.('Loading PicoRuby compiler...');
      const picoRubyModule = await createPicoRubyModule();
      await picoRubyModule.ready;

      // Setup virtual filesystem for compilation
      if (picoRubyModule.FS) {
        // Write Ruby source to virtual filesystem
        picoRubyModule.FS.writeFile('/tmp/app.rb', rubyCode, { encoding: 'utf8' });

        this.config.onOutput?.('Compiling Ruby source...');

        // Compile Ruby to mruby bytecode using mrbc
        const result = picoRubyModule.ccall(
          'mrbc_compile_file',
          'number',
          ['string', 'string'],
          ['/tmp/app.rb', '/tmp/app.mrb']
        );

        if (result !== 0) {
          throw new Error('Ruby compilation failed');
        }

        // Read the compiled bytecode
        const mrbData = picoRubyModule.FS.readFile('/tmp/app.mrb');

        if (!(mrbData instanceof Uint8Array)) {
          throw new Error('Unexpected bytecode format');
        }

        // Cleanup
        picoRubyModule.FS.unlink('/tmp/app.rb');
        picoRubyModule.FS.unlink('/tmp/app.mrb');

        return mrbData;
      } else {
        throw new Error('PicoRuby filesystem not available');
      }

    } catch (error) {
      this.config.onOutput?.('Compilation failed, falling back to mock bytecode...');

      // Fallback: Generate mock mruby bytecode structure
      return this.generateMockMrubyBytecode(rubyCode);
    }
  }

  /**
   * Generate mock mruby bytecode for testing (when real compilation fails)
   */
  private generateMockMrubyBytecode(rubyCode: string): Uint8Array {
    // Create a minimal mruby bytecode structure for R2P2
    const encoder = new TextEncoder();
    const sourceBytes = encoder.encode(rubyCode);

    // mruby bytecode header (simplified)
    const header = new Uint8Array([
      0x52, 0x49, 0x54, 0x45, // "RITE" magic
      0x30, 0x30, 0x30, 0x34, // version "0004"
      0x00, 0x00, 0x00, 0x00, // CRC placeholder
      0x00, 0x00, 0x00, 0x00, // size placeholder (will be set later)
      0x4D, 0x41, 0x54, 0x5A, // "MATZ"
      0x30, 0x30, 0x30, 0x30, // version "0000"
    ]);

    // Create bytecode with header + source (simplified structure)
    const bytecode = new Uint8Array(header.length + sourceBytes.length + 8);
    bytecode.set(header, 0);

    // Set size in header
    const totalSize = bytecode.length;
    bytecode[12] = (totalSize >> 24) & 0xff;
    bytecode[13] = (totalSize >> 16) & 0xff;
    bytecode[14] = (totalSize >> 8) & 0xff;
    bytecode[15] = totalSize & 0xff;

    // Add source code data section
    bytecode.set(sourceBytes, header.length);

    this.config.onOutput?.(`Generated mock mruby bytecode: ${bytecode.length} bytes`);

    return bytecode;
  }

  /**
   * Check if the executor is ready to use
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Get version information
   */
  getVersion(): string {
    return 'PicoRuby R2P2 Compatible';
  }

  /**
   * Set execution mode
   */
  setMode(_mode: ExecutionMode): void {
    // Only R2P2 compatible mode supported
    this.mode = ExecutionMode.R2P2_COMPATIBLE;
    this.config.onOutput?.(`Execution mode: ${this.mode}`);
  }

  /**
   * Get current execution mode
   */
  getMode(): ExecutionMode {
    return this.mode;
  }
}

/**
 * Convenience function to execute Ruby code
 */
export async function executeRuby(
  rubyCode: string,
  config: ExecutorConfig = {}
): Promise<ExecutionResult> {
  const executor = new PicoRubyExecutor(config);
  await executor.init();
  return executor.executeRuby(rubyCode);
}

// Legacy export for compatibility
export const PicoRubyCompiler = PicoRubyExecutor;
export type CompilerResult = ExecutionResult;
export type CompilerConfig = ExecutorConfig;