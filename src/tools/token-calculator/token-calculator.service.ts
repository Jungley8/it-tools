export interface ModelProfile {
  id: string
  name: string
  provider: string
  contextWindow: number
  inputPricePerMillion: number
  cachedPricePerMillion: number
  outputPricePerMillion: number
  tokenMultiplier: number
}

export const SUPPORTED_MODELS: ModelProfile[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o (o200k_base)',
    provider: 'OpenAI',
    contextWindow: 128_000,
    inputPricePerMillion: 2.50,
    cachedPricePerMillion: 1.25,
    outputPricePerMillion: 10.00,
    tokenMultiplier: 1.0,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o mini',
    provider: 'OpenAI',
    contextWindow: 128_000,
    inputPricePerMillion: 0.15,
    cachedPricePerMillion: 0.075,
    outputPricePerMillion: 0.60,
    tokenMultiplier: 1.0,
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 / 3.7 Sonnet',
    provider: 'Anthropic',
    contextWindow: 200_000,
    inputPricePerMillion: 3.00,
    cachedPricePerMillion: 0.30,
    outputPricePerMillion: 15.00,
    tokenMultiplier: 1.04,
  },
  {
    id: 'claude-3-5-haiku',
    name: 'Claude 3.5 Haiku',
    provider: 'Anthropic',
    contextWindow: 200_000,
    inputPricePerMillion: 0.80,
    cachedPricePerMillion: 0.08,
    outputPricePerMillion: 4.00,
    tokenMultiplier: 1.04,
  },
  {
    id: 'deepseek-v3',
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    contextWindow: 64_000,
    inputPricePerMillion: 0.14,
    cachedPricePerMillion: 0.014,
    outputPricePerMillion: 0.28,
    tokenMultiplier: 0.98,
  },
  {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'DeepSeek',
    contextWindow: 64_000,
    inputPricePerMillion: 0.55,
    cachedPricePerMillion: 0.14,
    outputPricePerMillion: 2.19,
    tokenMultiplier: 0.98,
  },
  {
    id: 'llama-3-3-70b',
    name: 'Llama 3.3 70B',
    provider: 'Meta',
    contextWindow: 128_000,
    inputPricePerMillion: 0.59,
    cachedPricePerMillion: 0.29,
    outputPricePerMillion: 0.79,
    tokenMultiplier: 1.02,
  },
  {
    id: 'gemini-1-5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'Google',
    contextWindow: 1_000_000,
    inputPricePerMillion: 0.075,
    cachedPricePerMillion: 0.01875,
    outputPricePerMillion: 0.30,
    tokenMultiplier: 0.97,
  },
  {
    id: 'gemini-1-5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    contextWindow: 2_000_000,
    inputPricePerMillion: 1.25,
    cachedPricePerMillion: 0.3125,
    outputPricePerMillion: 5.00,
    tokenMultiplier: 0.97,
  },
];

export interface TextTokenStats {
  characters: number
  charactersWithoutSpaces: number
  words: number
  lines: number
  cjkCharacters: number
  baseTokens: number
  tokensPerWord: number
  tokensPerChar: number
}

export interface ModelEstimate {
  model: ModelProfile
  estimatedTokens: number
  percentOfContext: number
  inputCostUSD: number
  cachedCostUSD: number
}

/**
 * Regular expression matching CJK characters, Japanese Hiragana & Katakana, and Korean Hangul.
 * Ranges:
 * - Hangul Jamo: \u1100-\u11FF
 * - Hiragana: \u3040-\u309F
 * - Katakana: \u30A0-\u30FF
 * - CJK Unified Ideographs Extension A: \u3400-\u4DBF
 * - CJK Unified Ideographs: \u4E00-\u9FFF
 * - Hangul Syllables: \uAC00-\uD7AF
 * - CJK Compatibility Ideographs: \uF900-\uFAFF
 */
export const CJK_CHAR_REGEX = /[\u1100-\u11FF\u3040-\u309F\u30A0-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/g;

function createCjkRegex(): RegExp {
  return new RegExp(CJK_CHAR_REGEX.source, 'g');
}

/**
 * Accurately estimate token count for text across different languages.
 * CJK (Chinese, Japanese, Korean) characters typically consume 1.2 to 1.8 tokens per character in modern BPE.
 * Latin words average ~1.3 tokens per word (or ~4 chars per token).
 * Code/symbols consume ~1 token per 3 chars.
 */
export function estimateBaseTokens(text: string): number {
  if (!text) {
    return 0;
  }

  // Count CJK, Hiragana, Katakana, and Hangul characters
  const cjkRegex = createCjkRegex();
  const cjkMatches = text.match(cjkRegex);
  const cjkCount = cjkMatches ? cjkMatches.length : 0;

  // Non-CJK text
  const nonCjkText = text.replace(createCjkRegex(), ' ');

  // Split into words and punctuation
  const words = nonCjkText.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Estimate non-CJK tokens: roughly 1.3 tokens per word + extra for punctuation/code symbols
  const punctuationCount = (nonCjkText.match(/[^a-zA-Z0-9\s]/g) || []).length;
  const nonCjkTokens = Math.ceil((wordCount * 1.28) + (punctuationCount * 0.45));

  // CJK characters in modern BPE (like o200k or Llama 3) average ~1.35 tokens per character
  const cjkTokens = Math.ceil(cjkCount * 1.35);

  return Math.max(1, nonCjkTokens + cjkTokens);
}

export function analyzeTextTokens(text: string): {
  stats: TextTokenStats
  estimates: ModelEstimate[]
} {
  const characters = text.length;
  const charactersWithoutSpaces = text.replace(/\s/g, '').length;
  const lines = text ? text.split('\n').length : 0;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const cjkMatches = text.match(createCjkRegex());
  const cjkCharacters = cjkMatches ? cjkMatches.length : 0;

  const baseTokens = estimateBaseTokens(text);
  const tokensPerWord = words > 0 ? Number((baseTokens / words).toFixed(2)) : 0;
  const tokensPerChar = characters > 0 ? Number((baseTokens / characters).toFixed(2)) : 0;

  const estimates = SUPPORTED_MODELS.map((model) => {
    const estimatedTokens = Math.round(baseTokens * model.tokenMultiplier);
    const percentOfContext = Number(((estimatedTokens / model.contextWindow) * 100).toFixed(3));
    const inputCostUSD = Number(((estimatedTokens / 1_000_000) * model.inputPricePerMillion).toFixed(6));
    const cachedCostUSD = Number(((estimatedTokens / 1_000_000) * model.cachedPricePerMillion).toFixed(6));

    return {
      model,
      estimatedTokens,
      percentOfContext,
      inputCostUSD,
      cachedCostUSD,
    };
  });

  return {
    stats: {
      characters,
      charactersWithoutSpaces,
      words,
      lines,
      cjkCharacters,
      baseTokens,
      tokensPerWord,
      tokensPerChar,
    },
    estimates,
  };
}
