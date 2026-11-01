import { describe, expect, it } from 'vitest';
import { redactText, restoreText } from './prompt-redactor.service';

describe('prompt-redactor service', () => {
  it('should redact API keys and restore them', () => {
    const text = 'Here is my key: sk-ant-api03-abcdef1234567890abcdef123456 and AWS AKIAIOSFODNN7EXAMPLE.';
    const result = redactText(text);

    expect(result.redactedText).toContain('{{REDACTED_API_KEY_');
    expect(result.redactedText).not.toContain('sk-ant-api03-abcdef1234567890abcdef123456');
    expect(result.redactedText).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(result.stats.apiKeys).toBe(2);

    const restored = restoreText(result.redactedText, result.mappings);
    expect(restored).toBe(text);
  });

  it('should redact emails, IP addresses and phone numbers', () => {
    const text = 'Contact alice@example.com on 13812345678 or visit server 192.168.1.100.';
    const result = redactText(text);

    expect(result.redactedText).toContain('{{REDACTED_EMAIL_1}}');
    expect(result.redactedText).toContain('{{REDACTED_PHONE_1}}');
    expect(result.redactedText).toContain('{{REDACTED_IP_1}}');
    expect(result.stats.emails).toBe(1);
    expect(result.stats.phoneNumbers).toBe(1);
    expect(result.stats.ipAddresses).toBe(1);

    const restored = restoreText(result.redactedText, result.mappings);
    expect(restored).toBe(text);
  });

  it('should support custom keywords', () => {
    const text = 'Our internal project ProjectTitan is hosted on SecretServer.';
    const result = redactText(text, { customKeywords: ['ProjectTitan', 'SecretServer'] });

    expect(result.redactedText).toContain('{{REDACTED_KEYWORD_1}}');
    expect(result.redactedText).toContain('{{REDACTED_KEYWORD_2}}');
    expect(result.stats.customKeywords).toBe(2);

    const restored = restoreText(result.redactedText, result.mappings);
    expect(restored).toBe(text);
  });
});
