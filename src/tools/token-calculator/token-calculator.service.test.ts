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

  it('should estimate Japanese and Korean text tokens correctly', () => {
    // Japanese text (Hiragana, Katakana, and Kanji)
    const japaneseText = 'こんにちは世界！AIモデルのトークン計算テストです。';
    const jaResult = analyzeTextTokens(japaneseText);
    expect(jaResult.stats.cjkCharacters).toBeGreaterThan(15);
    expect(jaResult.stats.baseTokens).toBeGreaterThan(15);

    // Korean text (Hangul)
    const koreanText = '안녕하세요 세계! 인공지능 토큰 계산 테스트입니다.';
    const koResult = analyzeTextTokens(koreanText);
    expect(koResult.stats.cjkCharacters).toBeGreaterThan(15);
    expect(koResult.stats.baseTokens).toBeGreaterThan(15);
  });

  it('should be strictly idempotent and stateless across repeated calls', () => {
    const singleChar = 'あ';
    const firstTokens = estimateBaseTokens(singleChar);
    const secondTokens = estimateBaseTokens(singleChar);
    expect(firstTokens).toBe(secondTokens);

    const firstStats = analyzeTextTokens(singleChar);
    const secondStats = analyzeTextTokens(singleChar);
    expect(firstStats.stats.cjkCharacters).toBe(secondStats.stats.cjkCharacters);
    expect(firstStats.stats.cjkCharacters).toBe(1);
  });
});
