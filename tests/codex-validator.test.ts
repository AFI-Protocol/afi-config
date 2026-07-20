import { describe, it, expect, vi, afterEach } from 'vitest';
import { validateCodex } from '../cli_utils/codex_validator';

describe('validateCodex', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs the file it is validating', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    validateCodex('.afi-codex.json');

    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('Validating .afi-codex.json...');
  });

  it('does not throw for an arbitrary file path', () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    expect(() => validateCodex('personas/example.json')).not.toThrow();
  });
});
