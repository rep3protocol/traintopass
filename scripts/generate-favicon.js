const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function drawFavicon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#0a0a0a';
  const radius = size * 0.12;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle = '#4ade80';
  ctx.font = `bold ${size * 0.52}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TP', size / 2, size / 2 + size * 0.03);
  
  return canvas;
}

const publicDir = path.join(__dirname, '../public');

const c16 = drawFavicon(16);
fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), c16.toBuffer('image/png'));

const c32 = drawFavicon(32);
fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), c32.toBuffer('image/png'));

const c180 = drawFavicon(180);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), c180.toBuffer('image/png'));

fs.copyFileSync(path.join(publicDir, 'favicon-32x32.png'), path.join(publicDir, 'favicon.ico'));

console.log('Favicons generated successfully');
