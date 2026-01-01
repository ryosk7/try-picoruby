/**
 * Local implementation of RP2040 SysInfo peripheral
 * Replaces rp2040js internal SysInfo to avoid import issues
 */

import { RP2040 } from 'rp2040js';

/**
 * Base SysInfo peripheral implementation
 * Provides system information registers for the RP2040
 */
export class RP2040SysInfo {
  protected mcu: RP2040;
  protected name: string;

  constructor(mcu: RP2040, name: string) {
    this.mcu = mcu;
    this.name = name;
  }

  /**
   * Read 32-bit value from SysInfo register
   * @param offset Register offset
   * @returns Register value
   */
  readUint32(offset: number): number {
    switch (offset) {
      case 0x0: // CHIP_ID
        return 0x00001000; // RP2040 chip ID
      case 0x4: // PLATFORM
        return 0x00000001; // Default platform ID
      case 0x8: // GITREF_RP2040
        return 0x00000000; // Git reference (placeholder)
      default:
        console.warn(`SysInfo: Unknown register read at offset 0x${offset.toString(16)}`);
        return 0;
    }
  }

  /**
   * Write 32-bit value to SysInfo register
   * SysInfo registers are typically read-only, so this logs a warning
   */
  writeUint32(offset: number, value: number): void {
    console.warn(`SysInfo: Attempted write to read-only register at offset 0x${offset.toString(16)}, value: 0x${value.toString(16)}`);
  }

  /**
   * Handle atomic writes by applying the atomic operation to the current value
   * before delegating to the normal write handler.
   */
  writeUint32Atomic(offset: number, value: number, atomicType: number): void {
    const currentValue = this.readUint32(offset);

    switch (atomicType) {
      case 1: // XOR
        this.writeUint32(offset, currentValue ^ value);
        break;
      case 2: // SET
        this.writeUint32(offset, currentValue | value);
        break;
      case 3: // CLEAR
        this.writeUint32(offset, currentValue & ~value);
        break;
      default: // Normal write
        this.writeUint32(offset, value);
        break;
    }
  }

  /**
   * Reset the peripheral to its default state
   */
  reset(): void {
    // SysInfo doesn't have state to reset
  }

  /**
   * Get the name of this peripheral
   */
  getName(): string {
    return this.name;
  }
}

/**
 * Custom SysInfo peripheral that returns PicoRuby-specific platform ID
 * This is used by R2P2 to identify the emulated environment
 */
export class CustomRP2040SysInfo extends RP2040SysInfo {
  readUint32(offset: number): number {
    const PLATFORM = 0x4;
    switch (offset) {
      case PLATFORM:
        // Return custom platform ID for PicoRuby/R2P2
        return 0x01000002;
      default:
        return super.readUint32(offset);
    }
  }
}
