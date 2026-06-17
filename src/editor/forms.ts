import * as vscode from 'vscode';

export interface FormBounds {
  start: number;
  end: number;
}

function byteOffsetFromPosition(
  doc: vscode.TextDocument,
  position: vscode.Position
): number {
  const text = doc.getText();
  const lines = text.split('\n');
  let offset = 0;
  for (let i = 0; i < position.line; i++) {
    offset += lines[i].length + 1;
  }
  offset += position.character;
  return offset;
}

function positionFromByteOffset(
  doc: vscode.TextDocument,
  byteOffset: number
): vscode.Position {
  const text = doc.getText();
  let line = 0;
  let col = 0;
  for (let i = 0; i < byteOffset && i < text.length; i++) {
    if (text[i] === '\n') {
      line++;
      col = 0;
    } else {
      col++;
    }
  }
  return new vscode.Position(line, col);
}

function rangeFromFormBounds(
  doc: vscode.TextDocument,
  bounds: FormBounds
): vscode.Range {
  const start = positionFromByteOffset(doc, bounds.start);
  const end = positionFromByteOffset(doc, bounds.end);
  return new vscode.Range(start, end);
}

const OPEN: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
const CLOSE: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

function isOpen(c: string): boolean {
  return c in OPEN;
}

function isClose(c: string): boolean {
  return c in CLOSE;
}

function skipComment(source: string, pos: number): number {
  while (pos < source.length && source[pos] !== '\n') {
    pos++;
  }
  return pos;
}

function skipString(source: string, pos: number): number {
  pos++; // skip opening "
  while (pos < source.length) {
    if (source[pos] === '"') break;
    if (source[pos] === '\\') pos++;
    pos++;
  }
  return pos + 1;
}

export function findEnclosingFormBounds(
  source: string,
  offset: number
): FormBounds | null {
  const len = source.length;
  if (len === 0) {
    return null;
  }

  // If cursor is at/past end, start from last char; otherwise start from offset
  let start = offset >= len ? len - 1 : offset;

  // Skip backward past whitespace
  while (start >= 0 && /\s/.test(source[start])) {
    start--;
  }
  if (start < 0) {
    return null;
  }

  // Walk backward to find opening bracket
  let depth = 0;
  let inString = false;

  while (start >= 0) {
    const c = source[start];
    if (inString) {
      if (c === '"') inString = false;
      else if (c === '\\') start--;
    } else {
      if (c === '"') inString = true;
      else if (c === '#') {
        // skip backward past comment — move to line start
        while (start >= 0 && source[start] !== '\n') {
          start--;
        }
        continue;
      } else if (isClose(c)) {
        depth++;
      } else if (isOpen(c)) {
        depth--;
        if (depth <= 0) break;
      }
    }
    start--;
  }

  if (depth > 0) {
    return null;
  }

  // Walk forward from start to find matching close
  let end = start + 1;
  depth = 1;
  inString = false;

  while (end < len) {
    const c = source[end];
    if (inString) {
      if (c === '"') inString = false;
      else if (c === '\\') end++;
    } else {
      if (c === '"') inString = true;
      else if (c === '#') {
        end = skipComment(source, end);
        continue;
      } else if (isOpen(c)) {
        depth++;
      } else if (isClose(c)) {
        depth--;
        if (depth === 0) {
          end++;
          break;
        }
      }
    }
    end++;
  }

  return { start, end: Math.min(end, len) };
}

export function findTopLevelFormBounds(
  source: string,
  offset: number
): FormBounds | null {
  const enclosing = findEnclosingFormBounds(source, offset);
  if (!enclosing) {
    return null;
  }

  let start = enclosing.start;
  while (start > 0 && source[start - 1] !== '\n') {
    start--;
  }

  // Re-find the full form from the expanded start position
  return findEnclosingFormBounds(source, start);
}

export function findEnclosingForm(
  doc: vscode.TextDocument,
  position: vscode.Position
): vscode.Range | null {
  const source = doc.getText();
  const offset = byteOffsetFromPosition(doc, position);
  const bounds = findEnclosingFormBounds(source, offset);
  if (!bounds) {
    return null;
  }
  return rangeFromFormBounds(doc, bounds);
}

export function findTopLevelForm(
  doc: vscode.TextDocument,
  position: vscode.Position
): vscode.Range | null {
  const source = doc.getText();
  const offset = byteOffsetFromPosition(doc, position);
  const bounds = findTopLevelFormBounds(source, offset);
  if (!bounds) {
    return null;
  }
  return rangeFromFormBounds(doc, bounds);
}
