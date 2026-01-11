import { Simulator } from '../lib/rp2040js/dist/esm/index.js';
import { FLASH_START_ADDRESS } from '../lib/rp2040js/dist/esm/rp2040.js';
import { bootromB1 } from './bootrom.js';
import { loadUF2ToFlash } from './uf2.js';

const statusEl = document.querySelector('[data-status]');
const outputEl = document.querySelector('[data-output]');
const startBtn = document.querySelector('[data-action="start"]');
const stopBtn = document.querySelector('[data-action="stop"]');
const resetBtn = document.querySelector('[data-action="reset"]');
const loadBtn = document.querySelector('[data-action="load-default"]');
const inputEl = document.querySelector('[data-input]');
const sendBtn = document.querySelector('[data-action="send"]');

const defaultUf2Url = new URL(
  '../build/picoruby/pico/debug/R2P2-PICORUBY-PICO-0.5.0-20260111-0353244.uf2',
  import.meta.url
);

let simulator = null;
let uf2Loaded = false;
const textEncoder = new TextEncoder();
const TERM_ROWS = 24;
const TERM_COLS = 80;
let escapeBuffer = null;
let currentSpan = null;
let currentStyle = { fg: null, bg: null };

const xterm16 = [
  [0, 0, 0],
  [205, 0, 0],
  [0, 205, 0],
  [205, 205, 0],
  [0, 0, 238],
  [205, 0, 205],
  [0, 205, 205],
  [229, 229, 229],
  [127, 127, 127],
  [255, 0, 0],
  [0, 255, 0],
  [255, 255, 0],
  [92, 92, 255],
  [255, 0, 255],
  [0, 255, 255],
  [255, 255, 255],
];

function xtermToRgb(code) {
  if (code < 0 || code > 255) {
    return null;
  }
  if (code < 16) {
    return xterm16[code];
  }
  if (code >= 16 && code <= 231) {
    const idx = code - 16;
    const r = Math.floor(idx / 36);
    const g = Math.floor((idx % 36) / 6);
    const b = idx % 6;
    const steps = [0, 95, 135, 175, 215, 255];
    return [steps[r], steps[g], steps[b]];
  }
  const gray = 8 + (code - 232) * 10;
  return [gray, gray, gray];
}

function setStatus(message) {
  statusEl.textContent = message;
}

function appendOutput(text) {
  outputEl.append(text);
  outputEl.scrollTop = outputEl.scrollHeight;
}

function resetOutput() {
  outputEl.textContent = '';
  currentSpan = null;
}

function initSimulator() {
  simulator = new Simulator();
  const mcu = simulator.rp2040;
  console.log(`rp2040js sysinfo=0x${mcu.readUint32(0x40000004).toString(16).padStart(8, '0')}`);
  mcu.loadBootrom(bootromB1);
  mcu.uart[0].onByte = (value) => {
    handleUartByte(value);
  };
}

function handleEscapeSequence(sequence) {
  if (sequence === '\x1b[5n') {
    sendSerial('\x1b[0n');
    return;
  }
  if (sequence === '\x1b[6n') {
    sendSerial(`\x1b[${TERM_ROWS};${TERM_COLS}R`);
    return;
  }
  if (sequence === '\x1b[2J') {
    resetOutput();
    return;
  }
  if (sequence.startsWith('\x1b[') && sequence.endsWith('m')) {
    const body = sequence.slice(2, -1);
    const parts = body.length ? body.split(';') : ['0'];
    const codes = parts.map((value) => Number.parseInt(value, 10));
    applyAnsiCodes(codes);
  }
}

function applyAnsiCodes(codes) {
  for (let i = 0; i < codes.length; i += 1) {
    const code = codes[i];
    if (code === 0) {
      currentStyle = { fg: null, bg: null };
      currentSpan = null;
    } else if (code === 39) {
      currentStyle = { ...currentStyle, fg: null };
      currentSpan = null;
    } else if (code === 49) {
      currentStyle = { ...currentStyle, bg: null };
      currentSpan = null;
    } else if (code === 38 && codes[i + 1] === 5) {
      const color = codes[i + 2];
      currentStyle = { ...currentStyle, fg: color };
      currentSpan = null;
      i += 2;
    } else if (code === 48 && codes[i + 1] === 5) {
      const color = codes[i + 2];
      currentStyle = { ...currentStyle, bg: color };
      currentSpan = null;
      i += 2;
    }
  }
}

function ensureSpan() {
  const styleKey = `${currentStyle.fg ?? ''}-${currentStyle.bg ?? ''}`;
  if (currentSpan && currentSpan.dataset.styleKey === styleKey) {
    return currentSpan;
  }
  const span = document.createElement('span');
  span.dataset.styleKey = styleKey;
  if (currentStyle.fg !== null) {
    const rgb = xtermToRgb(currentStyle.fg);
    if (rgb) {
      span.style.color = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    }
  }
  if (currentStyle.bg !== null) {
    const rgb = xtermToRgb(currentStyle.bg);
    if (rgb) {
      span.style.backgroundColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    }
  }
  outputEl.append(span);
  currentSpan = span;
  return span;
}

function appendChar(ch) {
  if (ch === '\r') {
    return;
  }
  if (ch === '\n') {
    outputEl.append(document.createElement('br'));
    currentSpan = null;
    outputEl.scrollTop = outputEl.scrollHeight;
    return;
  }
  const span = ensureSpan();
  span.append(document.createTextNode(ch));
  outputEl.scrollTop = outputEl.scrollHeight;
}

function handleUartByte(value) {
  const ch = String.fromCharCode(value);
  if (escapeBuffer !== null) {
    escapeBuffer += ch;
    if (/[A-Za-z]$/.test(escapeBuffer)) {
      handleEscapeSequence(escapeBuffer);
      escapeBuffer = null;
    }
    return;
  }
  if (ch === '\x1b') {
    escapeBuffer = ch;
    return;
  }
  appendChar(ch);
}

function sendSerial(text) {
  if (!simulator) {
    return false;
  }
  const data = textEncoder.encode(text);
  for (const byte of data) {
    simulator.rp2040.uart[0].feedByte(byte);
  }
  return true;
}
window.r2p2Send = sendSerial;
window.r2p2SendRaw = (buffer) => {
  if (!simulator) {
    return false;
  }
  for (const byte of buffer) {
    simulator.rp2040.uart[0].feedByte(byte);
  }
  return true;
};

function sendControlChar(key) {
  if (!key || key.length !== 1) {
    return false;
  }
  const code = key.toUpperCase().charCodeAt(0);
  if (code < 64 || code > 95) {
    return false;
  }
  return sendSerial(String.fromCharCode(code - 64));
}

function handleTerminalKey(event) {
  if (event.metaKey || event.altKey) {
    return;
  }
  if (event.ctrlKey && event.key.length === 1) {
    event.preventDefault();
    sendControlChar(event.key);
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    sendSerial('\n');
    return;
  }
  if (event.key === 'Backspace') {
    event.preventDefault();
    sendSerial('\x7f');
    return;
  }
  if (event.key === 'Tab') {
    event.preventDefault();
    sendSerial('\t');
    return;
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    sendSerial('\x1b[A');
    return;
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    sendSerial('\x1b[B');
    return;
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    sendSerial('\x1b[C');
    return;
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    sendSerial('\x1b[D');
    return;
  }
  if (event.key.length === 1) {
    event.preventDefault();
    sendSerial(event.key);
  }
}

function handleTerminalPaste(event) {
  const text = event.clipboardData?.getData('text');
  if (!text) {
    return;
  }
  event.preventDefault();
  sendSerial(text.replace(/\r\n/g, '\n'));
}

async function loadDefaultUF2() {
  setStatus('Loading default UF2...');
  const response = await fetch(defaultUf2Url);
  if (!response.ok) {
    throw new Error(`Failed to fetch UF2: ${response.status}`);
  }
  const buffer = new Uint8Array(await response.arrayBuffer());
  loadUF2(buffer);
}

function loadUF2(buffer) {
  if (!simulator) {
    initSimulator();
  }
  const mcu = simulator.rp2040;
  loadUF2ToFlash(buffer, mcu.flash, FLASH_START_ADDRESS);
  mcu.core.PC = FLASH_START_ADDRESS;
  uf2Loaded = true;
  setStatus('UF2 loaded');
}

async function start() {
  if (!simulator) {
    initSimulator();
  }
  if (!uf2Loaded) {
    await loadDefaultUF2();
  }
  if (!simulator.executing) {
    simulator.execute();
  }
  setStatus('Running');
}

function stop() {
  if (simulator && simulator.executing) {
    simulator.stop();
  }
  setStatus('Stopped');
}

function reset() {
  if (simulator && simulator.executing) {
    simulator.stop();
  }
  simulator = null;
  uf2Loaded = false;
  resetOutput();
  setStatus('Reset');
}

startBtn.addEventListener('click', () => {
  start().catch((err) => setStatus(`Error: ${err.message}`));
});

stopBtn.addEventListener('click', stop);
resetBtn.addEventListener('click', reset);
loadBtn.addEventListener('click', () => {
  loadDefaultUF2().catch((err) => setStatus(`Error: ${err.message}`));
});

sendBtn.addEventListener('click', () => {
  const value = inputEl.value;
  if (!value) {
    return;
  }
  const trimmed = value.endsWith('\n') ? value : `${value}\n`;
  sendSerial(trimmed);
  inputEl.value = '';
});

inputEl.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendBtn.click();
  }
});

outputEl.addEventListener('keydown', handleTerminalKey);
outputEl.addEventListener('paste', handleTerminalPaste);
outputEl.addEventListener('click', () => outputEl.focus());

setStatus('Ready');
