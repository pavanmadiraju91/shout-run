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
        accessToken: 'test-token',
        username: 'testuser',
        avatarUrl: 'https://example.com/avatar.png',
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(storedConfig));
      mockKeytar.getPassword.mockRejectedValue(new Error('keytar unavailable'));

      const { getToken } = await import('../auth.js');
      const result = await getToken();

      expect(result).toEqual({
        accessToken: 'test-token',
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
      mockKeytar.getPassword.mockResolvedValue('keytar-token');

      const { getToken } = await import('../auth.js');
      const result = await getToken();

      expect(result).toEqual({
        accessToken: 'keytar-token',
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
        accessToken: 'test-token',
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
        accessToken: 'test-token',
        username: 'testuser',
        avatarUrl: 'https://example.com/avatar.png',
      });

      expect(mockKeytar.setPassword).toHaveBeenCalledWith(
        'shout-cli',
        'default',
        'test-token'
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

    it('returns true when token exists', async () => {
      const storedConfig = {
        accessToken: 'test-token',
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
  });
});
