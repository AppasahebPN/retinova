// Test script comparing JS preprocessing against Python preprocessing
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

// Bicubic interpolation kernel (Keys cubic spline with a = -0.5, matching PIL Bicubic)
function cubic(x) {
  const a = -0.5;
  const absX = Math.abs(x);
  const absX2 = absX * absX;
  const absX3 = absX2 * absX;

  if (absX <= 1) {
    return (a + 2) * absX3 - (a + 3) * absX2 + 1;
  } else if (absX < 2) {
    return a * absX3 - 5 * a * absX2 + 8 * a * absX - 4 * a;
  }
  return 0;
}

function preprocessImageBuffer(buffer, isPng = true) {
  let imgWidth, imgHeight, imgData;

  if (isPng) {
    const png = PNG.sync.read(buffer);
    imgWidth = png.width;
    imgHeight = png.height;
    imgData = png.data; // RGBA
  } else {
    const jpeg = require('jpeg-js');
    const decoded = jpeg.decode(buffer, { useTArray: true });
    imgWidth = decoded.width;
    imgHeight = decoded.height;
    imgData = decoded.data; // RGBA
  }

  // 1. Retina FOV crop (tol = 7)
  const rows = new Uint8Array(imgHeight);
  const cols = new Uint8Array(imgWidth);

  for (let y = 0; y < imgHeight; y++) {
    for (let x = 0; x < imgWidth; x++) {
      const idx = (y * imgWidth + x) * 4;
      const gray = (imgData[idx] + imgData[idx + 1] + imgData[idx + 2]) / 3;
      if (gray > 7) {
        rows[y] = 1;
        cols[x] = 1;
      }
    }
  }

  let ymin = -1, ymax = -1;
  for (let y = 0; y < imgHeight; y++) {
    if (rows[y] === 1) {
      if (ymin === -1) ymin = y;
      ymax = y;
    }
  }

  let xmin = -1, xmax = -1;
  for (let x = 0; x < imgWidth; x++) {
    if (cols[x] === 1) {
      if (xmin === -1) xmin = x;
      xmax = x;
    }
  }

  if (ymin === -1 || xmin === -1) {
    // No mask found, fallback to full image
    ymin = 0; ymax = imgHeight - 1;
    xmin = 0; xmax = imgWidth - 1;
  }

  // Small buffer
  ymin = Math.max(0, ymin - 2);
  ymax = Math.min(imgHeight - 1, ymax + 3);
  xmin = Math.max(0, xmin - 2);
  xmax = Math.min(imgWidth - 1, xmax + 3);

  const cropW = xmax - xmin + 1;
  const cropH = ymax - ymin + 1;

  // 2. Pad to square
  const maxDim = Math.max(cropW, cropH);
  const dx = Math.floor((maxDim - cropW) / 2);
  const dy = Math.floor((maxDim - cropH) / 2);

  // 3. Bicubic resize to 512x512
  const targetSize = 512;
  const tensor = new Float32Array(3 * targetSize * targetSize);
  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];

  const scale = maxDim / targetSize;

  // Function to sample a pixel in the padded square (RGB, in [0, 255])
  function getSample(sx, sy, channel) {
    // Map from square coordinates (0 to maxDim - 1) back to cropped image
    const cx = sx - dx;
    const cy = sy - dy;

    if (cx < 0 || cx >= cropW || cy < 0 || cy >= cropH) {
      return 0; // Black padding
    }

    const ox = Math.min(imgWidth - 1, Math.max(0, xmin + Math.floor(cx)));
    const oy = Math.min(imgHeight - 1, Math.max(0, ymin + Math.floor(cy)));
    return imgData[(oy * imgWidth + ox) * 4 + channel];
  }

  for (let ty = 0; ty < targetSize; ty++) {
    // Map target coordinate to source coordinate in square space
    const srcY = (ty + 0.5) * scale - 0.5;
    const iy = Math.floor(srcY);
    const fy = srcY - iy;

    // Precalculate y weights
    const wy = [cubic(fy + 1), cubic(fy), cubic(fy - 1), cubic(fy - 2)];

    for (let tx = 0; tx < targetSize; tx++) {
      const srcX = (tx + 0.5) * scale - 0.5;
      const ix = Math.floor(srcX);
      const fx = srcX - ix;

      const wx = [cubic(fx + 1), cubic(fx), cubic(fx - 1), cubic(fx - 2)];

      for (let c = 0; c < 3; c++) {
        let val = 0;
        let wSum = 0;

        for (let m = -1; m <= 2; m++) {
          const sy = iy + m;
          const ymWeight = wy[m + 1];

          for (let n = -1; n <= 2; n++) {
            const sx = ix + n;
            const weight = ymWeight * wx[n + 1];
            wSum += weight;

            val += getSample(sx, sy, c) * weight;
          }
        }

        if (wSum > 0) val /= wSum;
        val = Math.max(0, Math.min(255, val));

        // Normalize
        const normVal = (val / 255.0 - mean[c]) / std[c];
        tensor[c * targetSize * targetSize + ty * targetSize + tx] = normVal;
      }
    }
  }

  return {
    tensor,
    crop: { xmin, ymin, xmax, ymax, cropW, cropH, maxDim, dx, dy }
  };
}

module.exports = { preprocessImageBuffer };
