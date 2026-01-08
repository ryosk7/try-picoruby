import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CodeEditor } from './ui/CodeEditor';
import { Console } from './ui/Console';
import { ControlPanel } from './ui/ControlPanel';
import { PicoRubySimulator } from './simulator/picoruby-simulator';
import { PicoRubyExecutor, ExecutionMode } from './compiler/picoruby-compiler';

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
  const [debugState, setDebugState] = useState<any>(null);
  const [executionMode, setExecutionMode] = useState<ExecutionMode>(ExecutionMode.R2P2_COMPATIBLE);

  const simulatorRef = useRef<PicoRubySimulator | null>(null);
  const executorRef = useRef<PicoRubyExecutor | null>(null);

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

  // Initialize executor
  const initializeExecutor = useCallback(() => {
    if (!executorRef.current) {
      executorRef.current = new PicoRubyExecutor({
        onOutput: (message: string) => {
          setConsoleOutput(prev => prev + `[EXECUTOR] ${message}\n`);
        },
        onError: (error: string) => {
          setConsoleOutput(prev => prev + `[EXECUTOR ERROR] ${error}\n`);
        },
      });

      // Set the initial execution mode
      executorRef.current.setMode(executionMode);
    }
  }, [executionMode]);

  // Initialize simulator and executor on mount
  React.useEffect(() => {
    initializeSimulator();
    initializeExecutor();
  }, [initializeSimulator, initializeExecutor]);

  // Update debug state periodically
  useEffect(() => {
    const updateDebugState = () => {
      if (simulatorRef.current) {
        const state = simulatorRef.current.getState();
        setDebugState({
          pc: state.pc,
          sp: state.sp,
          running: state.running,
          flashLayout: state.flashLayout
        });
      }
    };

    updateDebugState(); // Initial update
    const interval = setInterval(updateDebugState, 1000); // Update every second

    return () => clearInterval(interval);
  }, [firmwareLoaded, isRunning]);

  const handleRun = async () => {
    // Check firmware requirement for R2P2 mode only
    if (executionMode === ExecutionMode.R2P2_COMPATIBLE && (!simulatorRef.current || !firmwareLoaded)) {
      setConsoleOutput(prev => prev + '\nERROR: Please load R2P2 firmware first for R2P2 compatible mode\n');
      return;
    }

    if (!executorRef.current) {
      setConsoleOutput(prev => prev + '\nERROR: Executor not initialized\n');
      return;
    }

    try {
      setIsRunning(true);
      setIsCompiling(true);
      const modeLabel = executionMode === ExecutionMode.WASM_DIRECT ? 'WASM Direct' : 'R2P2 Compatible';
      setConsoleOutput(prev => prev + `\n=== Starting PicoRuby execution (${modeLabel}) ===\n`);

      // Initialize executor if needed
      if (!executorRef.current.isReady()) {
        setConsoleOutput(prev => prev + 'Initializing PicoRuby executor...\n');
        await executorRef.current.init();
      }

      // Execute Ruby code
      const modeLabel = executionMode === ExecutionMode.WASM_DIRECT ? 'WASM Direct mode' : 'R2P2 compatible mode';
      setConsoleOutput(prev => prev + `Executing Ruby code in ${modeLabel}...\n`);
      const executionResult = await executorRef.current.executeRuby(code, 'app.rb');

      if (!executionResult.success) {
        throw new Error(`Execution failed: ${executionResult.error}`);
      }

      // Show warnings if any
      if (executionResult.warnings && executionResult.warnings.length > 0) {
        executionResult.warnings.forEach(warning => {
          setConsoleOutput(prev => prev + `[WARNING] ${warning}\n`);
        });
      }

      // R2P2 compatible mode - flash filesystem if simulator and firmware available
      if (executionMode === ExecutionMode.R2P2_COMPATIBLE && simulatorRef.current && firmwareLoaded && executionResult.bytecode) {
        const bytecode = executionResult.bytecode;
        setConsoleOutput(prev => prev + `Flashing ${bytecode.length} bytes to R2P2 filesystem...\n`);
        await simulatorRef.current.flashFilesystem(bytecode);

        // Reset and start the MCU for R2P2 simulation
        setConsoleOutput(prev => prev + 'Starting R2P2 simulation...\n');
        simulatorRef.current.reset();
        simulatorRef.current.start();

        setConsoleOutput(prev => prev + 'R2P2 simulation started!\n');
      } else if (executionMode === ExecutionMode.R2P2_COMPATIBLE) {
        setConsoleOutput(prev => prev + 'R2P2 compatible files generated. Load firmware to simulate.\n');
      }
      setIsCompiling(false);

      // Reset running state after successful execution
      setIsRunning(false);
      setConsoleOutput(prev => prev + '\n=== Execution completed successfully ===\n');

    } catch (error) {
      console.error('Failed to run code:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setConsoleOutput(prev => prev + `\nERROR: ${errorMsg}\n`);
      setIsRunning(false);
      setIsCompiling(false);
    }
  };

  const handleModeChange = (mode: ExecutionMode) => {
    if (isRunning || isLoading) {
      setConsoleOutput(prev => prev + '\nERROR: Cannot change mode while running\n');
      return;
    }

    setExecutionMode(mode);
    setConsoleOutput(prev => prev + `\nExecution mode changed to: ${mode === ExecutionMode.WASM_DIRECT ? 'WASM Direct' : 'R2P2 Compatible'}\n`);

    // Reinitialize executor with new mode
    if (executorRef.current) {
      executorRef.current.setMode(mode);
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
        onModeChange={handleModeChange}
        executionMode={executionMode}
        isRunning={isRunning}
        isLoading={isLoading || isCompiling}
        firmwareLoaded={firmwareLoaded}
        debugState={debugState}
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
        Mode: {executionMode === ExecutionMode.WASM_DIRECT ? '⚡ WASM Direct' : '🤖 R2P2 Compatible'} |
        Status: {firmwareLoaded ? '✅ Firmware Loaded' : '⚠️ Load firmware for R2P2'} |
        {isRunning ? '🟢 Running' : '🔴 Stopped'}
      </div>
    </div>
  );
};