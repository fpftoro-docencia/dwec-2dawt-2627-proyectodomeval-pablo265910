import { describe, it, expect } from 'vitest';
import {
  validarNombreUsuario,
  validarCorreo,
  evaluarRequisitosClave,
  validarClave,
  validarSKU,
  validarEAN13,
  validarEstanteria,
  validarTitulo,
  validarPlataforma,
  validarFormato,
  validarFechaAdquisicion,
  validarHorasJugadas,
  validarEstadoProgreso,
  validarTiendaDigital,
  validarDlc,
  validarDlcs,
  VALIDADORES,
  MENSAJES_ERROR,
  REGEX_USUARIO,
  REGEX_EMAIL,
  REGEX_SKU,
  REGEX_EAN13,
  REGEX_ESTANTERIA,
  PLATAFORMAS_VALIDAS,
  FORMATOS_VALIDOS,
  ESTADOS_PROGRESO_VALIDOS,
  TIENDAS_DIGITALES_VALIDAS,
  ESTADOS_DLC_VALIDOS,
} from '../../js/validadores.js';

describe('módulo validadores.js', () => {
  describe('expresiones regulares y constantes exportadas', () => {
    it('las expresiones regulares son instancias válidas de RegExp', () => {
      expect(REGEX_USUARIO).toBeInstanceOf(RegExp);
      expect(REGEX_EMAIL).toBeInstanceOf(RegExp);
      expect(REGEX_SKU).toBeInstanceOf(RegExp);
      expect(REGEX_EAN13).toBeInstanceOf(RegExp);
      expect(REGEX_ESTANTERIA).toBeInstanceOf(RegExp);
    });

    it('las listas de constantes son arrays no vacíos', () => {
      expect(Array.isArray(PLATAFORMAS_VALIDAS)).toBe(true);
      expect(PLATAFORMAS_VALIDAS.length).toBeGreaterThanOrEqual(5);

      expect(Array.isArray(FORMATOS_VALIDOS)).toBe(true);
      expect(FORMATOS_VALIDOS).toContain('fisico');
      expect(FORMATOS_VALIDOS).toContain('digital');

      expect(Array.isArray(ESTADOS_PROGRESO_VALIDOS)).toBe(true);
      expect(ESTADOS_PROGRESO_VALIDOS).toContain('pendiente');
      expect(ESTADOS_PROGRESO_VALIDOS).toContain('completado');

      expect(Array.isArray(TIENDAS_DIGITALES_VALIDAS)).toBe(true);
      expect(TIENDAS_DIGITALES_VALIDAS).toContain('Steam');

      expect(Array.isArray(ESTADOS_DLC_VALIDOS)).toBe(true);
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

  describe('validarSKU — código de inventario (GAME-XXX-0000)', () => {
    it.each([
      [
        'código válido estándar RPG',
        'GAME-RPG-0042',
        true,
        'formato correcto con género de 3 letras y 4 dígitos',
      ],
      [
        'código válido género acción',
        'GAME-ACT-0001',
        true,
        'género ACT y primeros números correlativos',
      ],
      [
        'código válido género aventura',
        'GAME-ADV-9999',
        true,
        'límite superior numérico de 4 dígitos',
      ],
      [
        'código válido con espacios externos',
        '  GAME-FPS-1234  ',
        true,
        'trim() elimina espacios de extremos',
      ],
      [
        'inválido por minúsculas en prefijo',
        'game-RPG-0042',
        false,
        'el prefijo GAME debe estar en mayúsculas',
      ],
      [
        'inválido por minúsculas en género',
        'GAME-rpg-0042',
        false,
        'el género de 3 letras debe estar en mayúsculas',
      ],
      [
        'inválido por género de 2 letras',
        'GAME-RP-0042',
        false,
        'deben ser exactamente 3 letras de género',
      ],
      ['inválido por género de 4 letras', 'GAME-RPGA-0042', false, 'supera las 3 letras de género'],
      ['inválido por 3 dígitos', 'GAME-RPG-042', false, 'deben ser exactamente 4 dígitos'],
      ['inválido por 5 dígitos', 'GAME-RPG-00042', false, 'más de 4 dígitos correlativos'],
      [
        'inválido por prefijo incorrecto',
        'PLAY-RPG-0042',
        false,
        'prefijo debe ser estrictamente GAME',
      ],
      [
        'inválido por separador incorrecto guion bajo',
        'GAME_RPG_0042',
        false,
        'debe usar guiones medios',
      ],
      [
        'inválido por espacio interno',
        'GAME- RPG-0042',
        false,
        'espacio no permitido dentro del código',
      ],
      ['inválido por cadena vacía', '', false, 'cadena vacía'],
      ['inválido por tipo null', null, false, 'tipo null'],
      ['inválido por tipo undefined', undefined, false, 'tipo undefined'],
      ['inválido por tipo numérico', 123456, false, 'tipo number'],
    ])('%s: "%s" -> %s (Motivo: %s)', (_caso, input, esperado) => {
      expect(validarSKU(input)).toBe(esperado);
    });
  });

  describe('validarEAN13 — código de barras y algoritmo ponderado módulo 10', () => {
    it.each([
      [
        'código EAN-13 válido oficial (placeholder de ficha)',
        '4020628663124',
        true,
        '13 dígitos numéricos y dígito de control 4 verificado por algoritmo',
      ],
      [
        'código EAN-13 válido (ISBN Penguin)',
        '9780141036144',
        true,
        'código internacional real con dígito de control 4',
      ],
      [
        'código EAN-13 válido (ISBN editorial)',
        '9780306406157',
        true,
        'código real con dígito de control 7',
      ],
      [
        'código EAN-13 válido con dígito de control 0',
        '8412348000000',
        true,
        'suma módulo 10 da 0, por lo que el dígito de control calculado es (10-0)%10 = 0',
      ],
      [
        'código EAN-13 válido con todos ceros',
        '0000000000000',
        true,
        'suma 0 produce dígito de control 0',
      ],
      [
        'código EAN-13 válido con espacios externos',
        '  4020628663124  ',
        true,
        'trim() limpia los espacios exteriores',
      ],
      [
        'inválido por dígito de control erróneo (desviación de 1)',
        '4020628663125',
        false,
        'el dígito de control real es 4, pero se introduce 5',
      ],
      [
        'inválido por dígito de control erróneo para ceros',
        '0000000000001',
        false,
        'dígito de control 1 no concuerda con suma ponderada',
      ],
      [
        'inválido por longitud inferior (12 dígitos, UPC-A)',
        '402062866312',
        false,
        'faltan dígitos para completar los 13 de EAN-13',
      ],
      [
        'inválido por longitud superior (14 dígitos)',
        '40206286631240',
        false,
        'supera los 13 dígitos de longitud',
      ],
      [
        'inválido por contener letras',
        '402062866312A',
        false,
        'contiene carácter alfabético no numérico',
      ],
      [
        'inválido por incluir guiones separadores',
        '402-0628663124',
        false,
        'el EAN-13 estándar almacena solo dígitos numéricos',
      ],
      ['inválido por cadena vacía', '', false, 'cadena de texto vacía'],
      ['inválido por tipo null', null, false, 'tipo null'],
      ['inválido por tipo undefined', undefined, false, 'tipo undefined'],
      ['inválido por tipo numérico', 4020628663124, false, 'tipo number no admitido'],
    ])('%s: "%s" -> %s (Motivo: %s)', (_caso, input, esperado) => {
      expect(validarEAN13(input)).toBe(esperado);
    });
  });

  describe('validarEstanteria — formato de balda física (EST-X-00)', () => {
    it.each([
      ['ubicación válida estándar', 'EST-A-03', true, 'estantería A balda 03'],
      ['ubicación válida balda límite superior', 'EST-Z-99', true, 'estantería Z balda 99'],
      ['ubicación válida balda 00', 'EST-B-00', true, 'balda inferior 00'],
      [
        'ubicación válida con espacios externos',
        '  EST-C-15  ',
        true,
        'trim() limpia espacios externos',
      ],
      [
        'inválido por minúsculas en prefijo',
        'est-A-03',
        false,
        'el prefijo EST debe ser en mayúsculas',
      ],
      [
        'inválido por minúscula en letra de estantería',
        'EST-a-03',
        false,
        'la letra de estantería debe ser mayúscula',
      ],
      [
        'inválido por dos letras de estantería',
        'EST-AA-03',
        false,
        'debe ser exactamente una letra',
      ],
      ['inválido por dígito en lugar de letra', 'EST-1-03', false, 'se requiere una letra [A-Z]'],
      [
        'inválido por 1 solo dígito de balda',
        'EST-A-3',
        false,
        'la balda debe tener 2 dígitos (ej. 03)',
      ],
      [
        'inválido por 3 dígitos de balda',
        'EST-A-003',
        false,
        'la balda no puede tener más de 2 dígitos',
      ],
      ['inválido por prefijo erróneo', 'BAL-A-03', false, 'prefijo debe ser estrictamente EST'],
      ['inválido por guion bajo', 'EST_A_03', false, 'separador debe ser guion medio'],
      ['inválido por cadena vacía', '', false, 'cadena vacía'],
      ['inválido por tipo null', null, false, 'tipo null'],
      ['inválido por tipo undefined', undefined, false, 'tipo undefined'],
      ['inválido por tipo numérico', 123, false, 'tipo number'],
    ])('%s: "%s" -> %s (Motivo: %s)', (_caso, input, esperado) => {
      expect(validarEstanteria(input)).toBe(esperado);
    });
  });

  describe('validarTitulo — título de videojuego (2 a 100 caracteres)', () => {
    it.each([
      ['título válido estándar', 'Elden Ring', true, 'título habitual de longitud media'],
      ['límite inferior válido (2 caracteres)', 'Go', true, 'exactamente 2 caracteres mínimos'],
      [
        'límite superior válido (100 caracteres)',
        'A'.repeat(100),
        true,
        'exactamente 100 caracteres máximos',
      ],
      [
        'título válido con caracteres especiales',
        'The Witcher 3: Wild Hunt - Game of the Year Edition',
        true,
        'caracteres comunes en títulos',
      ],
      [
        'título válido con espacios que se recortan',
        '  Super Mario Odyssey  ',
        true,
        'trim() no afecta a longitud válida',
      ],
      ['inválido por 1 carácter (inferior al mínimo)', 'A', false, 'menos de 2 caracteres'],
      [
        'inválido por 101 caracteres (superior al máximo)',
        'A'.repeat(101),
        false,
        'más de 100 caracteres',
      ],
      ['inválido por cadena vacía', '', false, 'cadena vacía'],
      ['inválido por solo espacios en blanco', '     ', false, 'trim() reduce a longitud 0'],
      ['inválido por tipo null', null, false, 'tipo null'],
      ['inválido por tipo undefined', undefined, false, 'tipo undefined'],
      ['inválido por tipo number', 12345, false, 'tipo number'],
    ])('%s: "%s" -> %s (Motivo: %s)', (_caso, input, esperado) => {
      expect(validarTitulo(input)).toBe(esperado);
    });
  });

  describe('validarPlataforma — catálogo de plataformas oficiales', () => {
    it.each([
      ['PC', 'PC', true, 'plataforma oficial'],
      ['PlayStation 5', 'PlayStation 5', true, 'plataforma oficial'],
      ['Xbox Series X', 'Xbox Series X', true, 'plataforma oficial'],
      ['Nintendo Switch', 'Nintendo Switch', true, 'plataforma oficial'],
      ['Retro', 'Retro', true, 'plataforma oficial'],
      ['con espacios a recortar', '  PC  ', true, 'trim() gestiona espacios'],
      ['plataforma no admitida Atari', 'Atari 2600', false, 'no pertenece al catálogo admitido'],
      ['plataforma no admitida PS4', 'PlayStation 4', false, 'no incluida en las 5 oficiales'],
      ['cadena vacía', '', false, 'cadena vacía'],
      ['tipo null', null, false, 'tipo null'],
      ['tipo undefined', undefined, false, 'tipo undefined'],
    ])('%s: "%s" -> %s (Motivo: %s)', (_caso, input, esperado) => {
      expect(validarPlataforma(input)).toBe(esperado);
    });
  });

  describe('validarFormato — edición física o digital', () => {
    it.each([
      ['físico minúsculas', 'fisico', true, 'formato admitido'],
      ['digital minúsculas', 'digital', true, 'formato admitido'],
      ['Físico con mayúscula inicial', 'Fisico', true, 'insensible a mayúsculas'],
      ['Digital con mayúscula inicial', 'Digital', true, 'insensible a mayúsculas'],
      ['con espacios externos', '  fisico  ', true, 'trim() limpia espacios'],
      ['formato no admitido en nube', 'cloud', false, 'solo físico o digital'],
      ['formato híbrido no admitido', 'hibrido', false, 'solo físico o digital'],
      ['cadena vacía', '', false, 'cadena vacía'],
      ['tipo null', null, false, 'tipo null'],
      ['tipo undefined', undefined, false, 'tipo undefined'],
    ])('%s: "%s" -> %s (Motivo: %s)', (_caso, input, esperado) => {
      expect(validarFormato(input)).toBe(esperado);
    });
  });

  describe('validarFechaAdquisicion — fecha válida de calendario no futura', () => {
    const fechaReferencia = new Date(2026, 10, 12); // 12 de noviembre de 2026

    it.each([
      ['fecha pasada válida estándar', '2024-06-21', true, 'fecha anterior a la de hoy'],
      ['fecha igual al día de hoy', '2026-11-12', true, 'la fecha de hoy es admitida'],
      ['instancia Date válida pasada', new Date(2023, 0, 1), true, 'soporta objeto Date'],
      ['inválida por fecha futura', '2026-11-13', false, 'posterior a la fecha de referencia'],
      ['inválida por fecha lejana futura', '2099-12-31', false, 'año futuro no admitido'],
      [
        'inválida por día inexistente (30 febrero)',
        '2024-02-30',
        false,
        'no existe el 30 de febrero',
      ],
      ['inválida por mes inexistente 13', '2024-13-01', false, 'mes fuera de rango [1-12]'],
      ['inválida por día inexistente 32', '2024-01-32', false, 'día fuera de rango [1-31]'],
      ['inválida por formato barra', '21/06/2024', false, 'requiere formato ISO YYYY-MM-DD'],
      ['inválida por formato sin guiones', '20240621', false, 'requiere guiones separadores'],
      ['inválida por texto arbitrario', 'ayer', false, 'no es una fecha'],
      ['inválida por número', 12345, false, 'tipo number no admitido'],
      ['inválida por cadena vacía', '', false, 'cadena vacía'],
      ['inválida por tipo null', null, false, 'tipo null'],
      ['inválida por tipo undefined', undefined, false, 'tipo undefined'],
      ['inválida por objeto Date no válido', new Date('fecha_invalida'), false, 'Date NaN'],
    ])('%s: "%s" -> %s (Motivo: %s)', (_caso, input, esperado) => {
      expect(validarFechaAdquisicion(input, fechaReferencia)).toBe(esperado);
    });

    it('rechaza si el parámetro hoy es una fecha inválida', () => {
      expect(validarFechaAdquisicion('2024-01-01', new Date('invalido'))).toBe(false);
    });

    it('funciona por defecto usando new Date() si no se pasa segundo parámetro', () => {
      expect(validarFechaAdquisicion('2020-01-01')).toBe(true);
      expect(validarFechaAdquisicion('2099-01-01')).toBe(false);
    });

    it('soporta parámetro hoy como cadena de fecha', () => {
      expect(validarFechaAdquisicion('2024-01-01', '2026-11-12')).toBe(true);
    });
  });

  describe('validarHorasJugadas — horas como entero no negativo', () => {
    it.each([
      ['cero numérico', 0, true, '0 horas es válido (juego nuevo o pendiente)'],
      ['cero en cadena de texto', '0', true, 'admite representación textual de cero'],
      ['entero positivo', 120, true, 'número de horas habitual'],
      ['entero positivo en texto', '350', true, 'cadena de dígitos parseable'],
      ['cifra elevada', 9999, true, 'admite acumulaciones altas de tiempo'],
      ['inválido por número negativo', -1, false, 'no se admiten horas negativas'],
      ['inválido por texto negativo', '-5', false, 'cadena con signo negativo'],
      ['inválido por número decimal float', 12.5, false, 'debe ser número entero'],
      ['inválido por texto decimal', '3.5', false, 'cadena con punto decimal'],
      ['inválido por texto alfabético', 'muchas', false, 'caracteres no numéricos'],
      ['inválido por sufijo de unidades', '10h', false, 'contiene letra h'],
      ['inválido por cadena vacía', '', false, 'cadena vacía'],
      ['inválido por tipo null', null, false, 'tipo null'],
      ['inválido por tipo undefined', undefined, false, 'tipo undefined'],
      ['inválido por objeto', {}, false, 'tipo object'],
    ])('%s: "%s" -> %s (Motivo: %s)', (_caso, input, esperado) => {
      expect(validarHorasJugadas(input)).toBe(esperado);
    });
  });

  describe('validarEstadoProgreso — estados de juego oficiales', () => {
    it.each([
      ['pendiente', 'pendiente', true, 'estado oficial'],
      ['jugando', 'jugando', true, 'estado oficial'],
      ['completado', 'completado', true, 'estado oficial'],
      ['abandonado', 'abandonado', true, 'estado oficial'],
      ['Pendiente con mayúscula', 'Pendiente', true, 'insensible a mayúsculas'],
      ['JUGANDO en mayúsculas', 'JUGANDO', true, 'insensible a mayúsculas'],
      ['con espacios externos', '  completado  ', true, 'trim() elimina espacios'],
      ['estado no admitido pausado', 'pausado', false, 'no pertenece a los 4 admitidos'],
      ['estado no admitido en espera', 'espera', false, 'no pertenece a los 4 admitidos'],
      ['cadena vacía', '', false, 'cadena vacía'],
      ['tipo null', null, false, 'tipo null'],
      ['tipo undefined', undefined, false, 'tipo undefined'],
    ])('%s: "%s" -> %s (Motivo: %s)', (_caso, input, esperado) => {
      expect(validarEstadoProgreso(input)).toBe(esperado);
    });
  });

  describe('validarTiendaDigital — tiendas digitales oficiales', () => {
    it.each([
      ['Steam', 'Steam', true, 'tienda admitida'],
      ['PlayStation Store', 'PlayStation Store', true, 'tienda admitida'],
      ['Nintendo eShop', 'Nintendo eShop', true, 'tienda admitida'],
      ['Epic Games Store', 'Epic Games Store', true, 'tienda admitida'],
      ['Xbox Store', 'Xbox Store', true, 'tienda admitida'],
      ['con espacios a recortar', '  Steam  ', true, 'trim() limpia espacios'],
      ['tienda no admitida GOG', 'GOG', false, 'no pertenece a las 5 admitidas'],
      ['tienda no admitida Itch.io', 'Itch.io', false, 'no pertenece a las 5 admitidas'],
      ['cadena vacía', '', false, 'cadena vacía'],
      ['tipo null', null, false, 'tipo null'],
      ['tipo undefined', undefined, false, 'tipo undefined'],
    ])('%s: "%s" -> %s (Motivo: %s)', (_caso, input, esperado) => {
      expect(validarTiendaDigital(input)).toBe(esperado);
    });
  });

  describe('validarDlc y validarDlcs — validación de grupo dinámico', () => {
    it('valida un DLC individual correcto', () => {
      expect(validarDlc({ titulo: 'Shadow of the Erdtree', estado: 'completado' })).toBe(true);
      expect(validarDlc({ titulo: 'Blood and Wine', estado: 'jugando' })).toBe(true);
      expect(validarDlc({ titulo: 'Hearts of Stone', estado: 'pendiente' })).toBe(true);
    });

    it('rechaza un DLC con datos inválidos o incompletos', () => {
      expect(validarDlc(null)).toBe(false);
      expect(validarDlc({})).toBe(false);
      expect(validarDlc({ titulo: 'A', estado: 'pendiente' })).toBe(false); // título muy corto
      expect(validarDlc({ titulo: 'DLC Valido', estado: 'archivado' })).toBe(false); // estado no admitido
      expect(validarDlc({ titulo: 123, estado: 'pendiente' })).toBe(false);
    });

    it('validarDlcs admite entre 0 y 3 expansiones válidas', () => {
      expect(validarDlcs([])).toBe(true); // 0 DLCs es válido
      expect(validarDlcs([{ titulo: 'DLC 1', estado: 'pendiente' }])).toBe(true);
      expect(
        validarDlcs([
          { titulo: 'DLC 1', estado: 'pendiente' },
          { titulo: 'DLC 2', estado: 'jugando' },
        ]),
      ).toBe(true);
      expect(
        validarDlcs([
          { titulo: 'DLC 1', estado: 'pendiente' },
          { titulo: 'DLC 2', estado: 'jugando' },
          { titulo: 'DLC 3', estado: 'completado' },
        ]),
      ).toBe(true);
    });

    it('validarDlcs rechaza listas superiores al máximo permitido (3)', () => {
      const cuatroDlcs = [
        { titulo: 'DLC 1', estado: 'pendiente' },
        { titulo: 'DLC 2', estado: 'pendiente' },
        { titulo: 'DLC 3', estado: 'pendiente' },
        { titulo: 'DLC 4', estado: 'pendiente' },
      ];
      expect(validarDlcs(cuatroDlcs)).toBe(false);
    });

    it('validarDlcs rechaza si alguno de los DLCs contiene errores o tipos no válidos', () => {
      expect(validarDlcs([{ titulo: '', estado: 'pendiente' }])).toBe(false);
      expect(validarDlcs(null)).toBe(false);
      expect(validarDlcs('no es array')).toBe(false);
    });
  });

  describe('mapa VALIDADORES y MENSAJES_ERROR para formularios', () => {
    it('VALIDADORES contiene todas las funciones de validación asociables a data-validar', () => {
      const camposEsperados = [
        'usuario',
        'correo',
        'clave',
        'titulo',
        'plataforma',
        'formato',
        'fecha',
        'horas',
        'estado',
        'sku',
        'ean13',
        'estanteria',
        'tienda',
      ];

      camposEsperados.forEach((campo) => {
        expect(typeof VALIDADORES[campo]).toBe('function');
      });
    });

    it('MENSAJES_ERROR contiene mensajes informativos para cada campo', () => {
      Object.keys(MENSAJES_ERROR).forEach((clave) => {
        expect(typeof MENSAJES_ERROR[clave]).toBe('string');
        expect(MENSAJES_ERROR[clave].length).toBeGreaterThan(10);
      });
    });
  });
});
