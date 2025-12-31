import { RP2040 } from 'rp2040js';
import { CustomRP2040SysInfo } from './peripherals/sysinfo.js';

/**
 * Apply R2P2 patches to rp2040js MCU
 * Enables flash writing and custom SysInfo
 */
export function applyR2P2Patches(mcu: RP2040) {
  console.log('Applying R2P2 patches to rp2040js...');

  // 1. Replace SysInfo peripheral with custom implementation
  const sysInfoPeripheral = new CustomRP2040SysInfo(mcu, 'SYSINFO_BASE');
  mcu.peripherals[0x40000] = sysInfoPeripheral;

  // 2. Add flash writing support via breakpoint 27
  const originalOnBreak = mcu.onBreak;
  mcu.onBreak = (code: number) => {
    if (code === 27) {
      // Handle flash write operation
      // R0: flash address, R1: RAM address, R2: byte count
      const core = mcu.core;
      const RAM_START_ADDRESS = 0x20000000;

      const flashAddr = core.registers[0];
      const ramAddr = core.registers[1] - RAM_START_ADDRESS;
      const count = core.registers[2];

      console.log(`Flash write: ${flashAddr.toString(16)}, RAM: ${ramAddr.toString(16)}, count: ${count}`);

      // Copy from SRAM to flash
      if (ramAddr >= 0 && ramAddr + count <= mcu.sram.length) {
        const data = mcu.sram.slice(ramAddr, ramAddr + count);
        if (flashAddr < mcu.flash.length) {
          mcu.flash.set(data, flashAddr);
          console.log(`Flash write completed: ${count} bytes`);
        } else {
          console.error(`Flash write failed: address ${flashAddr.toString(16)} out of bounds`);
        }
      } else {
        console.error(`Flash write failed: invalid RAM address ${ramAddr.toString(16)}`);
      }

      // Continue execution (don't halt)
      return;
    }

    // Call original break handler for other breakpoints
    if (originalOnBreak) {
      originalOnBreak(code);
    }
  };

  console.log('R2P2 patches applied successfully');
}