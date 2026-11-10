/**
 * Validadores y expresiones regulares del proyecto GameVault.
 *
 * Funciones puras para validación de datos de usuario y videojuegos.
 *
 * @module validadores
 */

/**
 * Expresión regular para nombres de usuario (3 a 15 caracteres alfanuméricos o guiones).
 */
export const REGEX_USUARIO = /^[a-zA-Z0-9_-]{3,15}$/;

/**
 * Expresión regular para correo electrónico.
 */
export const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valida un nombre de usuario según el formato alfanumérico.
 *
 * @param {string} valor
 * @returns {boolean}
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
