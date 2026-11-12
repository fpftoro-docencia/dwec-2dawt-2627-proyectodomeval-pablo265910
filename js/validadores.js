/**
 * Validadores y expresiones regulares del proyecto GameVault.
 *
 * Funciones puras para validación de datos de usuario y de la entidad Videojuego.
 * Incluye algoritmos con expresiones regulares y reglas de control ponderado (EAN-13).
 *
 * @module validadores
 */

/**
 * Expresión regular para nombres de usuario (3 a 15 caracteres alfanuméricos o guiones).
 */
export const REGEX_USUARIO = /^[a-zA-Z0-9_-]{3,15}$/;

/**
 * Expresión regular para correo electrónico según estándar habitual.
 */
export const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Expresión regular para código de catálogo/inventario SKU (ej. GAME-RPG-0042).
 * Formato: prefijo GAME-, 3 letras mayúsculas de género y 4 dígitos correlativos.
 */
export const REGEX_SKU = /^GAME-[A-Z]{3}-\d{4}$/;

/**
 * Expresión regular para código de barras numérico de 13 dígitos (EAN-13).
 */
export const REGEX_EAN13 = /^\d{13}$/;

/**
 * Expresión regular para ubicación física en estantería (ej. EST-A-03).
 * Formato: prefijo EST-, letra mayúscula de estantería y 2 dígitos de balda.
 */
export const REGEX_ESTANTERIA = /^EST-[A-Z]-\d{2}$/;

/**
 * Plataformas oficiales admitidas en el catálogo de GameVault.
 */
export const PLATAFORMAS_VALIDAS = [
  'PC',
  'PlayStation 5',
  'Xbox Series X',
  'Nintendo Switch',
  'Retro',
];

/**
 * Formatos de edición admitidos para un videojuego.
 */
export const FORMATOS_VALIDOS = ['fisico', 'digital'];

/**
 * Estados de progreso de un videojuego en la biblioteca personal.
 */
export const ESTADOS_PROGRESO_VALIDOS = ['pendiente', 'jugando', 'completado', 'abandonado'];

/**
 * Tiendas digitales admitidas para videojuegos en formato digital.
 */
export const TIENDAS_DIGITALES_VALIDAS = [
  'Steam',
  'PlayStation Store',
  'Nintendo eShop',
  'Epic Games Store',
  'Xbox Store',
];

/**
 * Estados admitidos para contenidos descargables o expansiones (DLCs).
 */
export const ESTADOS_DLC_VALIDOS = ['pendiente', 'jugando', 'completado'];

/**
 * Mensajes de error oficiales de validación para los formularios de la aplicación.
 */
export const MENSAJES_ERROR = {
  usuario: 'El usuario debe tener entre 3 y 15 caracteres alfanuméricos y no estar ocupado.',
  correo: 'Introduce una dirección de correo electrónico válida.',
  clave:
    'La contraseña debe tener al menos 8 caracteres, una minúscula, una mayúscula y un número.',
  repetirClave: 'Las contraseñas no coinciden.',
  terminos: 'Debes aceptar las condiciones de uso para continuar.',
  titulo: 'El título del videojuego es obligatorio (entre 2 y 100 caracteres).',
  plataforma: 'Selecciona una plataforma válida de la lista.',
  formato: 'Debes seleccionar el formato del juego (Físico o Digital).',
  fecha: 'La fecha de adquisición es obligatoria y no puede ser posterior a hoy.',
  horas: 'Las horas jugadas deben ser un número igual o superior a 0.',
  estado: 'Selecciona el estado de progreso actual del juego.',
  sku: 'El código de catálogo debe seguir el formato GAME-XXX-0000 (ej. GAME-RPG-0042).',
  ean13: 'El código de barras debe tener 13 dígitos y un dígito de control EAN-13 válido.',
  estanteria: 'La ubicación debe indicar estantería y balda en formato EST-X-00 (ej. EST-A-03).',
  tienda: 'Selecciona la tienda digital donde adquiriste el juego.',
  dlcs: 'Cada DLC añadido debe incluir un título válido y su estado.',
};

/**
 * Valida un nombre de usuario según el formato alfanumérico.
 *
 * @param {string} valor
 * @returns {boolean}
 * @example
 * validarNombreUsuario('pablo_dev'); // true
 * validarNombreUsuario('a'); // false
 */
export function validarNombreUsuario(valor) {
  if (typeof valor !== 'string') return false;
  return REGEX_USUARIO.test(valor.trim());
}

/**
 * Valida una dirección de correo electrónico.
 *
 * @param {string} valor
 * @returns {boolean}
 * @example
 * validarCorreo('test@example.com'); // true
 * validarCorreo('sin-arroba'); // false
 */
export function validarCorreo(valor) {
  if (typeof valor !== 'string') return false;
  return REGEX_EMAIL.test(valor.trim());
}

/**
 * Comprueba los requisitos individuales de seguridad de una contraseña.
 *
 * Requisitos:
 * - longitud: al menos 8 caracteres
 * - minuscula: al menos una letra minúscula (\p{Ll})
 * - mayuscula: al menos una letra mayúscula (\p{Lu})
 * - digito: al menos un dígito (\d)
 *
 * @param {string} clave
 * @returns {{ longitud: boolean, minuscula: boolean, mayuscula: boolean, digito: boolean, valida: boolean }}
 */
export function evaluarRequisitosClave(clave) {
  const str = typeof clave === 'string' ? clave : '';
  const longitud = str.length >= 8;
  const minuscula = /\p{Ll}/u.test(str);
  const mayuscula = /\p{Lu}/u.test(str);
  const digito = /\d/.test(str);
  const valida = longitud && minuscula && mayuscula && digito;

  return {
    longitud,
    minuscula,
    mayuscula,
    digito,
    valida,
  };
}

/**
 * Valida si una contraseña cumple todos los requisitos.
 *
 * @param {string} clave
 * @returns {boolean}
 */
export function validarClave(clave) {
  return evaluarRequisitosClave(clave).valida;
}

/**
 * Valida un código de inventario o SKU de catálogo de videojuego.
 * Debe cumplir el patrón GAME-XXX-0000 (prefijo GAME-, 3 letras mayúsculas, 4 dígitos).
 *
 * @param {string} sku
 * @returns {boolean}
 * @example
 * validarSKU('GAME-RPG-0042'); // true
 * validarSKU('game-rpg-0042'); // false
 */
export function validarSKU(sku) {
  if (typeof sku !== 'string') return false;
  return REGEX_SKU.test(sku.trim());
}

/**
 * Valida el código de barras EAN-13 utilizando el algoritmo oficial de control ponderado (módulo 10).
 *
 * Algoritmo oficial:
 * 1. Debe tener exactamente 13 dígitos numéricos.
 * 2. Se separan los primeros 12 dígitos y el 13º dígito de control.
 * 3. Suma ponderada: posiciones impares peso 1, posiciones pares peso 3 (indexadas desde 0).
 * 4. Dígito calculado: (10 - (suma % 10)) % 10.
 * 5. Debe coincidir exactamente con el 13º dígito.
 *
 * @param {string} codigo
 * @returns {boolean}
 * @example
 * validarEAN13('4020628663124'); // true
 * validarEAN13('4020628663125'); // false (dígito de control erróneo)
 */
export function validarEAN13(codigo) {
  if (typeof codigo !== 'string') return false;
  const limpio = codigo.trim();
  if (!REGEX_EAN13.test(limpio)) return false;

  const digitos = limpio.split('').map(Number);
  const digitoControl = digitos.pop();

  const suma = digitos.reduce((acc, d, idx) => acc + d * (idx % 2 === 0 ? 1 : 3), 0);
  const calculado = (10 - (suma % 10)) % 10;

  return calculado === digitoControl;
}

/**
 * Valida la ubicación física en estantería para videojuegos en formato físico.
 * Formato requerido: EST-X-00 (ej. EST-A-03).
 *
 * @param {string} ubicacion
 * @returns {boolean}
 * @example
 * validarEstanteria('EST-A-03'); // true
 * validarEstanteria('EST-1-03'); // false
 */
export function validarEstanteria(ubicacion) {
  if (typeof ubicacion !== 'string') return false;
  return REGEX_ESTANTERIA.test(ubicacion.trim());
}

/**
 * Valida el título de un videojuego (obligatorio, entre 2 y 100 caracteres tras trim).
 *
 * @param {string} titulo
 * @returns {boolean}
 * @example
 * validarTitulo('Elden Ring'); // true
 * validarTitulo('A'); // false
 */
export function validarTitulo(titulo) {
  if (typeof titulo !== 'string') return false;
  const limpio = titulo.trim();
  return limpio.length >= 2 && limpio.length <= 100;
}

/**
 * Valida que la plataforma pertenezca a la lista oficial admitida.
 *
 * @param {string} plataforma
 * @returns {boolean}
 * @example
 * validarPlataforma('PlayStation 5'); // true
 * validarPlataforma('Atari 2600'); // false
 */
export function validarPlataforma(plataforma) {
  if (typeof plataforma !== 'string') return false;
  return PLATAFORMAS_VALIDAS.includes(plataforma.trim());
}

/**
 * Valida el formato de la edición del videojuego (físico o digital).
 *
 * @param {string} formato
 * @returns {boolean}
 * @example
 * validarFormato('fisico'); // true
 * validarFormato('Digital'); // true
 * validarFormato('nube'); // false
 */
export function validarFormato(formato) {
  if (typeof formato !== 'string') return false;
  const limpio = formato.trim().toLowerCase();
  return FORMATOS_VALIDOS.includes(limpio);
}

/**
 * Valida que la fecha de adquisición sea una fecha de calendario válida y no sea futura.
 *
 * @param {string | Date} fecha Fecha en formato ISO YYYY-MM-DD o instancia Date.
 * @param {Date | string} [hoy=new Date()] Fecha de referencia máxima admitida.
 * @returns {boolean}
 * @example
 * validarFechaAdquisicion('2024-06-21'); // true
 * validarFechaAdquisicion('2099-01-01'); // false
 */
export function validarFechaAdquisicion(fecha, hoy = new Date()) {
  if (!fecha) return false;
  let strFecha;

  if (fecha instanceof Date) {
    if (isNaN(fecha.getTime())) return false;
    strFecha = fecha.toISOString().split('T')[0];
  } else if (typeof fecha === 'string') {
    strFecha = fecha.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(strFecha)) {
      return false;
    }
    const [anio, mes, dia] = strFecha.split('-').map(Number);
    const d = new Date(anio, mes - 1, dia);
    if (d.getFullYear() !== anio || d.getMonth() !== mes - 1 || d.getDate() !== dia) {
      return false;
    }
  } else {
    return false;
  }

  const fechaHoy = hoy instanceof Date ? hoy : new Date(hoy);
  if (isNaN(fechaHoy.getTime())) return false;

  const anioHoy = fechaHoy.getFullYear();
  const mesHoy = String(fechaHoy.getMonth() + 1).padStart(2, '0');
  const diaHoy = String(fechaHoy.getDate()).padStart(2, '0');
  const strHoy = `${anioHoy}-${mesHoy}-${diaHoy}`;

  return strFecha <= strHoy;
}

/**
 * Valida que las horas jugadas sean un número entero igual o superior a 0.
 *
 * @param {number | string} horas
 * @returns {boolean}
 * @example
 * validarHorasJugadas(120); // true
 * validarHorasJugadas('0'); // true
 * validarHorasJugadas(-5); // false
 */
export function validarHorasJugadas(horas) {
  if (horas === null || horas === undefined || horas === '') return false;

  if (typeof horas === 'number') {
    return Number.isInteger(horas) && horas >= 0;
  }

  if (typeof horas === 'string') {
    const limpia = horas.trim();
    if (!/^\d+$/.test(limpia)) return false;
    const n = Number(limpia);
    return Number.isSafeInteger(n) && n >= 0;
  }

  return false;
}

/**
 * Valida que el estado de progreso sea uno de los valores admitidos.
 * Admite valores en minúsculas o mayúsculas habituales.
 *
 * @param {string} estado
 * @returns {boolean}
 * @example
 * validarEstadoProgreso('completado'); // true
 * validarEstadoProgreso('Jugando'); // true
 * validarEstadoProgreso('pausado'); // false
 */
export function validarEstadoProgreso(estado) {
  if (typeof estado !== 'string') return false;
  const limpio = estado.trim().toLowerCase();
  return ESTADOS_PROGRESO_VALIDOS.includes(limpio);
}

/**
 * Valida que la tienda digital seleccionada pertenezca a las admitidas.
 *
 * @param {string} tienda
 * @returns {boolean}
 * @example
 * validarTiendaDigital('Steam'); // true
 * validarTiendaDigital('Itch.io'); // false
 */
export function validarTiendaDigital(tienda) {
  if (typeof tienda !== 'string') return false;
  return TIENDAS_DIGITALES_VALIDAS.includes(tienda.trim());
}

/**
 * Valida un objeto de DLC individual (título no vacío y estado de progreso válido).
 *
 * @param {Object} dlc
 * @returns {boolean}
 * @example
 * validarDlc({ titulo: 'Shadow of the Erdtree', estado: 'completado' }); // true
 */
export function validarDlc(dlc) {
  if (!dlc || typeof dlc !== 'object' || Array.isArray(dlc)) return false;
  const tituloValido =
    typeof dlc.titulo === 'string' &&
    dlc.titulo.trim().length >= 2 &&
    dlc.titulo.trim().length <= 100;
  const estadoValido =
    typeof dlc.estado === 'string' && ESTADOS_DLC_VALIDOS.includes(dlc.estado.trim().toLowerCase());

  return tituloValido && estadoValido;
}

/**
 * Valida una lista de DLCs (máximo 3 elementos y todos válidos).
 *
 * @param {Array<Object>} dlcs
 * @returns {boolean}
 * @example
 * validarDlcs([]); // true (0 DLCs es válido)
 * validarDlcs([{ titulo: 'DLC 1', estado: 'pendiente' }]); // true
 */
export function validarDlcs(dlcs) {
  if (!Array.isArray(dlcs)) return false;
  if (dlcs.length > 3) return false;
  return dlcs.every(validarDlc);
}

/**
 * Mapa centralizado de validadores por clave de control para uso en formularios con `data-validar`.
 *
 * Permite que los formularios dinámicos seleccionen el validador adecuado mediante
 * el atributo HTML `data-validar="<nombre>"`.
 */
export const VALIDADORES = {
  usuario: validarNombreUsuario,
  correo: validarCorreo,
  clave: validarClave,
  titulo: validarTitulo,
  plataforma: validarPlataforma,
  formato: validarFormato,
  fecha: validarFechaAdquisicion,
  horas: validarHorasJugadas,
  estado: validarEstadoProgreso,
  sku: validarSKU,
  ean13: validarEAN13,
  estanteria: validarEstanteria,
  tienda: validarTiendaDigital,
};
