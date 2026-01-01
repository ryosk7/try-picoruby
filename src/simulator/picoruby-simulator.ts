import { RP2040, USBCDC } from 'rp2040js';
import { ConsoleLogger, LogLevel } from './utils/logging.js';
import { bootromB1 } from './bootrom.js';
import { loadUF2 } from './uf2-loader.js';
import { applyR2P2Patches } from './r2p2-patches.js';
import { analyzeFlashLayout, logFlashLayout, FlashLayout } from '../utils/uf2-analyzer.js';
import { createR2P2Filesystem, padFilesystemImage } from '../filesystem/fat-generator.js';

export interface SimulatorConfig {
  onConsoleOutput?: (text: string) => void;
  onError?: (error: Error) => void;
  logLevel?: LogLevel;
}

export class PicoRubySimulator {
  private mcu: RP2040;
  private running = false;
  private usbCDC?: USBCDC;
  private config: SimulatorConfig;
  private flashLayout?: FlashLayout;

  constructor(config: SimulatorConfig = {}) {
    this.config = config;

    // Create MCU with bootrom
    this.mcu = new RP2040();
    this.mcu.loadBootrom(bootromB1);

    // Apply R2P2 patches for PicoRuby support
    applyR2P2Patches(this.mcu);

    // Set up USB CDC for serial communication
    this.setupUSBCDC();

    // Set up logging
    if (config.logLevel !== undefined) {
      this.mcu.logger = new ConsoleLogger(config.logLevel);
    }
  }

  private setupUSBCDC() {
    this.usbCDC = new USBCDC(this.mcu.usbCtrl);

    // Handle serial output
    this.usbCDC.onSerialData = (data: Uint8Array) => {
      const text = new TextDecoder().decode(data);
      if (this.config.onConsoleOutput) {
        this.config.onConsoleOutput(text);
      }
    };
  }

  /**
   * Load R2P2 firmware from UF2 data
   */
  async loadFirmware(uf2Data: Uint8Array): Promise<void> {
    try {
      console.log('Loading R2P2 firmware...');
      loadUF2(uf2Data, this.mcu);

      // Analyze flash layout for filesystem placement
      this.flashLayout = analyzeFlashLayout(uf2Data);
      logFlashLayout(this.flashLayout);

      console.log('R2P2 firmware loaded successfully');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Failed to load firmware:', err.message);
      if (this.config.onError) {
        this.config.onError(err);
      }
      throw err;
    }
  }

  /**
   * Flash filesystem with Ruby bytecode (.mrb file)
   */
  async flashFilesystem(mrbBytecode: Uint8Array): Promise<void> {
    if (!this.flashLayout) {
      throw new Error('Firmware not loaded. Load firmware first.');
    }

    try {
      console.log('Creating FAT filesystem with app.mrb...');

      // Create filesystem with the bytecode
      const fsImage = await createR2P2Filesystem(mrbBytecode, this.flashLayout.availableSize);

      // Pad to sector alignment if needed
      const paddedImage = padFilesystemImage(fsImage, this.flashLayout.availableSize);

      // Calculate flash offset (convert virtual address to array index)
      const flashOffset = this.flashLayout.availableStart - 0x10000000;

      console.log(`Flashing filesystem at offset 0x${this.flashLayout.availableStart.toString(16)} (${Math.round(paddedImage.length / 1024)}KB)`);

      // Check bounds
      if (flashOffset + paddedImage.length > this.mcu.flash.length) {
        throw new Error(`Filesystem too large: ${paddedImage.length} bytes, available: ${this.mcu.flash.length - flashOffset}`);
      }

      // Flash the filesystem image
      this.mcu.flash.set(paddedImage, flashOffset);
      console.log('Filesystem flashed successfully');

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Failed to flash filesystem:', err.message);
      if (this.config.onError) {
        this.config.onError(err);
      }
      throw err;
    }
  }

  /**
   * @deprecated Use flashFilesystem() instead
   */
  injectBytecode(bytecode: Uint8Array, offset = 0x10040000): void {
    console.warn('injectBytecode() is deprecated. Use flashFilesystem() instead.');

    try {
      console.log(`Injecting bytecode at offset 0x${offset.toString(16)}, size: ${bytecode.length} bytes`);

      if (offset + bytecode.length > this.mcu.flash.length) {
        throw new Error(`Bytecode too large: ${bytecode.length} bytes, available: ${this.mcu.flash.length - offset}`);
      }

      this.mcu.flash.set(bytecode, offset);
      console.log('Bytecode injection completed');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Failed to inject bytecode:', err.message);
      if (this.config.onError) {
        this.config.onError(err);
      }
      throw err;
    }
  }

  /**
   * Start simulation
   */
  start(): void {
    if (this.running) {
      console.warn('Simulator is already running');
      return;
    }

    console.log('Starting PicoRuby simulation...');
    this.running = true;

    // Set PC to flash start and begin execution
    this.mcu.core.PC = 0x10000000;
    this.executeLoop();
  }

  /**
   * Stop simulation
   */
  stop(): void {
    console.log('Stopping simulation...');
    this.running = false;
  }

  /**
   * Reset the MCU
   */
  reset(): void {
    console.log('Resetting MCU...');
    this.stop();
    this.mcu.reset();
    // Reapply patches after reset
    applyR2P2Patches(this.mcu);
  }

  /**
   * Send data to serial input (UART)
   */
  sendSerialData(data: string): void {
    if (this.usbCDC) {
      // Note: API method name needs verification
      // const bytes = new TextEncoder().encode(data);
      // this.usbCDC.sendSerialData(bytes);
      console.log('Serial data to send:', data);
    }
  }

  /**
   * Get current MCU state for debugging
   */
  getState() {
    return {
      pc: this.mcu.core.PC,
      sp: this.mcu.core.SP,
      running: this.running,
      registers: Array.from(this.mcu.core.registers),
      flashLayout: this.flashLayout
    };
  }

  /**
   * Get flash layout information
   */
  getFlashLayout(): FlashLayout | undefined {
    return this.flashLayout;
  }

  private async executeLoop(): Promise<void> {
    try {
      while (this.running) {
        // Execute instructions in chunks to avoid blocking the UI
        for (let i = 0; i < 1000 && this.running; i++) {
          // Note: RP2040 API method name needs verification
          // this.mcu.executeInstruction();
          // Placeholder execution step
          if (typeof (this.mcu as any).step === 'function') {
            (this.mcu as any).step();
          }
        }

        // Yield control to browser
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Simulation error:', err.message);
      this.running = false;
      if (this.config.onError) {
        this.config.onError(err);
      }
    }
  }
}