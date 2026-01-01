import React, { useState, useRef, useCallback } from 'react';
import { CodeEditor } from './ui/CodeEditor';
import { Console } from './ui/Console';
import { ControlPanel } from './ui/ControlPanel';
import { PicoRubySimulator } from './simulator/picoruby-simulator';
import { PicoRubyCompiler } from './compiler/picoruby-compiler';

const DEFAULT_RUBY_CODE = `# PicoRuby Hello World
puts "Hello, PicoRuby!"

# Simple LED blink example
# led = GPIO.new(25, GPIO::OUT)
# 5.times do |i|
#   puts "Blink #{i + 1}"
#   led.write(1)
#   sleep(0.5)
#   led.write(0)
#   sleep(0.5)
# end

puts "Program completed!"
`;

export const App: React.FC = () => {
  const [code, setCode] = useState(DEFAULT_RUBY_CODE);
  const [consoleOutput, setConsoleOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [firmwareLoaded, setFirmwareLoaded] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);

  const simulatorRef = useRef<PicoRubySimulator | null>(null);
  const compilerRef = useRef<PicoRubyCompiler | null>(null);

  // Initialize simulator
  const initializeSimulator = useCallback(() => {
    if (simulatorRef.current) {
      simulatorRef.current.stop();
    }

    simulatorRef.current = new PicoRubySimulator({
      onConsoleOutput: (text: string) => {
        setConsoleOutput(prev => prev + text);
      },
      onError: (error: Error) => {
        console.error('Simulator error:', error);
        setConsoleOutput(prev => prev + `\nERROR: ${error.message}\n`);
        setIsRunning(false);
      }
    });
  }, []);

  // Initialize compiler
  const initializeCompiler = useCallback(() => {
    if (!compilerRef.current) {
      compilerRef.current = new PicoRubyCompiler({
        onOutput: (message: string) => {
          setConsoleOutput(prev => prev + `[COMPILER] ${message}\n`);
        },
        onError: (error: string) => {
          setConsoleOutput(prev => prev + `[COMPILER ERROR] ${error}\n`);
        }
      });
    }
  }, []);

  // Initialize simulator and compiler on mount
  React.useEffect(() => {
    initializeSimulator();
    initializeCompiler();
  }, [initializeSimulator, initializeCompiler]);

  const handleRun = async () => {
    if (!simulatorRef.current || !firmwareLoaded) {
      setConsoleOutput(prev => prev + '\nERROR: Please load R2P2 firmware first\n');
      return;
    }

    if (!compilerRef.current) {
      setConsoleOutput(prev => prev + '\nERROR: Compiler not initialized\n');
      return;
    }

    try {
      setIsRunning(true);
      setIsCompiling(true);
      setConsoleOutput(prev => prev + '\n=== Starting PicoRuby execution ===\n');

      // Initialize compiler if needed
      if (!compilerRef.current.isReady()) {
        setConsoleOutput(prev => prev + 'Initializing PicoRuby compiler...\n');
        await compilerRef.current.init();
      }

      // Compile Ruby code to .mrb bytecode
      setConsoleOutput(prev => prev + 'Compiling Ruby code...\n');
      const compileResult = await compilerRef.current.compileToMrb(code, 'app.rb');

      if (!compileResult.success) {
        throw new Error(`Compilation failed: ${compileResult.error}`);
      }

      if (!compileResult.bytecode) {
        throw new Error('No bytecode generated');
      }

      // Flash filesystem with compiled bytecode
      setConsoleOutput(prev => prev + `Flashing ${compileResult.bytecode.length} bytes of bytecode to filesystem...\n`);
      await simulatorRef.current.flashFilesystem(compileResult.bytecode);

      // Show warnings if any
      if (compileResult.warnings && compileResult.warnings.length > 0) {
        compileResult.warnings.forEach(warning => {
          setConsoleOutput(prev => prev + `[WARNING] ${warning}\n`);
        });
      }

      // Reset and start the MCU
      setConsoleOutput(prev => prev + 'Starting execution...\n');
      simulatorRef.current.reset();
      simulatorRef.current.start();

      setConsoleOutput(prev => prev + 'Ruby code execution started!\n');
      setConsoleOutput(prev => prev + 'Note: This is a mock implementation. Real execution requires actual R2P2 firmware integration.\n');
      setIsCompiling(false);

    } catch (error) {
      console.error('Failed to run code:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setConsoleOutput(prev => prev + `\nERROR: ${errorMsg}\n`);
      setIsRunning(false);
      setIsCompiling(false);
    }
  };

  const handleStop = () => {
    if (simulatorRef.current) {
      simulatorRef.current.stop();
      setIsRunning(false);
      setConsoleOutput(prev => prev + '\n=== Execution stopped ===\n');
    }
  };

  const handleReset = () => {
    if (simulatorRef.current) {
      simulatorRef.current.reset();
      setIsRunning(false);
      setConsoleOutput(prev => prev + '\n=== MCU Reset ===\n');
    }
  };

  const handleLoadFirmware = async (file: File) => {
    if (!file.name.endsWith('.uf2')) {
      setConsoleOutput(prev => prev + '\nERROR: Please select a .uf2 firmware file\n');
      return;
    }

    try {
      setIsLoading(true);
      setConsoleOutput(prev => prev + `\nLoading firmware: ${file.name}...\n`);

      const arrayBuffer = await file.arrayBuffer();
      const uf2Data = new Uint8Array(arrayBuffer);

      if (!simulatorRef.current) {
        initializeSimulator();
      }

      await simulatorRef.current!.loadFirmware(uf2Data);
      setFirmwareLoaded(true);
      setConsoleOutput(prev => prev + 'Firmware loaded successfully!\n');
    } catch (error) {
      console.error('Failed to load firmware:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setConsoleOutput(prev => prev + `\nERROR: Failed to load firmware: ${errorMsg}\n`);
      setFirmwareLoaded(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadLatestFirmware = async () => {
    try {
      setIsLoading(true);
      setConsoleOutput(prev => prev + '\nDownloading latest R2P2 firmware v0.5.0...\n');

      const response = await fetch('/firmware/r2p2-latest.uf2');
      if (!response.ok) {
        throw new Error(`Failed to download firmware: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const uf2Data = new Uint8Array(arrayBuffer);

      if (!simulatorRef.current) {
        initializeSimulator();
      }

      await simulatorRef.current!.loadFirmware(uf2Data);
      setFirmwareLoaded(true);
      setConsoleOutput(prev => prev + 'Latest R2P2 firmware loaded successfully!\n');
    } catch (error) {
      console.error('Failed to load latest firmware:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setConsoleOutput(prev => prev + `\nERROR: Failed to load latest firmware: ${errorMsg}\n`);
      setFirmwareLoaded(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConsoleInput = (data: string) => {
    if (simulatorRef.current) {
      simulatorRef.current.sendSerialData(data);
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px',
      background: '#ffffff',
      fontFamily: 'Arial, sans-serif'
    }}>
      <ControlPanel
        onRun={handleRun}
        onStop={handleStop}
        onReset={handleReset}
        onLoadFirmware={handleLoadFirmware}
        onLoadLatestFirmware={handleLoadLatestFirmware}
        isRunning={isRunning}
        isLoading={isLoading || isCompiling}
      />

      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        minHeight: 0
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <CodeEditor
            value={code}
            onChange={setCode}
            height="100%"
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Console
            output={consoleOutput}
            onInput={handleConsoleInput}
            height="100%"
          />
        </div>
      </div>

      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#6c757d',
        textAlign: 'center'
      }}>
        Try PicoRuby v1.0 |
        Status: {firmwareLoaded ? '✅ Firmware Loaded' : '⚠️ Load firmware to start'} |
        {isRunning ? '🟢 Running' : '🔴 Stopped'}
      </div>
    </div>
  );
};