import { describe, it, expect } from 'vitest';
import {
  validarNombreUsuario,
  validarCorreo,
  evaluarRequisitosClave,
  validarClave,
  REGEX_USUARIO,
  REGEX_EMAIL,
} from '../../js/validadores.js';

describe('módulo validadores.js', () => {
  describe('expresiones regulares exportadas', () => {
    it('REGEX_USUARIO y REGEX_EMAIL son instancias válidas de RegExp', () => {
      expect(REGEX_USUARIO).toBeInstanceOf(RegExp);
      expect(REGEX_EMAIL).toBeInstanceOf(RegExp);
    });
  });

  describe('validarNombreUsuario — tabla it.each con límites y motivos', () => {
    it.each([
      ['caso válido estándar', 'pablo_dev', true, 'alfanumérico estándar con guion bajo'],
      [
        'límite inferior válido (3 caracteres)',
        'abc',
        true,
        'longitud mínima exacta permitida (3)',
      ],
      [
        'límite superior válido (15 caracteres)',
        '123456789012345',
        true,
        'longitud máxima exacta permitida (15)',
      ],
      ['caso válido con números y letras', 'gamer2026', true, 'combinación alfanumérica habitual'],
      ['caso válido con guion medio', 'retro-player', true, 'guion medio permitido'],
      ['caso válido con guion bajo', 'master_chief', true, 'guion bajo permitido'],
      [
        'inválido por longitud inferior (2 caracteres)',
        'ab',
        false,
        'menos de 3 caracteres (límite inferior no alcanzado)',
      ],
      [
        'inválido por longitud excesiva (16 caracteres)',
        '1234567890123456',
        false,
        'más de 15 caracteres (límite superior superado)',
      ],
      ['inválido por cadena vacía', '', false, 'cadena de texto vacía'],
      ['inválido por solo espacios', '   ', false, 'espacios en blanco no permitidos'],
      [
        'inválido por espacios interiores',
        'usuario pro',
        false,
        'espacios intermedios no permitidos',
      ],
      ['inválido por símbolo arroba', 'user@domain', false, 'carácter especial @ no admitido'],
      ['inválido por símbolo punto', 'user.name', false, 'carácter especial punto no admitido'],
      ['inválido por símbolos de exclamación', 'gamer!', false, 'carácter especial ! no admitido'],
      ['inválido por tipo null', null, false, 'tipo de dato no string (null)'],
      ['inválido por tipo undefined', undefined, false, 'tipo de dato no string (undefined)'],
      ['inválido por tipo numérico', 12345, false, 'tipo de dato no string (number)'],
      ['inválido por tipo objeto', {}, false, 'tipo de dato no string (object)'],
    ])('%s: "%s" -> %s (Motivo: %s)', (_caso, input, esperado) => {
      expect(validarNombreUsuario(input)).toBe(esperado);
    });
  });

  describe('validarCorreo — tabla it.each con límites y motivos', () => {
    it.each([
      [
        'correo estándar válido',
        'test@example.com',
        true,
        'estructura correcta usuario@dominio.tld',
      ],
      [
        'correo con subdominio',
        'pablo.dev@gamevault.org',
        true,
        'punto en usuario y dominio con extensión',
      ],
      [
        'correo con etiqueta plus',
        'user+tag@domain.co.uk',
        true,
        'etiqueta + permitida y TLD compuesto',
      ],
      [
        'correo corporativo',
        'soporte@nintendo.co.jp',
        true,
        'dominio internacional con dos niveles',
      ],
      [
        'inválido sin arroba',
        'correo_sin_arroba.com',
        false,
        'ausencia del separador obligatorio @',
      ],
      ['inválido sin usuario local', '@dominio.com', false, 'falta la parte local antes de la @'],
      ['inválido sin dominio tras arroba', 'usuario@', false, 'falta el dominio posterior a la @'],
      [
        'inválido sin extensión TLD',
        'usuario@dominio',
        false,
        'falta la extensión de dominio con punto',
      ],
      [
        'inválido con espacios intermedios',
        'usuario @dominio.com',
        false,
        'contiene espacios en blanco',
      ],
      ['inválido por cadena vacía', '', false, 'cadena vacía'],
      ['inválido por tipo null', null, false, 'tipo de dato no string (null)'],
      ['inválido por tipo undefined', undefined, false, 'tipo de dato no string (undefined)'],
      ['inválido por tipo numérico', 99999, false, 'tipo de dato no string (number)'],
    ])('%s: "%s" -> %s (Motivo: %s)', (_caso, input, esperado) => {
      expect(validarCorreo(input)).toBe(esperado);
    });
  });

  describe('validarClave — tabla it.each con límites y un caso no válido por regla', () => {
    it.each([
      [
        'límite inferior válido exacto (8 caracteres)',
        'Pass1234',
        true,
        'exactamente 8 caracteres con mayúscula, minúscula y número',
      ],
      [
        'clave larga válida con símbolos',
        'PasswordSuperSegura2026!',
        true,
        'longitud amplia cumpliendo todos los requisitos',
      ],
      [
        'clave válida con carácter Unicode eñe',
        'Contraseña9',
        true,
        'letra ñ minúscula reconocida por \\p{Ll} y mayúscula por \\p{Lu}',
      ],
      [
        'clave válida con tildes Unicode',
        'CódígoSegur0',
        true,
        'vocales con tilde reconocidas por \\p{Ll} y número',
      ],
      [
        'inválida por regla 1: longitud insuficiente (7 caracteres)',
        'Pass123',
        false,
        'falla longitud (7 caracteres frente al mínimo de 8)',
      ],
      [
        'inválida por regla 2: ausencia de minúsculas',
        'PASSWORD123',
        false,
        'falla minúscula (todas son mayúsculas y dígitos)',
      ],
      [
        'inválida por regla 3: ausencia de mayúsculas',
        'password123',
        false,
        'falla mayúscula (todas son minúsculas y dígitos)',
      ],
      [
        'inválida por regla 4: ausencia de dígitos',
        'PasswordSeguro',
        false,
        'falla dígito (solo contiene letras)',
      ],
      ['inválida por cadena vacía', '', false, 'cadena de texto vacía'],
      ['inválida por tipo null', null, false, 'tipo de dato no string (null)'],
      ['inválida por tipo undefined', undefined, false, 'tipo de dato no string (undefined)'],
      ['inválida por tipo numérico', 12345678, false, 'tipo de dato no string (number)'],
    ])('%s: "%s" -> %s (Motivo: %s)', (_caso, input, esperado) => {
      expect(validarClave(input)).toBe(esperado);
    });
  });

  describe('evaluarRequisitosClave — desglose detallado de requisitos reactivos', () => {
    it.each([
      [
        'solo minúsculas y longitud suficiente',
        'abcdefgh',
        { longitud: true, minuscula: true, mayuscula: false, digito: false, valida: false },
        'cumple longitud y minúscula pero faltan mayúscula y dígito',
      ],
      [
        'mayúscula y minúscula sin dígito',
        'Abcdefgh',
        { longitud: true, minuscula: true, mayuscula: true, digito: false, valida: false },
        'cumple longitud, minúscula y mayúscula pero falta dígito',
      ],
      [
        'minúscula y dígito sin mayúscula',
        'abcdefg1',
        { longitud: true, minuscula: true, mayuscula: false, digito: true, valida: false },
        'cumple longitud, minúscula y dígito pero falta mayúscula',
      ],
      [
        'mayúscula y dígito sin minúscula',
        'ABCDEFG1',
        { longitud: true, minuscula: false, mayuscula: true, digito: true, valida: false },
        'cumple longitud, mayúscula y dígito pero falta minúscula',
      ],
      [
        'todos los requisitos pero longitud insuficiente (6 chars)',
        'Abc12',
        { longitud: false, minuscula: true, mayuscula: true, digito: true, valida: false },
        'falla únicamente la longitud mínima de 8 caracteres',
      ],
      [
        'clave completa válida estándar',
        'Password123',
        { longitud: true, minuscula: true, mayuscula: true, digito: true, valida: true },
        'cumple las cuatro condiciones simultáneamente',
      ],
      [
        'clave completa válida con Unicode (eñe y tilde)',
        'ÁñoGamer2026',
        { longitud: true, minuscula: true, mayuscula: true, digito: true, valida: true },
        'soporta clases Unicode \\p{Lu} y \\p{Ll} en caracteres no ASCII',
      ],
      [
        'argumento null',
        null,
        { longitud: false, minuscula: false, mayuscula: false, digito: false, valida: false },
        'valor no string no cumple ningún requisito de forma segura',
      ],
    ])('%s: "%s" -> valida: %s (%s)', (_caso, input, esperado) => {
      const res = evaluarRequisitosClave(input);
      expect(res.longitud).toBe(esperado.longitud);
      expect(res.minuscula).toBe(esperado.minuscula);
      expect(res.mayuscula).toBe(esperado.mayuscula);
      expect(res.digito).toBe(esperado.digito);
      expect(res.valida).toBe(esperado.valida);
    });
  });
});
