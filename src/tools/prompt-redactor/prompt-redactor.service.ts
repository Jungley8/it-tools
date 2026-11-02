export interface RedactorOptions {
  apiKeys: boolean
  emails: boolean
  ipAddresses: boolean
  phoneNumbers: boolean
  idCards: boolean
  customKeywords: string[]
}

export const DEFAULT_REDACTOR_OPTIONS: RedactorOptions = {
  apiKeys: true,
  emails: true,
  ipAddresses: true,
  phoneNumbers: true,
  idCards: true,
  customKeywords: [],
};

export interface RedactResult {
  redactedText: string
  mappings: Record<string, string>
  stats: {
    apiKeys: number
    emails: number
    ipAddresses: number
    phoneNumbers: number
    idCards: number
    customKeywords: number
    total: number
  }
}

export function redactText(text: string, options: Partial<RedactorOptions> = {}): RedactResult {
  if (!text) {
    return {
      redactedText: '',
      mappings: {},
      stats: { apiKeys: 0, emails: 0, ipAddresses: 0, phoneNumbers: 0, idCards: 0, customKeywords: 0, total: 0 },
    };
  }

  const opts: RedactorOptions = { ...DEFAULT_REDACTOR_OPTIONS, ...options };
  const mappings: Record<string, string> = {};
  let currentText = text;

  let apiKeyCount = 0;
  let emailCount = 0;
  let ipCount = 0;
  let phoneCount = 0;
  let idCardCount = 0;
  let customCount = 0;

  // 1. API Keys and Secrets
  if (opts.apiKeys) {
    // OpenAI / Claude / Anthropic / GitHub / AWS keys
    const apiKeyPatterns = [
      /\bsk-[a-zA-Z0-9_-]{20,}\b/g,
      /\bgh[pousr]_[a-zA-Z0-9]{36,}\b/g,
      /\bAKIA[0-9A-Z]{16}\b/g,
      /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, // JWT
      /Bearer\s+[a-zA-Z0-9_\-.~+/]+=*/gi,
    ];

    for (const pattern of apiKeyPatterns) {
      currentText = currentText.replace(pattern, (match) => {
        apiKeyCount++;
        const placeholder = `{{REDACTED_API_KEY_${apiKeyCount}}}`;
        mappings[placeholder] = match;
        return placeholder;
      });
    }
  }

  // 2. Email Addresses
  if (opts.emails) {
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,7}\b/g;
    currentText = currentText.replace(emailPattern, (match) => {
      emailCount++;
      const placeholder = `{{REDACTED_EMAIL_${emailCount}}}`;
      mappings[placeholder] = match;
      return placeholder;
    });
  }

  // 3. IPv4 Addresses (exclude 127.0.0.1 and 0.0.0.0 if desirable, or match standard)
  if (opts.ipAddresses) {
    const ipPattern = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
    currentText = currentText.replace(ipPattern, (match) => {
      ipCount++;
      const placeholder = `{{REDACTED_IP_${ipCount}}}`;
      mappings[placeholder] = match;
      return placeholder;
    });
  }

  // 4. Phone Numbers (Chinese 11-digit & International format)
  if (opts.phoneNumbers) {
    // Chinese 11-digit mobile: 1[3-9]\d{9}
    const cnPhonePattern = /(?<!\d)1[3-9]\d{9}(?!\d)/g;
    currentText = currentText.replace(cnPhonePattern, (match) => {
      phoneCount++;
      const placeholder = `{{REDACTED_PHONE_${phoneCount}}}`;
      mappings[placeholder] = match;
      return placeholder;
    });

    // International format e.g. +86-13800000000 or +1 (555) 000-0000
    const intlPhonePattern = /\+\d{1,3}[-.\s]?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,9}\b/g;
    currentText = currentText.replace(intlPhonePattern, (match) => {
      phoneCount++;
      const placeholder = `{{REDACTED_PHONE_${phoneCount}}}`;
      mappings[placeholder] = match;
      return placeholder;
    });
  }

  // 5. Chinese Resident ID Cards (18 digits)
  if (opts.idCards) {
    const idCardPattern = /\b[1-9]\d{5}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g;
    currentText = currentText.replace(idCardPattern, (match) => {
      idCardCount++;
      const placeholder = `{{REDACTED_IDCARD_${idCardCount}}}`;
      mappings[placeholder] = match;
      return placeholder;
    });
  }

  // 6. Custom Keywords
  if (opts.customKeywords && opts.customKeywords.length > 0) {
    const cjkPattern = /[\u1100-\u11FF\u3040-\u309F\u30A0-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/;
    // Deduplicate and sort descending by length so longer phrases are matched before substrings
    const sortedKeywords = Array.from(new Set(opts.customKeywords.map(k => k.trim()).filter(Boolean)))
      .sort((a, b) => b.length - a.length);

    for (const kw of sortedKeywords) {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const hasCjk = cjkPattern.test(kw);
      let regex: RegExp;
      if (hasCjk) {
        regex = new RegExp(escaped, 'gi');
      }
      else {
        // Only apply \b where character is an ASCII word character to avoid breaking keywords like C++ or .env
        const leftBoundary = /^\w/.test(kw) ? '\\b' : '';
        const rightBoundary = /\w$/.test(kw) ? '\\b' : '';
        regex = new RegExp(`${leftBoundary}${escaped}${rightBoundary}`, 'gi');
      }

      currentText = currentText.replace(regex, (match) => {
        customCount++;
        const placeholder = `{{REDACTED_KEYWORD_${customCount}}}`;
        mappings[placeholder] = match;
        return placeholder;
      });
    }
  }

  const total = apiKeyCount + emailCount + ipCount + phoneCount + idCardCount + customCount;

  return {
    redactedText: currentText,
    mappings,
    stats: {
      apiKeys: apiKeyCount,
      emails: emailCount,
      ipAddresses: ipCount,
      phoneNumbers: phoneCount,
      idCards: idCardCount,
      customKeywords: customCount,
      total,
    },
  };
}

export function restoreText(redactedText: string, mappings: Record<string, string>): string {
  if (!redactedText || !mappings || Object.keys(mappings).length === 0) {
    return redactedText;
  }

  let restored = redactedText;
  for (const [placeholder, original] of Object.entries(mappings)) {
    // Replace all occurrences of this placeholder
    restored = restored.split(placeholder).join(original);
  }

  return restored;
}
