import { describe, it, expect } from 'vitest';
import { resumirClave } from '../../js/clave.js';

describe('módulo clave.js (SHA-256)', () => {
  describe('resumirClave — hashing determinista con Web Crypto API', () => {
    it.each([
      [
        'cadena estándar "abc"',
        'abc',
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
        'resumen SHA-256 canónico NIST para "abc"',
      ],
      [
        'cadena vacía',
        '',
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        'resumen SHA-256 canónico para entrada vacía (0 bytes)',
      ],
      [
        'contraseña de ejemplo "Password123"',
        'Password123',
        '008c70392e3abfbd0fa47bbc2ed96aa99bd49e159727fcba0f2e6abeb3a9d601',
        'genera hash hexadecimal de 64 caracteres exactos',
      ],
    ])('%s: resumirClave("%s") -> %s (%s)', async (_caso, clave, esperado) => {
      const hash = await resumirClave(clave);
      expect(hash).toBe(esperado);
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('la misma contraseña genera siempre exactamente el mismo hash', async () => {
      const hash1 = await resumirClave('GameVault2026');
      const hash2 = await resumirClave('GameVault2026');
      expect(hash1).toBe(hash2);
    });

    it('contraseñas distintas o variaciones en mayúsculas generan hashes completamente diferentes', async () => {
      const hashMin = await resumirClave('mypassword');
      const hashMay = await resumirClave('MyPassword');
      expect(hashMin).not.toBe(hashMay);
    });

    it('resumirClave de "null" coincide con el hash SHA-256 de la cadena "null"', async () => {
      const hashNull = await resumirClave('null');
      expect(hashNull).toBe('74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b');
    });
  });
});
