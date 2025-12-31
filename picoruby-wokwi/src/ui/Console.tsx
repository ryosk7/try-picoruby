import React, { useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (!terminalRef.current) return;

    // Create terminal instance
    const terminal = new Terminal({
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
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    // Handle input
    terminal.onData((data) => {
      if (onInput) {
        onInput(data);
      }
    });

    // Open terminal
    terminal.open(terminalRef.current);
    fitAddon.fit();

    // Store references
    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    // Initial welcome message
    terminal.writeln('PicoRuby Simulator Console');
    terminal.writeln('Ready to run your Ruby code...');
    terminal.write('\r\n$ ');

    return () => {
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
    };
  }, [onInput]);

  // Update terminal output when new output is received
  useEffect(() => {
    if (xtermRef.current && output) {
      // Split output into lines and write each one
      const lines = output.split('\n');
      lines.forEach((line, index) => {
        if (line.trim()) {
          xtermRef.current!.write(line);
        }
        if (index < lines.length - 1) {
          xtermRef.current!.write('\r\n');
        }
      });
    }
  }, [output]);

  const clearConsole = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
      xtermRef.current.writeln('Console cleared');
      xtermRef.current.write('$ ');
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