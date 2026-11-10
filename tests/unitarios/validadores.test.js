import { describe, it, expect } from 'vitest';
import {
  validarNombreUsuario,
  validarCorreo,
  evaluarRequisitosClave,
  validarClave,
} from '../../js/validadores.js';

describe('módulo validadores.js', () => {
  describe('validarNombreUsuario', () => {
    it.each([
      ['pablo', true],
      ['user123', true],
      ['player_one', true],
      ['pro-gamer', true],
      ['abc', true], // límite inferior 3 chars
      ['123456789012345', true], // límite superior 15 chars
      ['', false],
      ['ab', false], // menos de 3
      ['1234567890123456', false], // más de 15
      ['usuario con espacios', false],
      ['user@domain', false],
      ['user.name', false],
      [null, false],
      [undefined, false],
    ])('validarNombreUsuario("%s") -> %s', (input, expected) => {
      expect(validarNombreUsuario(input)).toBe(expected);
    });
  });

  describe('validarCorreo', () => {
    it.each([
      ['test@example.com', true],
      ['pablo.dev@gamevault.org', true],
      ['user+tag@domain.co.uk', true],
      ['sin_arroba', false],
      ['@sin-usuario.com', false],
      ['user@sin-dominio', false],
      ['', false],
      [null, false],
    ])('validarCorreo("%s") -> %s', (input, expected) => {
      expect(validarCorreo(input)).toBe(expected);
    });
  });

  describe('evaluarRequisitosClave y Unicode (\\p{Ll}, \\p{Lu})', () => {
    it('detecta cada requisito individualmente', () => {
      // Solo minúsculas
      const res1 = evaluarRequisitosClave('abcdefgh');
      expect(res1.longitud).toBe(true);
      expect(res1.minuscula).toBe(true);
      expect(res1.mayuscula).toBe(false);
      expect(res1.digito).toBe(false);
      expect(res1.valida).toBe(false);

      // Con mayúscula pero sin dígito
      const res2 = evaluarRequisitosClave('Abcdefgh');
      expect(res2.mayuscula).toBe(true);
      expect(res2.digito).toBe(false);
      expect(res2.valida).toBe(false);

      // Clave completa válida
      const res3 = evaluarRequisitosClave('Password123');
      expect(res3.longitud).toBe(true);
      expect(res3.minuscula).toBe(true);
      expect(res3.mayuscula).toBe(true);
      expect(res3.digito).toBe(true);
      expect(res3.valida).toBe(true);
      expect(validarClave('Password123')).toBe(true);
    });

    it('soporta caracteres Unicode (letras con tilde o eñe)', () => {
      const resUnicode = evaluarRequisitosClave('Contraseña9');
      expect(resUnicode.minuscula).toBe(true);
      expect(resUnicode.mayuscula).toBe(true);
      expect(resUnicode.valida).toBe(true);
    });

    it('rechaza claves de menos de 8 caracteres aunque cumplan el resto', () => {
      const corta = evaluarRequisitosClave('Pass1');
      expect(corta.longitud).toBe(false);
      expect(corta.valida).toBe(false);
    });
  });
});
