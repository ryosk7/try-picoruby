import React from 'react';
import { ExecutionMode } from '../compiler/picoruby-compiler';

interface ControlPanelProps {
  onRun: () => void;
  onStop: () => void;
  onReset: () => void;
  onLoadFirmware: (file: File) => void;
  onLoadLatestFirmware: () => void;
  onModeChange: (mode: ExecutionMode) => void;
  executionMode: ExecutionMode;
  isRunning: boolean;
  isLoading: boolean;
  firmwareLoaded: boolean;
  debugState?: {
    pc: number;
    sp: number;
    running: boolean;
    flashLayout?: {
      availableStart: number;
      availableSize: number;
    };
  };
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  onRun,
  onStop,
  onReset,
  onLoadFirmware,
  onLoadLatestFirmware,
  onModeChange,
  executionMode,
  isRunning,
  isLoading,
  firmwareLoaded,
  debugState
}) => {
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onLoadFirmware(file);
    }
  };

  return (
    <div style={{
      padding: '16px',
      background: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      marginBottom: '16px'
    }}>
      <div style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <h3 style={{ margin: 0, color: '#495057' }}>Try PicoRuby</h3>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginLeft: '16px'
        }}>
          <label style={{ fontSize: '14px', color: '#495057', fontWeight: '500' }}>
            Mode:
          </label>
          <select
            value={executionMode}
            onChange={(e) => onModeChange(e.target.value as ExecutionMode)}
            disabled={isRunning || isLoading}
            style={{
              padding: '6px 8px',
              borderRadius: '4px',
              border: '1px solid #ced4da',
              fontSize: '14px',
              background: '#ffffff',
              color: '#495057',
              cursor: isRunning || isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            <option value={ExecutionMode.R2P2_COMPATIBLE}>🤖 R2P2 Compatible</option>
            <option value={ExecutionMode.WASM_DIRECT}>⚡ WASM Direct</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onRun}
            disabled={isRunning || isLoading || (executionMode === ExecutionMode.R2P2_COMPATIBLE && !firmwareLoaded)}
            style={{
              background: isRunning ? '#6c757d' : (executionMode === ExecutionMode.R2P2_COMPATIBLE && !firmwareLoaded) ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: (isRunning || isLoading || (executionMode === ExecutionMode.R2P2_COMPATIBLE && !firmwareLoaded)) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
            title={executionMode === ExecutionMode.R2P2_COMPATIBLE && !firmwareLoaded ? 'Load firmware first for R2P2 mode' : ''}
          >
            {isRunning ? 'Running...' : '▶ Run'}
          </button>

          <button
            onClick={onStop}
            disabled={!isRunning}
            style={{
              background: !isRunning ? '#6c757d' : '#dc3545',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: !isRunning ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            ⏹ Stop
          </button>

          <button
            onClick={onReset}
            disabled={isLoading}
            style={{
              background: isLoading ? '#6c757d' : '#ffc107',
              color: '#212529',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            🔄 Reset
          </button>
        </div>

        {executionMode === ExecutionMode.R2P2_COMPATIBLE && (
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '14px', color: '#495057' }}>
            R2P2 Firmware:
          </label>
          <button
            onClick={onLoadLatestFirmware}
            disabled={isLoading}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              marginRight: '8px'
            }}
          >
            📦 Load Latest (v0.5.0)
          </button>
          <input
            type="file"
            accept=".uf2"
            onChange={handleFileUpload}
            disabled={isLoading}
            style={{
              fontSize: '14px',
              padding: '4px',
              border: '1px solid #ced4da',
              borderRadius: '4px'
            }}
          />
        </div>
        )}

        {isLoading && (
          <div style={{
            fontSize: '14px',
            color: '#6c757d',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid #f3f3f3',
              borderTop: '2px solid #6c757d',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            Loading...
          </div>
        )}
      </div>

      {debugState && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: '#e9ecef',
          borderRadius: '4px',
          border: '1px solid #adb5bd'
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#495057', fontSize: '14px', fontWeight: '600' }}>
            🔧 Debug Information
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            fontSize: '13px'
          }}>
            <div>
              <strong style={{ color: '#495057' }}>MCU Status:</strong>
              <div style={{ color: debugState.running ? '#28a745' : '#6c757d', fontWeight: '500' }}>
                {debugState.running ? '🟢 Running' : '🔴 Stopped'}
              </div>
            </div>

            <div>
              <strong style={{ color: '#495057' }}>Firmware:</strong>
              <div style={{ color: firmwareLoaded ? '#28a745' : '#dc3545', fontWeight: '500' }}>
                {firmwareLoaded ? '✅ Loaded' : '❌ Not Loaded'}
              </div>
            </div>

            <div>
              <strong style={{ color: '#495057' }}>Program Counter:</strong>
              <div style={{ fontFamily: 'monospace', color: '#495057' }}>
                0x{debugState.pc.toString(16).toUpperCase().padStart(8, '0')}
              </div>
            </div>

            <div>
              <strong style={{ color: '#495057' }}>Stack Pointer:</strong>
              <div style={{ fontFamily: 'monospace', color: '#495057' }}>
                0x{debugState.sp.toString(16).toUpperCase().padStart(8, '0')}
              </div>
            </div>

            {debugState.flashLayout && (
              <>
                <div>
                  <strong style={{ color: '#495057' }}>Flash Start:</strong>
                  <div style={{ fontFamily: 'monospace', color: '#495057' }}>
                    0x{debugState.flashLayout.availableStart.toString(16).toUpperCase()}
                  </div>
                </div>

                <div>
                  <strong style={{ color: '#495057' }}>Available Space:</strong>
                  <div style={{ color: '#495057' }}>
                    {Math.round(debugState.flashLayout.availableSize / 1024)}KB
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};