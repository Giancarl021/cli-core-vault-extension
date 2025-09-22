import { describe, expect, test } from '@jest/globals';

import hash from '../../src/util/hash.js';

describe('[UNIT] util/hash', () => {
    test('Must return a hash string', () => {
        const input = 'test-string';
        const output = hash(input);
        expect(typeof output).toBe('string');
        expect(output.length).toBeGreaterThan(0);
    });

    test('Must return different hashes for different inputs', () => {
        const input1 = 'test-string-1';
        const input2 = 'test-string-2';
        const hash1 = hash(input1);
        const hash2 = hash(input2);
        expect(hash1).not.toBe(hash2);
    });

    test('Must return the same hash for the same input', () => {
        const input = 'consistent-string';
        const hash1 = hash(input);
        const hash2 = hash(input);
        expect(hash1).toBe(hash2);
    });

    test('Must handle empty string input', () => {
        const input = '';
        const output = hash(input);
        expect(typeof output).toBe('string');
        expect(output.length).toBeGreaterThan(0);
    });

    test('Must handle long string input', () => {
        const input = 'a'.repeat(1000);
        const output = hash(input);
        expect(typeof output).toBe('string');
        expect(output.length).toBeGreaterThan(0);
    });

    test('Must handle special characters in input', () => {
        const input = '!@#$%^&*()_+-=[]{}|;:\'",.<>/?`~';
        const output = hash(input);
        expect(typeof output).toBe('string');
        expect(output.length).toBeGreaterThan(0);
    });

    test('Must handle unicode characters in input', () => {
        const input = '测试字符串🌟';
        const output = hash(input);
        expect(typeof output).toBe('string');
        expect(output.length).toBeGreaterThan(0);
    });
});
