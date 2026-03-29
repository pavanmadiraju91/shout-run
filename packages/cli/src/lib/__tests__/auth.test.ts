import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

vi.mock('node:fs');
vi.mock('@shout/shared', () => ({}));

const mockKeytar = {
  setPassword: vi.fn(),
  getPassword: vi.fn(),
  deletePassword: vi.fn(),
};

vi.mock('keytar', () => mockKeytar);

const CONFIG_DIR = path.join(os.homedir(), '.shout');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/** Create a fake JWT with a given exp (seconds since epoch). */
function fakeJwt(exp: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: '1', exp })).toString('base64url');
  return `${header}.${payload}.fakesignature`;
}

const FUTURE_EXP = Math.floor(Date.now() / 1000) + 86400; // 24h from now
const PAST_EXP = Math.floor(Date.now() / 1000) - 3600; // 1h ago
const VALID_TOKEN = fakeJwt(FUTURE_EXP);
const EXPIRED_TOKEN = fakeJwt(PAST_EXP);

describe('auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('getToken', () => {
    it('returns null when no config file and no keytar', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      mockKeytar.getPassword.mockRejectedValue(new Error('keytar unavailable'));

      const { getToken } = await import('../auth.js');
      const result = await getToken();
      expect(result).toBeNull();
    });

    it('reads from config file when keytar unavailable', async () => {
      const storedConfig = {
        accessToken: VALID_TOKEN,
        username: 'testuser',
        avatarUrl: 'https://example.com/avatar.png',
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(storedConfig));
      mockKeytar.getPassword.mockRejectedValue(new Error('keytar unavailable'));

      const { getToken } = await import('../auth.js');
      const result = await getToken();

      expect(result).toEqual({
        accessToken: VALID_TOKEN,
        username: 'testuser',
        avatarUrl: 'https://example.com/avatar.png',
      });
    });

    it('returns null for malformed JSON config', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('{ invalid json }');
      mockKeytar.getPassword.mockRejectedValue(new Error('keytar unavailable'));

      const { getToken } = await import('../auth.js');
      const result = await getToken();
      expect(result).toBeNull();
    });

    it('merges keytar token with config metadata', async () => {
      const configMetadata = {
        username: 'testuser',
        avatarUrl: 'https://example.com/avatar.png',
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(configMetadata));
      mockKeytar.getPassword.mockResolvedValue(VALID_TOKEN);

      const { getToken } = await import('../auth.js');
      const result = await getToken();

      expect(result).toEqual({
        accessToken: VALID_TOKEN,
        username: 'testuser',
        avatarUrl: 'https://example.com/avatar.png',
      });
    });
  });

  describe('saveToken', () => {
    it('writes to config file when keytar unavailable', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      mockKeytar.setPassword.mockRejectedValue(new Error('keytar unavailable'));

      const { saveToken } = await import('../auth.js');
      await saveToken({
        accessToken: VALID_TOKEN,
        username: 'testuser',
        avatarUrl: 'https://example.com/avatar.png',
      });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        CONFIG_FILE,
        expect.stringContaining('"accessToken"'),
        expect.objectContaining({ mode: 0o600 })
      );
    });

    it('calls setPassword when keytar is available', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      mockKeytar.setPassword.mockResolvedValue(undefined);

      const { saveToken } = await import('../auth.js');
      await saveToken({
        accessToken: VALID_TOKEN,
        username: 'testuser',
        avatarUrl: 'https://example.com/avatar.png',
      });

      expect(mockKeytar.setPassword).toHaveBeenCalledWith(
        'shout-cli',
        'default',
        VALID_TOKEN
      );
    });
  });

  describe('removeToken', () => {
    it('deletes keychain entry and config file', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      mockKeytar.deletePassword.mockResolvedValue(true);

      const { removeToken } = await import('../auth.js');
      await removeToken();

      expect(mockKeytar.deletePassword).toHaveBeenCalledWith('shout-cli', 'default');
      expect(fs.unlinkSync).toHaveBeenCalledWith(CONFIG_FILE);
    });
  });

  describe('isLoggedIn', () => {
    it('returns false when no token', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      mockKeytar.getPassword.mockRejectedValue(new Error('keytar unavailable'));

      const { isLoggedIn } = await import('../auth.js');
      const result = await isLoggedIn();
      expect(result).toBe(false);
    });

    it('returns true when token exists and is not expired', async () => {
      const storedConfig = {
        accessToken: VALID_TOKEN,
        username: 'testuser',
        avatarUrl: 'https://example.com/avatar.png',
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(storedConfig));
      mockKeytar.getPassword.mockRejectedValue(new Error('keytar unavailable'));

      const { isLoggedIn } = await import('../auth.js');
      const result = await isLoggedIn();
      expect(result).toBe(true);
    });

    it('returns false when token exists but is expired', async () => {
      const storedConfig = {
        accessToken: EXPIRED_TOKEN,
        username: 'testuser',
        avatarUrl: 'https://example.com/avatar.png',
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(storedConfig));
      mockKeytar.getPassword.mockRejectedValue(new Error('keytar unavailable'));

      const { isLoggedIn } = await import('../auth.js');
      const result = await isLoggedIn();
      expect(result).toBe(false);
    });
  });
});
