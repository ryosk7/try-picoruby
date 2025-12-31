# Try PicoRuby

A browser-based simulator for PicoRuby with Wokwi-like UI, built on top of rp2040js.

## Features

- 🖥️ **Browser-based**: Runs entirely in your browser, no installation required
- 🎯 **Wokwi-inspired UI**: Familiar interface with code editor and circuit visualization
- 🔧 **R2P2 Compatible**: Uses the same firmware as the real PicoRuby hardware
- ⚡ **Real-time**: See your Ruby code execution in real-time
- 🔌 **GPIO Control**: Simulate LED blinking, button presses, and sensor readings

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Build R2P2 firmware** (optional, for development)
   ```bash
   cd firmware
   ./build-r2p2.sh
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Load firmware**: Open the simulator in your browser and upload a `.uf2` firmware file

## Project Structure

```
try-picoruby/
├── src/
│   ├── simulator/
│   │   ├── picoruby-simulator.ts  # Main simulator class
│   │   └── r2p2-patches.ts        # R2P2 patches for rp2040js
│   └── ui/
│       ├── CodeEditor.tsx         # Ruby code editor
│       ├── Console.tsx           # Serial console
│       └── ControlPanel.tsx      # Control buttons
├── firmware/                     # Firmware build scripts
└── public/                       # Static assets
```

## How it Works

The simulator consists of several key components:

### 1. **rp2040js Integration**
- Uses the rp2040js library to emulate the RP2040 microcontroller
- Applies R2P2-specific patches for flash writing and platform identification

### 2. **R2P2 Firmware**
- Loads the actual R2P2 firmware (.uf2 file) into the emulated flash memory
- Supports the same Ruby APIs as the real hardware

### 3. **Ruby Code Execution** (Future)
- Compile Ruby code to mruby bytecode using WebAssembly mrbcWASM
- Inject bytecode into flash memory at runtime
- Execute through the R2P2 runtime

### 4. **UI Components**
- Monaco Editor for Ruby syntax highlighting
- xterm.js for serial console output
- Circuit canvas for GPIO visualization (planned)

## Development

### Building Firmware

To build the R2P2 firmware locally:

```bash
cd firmware
./build-r2p2.sh
```

Requirements:
- cmake
- arm-none-eabi-gcc
- Ruby

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
```

## Roadmap

- [x] Basic project structure and rp2040js integration
- [x] R2P2 patches and firmware loading
- [x] Code editor with Ruby syntax highlighting
- [x] Serial console output
- [x] Local implementations of required rp2040js classes
- [x] UF2 firmware loader for browser
- [x] Development server running successfully
- [ ] mrbcWASM integration for Ruby compilation
- [ ] GPIO control and LED simulation
- [ ] Wokwi-style circuit canvas
- [ ] Component library (sensors, actuators)
- [ ] Project sharing and examples

## Technical Details

### R2P2 Patches

The simulator applies specific patches to rp2040js to support PicoRuby:

1. **Flash Writing Support**: Handles breakpoint 27 for runtime flash operations
2. **Custom SysInfo**: Returns platform ID `0x01000002` for PicoRuby identification

### Memory Layout

- **Flash**: R2P2 firmware + user bytecode
- **SRAM**: Runtime variables and stack
- **Peripherals**: GPIO, UART, I2C, SPI emulation through rp2040js

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Acknowledgments

- [rp2040js](https://github.com/wokwi/rp2040js) - RP2040 emulator
- [R2P2](https://github.com/picoruby/R2P2) - PicoRuby shell for RP2040
- [Wokwi](https://wokwi.com/) - Inspiration for the UI design
- [PicoRuby](https://github.com/picoruby/picoruby) - Ruby implementation for microcontrollers