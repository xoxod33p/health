const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create PNG buffer from raw RGBA pixels using pure node zlib (no external dependencies)
function createPngBuffer(width, height, getPixelRgba) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth 8
  ihdr.writeUInt8(6, 9); // color type RGBA (6)
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data with filter byte 0 at start of each scanline
  const rowBytes = width * 4;
  const rawData = Buffer.alloc((rowBytes + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowBytes + 1);
    rawData[rowOffset] = 0; // No filter for row

    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixelRgba(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 implementation for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crcData = Buffer.alloc(4 + len);
  crcData.write(type, 0, 4, 'ascii');
  data.copy(crcData, 4);

  const crcVal = crc32(crcData);
  chunk.writeUInt32BE(crcVal, 8 + len);
  return chunk;
}

// Generates CareSignal Health Icon: Dark Navy Background + Teal Rounded Badge + White Health Pulse / Cross
function getCareSignalPixel(x, y, width, height) {
  const nx = x / width;
  const ny = y / height;

  // Background: Deep Navy (#0a1b21 -> 10, 27, 33)
  let r = 10, g = 27, b = 33, a = 255;

  // Rounded squircle badge in center (0.12 to 0.88)
  const cx = 0.5, cy = 0.5;
  const dx = Math.abs(nx - cx);
  const dy = Math.abs(ny - cy);

  const cornerRadius = 0.16;
  const halfSize = 0.38;

  let insideBadge = false;
  if (dx < halfSize && dy < halfSize) {
    if (dx > halfSize - cornerRadius && dy > halfSize - cornerRadius) {
      const cdx = dx - (halfSize - cornerRadius);
      const cdy = dy - (halfSize - cornerRadius);
      insideBadge = (cdx * cdx + cdy * cdy) <= (cornerRadius * cornerRadius);
    } else {
      insideBadge = true;
    }
  }

  if (insideBadge) {
    // Teal Gradient badge (#1b8b83 to #0f766e)
    const grad = ny;
    r = Math.round(27 * (1 - grad) + 15 * grad);
    g = Math.round(139 * (1 - grad) + 118 * grad);
    b = Math.round(131 * (1 - grad) + 110 * grad);

    // Draw White Medical Cross & Heartbeat Wave inside
    // Cross center:
    const isVerticalBar = Math.abs(nx - 0.5) < 0.05 && Math.abs(ny - 0.5) < 0.22;
    const isHorizontalBar = Math.abs(ny - 0.5) < 0.05 && Math.abs(nx - 0.5) < 0.22;

    // Heartbeat wave pulse line
    let isPulse = false;
    const px = (nx - 0.25) / 0.5; // 0 to 1 across center
    if (px >= 0 && px <= 1) {
      let waveY = 0.5;
      if (px > 0.3 && px < 0.45) waveY = 0.5 - (px - 0.3) * 2.0; // peak up
      else if (px >= 0.45 && px < 0.6) waveY = 0.2 + (px - 0.45) * 4.0; // drop down
      else if (px >= 0.6 && px < 0.75) waveY = 0.8 - (px - 0.6) * 2.0; // return to center

      if (Math.abs(ny - waveY) < 0.025) {
        isPulse = true;
      }
    }

    if (isVerticalBar || isHorizontalBar || isPulse) {
      r = 255;
      g = 255;
      b = 255;
    }
  }

  return [r, g, b, a];
}

const iconsDir = path.join(__dirname, '../apps/web/public/icons');
fs.mkdirSync(iconsDir, { recursive: true });

// 1. Generate 192x192 PNG
const png192 = createPngBuffer(192, 192, getCareSignalPixel);
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), png192);
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-192.png'), png192);

// 2. Generate 512x512 PNG
const png512 = createPngBuffer(512, 512, getCareSignalPixel);
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), png512);
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.png'), png512);

// 3. Generate Apple Touch Icon (180x180)
const appleIcon = createPngBuffer(180, 180, getCareSignalPixel);
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), appleIcon);
fs.writeFileSync(path.join(__dirname, '../apps/web/public/apple-touch-icon.png'), appleIcon);
fs.writeFileSync(path.join(__dirname, '../apps/web/public/favicon.png'), appleIcon);

// 4. Generate SVG Icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="112" fill="#0a1b21"/>
  <rect x="64" y="64" width="384" height="384" rx="80" fill="url(#tealGrad)"/>
  <defs>
    <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1b8b83"/>
      <stop offset="100%" stop-color="#0f766e"/>
    </linearGradient>
  </defs>
  <!-- Medical Cross -->
  <rect x="232" y="140" width="48" height="232" rx="16" fill="#ffffff"/>
  <rect x="140" y="232" width="232" height="48" rx="16" fill="#ffffff"/>
  <!-- Telemetry Pulse Wave -->
  <path d="M 120 256 L 190 256 L 220 180 L 260 330 L 300 210 L 330 256 L 392 256" fill="none" stroke="#a9e6d3" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent);
fs.writeFileSync(path.join(__dirname, '../apps/web/public/icon.svg'), svgContent);

console.log('✅ PWA Icons successfully generated in apps/web/public/icons/');
