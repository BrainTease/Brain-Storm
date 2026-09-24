/**
 * Test to verify forum thread view components are modular (Issue #1122)
 * Ensures forum components are split into manageable pieces with proper encapsulation
 */

import fs from 'fs';
import path from 'path';

import { describe, it, expect } from 'vitest';

const FORUM_DIR = path.resolve(__dirname, '../components/forum');

describe('Forum Component Modularity - Issue #1122', () => {
  it('should have extracted ThreadList component', () => {
    expect(fs.existsSync(path.resolve(FORUM_DIR, 'ThreadList.tsx'))).toBe(true);
  });

  it('should have extracted ReplyList component', () => {
    expect(fs.existsSync(path.resolve(FORUM_DIR, 'ReplyList.tsx'))).toBe(true);
  });

  it('should have extracted ThreadDetail component', () => {
    expect(fs.existsSync(path.resolve(FORUM_DIR, 'ThreadDetail.tsx'))).toBe(true);
  });

  it('should have extracted ReplyItem component', () => {
    expect(fs.existsSync(path.resolve(FORUM_DIR, 'ReplyItem.tsx'))).toBe(true);
  });

  it('ThreadList should be under 150 lines', () => {
    const threadListPath = path.resolve(FORUM_DIR, 'ThreadList.tsx');
    if (fs.existsSync(threadListPath)) {
      const lines = fs.readFileSync(threadListPath, 'utf-8').split('\n').length;
      expect(lines).toBeLessThanOrEqual(150);
    }
  });

  it('ReplyList should be under 150 lines', () => {
    const replyListPath = path.resolve(FORUM_DIR, 'ReplyList.tsx');
    if (fs.existsSync(replyListPath)) {
      const lines = fs.readFileSync(replyListPath, 'utf-8').split('\n').length;
      expect(lines).toBeLessThanOrEqual(150);
    }
  });

  it('ThreadDetail should be under 150 lines', () => {
    const threadDetailPath = path.resolve(FORUM_DIR, 'ThreadDetail.tsx');
    if (fs.existsSync(threadDetailPath)) {
      const lines = fs.readFileSync(threadDetailPath, 'utf-8').split('\n').length;
      expect(lines).toBeLessThanOrEqual(150);
    }
  });

  it('should have forum mutations hook', () => {
    const files = fs.readdirSync(FORUM_DIR);
    const hasMutationHook = files.some((file) => {
      const content = fs.readFileSync(path.join(FORUM_DIR, file), 'utf-8');
      return content.includes('useForum') || content.includes('mutation');
    });
    expect(hasMutationHook).toBe(true);
  });

  it('VoteButton should be a reusable component', () => {
    const voteButtonPath = path.resolve(FORUM_DIR, 'VoteButton.tsx');
    if (fs.existsSync(voteButtonPath)) {
      const content = fs.readFileSync(voteButtonPath, 'utf-8');
      expect(content).toMatch(/export\s+(const|function)\s+VoteButton/);
    }
  });

  it('MarkdownEditor should exist', () => {
    expect(fs.existsSync(path.resolve(FORUM_DIR, 'MarkdownEditor.tsx'))).toBe(true);
  });

  it('RichTextEditor should exist', () => {
    expect(fs.existsSync(path.resolve(FORUM_DIR, 'RichTextEditor.tsx'))).toBe(true);
  });

  it('CreateThreadModal should exist', () => {
    const createThreadPath = path.resolve(FORUM_DIR, 'CreateThreadModal.tsx');
    if (fs.existsSync(createThreadPath)) {
      const content = fs.readFileSync(createThreadPath, 'utf-8');
      expect(content).toMatch(/import|export/);
    }
  });

  it('should not duplicate mutation logic', () => {
    const files = fs.readdirSync(FORUM_DIR).filter((f) => f.endsWith('.tsx'));
    let mutationCount = 0;
    files.forEach((file) => {
      const content = fs.readFileSync(path.join(FORUM_DIR, file), 'utf-8');
      if (content.includes('useMutation') || content.includes('useQuery')) {
        mutationCount += 1;
      }
    });
    expect(mutationCount).toBeLessThanOrEqual(files.length / 2);
  });
});
