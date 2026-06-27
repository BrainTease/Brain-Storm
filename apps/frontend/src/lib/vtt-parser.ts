export interface VTTLine {
  id?: string;
  start: number;
  end: number;
  text: string;
}

export function parseVTT(content: string): VTTLine[] {
  const lines: VTTLine[] = [];
  const normalized = content.replace(/\r\n/g, '\n');

  const blocks = normalized.split(/\n\n+/);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed || trimmed === 'WEBVTT') continue;

    const parts = trimmed.split('\n');
    let id: string | undefined;
    let timingLine = '';
    let textLines: string[] = [];

    if (parts.length === 1) continue;

    const firstLine = parts[0].trim();
    const timeRegex = /^(\d{2}:)?(\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:)?(\d{2}:\d{2}\.\d{3})/;

    if (timeRegex.test(firstLine)) {
      timingLine = firstLine;
      textLines = parts.slice(1);
    } else {
      id = firstLine;
      timingLine = parts[1]?.trim() || '';
      textLines = parts.slice(2);
    }

    if (!timingLine) continue;

    const match = timingLine.match(
      /(?:(\d{2}):)?(\d{2}:\d{2}\.\d{3})\s*-->\s*(?:(\d{2}):)?(\d{2}:\d{2}\.\d{3})/,
    );
    if (!match) continue;

    const start = parseVTTTime(match[1], match[2]);
    const end = parseVTTTime(match[3], match[4]);

    lines.push({
      id,
      start,
      end,
      text: textLines.join(' ').replace(/<[^>]+>/g, '').trim(),
    });
  }

  return lines;
}

function parseVTTTime(hourPart: string | undefined, rest: string): number {
  let total = 0;
  if (hourPart) {
    total += parseInt(hourPart, 10) * 3600;
  }
  const [minSec, ms] = rest.split('.');
  const [m, s] = minSec.split(':');
  total += parseInt(m, 10) * 60;
  total += parseInt(s, 10);
  total += parseInt(ms, 10) / 1000;
  return total;
}
