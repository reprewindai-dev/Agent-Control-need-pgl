import { describe, it, expect } from 'vitest';
import { generateHash } from '../simulation';

describe('generateHash', () => {
  it('should include the correct prefix', () => {
    const hash = generateHash('test');
    expect(hash.startsWith('test_')).toBe(true);
  });

  it('should have the correct length', () => {
    const prefix = 'abc';
    const hash = generateHash(prefix);
    // prefix length (3) + underscore (1) + 24 random chars = 28
    expect(hash.length).toBe(prefix.length + 1 + 24);
  });

  it('should only use characters 0-9 and a-f for the random part', () => {
    const hash = generateHash('prefix');
    const randomPart = hash.split('_')[1];

    // Check if every character is either a number or a lowercase letter a-f
    const isValid = Array.from(randomPart).every(char =>
      (char >= '0' && char <= '9') || (char >= 'a' && char <= 'f')
    );

    expect(isValid).toBe(true);
  });

  it('should generate different hashes on multiple calls', () => {
    const hash1 = generateHash('test');
    const hash2 = generateHash('test');

    expect(hash1).not.toBe(hash2);
  });
});
