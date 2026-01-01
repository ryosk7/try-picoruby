/**
 * PicoRuby executor using @picoruby/wasm-wasi for direct Ruby execution
 */

export interface ExecutionResult {
  success: boolean;
  output?: string;
  bytecode?: Uint8Array;  // Optional bytecode for R2P2 compatibility
  error?: string;
  warnings?: string[];
}

export interface ExecutorConfig {
  onOutput?: (message: string) => void;
  onError?: (error: string) => void;
  mode?: 'immediate' | 'r2p2-compatible'; // Execution mode
}

export enum ExecutionMode {
  IMMEDIATE = 'immediate',        // Direct WASM execution in browser
  R2P2_COMPATIBLE = 'r2p2-compatible'  // Generate files for R2P2 simulation
}

export class PicoRubyExecutor {
  private config: ExecutorConfig;
  private wasmModule?: any;
  private initialized = false;
  private mode: ExecutionMode;
  private outputBuffer = '';

  constructor(config: ExecutorConfig = {}) {
    this.config = config;
    this.mode = config.mode === 'r2p2-compatible' ? ExecutionMode.R2P2_COMPATIBLE : ExecutionMode.IMMEDIATE;
  }

  /**
   * Initialize the PicoRuby WASM module
   */
  async init(): Promise<void> {
    try {
      this.config.onOutput?.('Initializing PicoRuby WASM executor...');

      // Import the PicoRuby WASM module factory
      const { default: createModule } = await import('@picoruby/wasm-wasi');

      this.config.onOutput?.('Loading WASM module...');

      // Create and initialize the PicoRuby Module
      const module = await createModule();

      // Set up output capture
      this.setupOutputCapture(module);

      // Initialize PicoRuby
      module.ccall('picorb_init', 'number', [], []);

      this.wasmModule = module;
      this.initialized = true;
      this.config.onOutput?.(`PicoRuby executor ready! Mode: ${this.mode}`);
    } catch (error) {
      const errorMsg = `Failed to initialize PicoRuby executor: ${error instanceof Error ? error.message : String(error)}`;
      this.config.onError?.(errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Set up output capture from PicoRuby
   */
  private setupOutputCapture(module: any): void {
    // Capture stdout
    if (module.print) {
      const originalPrint = module.print;
      module.print = (text: string) => {
        this.outputBuffer += text + '\n';
        originalPrint(text);
      };
    } else {
      module.print = (text: string) => {
        this.outputBuffer += text + '\n';
      };
    }

    // Capture stderr
    if (module.printErr) {
      const originalPrintErr = module.printErr;
      module.printErr = (text: string) => {
        this.outputBuffer += '[ERROR] ' + text + '\n';
        originalPrintErr(text);
      };
    } else {
      module.printErr = (text: string) => {
        this.outputBuffer += '[ERROR] ' + text + '\n';
      };
    }
  }

  /**
   * Execute Ruby source code
   */
  async executeRuby(rubyCode: string, filename = 'app.rb'): Promise<ExecutionResult> {
    if (!this.initialized || !this.wasmModule) {
      throw new Error('Executor not initialized. Call init() first.');
    }

    try {
      this.config.onOutput?.(`Executing ${filename} in ${this.mode} mode...`);

      if (this.mode === ExecutionMode.IMMEDIATE) {
        // Direct execution in browser using WASM
        return await this.executeImmediate(rubyCode, filename);
      } else {
        // R2P2 compatible mode - generate filesystem files
        return await this.generateR2P2Compatible(rubyCode, filename);
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
   * Direct Ruby execution using WASM
   */
  private async executeImmediate(rubyCode: string, _filename: string): Promise<ExecutionResult> {
    try {
      this.config.onOutput?.('Running Ruby code directly in WASM...');

      // Clear previous output
      this.outputBuffer = '';

      // Create a task for the Ruby code
      const taskId = this.wasmModule.ccall('picorb_create_task', 'number', ['string'], [rubyCode]);

      if (taskId < 0) {
        throw new Error(`Failed to create Ruby task: ${taskId}`);
      }

      this.config.onOutput?.('Ruby task created, starting execution...');

      // Run the task using the PicoRuby execution loop
      const MRBC_TICK_UNIT = 8.1;
      let lastTime = performance.now();

      // Execute in a controlled manner
      return new Promise((resolve, reject) => {
        const runStep = () => {
          try {
            const currentTime = performance.now();
            if (MRBC_TICK_UNIT <= currentTime - lastTime) {
              this.wasmModule.ccall('mrbc_tick', null, [], []);
              lastTime = currentTime;
            }

            const result = this.wasmModule.ccall('mrbc_run_step', 'number', [], []);

            if (result < 0) {
              // All tasks are dormant - execution complete
              this.config.onOutput?.(`Execution completed! Output: ${this.outputBuffer.length} characters`);

              resolve({
                success: true,
                output: this.outputBuffer,
                warnings: ['Direct WASM execution - no filesystem simulation']
              });
            } else {
              // Continue execution
              setTimeout(runStep, 0);
            }
          } catch (error) {
            reject(new Error(`WASM execution failed: ${error instanceof Error ? error.message : String(error)}`));
          }
        };

        runStep();
      });

    } catch (error) {
      throw new Error(`WASM execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate R2P2 compatible filesystem with app.rb
   */
  private async generateR2P2Compatible(rubyCode: string, _filename: string): Promise<ExecutionResult> {
    try {
      this.config.onOutput?.('Generating R2P2 compatible filesystem...');

      // Create Ruby source file for R2P2
      const sourceFile = new TextEncoder().encode(rubyCode);

      this.config.onOutput?.(`Generated /home/app.rb (${sourceFile.length} bytes)`);

      return {
        success: true,
        bytecode: sourceFile, // Using bytecode field to pass source file
        output: '',
        warnings: [
          'R2P2 compatible mode - source file ready for filesystem',
          `Source file: ${sourceFile.length} bytes`,
          'Ready for flashing to simulated R2P2 filesystem'
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
      return this.wasmModule.version || 'PicoRuby WASM';
    } catch {
      return 'PicoRuby WASM';
    }
  }

  /**
   * Set execution mode
   */
  setMode(mode: ExecutionMode): void {
    this.mode = mode;
    this.config.onOutput?.(`Execution mode changed to: ${mode}`);
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