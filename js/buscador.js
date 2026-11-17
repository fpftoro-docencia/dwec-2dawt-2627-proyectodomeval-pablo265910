/**
 * Utilidades puras de búsqueda textual y control de frecuencia (debounce) en GameVault.
 *
 * Reutilizable entre el catálogo de videojuegos (listado.html) y la gestión
 * de usuarios (usuarios.html), implementando el Requisito 15 del ENUNCIADO:
 * - Retardo configurable mediante temporizador (debounce).
 * - Normalización Unicode NFD para ignorar mayúsculas, tildes y diacríticos.
 *
 * @module buscador
 */

export const RETARDO_DEBOUNCE_DEFECTO = 300;

/**
 * Normaliza una cadena de texto para comparaciones de búsqueda insensibles
 * a mayúsculas/minúsculas y a tildes o signos diacríticos mediante Unicode NFD.
 *
 * @param {string} texto Cadena de entrada a normalizar.
 * @returns {string} Texto en minúsculas, sin diacríticos y sin espacios extremos.
 * @example
 * normalizarTextoBusqueda('  Pokémon: Leyendas Árceus  '); // 'pokemon: leyendas arceus'
 */
export function normalizarTextoBusqueda(texto) {
  if (typeof texto !== 'string') return '';
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Envuelve una función para retrasar su ejecución hasta que hayan transcurrido
 * `retardoMs` milisegundos sin nuevas invocaciones (patrón debounce).
 *
 * Expone un método `.cancelar()` en la función devuelta para anular
 * temporizadores pendientes al desmontar componentes o en pruebas.
 *
 * @param {Function} fn Función objetivo a ejecutar tras el retardo.
 * @param {number} [retardoMs=RETARDO_DEBOUNCE_DEFECTO] Milisegundos de espera.
 * @returns {Function & { cancelar: Function }} Función con retardo y método de cancelación.
 * @throws {TypeError} Si `fn` no es una función.
 */
export function debounce(fn, retardoMs = RETARDO_DEBOUNCE_DEFECTO) {
  if (typeof fn !== 'function') {
    throw new TypeError('El primer argumento de debounce debe ser una función.');
  }

  const espera =
    Number.isFinite(retardoMs) && retardoMs >= 0 ? retardoMs : RETARDO_DEBOUNCE_DEFECTO;
  let temporizadorId = null;

  function envuelta(...args) {
    if (temporizadorId !== null) {
      clearTimeout(temporizadorId);
    }

    temporizadorId = setTimeout(() => {
      temporizadorId = null;
      fn.apply(this, args);
    }, espera);
  }

  envuelta.cancelar = () => {
    if (temporizadorId !== null) {
      clearTimeout(temporizadorId);
      temporizadorId = null;
    }
  };

  return envuelta;
}

/**
 * Filtra una colección genérica comprobando si el término normalizado está
 * contenido en alguno de los campos textuales extraídos de cada elemento.
 *
 * Si la consulta está vacía o solo contiene espacios, devuelve una copia
 * superficial de la lista original sin mutarla.
 *
 * @template T
 * @param {T[]} lista Colección original de elementos.
 * @param {string} consulta Texto de búsqueda introducido por el usuario.
 * @param {function(T): (string | string[])} extractorCampos Función que devuelve los textos indexables del elemento.
 * @returns {T[]} Nuevo array con los elementos coincidentes.
 */
export function filtrarListaPorTexto(lista, consulta, extractorCampos) {
  if (!Array.isArray(lista)) return [];

  const termino = normalizarTextoBusqueda(consulta);
  if (!termino) return [...lista];

  if (typeof extractorCampos !== 'function') {
    return [...lista];
  }

  return lista.filter((elemento) => {
    if (elemento === null || elemento === undefined) return false;
    const campos = extractorCampos(elemento);
    const listaCampos = Array.isArray(campos) ? campos : [campos];

    return listaCampos.some((campo) => normalizarTextoBusqueda(campo).includes(termino));
  });
}

export default {
  RETARDO_DEBOUNCE_DEFECTO,
  normalizarTextoBusqueda,
  debounce,
  filtrarListaPorTexto,
};
