import { describe, expect, it } from 'vitest';
import { analyzeTextTokens, estimateBaseTokens } from './token-calculator.service';

describe('token-calculator service', () => {
  it('should return 0 tokens for empty text', () => {
    expect(estimateBaseTokens('')).toBe(0);
    const result = analyzeTextTokens('');
    expect(result.stats.characters).toBe(0);
    expect(result.stats.baseTokens).toBe(0);
  });

  it('should estimate english words tokens', () => {
    const text = 'Hello world, this is a test prompt for artificial intelligence.';
    const tokens = estimateBaseTokens(text);
    expect(tokens).toBeGreaterThan(5);
    expect(tokens).toBeLessThan(25);
  });

  it('should estimate CJK characters tokens correctly', () => {
    const text = '你好，世界！这是一段中文测试提示词。';
    const tokens = estimateBaseTokens(text);
    // 17 characters, expecting roughly 20-25 tokens
    expect(tokens).toBeGreaterThan(15);
    expect(tokens).toBeLessThan(35);
  });

  it('should generate model estimates and costs', () => {
    const text = 'Quick brown fox jumps over the lazy dog';
    const { estimates, stats } = analyzeTextTokens(text);
    expect(stats.words).toBe(8);
    expect(estimates.length).toBeGreaterThan(0);
    const gpt4o = estimates.find(e => e.model.id === 'gpt-4o');
    expect(gpt4o).toBeDefined();
    expect(gpt4o?.inputCostUSD).toBeGreaterThanOrEqual(0);
  });
});
