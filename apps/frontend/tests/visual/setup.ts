import { expect, afterAll } from 'vitest';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

const BASELINE_DIR = path.join(__dirname, 'baselines');
const DIFF_DIR = path.join(__dirname, 'diffs');

if (!fs.existsSync(BASELINE_DIR)) fs.mkdirSync(BASELINE_DIR, { recursive: true });
if (!fs.existsSync(DIFF_DIR)) fs.mkdirSync(DIFF_DIR, { recursive: true });

export async function captureScreenshot(name: string, element: HTMLElement): Promise<Buffer> {
  const canvas = await html2canvas(element);
  return canvas.toBuffer('image/png');
}

export async function compareScreenshot(name: string, current: Buffer): Promise<boolean> {
  const baselinePath = path.join(BASELINE_DIR, `${name}.png`);

  if (!fs.existsSync(baselinePath)) {
    fs.writeFileSync(baselinePath, current);
    return true;
  }

  const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
  const currentPng = PNG.sync.read(current);

  const { width, height } = baseline;
  const diff = new PNG({ width, height });

  const pixelDiff = pixelmatch(baseline.data, currentPng.data, diff.data, width, height, {
    threshold: 0.1,
  });

  if (pixelDiff > 0) {
    fs.writeFileSync(path.join(DIFF_DIR, `${name}-diff.png`), PNG.sync.write(diff));
    return false;
  }

  return true;
}
