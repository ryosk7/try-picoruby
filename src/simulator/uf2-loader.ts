import { RP2040 } from 'rp2040js';

const FLASH_START_ADDRESS = 0x10000000;
const RP2040_FAMILY_ID = 0xE48BFF56;

export interface UF2Block {
  flashAddress: number;
  payload: Uint8Array;
}

/**
 * Decode a single UF2 block (512 bytes)
 * Based on the UF2 format specification
 */
export function decodeUF2Block(data: Uint8Array): UF2Block | null {
  if (data.length !== 512) {
    return null;
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  // Check UF2 magic numbers
  const magic1 = view.getUint32(0, true); // 0x0A324655
  const magic2 = view.getUint32(4, true); // 0x9E5D5157
  const magic3 = view.getUint32(508, true); // 0x0AB16F30

  if (magic1 !== 0x0A324655 || magic2 !== 0x9E5D5157 || magic3 !== 0x0AB16F30) {
    return null;
  }

  // Extract block information
  const flags = view.getUint32(8, true);
  const flashAddress = view.getUint32(12, true);
  const payloadSize = view.getUint32(16, true);
  const blockNumber = view.getUint32(20, true);
  const totalBlocks = view.getUint32(24, true);
  const familyId = view.getUint32(28, true);

  // Validate payload size
  if (payloadSize > 476) { // 512 - 32 (header) - 4 (magic3)
    console.error(`Invalid payload size: ${payloadSize}`);
    return null;
  }

  // Skip non-flash blocks
  if ((flags & 0x01) !== 0) {
    console.warn(`Skipping non-flash UF2 block ${blockNumber + 1}/${totalBlocks}`);
    return null;
  }

  // Basic sanity checks
  if (totalBlocks !== 0 && blockNumber >= totalBlocks) {
    console.warn(`UF2 block number ${blockNumber} is out of range for total blocks ${totalBlocks}`);
    return null;
  }

  if (familyId !== 0 && familyId !== RP2040_FAMILY_ID) {
    console.warn(`UF2 family ID mismatch: expected 0x${RP2040_FAMILY_ID.toString(16)}, got 0x${familyId.toString(16)}`);
  }

  // Extract payload data
  const payload = data.slice(32, 32 + payloadSize);

  return {
    flashAddress,
    payload
  };
}

/**
 * Load UF2 firmware data into RP2040 flash memory
 * Browser-compatible version that works with Uint8Array
 */
export function loadUF2(data: Uint8Array, rp2040: RP2040): void {
  console.log(`Loading UF2 data: ${data.length} bytes`);

  const blockSize = 512;
  const numBlocks = Math.floor(data.length / blockSize);
  let blocksLoaded = 0;

  for (let i = 0; i < numBlocks; i++) {
    const blockStart = i * blockSize;
    const blockData = data.slice(blockStart, blockStart + blockSize);

    try {
      const block = decodeUF2Block(blockData);
      if (block) {
        const flashOffset = block.flashAddress - FLASH_START_ADDRESS;

        // Validate flash address
        if (flashOffset < 0 || flashOffset + block.payload.length > rp2040.flash.length) {
          console.error(`Flash address out of bounds: 0x${block.flashAddress.toString(16)}`);
          continue;
        }

        // Write to flash
        rp2040.flash.set(block.payload, flashOffset);
        blocksLoaded++;

        console.log(`Block ${i}: loaded ${block.payload.length} bytes at flash offset 0x${flashOffset.toString(16)}`);
      }
    } catch (error) {
      console.error(`Error processing block ${i}:`, error);
    }
  }

  console.log(`UF2 loading complete: ${blocksLoaded}/${numBlocks} blocks loaded`);

  if (blocksLoaded === 0) {
    throw new Error('No valid UF2 blocks found in the provided data');
  }
}

/**
 * Load UF2 firmware from a File object (for browser file input)
 */
export async function loadUF2FromFile(file: File, rp2040: RP2040): Promise<void> {
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  loadUF2(data, rp2040);
}

/**
 * Validate UF2 file format
 */
export function validateUF2(data: Uint8Array): boolean {
  if (data.length < 512 || data.length % 512 !== 0) {
    return false;
  }

  // Check first block
  const firstBlock = decodeUF2Block(data.slice(0, 512));
  return firstBlock !== null;
}
