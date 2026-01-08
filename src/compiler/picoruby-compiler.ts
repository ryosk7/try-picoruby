/**
 * PicoRuby executor with real WASM integration
 */

import createModule from '@picoruby/wasm-wasi/picoruby.js';

export interface ExecutionResult {
  success: boolean;
  output?: string;
  bytecode?: Uint8Array;  // Compiled bytecode or source file for R2P2 compatibility
  error?: string;
  warnings?: string[];
}

interface PicoRubyModule {
  ccall: (name: string, returnType: string | null, argTypes: string[], args: any[], options?: any) => any;
  picorubyRun(): void;
  ready: Promise<void>;
  print?: (text: string) => void;
  printErr?: (text: string) => void;
}

export interface ExecutorConfig {
  onOutput?: (message: string) => void;
  onError?: (error: string) => void;
}

export enum ExecutionMode {
  R2P2_COMPATIBLE = 'r2p2-compatible',  // Generate files for R2P2 simulation
  WASM_DIRECT = 'wasm-direct'  // Execute directly in WASM
}

export class PicoRubyExecutor {
  private config: ExecutorConfig;
  private initialized = false;
  private mode: ExecutionMode;
  private wasmModule: PicoRubyModule | null = null;
  private outputBuffer: string = '';

  constructor(config: ExecutorConfig = {}) {
    this.config = config;
    this.mode = ExecutionMode.R2P2_COMPATIBLE;
  }

  /**
   * Initialize PicoRuby WASM module
   */
  async init(): Promise<void> {
    try {
      if (this.mode === ExecutionMode.WASM_DIRECT) {
        this.config.onOutput?.('Initializing PicoRuby WASM module...');

        // Initialize WASM module
        this.wasmModule = await createModule();

        // Set up output handlers
        if (this.wasmModule.print) {
          this.wasmModule.print = (text: string) => {
            this.outputBuffer += text + '\n';
            this.config.onOutput?.(text);
          };
        }

        if (this.wasmModule.printErr) {
          this.wasmModule.printErr = (text: string) => {
            this.outputBuffer += text + '\n';
            this.config.onError?.(text);
          };
        }

        // Initialize PicoRuby
        this.wasmModule.ccall('picorb_init', 'number', [], []);
        this.config.onOutput?.('PicoRuby WASM module initialized!');
      } else {
        this.config.onOutput?.('Initializing R2P2 compatible executor...');
      }

      this.initialized = true;
      this.config.onOutput?.(`PicoRuby executor ready! Mode: ${this.mode}`);
    } catch (error) {
      const errorMsg = `Failed to initialize PicoRuby executor: ${error instanceof Error ? error.message : String(error)}`;
      this.config.onError?.(errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Execute Ruby source code
   */
  async executeRuby(rubyCode: string, filename = 'app.rb'): Promise<ExecutionResult> {
    try {
      if (this.mode === ExecutionMode.WASM_DIRECT && this.wasmModule) {
        this.config.onOutput?.('Executing Ruby code in WASM...');
        return await this.executeInWasm(rubyCode);
      } else {
        this.config.onOutput?.(`Generating R2P2 compatible files for ${filename}...`);
        return await this.generateR2P2Compatible(rubyCode);
      }

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
   * Execute Ruby code directly in WASM
   */
  private async executeInWasm(rubyCode: string): Promise<ExecutionResult> {
    try {
      if (!this.wasmModule) {
        throw new Error('WASM module not initialized');
      }

      this.outputBuffer = '';
      this.config.onOutput?.('Creating Ruby task in WASM...');

      // Create and execute Ruby task
      const taskResult = this.wasmModule.ccall('picorb_create_task', 'number', ['string'], [rubyCode]);

      if (taskResult < 0) {
        throw new Error('Failed to create Ruby task');
      }

      this.config.onOutput?.('Executing Ruby code...');

      // Run the Ruby code
      this.wasmModule.picorubyRun();

      return {
        success: true,
        output: this.outputBuffer,
        warnings: [
          'Ruby code executed in PicoRuby WASM',
          'Direct WASM execution completed'
        ]
      };

    } catch (error) {
      throw new Error(`WASM execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate R2P2 compatible filesystem with /home/app.rb
   */
  private async generateR2P2Compatible(rubyCode: string): Promise<ExecutionResult> {
    try {
      this.config.onOutput?.('Generating R2P2 compatible Ruby source file...');

      // R2P2 expects .rb source file, not .mrb bytecode
      const rubySource = new TextEncoder().encode(rubyCode);

      this.config.onOutput?.(`Generated /home/app.rb (${rubySource.length} bytes)`);

      return {
        success: true,
        bytecode: rubySource, // Using bytecode field to pass Ruby source
        output: '',
        warnings: [
          'R2P2 compatible mode - Ruby source ready for filesystem',
          `Source file size: ${rubySource.length} bytes`,
          'Ready for flashing to simulated R2P2 filesystem as /home/app.rb'
        ]
      };

    } catch (error) {
      throw new Error(`R2P2 generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
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
  setMode(mode: ExecutionMode): void {
    this.mode = mode;
    this.config.onOutput?.(`Execution mode set to: ${this.mode}`);
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