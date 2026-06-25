import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TranscriptPanel } from '@/components/courses/TranscriptPanel';
import { parseVTT } from '@/lib/vtt-parser';

const sampleVTT = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
Hello and welcome

2
00:00:05.000 --> 00:00:10.000
This is a test transcript

3
00:00:11.000 --> 00:00:15.000
With multiple lines`;

global.fetch = vi.fn(() =>
  Promise.resolve({
    text: () => Promise.resolve(sampleVTT),
  }),
) as any;

describe('TranscriptPanel', () => {
  it('renders transcript lines after loading', async () => {
    const onSeek = vi.fn();
    render(
      <TranscriptPanel
        src="/test.vtt"
        currentTime={0}
        onSeek={onSeek}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Hello and welcome')).toBeInTheDocument();
    });

    expect(screen.getByText('This is a test transcript')).toBeInTheDocument();
  });

  it('highlights active line based on currentTime', async () => {
    const onSeek = vi.fn();
    render(
      <TranscriptPanel
        src="/test.vtt"
        currentTime={6}
        onSeek={onSeek}
      />,
    );

    await waitFor(() => {
      const active = screen.getByText('This is a test transcript');
      expect(active.closest('button')).toHaveAttribute('aria-current', 'true');
    });
  });

  it('calls onSeek when a line is clicked', async () => {
    const user = userEvent.setup();
    const onSeek = vi.fn();
    render(
      <TranscriptPanel
        src="/test.vtt"
        currentTime={0}
        onSeek={onSeek}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Hello and welcome')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Hello and welcome'));
    expect(onSeek).toHaveBeenCalledWith(1);
  });
});

describe('parseVTT', () => {
  it('parses basic WebVTT content', () => {
    const result = parseVTT(sampleVTT);
    expect(result).toHaveLength(3);
    expect(result[0].start).toBe(1);
    expect(result[0].end).toBe(4);
    expect(result[0].text).toBe('Hello and welcome');
    expect(result[1].start).toBe(5);
    expect(result[1].end).toBe(10);
    expect(result[2].start).toBe(11);
    expect(result[2].end).toBe(15);
  });

  it('strips HTML tags from text', () => {
    const result = parseVTT('WEBVTT\n\n1\n00:00:01.000 --> 00:00:02.000\nHello <b>world</b>');
    expect(result[0].text).toBe('Hello world');
  });

  it('handles empty content', () => {
    const result = parseVTT('');
    expect(result).toHaveLength(0);
  });
});
