#!/bin/bash

# Build script for R2P2 firmware
# This script downloads and builds R2P2 firmware for use in the simulator

set -e

echo "Building R2P2 firmware..."

# Check if we're in the firmware directory
if [ ! -f "build-r2p2.sh" ]; then
    echo "Error: Please run this script from the firmware directory"
    exit 1
fi

# Create build directory
mkdir -p build
cd build

# Clone R2P2 if not exists
if [ ! -d "R2P2" ]; then
    echo "Cloning R2P2 repository..."
    git clone --recursive https://github.com/picoruby/R2P2.git
fi

cd R2P2

# Check required dependencies
echo "Checking dependencies..."
if ! command -v cmake &> /dev/null; then
    echo "Error: cmake is required but not installed"
    exit 1
fi

if ! command -v arm-none-eabi-gcc &> /dev/null; then
    echo "Error: arm-none-eabi-gcc is required but not installed"
    echo "Install with: apt install gcc-arm-none-eabi"
    exit 1
fi

# Build firmware
echo "Building firmware..."
rake mrubyc:pico:debug

# Copy UF2 file to parent directory for easy access
echo "Copying firmware..."
UF2_FILE=$(find build_pico -name "*.uf2" | head -n 1)
if [ -n "$UF2_FILE" ]; then
    cp "$UF2_FILE" "../../r2p2-firmware.uf2"
    echo "Firmware built successfully: r2p2-firmware.uf2"
else
    echo "Error: No UF2 file found in build output"
    exit 1
fi

echo "Build completed!"
echo "To use the firmware:"
echo "1. Start the simulator with 'npm run dev'"
echo "2. Upload the r2p2-firmware.uf2 file through the web interface"