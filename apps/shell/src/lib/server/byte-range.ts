export interface ByteRange {
  readonly start: number;
  readonly end: number;
}

/** Parse one RFC 9110 byte range. Multi-range responses are deliberately unsupported. */
export function parseByteRange(value: string | null, size: number): ByteRange | undefined {
  if (!value || !Number.isSafeInteger(size) || size < 0) return undefined;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match) return undefined;
  const startText = match[1] ?? '';
  const endText = match[2] ?? '';
  if (!startText && !endText) return undefined;
  if (size === 0) return undefined;
  if (!startText) {
    const suffix = Number(endText);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return undefined;
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }
  const start = Number(startText);
  const end = endText ? Number(endText) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) {
    return undefined;
  }
  return { start, end: Math.min(end, size - 1) };
}
