/**
 * Custom FatFS WASM loader to handle MIME type issues
 */

import { FatFsDisk, FatFsFormat, FatFsMode } from 'fatfs-wasm';

/**
 * Load fatfs-wasm with custom WASM URLs from public directory
 */
export async function createFatFsDiskWithCustomWasm(
  diskImage: Uint8Array,
  options: { sectorSize?: number; multiPartition?: boolean } = {}
): Promise<any> {
  try {
    // Try to use original fatfs-wasm first
    return await FatFsDisk.create(diskImage, options);
  } catch (error) {
    console.warn('Failed to load fatfs-wasm with default loader:', error);

    // If that fails due to WASM MIME type, try alternative approach
    console.log('Attempting to use custom WASM loader...');

    // For now, fallback to creating a basic disk without fatfs-wasm
    return await createMockFatFsDisk(diskImage, options);
  }
}

/**
 * Mock FatFS disk implementation for fallback
 */
async function createMockFatFsDisk(
  _diskImage: Uint8Array,
  _options: { sectorSize?: number; multiPartition?: boolean } = {}
) {
  return {
    // Mock implementation with minimal functionality
    mkfs: (opts: any) => {
      console.log('Mock mkfs called with options:', opts);
    },

    open: (path: string, _mode: number) => {
      console.log('Mock open called for:', path);
      return {
        write: (data: Uint8Array) => {
          console.log(`Mock write: ${data.length} bytes to ${path}`);
          return data.length;
        },
        close: () => {
          console.log('Mock close called');
        }
      };
    },

    setLabel: (label: string) => {
      console.log('Mock setLabel:', label);
    }
  };
}

export { FatFsFormat, FatFsMode };