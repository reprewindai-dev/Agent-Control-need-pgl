import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateHash } from './simulation';

describe('generateHash', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should start with the provided prefix and an underscore', () => {
    const prefix = 'test';
    const hash = generateHash(prefix);
    expect(hash.startsWith(`${prefix}_`)).toBe(true);
  });

  it('should append exactly 24 characters after the prefix and underscore', () => {
    const prefix = 'test';
    const hash = generateHash(prefix);
    const parts = hash.split('_');

    expect(parts.length).toBeGreaterThanOrEqual(2);

    const generatedPart = hash.substring(prefix.length + 1);
    expect(generatedPart.length).toBe(24);
    expect(hash.length).toBe(prefix.length + 1 + 24);
  });

  it('should only contain valid characters in the generated part', () => {
    const prefix = 'ent';
    const hash = generateHash(prefix);
    const generatedPart = hash.substring(prefix.length + 1);

    // Check against characters present in SECURE_ENTROPY
    expect(/^[a-f0-9]{24}$/.test(generatedPart)).toBe(true);
  });

  it('should generate unique hashes for the same prefix', () => {
    const hash1 = generateHash('prefix');
    const hash2 = generateHash('prefix');

    expect(hash1).not.toBe(hash2);
  });

  it('should handle empty prefixes correctly', () => {
    const hash = generateHash('');
    expect(hash.startsWith('_')).toBe(true);
    expect(hash.length).toBe(1 + 24);
  });

  it('should use Math.random to generate characters', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const hash = generateHash('spy');

    expect(randomSpy).toHaveBeenCalledTimes(24);
    expect(hash.substring(4)).toHaveLength(24);
    const generatedPart = hash.substring(4);
    const firstChar = generatedPart[0];
    expect(generatedPart.split('').every(c => c === firstChar)).toBe(true);
  });
});
