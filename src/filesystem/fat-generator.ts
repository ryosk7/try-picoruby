/**
 * FAT filesystem generator for PicoRuby R2P2 firmware
 */

// Note: fatfs-wasm API needs investigation - using placeholder for now
// import { FatFS } from 'fatfs-wasm';

export interface FileEntry {
  name: string;
  content: Uint8Array;
  directory?: string;
}

export interface FatConfig {
  size: number; // Total filesystem size in bytes
  sectorSize: number; // Sector size (typically 512 or 4096)
  label?: string; // Volume label
}

export class FatGenerator {
  private config: FatConfig;
  private fatfs?: any; // Placeholder for FatFS instance

  constructor(config: FatConfig) {
    this.config = config;
  }

  /**
   * Initialize the FAT filesystem
   */
  async init(): Promise<void> {
    try {
      // Placeholder implementation - real FAT filesystem creation needed
      console.log('Initializing placeholder FAT filesystem...');
      this.fatfs = {
        files: new Map<string, Uint8Array>()
      };
    } catch (error) {
      throw new Error(`Failed to initialize FAT filesystem: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Add files to the filesystem
   */
  async addFiles(files: FileEntry[]): Promise<void> {
    if (!this.fatfs) {
      throw new Error('Filesystem not initialized');
    }

    try {
      for (const file of files) {
        const fullPath = file.directory ? `${file.directory}/${file.name}` : file.name;
        console.log(`Adding file: ${fullPath} (${file.content.length} bytes)`);

        // Store in placeholder filesystem
        this.fatfs.files.set(fullPath, file.content);
      }
    } catch (error) {
      throw new Error(`Failed to add files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate the complete filesystem image
   */
  async generate(files: FileEntry[]): Promise<Uint8Array> {
    await this.init();
    await this.addFiles(files);

    if (!this.fatfs) {
      throw new Error('Filesystem not initialized');
    }

    // Create a placeholder filesystem image
    console.log('Generating placeholder filesystem image...');

    // Calculate total size needed
    let totalSize = 0;
    for (const [, content] of this.fatfs.files.entries()) {
      totalSize += content.length + 64; // Add some overhead for directory entries
    }

    // Create a simple concatenated file structure as placeholder
    const image = new Uint8Array(Math.max(totalSize, 4096));
    let offset = 0;

    for (const [, content] of this.fatfs.files.entries()) {
      if (offset + content.length < image.length) {
        image.set(content, offset);
        offset += content.length;
      }
    }

    return image;
  }

  /**
   * Get filesystem stats
   */
  async getStats() {
    if (!this.fatfs) {
      throw new Error('Filesystem not initialized');
    }

    return {
      totalSize: this.config.size,
      usedSize: this.fatfs.files.size * 1024, // Rough estimate
      files: this.fatfs.files.size
    };
  }
}

/**
 * Create a minimal FAT filesystem for PicoRuby with app.mrb
 */
export async function createR2P2Filesystem(
  appMrb: Uint8Array,
  availableSize: number
): Promise<Uint8Array> {

  // Use a reasonable size for the filesystem (leave some space for future files)
  const fsSize = Math.min(availableSize, 1024 * 1024); // Max 1MB
  const sectorSize = 4096; // 4KB sectors as used by R2P2

  const fatGen = new FatGenerator({
    size: fsSize,
    sectorSize: sectorSize,
    label: 'R2P2FS'
  });

  const files: FileEntry[] = [
    {
      name: 'app.mrb',
      content: appMrb
    }
  ];

  console.log(`Creating R2P2 filesystem: ${Math.round(fsSize / 1024)}KB`);
  console.log(`App bytecode: ${appMrb.length} bytes`);

  const fsImage = await fatGen.generate(files);

  console.log(`Generated filesystem image: ${fsImage.length} bytes`);

  return fsImage;
}

/**
 * Pad filesystem image to required size
 */
export function padFilesystemImage(image: Uint8Array, targetSize: number): Uint8Array {
  if (image.length >= targetSize) {
    return image;
  }

  const padded = new Uint8Array(targetSize);
  padded.set(image, 0);

  // Fill remaining space with 0xFF (typical flash erased state)
  for (let i = image.length; i < targetSize; i++) {
    padded[i] = 0xFF;
  }

  return padded;
}