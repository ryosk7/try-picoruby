# try-picoruby - Technical Documentation

## Architecture Overview

This project provides a browser-based RP2040 emulator running PicoRuby, allowing users to experiment with Ruby code on microcontrollers without physical hardware.

### Core Components

1. **rp2040js Emulator**: JavaScript-based RP2040 microcontroller emulator
2. **PicoRuby Runtime**: Ruby interpreter optimized for microcontrollers
3. **R2P2**: Development environment integrating PicoRuby with RP2040 hardware
4. **Browser Interface**: Web-based terminal and control interface

### Directory Structure

```
try-picoruby/
├── browser-rp2040js/           # Legacy browser interface (deprecated)
├── build_files/                # Build artifacts and UF2 files
├── picoruby/                   # Standalone PicoRuby (legacy)
└── R2P2/                       # Main R2P2 project (Git Subtree)
    ├── browser-rp2040js/       # Active browser interface
    │   ├── index.html          # Web UI
    │   ├── main.js             # Main application logic
    │   ├── bootrom.js          # RP2040 bootrom implementation
    │   ├── uf2.js              # UF2 file loader
    │   └── lib/rp2040js/       # RP2040 JavaScript emulator
    ├── lib/picoruby/           # PicoRuby source (Git Subtree)
    ├── src/                    # R2P2 C source code
    ├── mrblib/                 # Ruby source code
    └── build_config/           # Build configurations
```

## Implementation Details

### Browser Emulator (`R2P2/browser-rp2040js/`)

#### Core Files

**index.html**
- Provides the user interface with terminal output and controls
- Styled with a monospace font for terminal feel
- Contains buttons for Start/Stop/Reset and UF2 loading
- Real-time UART input/output interface

**main.js**
- Initializes the RP2040 JavaScript simulator
- Handles UART communication between browser and emulated microcontroller
- Manages terminal output with ANSI escape sequence support
- Loads UF2 firmware files and manages emulator lifecycle
- Implements terminal features like cursor positioning and color support

**bootrom.js**
- Contains the RP2040 bootrom binary data
- Essential for proper microcontroller initialization

**uf2.js**
- UF2 (USB Flashing Format) file parser and loader
- Converts UF2 files to flash memory layout for the emulator

### PicoRuby Integration

#### Modified R2P2 Runtime (`R2P2/mrblib/main_task.rb`)

The main Ruby task has been enhanced with platform detection:

```ruby
def rp2040js_platform?
  # Detects if running in browser emulator vs real hardware
  # Uses memory register inspection to identify rp2040js environment
end
```

Key features:
- **Platform Detection**: Automatically detects browser vs hardware environment
- **Conditional Behavior**: Skips filesystem initialization in browser mode
- **Enhanced Logging**: Provides detailed boot information for debugging
- **USB Task Management**: Handles USB communication in browser environment
- **Direct UART Communication**: Bypasses USB CDC stack in favor of direct UART I/O for better emulator compatibility

#### Build Configuration (`R2P2/build_config/r2p2-picoruby-pico.rb`)

Extended with rp2040js-specific settings:

```ruby
if ENV["R2P2_RP2040JS"] == "1"
  conf.cc.defines << "R2P2_RP2040JS"
end
```

#### USB Configuration (`R2P2/include/tusb_config.h`)

Modified USB CDC configuration for browser environment:

```c
#if defined(R2P2_RP2040JS)
#define CFG_TUD_CDC              1  // Reduced from 2 for browser
#else
#define CFG_TUD_CDC              2  // Standard hardware config
#endif
```

**Important**: In browser environment, USB CDC is bypassed entirely. Communication flows directly through UART0, making the USB stack largely unnecessary for terminal I/O.

### Git Subtree Management

This project uses Git Subtrees to manage dependencies:

#### R2P2 Subtree
```bash
# Original repository: https://github.com/picoruby/R2P2.git
# Integrated as: R2P2/
```

#### PicoRuby Subtree
```bash
# Original repository: https://github.com/picoruby/picoruby.git
# Integrated as: R2P2/lib/picoruby/
```

#### Subtree Operations

**Pull updates from upstream:**
```bash
git subtree pull --prefix=R2P2 https://github.com/picoruby/R2P2.git master --squash
git subtree pull --prefix=R2P2/lib/picoruby https://github.com/picoruby/picoruby.git master --squash
```

**Push changes upstream (if contributing back):**
```bash
git subtree push --prefix=R2P2 origin feature-branch
```

## Build Process

### UF2 Generation

UF2 files are generated using the R2P2 build system:

1. **Environment Setup**: Set `R2P2_RP2040JS=1` for browser-specific builds
2. **CMake Configuration**: Modified `CMakeLists.txt` includes conditional compilation
3. **Ruby Compilation**: `mrblib/main_task.rb` is compiled into bytecode
4. **Binary Generation**: Combined with bootrom and runtime to create UF2

### Browser Build Requirements

The browser interface requires:
- Modern browser with ES6 module support
- WebAssembly support (for potential future optimizations)
- Local file access (for UF2 loading)

## Deployment

### Cloudflare Pages

The browser interface is deployed to Cloudflare Pages:

```bash
cd R2P2/browser-rp2040js
CLOUDFLARE_ACCOUNT_ID=<account_id> npx wrangler pages deploy . --project-name try-picoruby
```

**Deployment Requirements:**
- Static file serving only
- No server-side processing required
- CORS headers automatically handled by Cloudflare

### Local Development

For local development:

```bash
cd R2P2/browser-rp2040js
python3 -m http.server 8000
# Access via http://localhost:8000
```

## Communication Flow

### Browser to Emulator
1. User types in UART input field
2. JavaScript converts to bytes and sends directly to emulated UART0 via `simulator.rp2040.uart[0].feedByte()`
3. PicoRuby receives via standard UART input (bypassing USB CDC)
4. Shell processes command and generates output

### Emulator to Browser
1. PicoRuby sends output via standard UART output
2. Emulated UART0 transmits bytes directly to JavaScript via `onByte` callback
3. JavaScript processes ANSI escape sequences
4. Terminal output is rendered with colors and formatting

**Key Point**: USB CDC stack is completely bypassed in browser environment. All communication flows through the emulated UART0 hardware interface directly.

## Debugging

### Browser Console
- rp2040js emulator logs are available in browser console
- Memory inspection available through emulator API
- UART traffic can be monitored

### PicoRuby Debugging
- Enhanced logging in `main_task.rb` provides boot diagnostics
- USB CDC debug output shows connection status
- Platform detection helps identify environment issues

## Performance Considerations

### Memory Management
- JavaScript emulator runs in browser memory
- PicoRuby bytecode is pre-compiled for efficiency
- Terminal output is managed to prevent memory leaks

### Real-time Constraints
- Browser setTimeout used for timing simulation
- UART polling implemented with appropriate intervals
- Terminal updates batched for smooth rendering

## Future Enhancements

### Potential Improvements
- WebAssembly compilation of PicoRuby for better performance
- File system persistence using browser storage
- Multi-core RP2040 emulation
- GPIO simulation with visual interface
- Integration with hardware debugging tools

### Known Limitations
- No GPIO hardware simulation
- Limited peripheral emulation
- Browser security restrictions on file access
- Performance slower than native execution

## Troubleshooting

### Common Issues

**UF2 Loading Fails**
- Ensure UF2 file is accessible from browser-rp2040js directory
- Check browser console for fetch errors
- Verify UF2 file is not corrupted

**Terminal Output Garbled**
- Check ANSI escape sequence processing in main.js
- Verify UART configuration matches emulator expectations
- Test with simpler output first

**Emulator Won't Start**
- Verify bootrom.js is loaded correctly
- Check browser console for initialization errors
- Ensure all required dependencies are available

**Git Subtree Issues**
- Use `--squash` option to avoid complex merge histories
- Ensure working directory is clean before subtree operations
- Check remote repository accessibility

## Development Workflow

### Making Changes

1. **Modify source code** in appropriate directory (R2P2/ for firmware, browser-rp2040js/ for web interface)
2. **Test locally** using local HTTP server
3. **Build UF2** if firmware changes were made
4. **Deploy to Cloudflare** for public testing
5. **Commit changes** with descriptive messages
6. **Push to repository** for collaboration

### Contributing

When contributing changes:
- Follow existing code style and conventions
- Test thoroughly in both browser and hardware environments
- Document any new features or API changes
- Consider impact on both browser emulation and physical hardware