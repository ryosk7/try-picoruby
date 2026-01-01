/**
 * UF2 (USB Flashing Format) analyzer for determining flash memory layout
 */

export interface UF2Block {
  flags: number;
  targetAddr: number;
  payloadSize: number;
  blockNo: number;
  numBlocks: number;
  data: Uint8Array;
}

export interface FlashLayout {
  firmwareStart: number;
  firmwareEnd: number;
  firmwareSize: number;
  availableStart: number;
  availableSize: number;
  flashSize: number;
}

const UF2_MAGIC_START0 = 0x0A324655;
const UF2_MAGIC_START1 = 0x9E5D5157;
const UF2_MAGIC_END = 0x0AB16F30;

export function parseUF2(data: Uint8Array): UF2Block[] {
  const blocks: UF2Block[] = [];
  const view = new DataView(data.buffer);

  for (let offset = 0; offset < data.length; offset += 512) {
    if (offset + 512 > data.length) break;

    // Check UF2 magic numbers
    const magic0 = view.getUint32(offset, true);
    const magic1 = view.getUint32(offset + 4, true);
    const magicEnd = view.getUint32(offset + 508, true);

    if (magic0 !== UF2_MAGIC_START0 || magic1 !== UF2_MAGIC_START1 || magicEnd !== UF2_MAGIC_END) {
      console.warn(`Invalid UF2 block at offset ${offset.toString(16)}`);
      continue;
    }

    const flags = view.getUint32(offset + 8, true);
    const targetAddr = view.getUint32(offset + 12, true);
    const payloadSize = view.getUint32(offset + 16, true);
    const blockNo = view.getUint32(offset + 20, true);
    const numBlocks = view.getUint32(offset + 24, true);

    const blockData = new Uint8Array(data.buffer, offset + 32, Math.min(payloadSize, 476));

    blocks.push({
      flags,
      targetAddr,
      payloadSize,
      blockNo,
      numBlocks,
      data: blockData
    });
  }

  return blocks;
}

export function analyzeFlashLayout(uf2Data: Uint8Array): FlashLayout {
  const blocks = parseUF2(uf2Data);

  if (blocks.length === 0) {
    throw new Error('No valid UF2 blocks found');
  }

  // Find the range of flash addresses used by firmware
  let minAddr = Number.MAX_SAFE_INTEGER;
  let maxAddr = 0;

  for (const block of blocks) {
    if (block.targetAddr < minAddr) minAddr = block.targetAddr;
    if (block.targetAddr + block.payloadSize > maxAddr) {
      maxAddr = block.targetAddr + block.payloadSize;
    }
  }

  // Round up to next page boundary (4KB alignment)
  const pageSize = 4096;
  const firmwareEnd = Math.ceil(maxAddr / pageSize) * pageSize;

  // Flash memory constants for RP2040
  const flashStart = 0x10000000;
  const flashSize = 2 * 1024 * 1024; // 2MB for standard Pico

  return {
    firmwareStart: minAddr,
    firmwareEnd: firmwareEnd,
    firmwareSize: firmwareEnd - minAddr,
    availableStart: firmwareEnd,
    availableSize: flashSize - (firmwareEnd - flashStart),
    flashSize: flashSize
  };
}

export function logFlashLayout(layout: FlashLayout): void {
  console.log('Flash Memory Layout Analysis:');
  console.log(`  Firmware: 0x${layout.firmwareStart.toString(16)} - 0x${layout.firmwareEnd.toString(16)} (${Math.round(layout.firmwareSize / 1024)}KB)`);
  console.log(`  Available: 0x${layout.availableStart.toString(16)} - 0x${(layout.availableStart + layout.availableSize).toString(16)} (${Math.round(layout.availableSize / 1024)}KB)`);
  console.log(`  Flash Total: ${Math.round(layout.flashSize / 1024)}KB`);
}