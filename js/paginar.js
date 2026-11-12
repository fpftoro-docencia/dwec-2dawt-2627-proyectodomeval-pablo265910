/**
 * Módulo de paginación pura para colecciones de datos en GameVault.
 *
 * Función matemática y pura sin dependencias de DOM ni efectos secundarios,
 * reutilizable tanto en el catálogo de videojuegos (listado.html) como en el
 * panel de gestión de usuarios (usuarios.html).
 *
 * @module paginar
 */

/**
 * @template T
 * @typedef {Object} ResultadoPaginacion
 * @property {T[]} elementos Elementos correspondientes a la página actual calculada.
 * @property {number} pagina Número de página corregido y ajustado a los límites válidos.
 * @property {number} paginaActual Alias del número de página corregido.
 * @property {number} totalPaginas Cantidad total de páginas calculadas (mínimo 1).
 * @property {number} porPagina Elementos configurados por cada página.
 * @property {number} total Total de elementos presentes en la lista original.
 * @property {boolean} tieneAnterior Indica si existe una página previa a la actual.
 * @property {boolean} tieneSiguiente Indica si existe una página posterior a la actual.
 */

/**
 * Cantidad por defecto de elementos por página en las vistas de catálogo y listado.
 */
export const POR_PAGINA_DEFECTO = 6;

/**
 * Pagina una lista de elementos ajustando automáticamente los límites si la página solicitada no existe.
 *
 * Si se solicita una página menor que 1, se corrige a la primera página (1).
 * Si se solicita una página superior al total de páginas, se corrige a la última página disponible.
 * Si la lista está vacía, devuelve un array vacío de elementos con totalPaginas = 1 y pagina = 1.
 *
 * @template T
 * @param {T[]} lista Colección o array de elementos a paginar.
 * @param {number | string} [pagina=1] Número de página solicitada (1-based, admite string numérico).
 * @param {number | string} [porPagina=POR_PAGINA_DEFECTO] Cantidad de elementos por página.
 * @returns {ResultadoPaginacion<T>}
 *
 * @example
 * const items = ['A', 'B', 'C', 'D', 'E'];
 * const res = paginar(items, 1, 2);
 * // res.elementos -> ['A', 'B']
 * // res.pagina -> 1
 * // res.totalPaginas -> 3
 *
 * const resAjuste = paginar(items, 99, 2);
 * // resAjuste.elementos -> ['E']
 * // resAjuste.pagina -> 3 (corregida a la última)
 */
export function paginar(lista, pagina = 1, porPagina = POR_PAGINA_DEFECTO) {
  const elementosOriginales = Array.isArray(lista) ? lista : [];
  const total = elementosOriginales.length;

  const numPorPagina = Number(porPagina);
  const limite =
    Number.isInteger(numPorPagina) && numPorPagina > 0 ? numPorPagina : POR_PAGINA_DEFECTO;

  const totalPaginas = Math.max(1, Math.ceil(total / limite));

  const numPagina = Number(pagina);
  let paginaCorregida = Number.isInteger(numPagina) ? numPagina : 1;

  if (paginaCorregida < 1) {
    paginaCorregida = 1;
  } else if (paginaCorregida > totalPaginas) {
    paginaCorregida = totalPaginas;
  }

  const inicio = (paginaCorregida - 1) * limite;
  const fin = inicio + limite;
  const elementos = elementosOriginales.slice(inicio, fin);

  return {
    elementos,
    pagina: paginaCorregida,
    paginaActual: paginaCorregida,
    totalPaginas,
    porPagina: limite,
    total,
    tieneAnterior: paginaCorregida > 1,
    tieneSiguiente: paginaCorregida < totalPaginas,
  };
}

export default paginar;
