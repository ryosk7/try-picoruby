const UF2_MAGIC_START0 = 0x0a324655;
const UF2_MAGIC_START1 = 0x9e5d5157;
const UF2_MAGIC_END = 0x0ab16f30;
const UF2_BLOCK_SIZE = 512;
const UF2_MAX_PAYLOAD = 476;

export function loadUF2ToFlash(uf2Data, flash, flashStartAddress) {
  const view = new DataView(uf2Data.buffer, uf2Data.byteOffset, uf2Data.byteLength);
  for (let offset = 0; offset + UF2_BLOCK_SIZE <= uf2Data.length; offset += UF2_BLOCK_SIZE) {
    const magic0 = view.getUint32(offset + 0, true);
    const magic1 = view.getUint32(offset + 4, true);
    const magicEnd = view.getUint32(offset + 508, true);
    if (magic0 !== UF2_MAGIC_START0 || magic1 !== UF2_MAGIC_START1 || magicEnd !== UF2_MAGIC_END) {
      continue;
    }
    const targetAddr = view.getUint32(offset + 12, true);
    const payloadSize = view.getUint32(offset + 16, true);
    if (payloadSize === 0 || payloadSize > UF2_MAX_PAYLOAD) {
      continue;
    }
    if (targetAddr < flashStartAddress) {
      continue;
    }
    const payloadStart = offset + 32;
    const payload = uf2Data.subarray(payloadStart, payloadStart + payloadSize);
    const flashOffset = targetAddr - flashStartAddress;
    flash.set(payload, flashOffset);
  }
}
