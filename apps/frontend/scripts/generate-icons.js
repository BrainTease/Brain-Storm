#!/usr/bin/env node

/**
 * Script to generate PWA icons from a source image
 * 
 * Usage:
 *   node scripts/generate-icons.js <source-image> [output-dir]
 * 
 * Example:
 *   node scripts/generate-icons.js logo.png public/icons
 * 
 * Requirements:
 *   - sharp npm package: npm install --save-dev sharp
 *   - Source image should be at least 512x512px
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is installed
try {
  require.resolve('sharp');
} catch (e) {
  console.error('Error: sharp package not found.');
  console.error('Install it with: npm install --save-dev sharp');
  process.exit(1);
}

const sharp = require('sharp');

const sourceImage = process.argv[2];
const outputDir = process.argv[3] || 'public/icons';

if (!sourceImage) {
  console.error('Usage: node scripts/generate-icons.js <source-image> [output-dir]');
  console.error('Example: node scripts/generate-icons.js logo.png public/icons');
  process.exit(1);
}

if (!fs.existsSync(sourceImage)) {
  console.error(`Error: Source image not found: ${sourceImage}`);
  process.exit(1);
}

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`Created directory: ${outputDir}`);
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  try {
    console.log(`Generating icons from: ${sourceImage}`);
    console.log(`Output directory: ${outputDir}`);
    console.log('');

    for (const size of sizes) {
      const filename = `icon-${size}x${size}.png`;
      const filepath = path.join(outputDir, filename);

      await sharp(sourceImage)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .png()
        .toFile(filepath);

      console.log(`✓ Generated ${filename}`);
    }

    // Generate maskable icons (for adaptive icons on Android)
    console.log('');
    console.log('Generating maskable icons...');

    for (const size of [192, 512]) {
      const filename = `icon-maskable-${size}x${size}.png`;
      const filepath = path.join(outputDir, filename);

      await sharp(sourceImage)
        .resize(Math.floor(size * 0.8), Math.floor(size * 0.8), {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .extend({
          top: Math.floor(size * 0.1),
          bottom: Math.floor(size * 0.1),
          left: Math.floor(size * 0.1),
          right: Math.floor(size * 0.1),
          background: { r: 37, g: 99, b: 235, alpha: 1 }, // blue-600
        })
        .png()
        .toFile(filepath);

      console.log(`✓ Generated ${filename}`);
    }

    console.log('');
    console.log('✅ All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
