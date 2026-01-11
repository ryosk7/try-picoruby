# try-picoruby

**Experience Ruby on microcontrollers directly in your browser!**

try-picoruby is a browser-based RP2040 emulator that runs PicoRuby, allowing you to experiment with Ruby code on microcontrollers without needing physical hardware.

## 🚀 Quick Start

### Online Demo

Visit the live demo: **[https://try-picoruby.pages.dev](https://try-picoruby.pages.dev)**

1. Click **"Load default UF2"** to load the PicoRuby firmware
2. Click **"Start"** to begin the emulation
3. Wait for the Ruby shell to initialize
4. Start typing Ruby code in the terminal!

### Example Commands

Try these Ruby commands in the emulator:

```ruby
# Basic Ruby
puts "Hello, PicoRuby!"
2 + 2
[1, 2, 3].map { |x| x * 2 }

# PicoRuby specific features
Machine.class
GPIO.class

# File system (limited in browser mode)
Dir.pwd
```

## ✨ Features

- **Full Ruby REPL**: Interactive Ruby shell running on emulated RP2040
- **No Hardware Required**: Runs entirely in your web browser
- **Real-time Interaction**: Terminal-like interface with immediate feedback
- **Authentic Environment**: Same PicoRuby runtime used on real hardware
- **ANSI Color Support**: Colorized output and terminal formatting
- **Easy Reset**: Restart the emulation at any time

## 🎯 What is PicoRuby?

[PicoRuby](https://github.com/picoruby/picoruby) is a lightweight Ruby implementation designed specifically for microcontrollers and embedded systems. It provides:

- **Minimal Memory Footprint**: Optimized for resource-constrained environments
- **Real-time Capabilities**: Suitable for embedded applications
- **Hardware Integration**: Direct access to GPIO, I2C, SPI, and other peripherals
- **Familiar Syntax**: Standard Ruby language features

## 🛠 Technology Stack

This project combines several technologies:

- **[rp2040js](https://github.com/wokwi/rp2040js)**: JavaScript-based RP2040 microcontroller emulator
- **[PicoRuby](https://github.com/picoruby/picoruby)**: Ruby interpreter for embedded systems
- **[R2P2](https://github.com/picoruby/R2P2)**: Development environment integrating PicoRuby with RP2040
- **Cloudflare Pages**: Static hosting for the web interface

## 🏗 Architecture

```
Browser Interface
    ↓ (JavaScript)
RP2040 Emulator (rp2040js)
    ↓ (Emulated Hardware)
R2P2 Firmware
    ↓ (PicoRuby Runtime)
Ruby Shell & Applications
```

## 📖 Documentation

- **[CLAUDE.md](./CLAUDE.md)**: Technical implementation details and development guide
- **[PicoRuby Documentation](https://github.com/picoruby/picoruby)**: Official PicoRuby documentation
- **[R2P2 Guide](https://github.com/picoruby/R2P2)**: R2P2 development environment

## 🔧 Local Development

To run locally:

```bash
git clone https://github.com/ryosk7/try-picoruby.git
cd try-picoruby/R2P2/browser-rp2040js
python3 -m http.server 8000
```

Then open http://localhost:8000 in your browser.

### Building Custom UF2

To create custom firmware:

1. Modify Ruby code in `R2P2/mrblib/`
2. Build with R2P2 build system
3. Replace UF2 file in `browser-rp2040js/build/`

See [CLAUDE.md](./CLAUDE.md) for detailed build instructions.

## 🌟 Use Cases

- **Learning Ruby**: Practice Ruby syntax without setup
- **Prototyping**: Test embedded Ruby code before hardware deployment
- **Education**: Demonstrate microcontroller programming concepts
- **Exploration**: Experiment with PicoRuby features interactively
- **Development**: Debug Ruby code in controlled environment

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** (see [CLAUDE.md](./CLAUDE.md) for development details)
4. **Test thoroughly**: Verify in both browser and hardware environments
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to the branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Areas for Contribution

- **UI/UX Improvements**: Enhance the browser interface
- **Emulator Features**: Add GPIO simulation and peripheral emulation
- **Documentation**: Improve guides and examples
- **Performance**: Optimize emulator speed and memory usage
- **Examples**: Create sample applications and tutorials

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- **[PicoRuby Team](https://github.com/picoruby)**: For creating an amazing Ruby implementation for embedded systems
- **[Wokwi](https://wokwi.com/)**: For the excellent rp2040js emulator
- **[Raspberry Pi Foundation](https://www.raspberrypi.org/)**: For the RP2040 microcontroller
- **Ruby Community**: For maintaining the beautiful Ruby language

## 🔗 Related Projects

- **[PicoRuby](https://github.com/picoruby/picoruby)**: The Ruby interpreter powering this emulator
- **[R2P2](https://github.com/picoruby/R2P2)**: PicoRuby development environment for RP2040
- **[rp2040js](https://github.com/wokwi/rp2040js)**: The JavaScript RP2040 emulator
- **[mruby](https://github.com/mruby/mruby)**: Lightweight Ruby implementation that inspired PicoRuby

---

**Ready to try Ruby on microcontrollers? [Start experimenting now!](https://try-picoruby.pages.dev)**