/**
 * FAT filesystem generator for PicoRuby R2P2 firmware
 */

import { createFatFsDiskWithCustomWasm, FatFsFormat, FatFsMode } from './custom-fatfs-loader';

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
  private disk?: any; // Use any type for custom disk implementation
  private diskImage?: Uint8Array;

  constructor(config: FatConfig) {
    this.config = config;
  }

  /**
   * Initialize the FAT filesystem
   */
  async init(): Promise<void> {
    try {
      console.log('Initializing FAT filesystem...');

      // Create a disk with the specified size
      this.diskImage = new Uint8Array(this.config.size);
      this.disk = await createFatFsDiskWithCustomWasm(this.diskImage, {
        sectorSize: this.config.sectorSize
      });

      // Format the disk
      this.disk.mkfs({
        fmt: this.config.size > 32 * 1024 * 1024 ? FatFsFormat.FAT32 : FatFsFormat.FAT,
        auSize: 4096 // 4KB clusters
      });

      if (this.config.label) {
        this.disk.setLabel(this.config.label);
      }

      console.log('FAT filesystem initialized successfully');
    } catch (error) {
      throw new Error(`Failed to initialize FAT filesystem: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Add files to the filesystem
   */
  async addFiles(files: FileEntry[]): Promise<void> {
    if (!this.disk) {
      throw new Error('Filesystem not initialized');
    }

    try {
      for (const file of files) {
        const fullPath = file.directory ? `${file.directory}/${file.name}` : file.name;
        console.log(`Adding file: ${fullPath} (${file.content.length} bytes)`);

        // Create directory if needed
        if (file.directory) {
          try {
            this.disk.mkdir(file.directory);
          } catch {
            // Directory might already exist
          }
        }

        // Write file to filesystem
        const fatFile = this.disk.open(
          fullPath,
          FatFsMode.WRITE | FatFsMode.CREATE_ALWAYS
        );
        if (fatFile && fatFile.write) {
          fatFile.write(file.content);
          fatFile.close();
        }
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

    if (!this.disk) {
      throw new Error('Filesystem not initialized');
    }

    // Export the filesystem as a binary image
    console.log('Generating FAT filesystem image...');
    if (!this.diskImage) {
      throw new Error('Filesystem image not available');
    }

    return new Uint8Array(this.diskImage);
  }

  /**
   * Get filesystem stats
   */
  async getStats() {
    if (!this.disk) {
      throw new Error('Filesystem not initialized');
    }

    try {
      const [freeClusters, fatFs] = this.disk.getFree('/');
      const bytesPerCluster = fatFs.cSize * this.config.sectorSize;
      const totalClusters = Math.floor(this.config.size / bytesPerCluster);
      return {
        totalSize: this.config.size,
        freeBytes: freeClusters * bytesPerCluster,
        usedBytes: this.config.size - (freeClusters * bytesPerCluster),
        totalClusters,
        freeClusters
      };
    } catch (error) {
      return {
        totalSize: this.config.size,
        freeBytes: 0,
        usedBytes: this.config.size,
        totalClusters: 0,
        freeClusters: 0
      };
    }
  }
}

/**
 * Create a minimal FAT filesystem for PicoRuby with /home/app.rb
 */
export async function createR2P2Filesystem(
  rubySource: Uint8Array,
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
      name: 'app.rb',
      content: rubySource,
      directory: 'home'
    }
  ];

  console.log(`Creating R2P2 filesystem: ${Math.round(fsSize / 1024)}KB`);
  console.log(`App Ruby source: ${rubySource.length} bytes`);

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
