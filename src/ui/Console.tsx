import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

interface ConsoleProps {
  output: string;
  onInput?: (data: string) => void;
  height?: string | number;
}

export const Console: React.FC<ConsoleProps> = ({
  output,
  onInput,
  height = '300px'
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isTerminalReady, setIsTerminalReady] = useState(false);
  const [lastOutputLength, setLastOutputLength] = useState(0);

  // Memoize the input handler to prevent terminal re-initialization
  const handleInput = useCallback((data: string) => {
    if (onInput) {
      onInput(data);
    }
  }, [onInput]);

  // Initialize terminal after component mounts and container is available
  useEffect(() => {
    if (!terminalRef.current) return;

    const terminalElement = terminalRef.current;
    let terminal: Terminal;
    let fitAddon: FitAddon;

    const initializeTerminal = () => {
      try {
        // Create terminal instance
        terminal = new Terminal({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
          theme: {
            background: '#000000',
            foreground: '#ffffff',
            cursor: '#ffffff'
          }
        });

        // Create fit addon
        fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);

        // Handle input
        terminal.onData(handleInput);

        // Store references
        xtermRef.current = terminal;
        fitAddonRef.current = fitAddon;

        // Open terminal
        terminal.open(terminalElement);

        // Initial welcome message
        terminal.writeln('PicoRuby Simulator Console');
        terminal.writeln('Ready to run your Ruby code...');
        terminal.write('\r\n$ ');

        setIsTerminalReady(true);

        // Safe fit after terminal is opened and DOM is stable
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            try {
              if (terminalElement.offsetHeight > 0 && terminalElement.offsetWidth > 0) {
                fitAddon.fit();
              }
            } catch (error) {
              console.warn('Failed to fit terminal:', error);
            }
          });
        });

      } catch (error) {
        console.error('Failed to initialize terminal:', error);
      }
    };

    // Initialize with a small delay to ensure DOM is ready
    const initTimer = setTimeout(initializeTerminal, 10);

    // Handle resize
    const handleResize = () => {
      if (fitAddonRef.current && terminalElement.offsetHeight > 0) {
        try {
          fitAddonRef.current.fit();
        } catch (error) {
          console.warn('Failed to resize terminal:', error);
        }
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(initTimer);
      window.removeEventListener('resize', handleResize);
      if (terminal) {
        terminal.dispose();
      }
      setIsTerminalReady(false);
    };
  }, [handleInput]);

  // Update terminal output when new output is received (incremental)
  useEffect(() => {
    if (xtermRef.current && output && isTerminalReady) {
      // Only write new output since last update to prevent duplication
      const newOutput = output.slice(lastOutputLength);
      if (newOutput) {
        // Split new output into lines and write each one
        const lines = newOutput.split('\n');
        lines.forEach((line, index) => {
          if (index === 0 && lastOutputLength > 0) {
            // First line might be continuation of previous line
            xtermRef.current!.write(line);
          } else {
            if (line.trim() || index < lines.length - 1) {
              xtermRef.current!.write(line);
            }
          }
          if (index < lines.length - 1) {
            xtermRef.current!.write('\r\n');
          }
        });
        setLastOutputLength(output.length);
      }
    }
  }, [output, isTerminalReady, lastOutputLength]);

  const clearConsole = () => {
    if (xtermRef.current && isTerminalReady) {
      xtermRef.current.clear();
      xtermRef.current.writeln('Console cleared');
      xtermRef.current.write('$ ');
      setLastOutputLength(0);
    }
  };

  return (
    <div style={{
      border: '1px solid #ccc',
      borderRadius: '4px',
      height: height,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        background: '#f5f5f5',
        padding: '8px 12px',
        borderBottom: '1px solid #ccc',
        fontSize: '14px',
        fontWeight: 'bold',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>Console</span>
        <button
          onClick={clearConsole}
          style={{
            background: 'none',
            border: '1px solid #ccc',
            padding: '2px 8px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Clear
        </button>
      </div>
      <div
        ref={terminalRef}
        style={{
          flex: 1,
          padding: '8px'
        }}
      />
    </div>
  );
};