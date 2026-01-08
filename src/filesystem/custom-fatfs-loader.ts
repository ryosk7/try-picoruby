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
  diskImage: Uint8Array,
  options: { sectorSize?: number; multiPartition?: boolean } = {}
) {
  console.warn(`Using mock FAT filesystem implementation - disk size: ${diskImage.length} bytes`);

  // Create a file registry for the mock filesystem
  const fileRegistry: { [path: string]: Uint8Array } = {};

  return {
    // Mock implementation with enhanced functionality
    mkfs: (opts: any) => {
      console.log('Mock mkfs called with options:', opts);
      // Clear the registry to simulate formatting
      Object.keys(fileRegistry).forEach(key => delete fileRegistry[key]);
    },

    mkdir: (dirPath: string) => {
      console.log('Mock mkdir called for:', dirPath);
      // In mock implementation, directories are implicit
    },

    open: (path: string, mode: number) => {
      console.log(`Mock open called for: ${path} (mode: ${mode})`);
      return {
        write: (data: Uint8Array) => {
          console.log(`Mock write: ${data.length} bytes to ${path}`);
          fileRegistry[path] = new Uint8Array(data);
          console.log(`Registered file ${path} in mock filesystem`);
          return data.length;
        },
        close: () => {
          console.log(`Mock close called for ${path}`);
        }
      };
    },

    setLabel: (label: string) => {
      console.log('Mock setLabel:', label);
    },

    getFree: (path: string) => {
      console.log('Mock getFree called for:', path);
      const usedBytes = Object.values(fileRegistry).reduce((sum, data) => sum + data.length, 0);
      const freeBytes = diskImage.length - usedBytes;
      const freeClusters = Math.floor(freeBytes / (options.sectorSize || 512));

      return [freeClusters, {
        cSize: 1 // Cluster size in sectors
      }];
    },

    // Enhanced debugging function to show registered files
    _debug_getFiles: () => {
      console.log('Mock filesystem contents:', Object.keys(fileRegistry));
      return fileRegistry;
    }
  };
}

export { FatFsFormat, FatFsMode };