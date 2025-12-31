import React from 'react';

interface ControlPanelProps {
  onRun: () => void;
  onStop: () => void;
  onReset: () => void;
  onLoadFirmware: (file: File) => void;
  isRunning: boolean;
  isLoading: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  onRun,
  onStop,
  onReset,
  onLoadFirmware,
  isRunning,
  isLoading
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

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onRun}
            disabled={isRunning || isLoading}
            style={{
              background: isRunning ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: isRunning || isLoading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
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

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '14px', color: '#495057' }}>
            R2P2 Firmware:
          </label>
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

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};