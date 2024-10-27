const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcon(size, outputPath) {
  const padding = Math.floor(size * 0.1);
  const circleSize = size - (padding * 2);

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 30, g: 30, b: 30, alpha: 1 }
    }
  })
    .composite([{
      input: Buffer.from(`<svg><circle cx="${size/2}" cy="${size/2}" r="${circleSize/2}" fill="white"/></svg>`),
      top: 0,
      left: 0,
    }, {
      input: Buffer.from(`<svg><text x="${size/2}" y="${size/2}" font-family="Arial" font-size="${size/3}" fill="#3B82F6" text-anchor="middle" dominant-baseline="central">OC</text></svg>`),
      top: 0,
      left: 0,
    }])
    .png()
    .toFile(outputPath);
}

async function generateAllIcons() {
  const extensionDir = path.join(__dirname, 'extension');
  
  // Asegúrate de que la carpeta extension existe
  if (!fs.existsSync(extensionDir)) {
    fs.mkdirSync(extensionDir);
  }

  const sizes = [16, 48, 128];
  const promises = sizes.map(size => 
    generateIcon(size, path.join(extensionDir, `icon${size}.png`))
  );
  
  try {
    await Promise.all(promises);
    console.log('Icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateAllIcons();
