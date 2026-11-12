/**
 * Componente visual de paginación y sincronización de URL en GameVault.
 *
 * Renderiza los controles de paginación accesibles (Anterior, números y Siguiente),
 * gestiona los atributos aria-current y disabled, sincroniza el estado en la URL
 * (?pagina=X mediante URLSearchParams y history.replaceState) y aplica delegación de eventos.
 *
 * @module paginacion
 */

import { paginar, POR_PAGINA_DEFECTO } from './paginar.js';

export { paginar, POR_PAGINA_DEFECTO };

/**
 * Obtiene el número de página actual desde los parámetros de la URL.
 *
 * Si el parámetro no existe o tiene un valor no numérico o inferior a 1, devuelve 1.
 *
 * @param {string} [claveParametro='pagina'] Nombre del parámetro en la URL.
 * @param {Window} [ventana=window] Objeto de ventana inyectable para pruebas.
 * @returns {number} Número de página (mínimo 1).
 */
export function obtenerPaginaUrl(
  claveParametro = 'pagina',
  ventana = typeof window !== 'undefined' ? window : null,
) {
  if (!ventana || !ventana.location) return 1;
  try {
    const params = new URLSearchParams(ventana.location.search);
    const valor = params.get(claveParametro);
    if (!valor) return 1;
    const num = Number(valor);
    return Number.isInteger(num) && num >= 1 ? num : 1;
  } catch {
    return 1;
  }
}

/**
 * Sincroniza el número de página en la URL mediante URLSearchParams y history.replaceState.
 *
 * Si la página es superior a 1, establece ?pagina=X.
 * Si la página es 1, elimina el parámetro para mantener limpia la dirección.
 *
 * @param {number} pagina Número de página efectiva.
 * @param {string} [claveParametro='pagina'] Nombre del parámetro de URL.
 * @param {Window} [ventana=window] Objeto de ventana inyectable.
 */
export function fijarPaginaUrl(
  pagina,
  claveParametro = 'pagina',
  ventana = typeof window !== 'undefined' ? window : null,
) {
  if (!ventana || !ventana.location || !ventana.history) return;

  try {
    const url = new URL(ventana.location.href);
    const numPagina = Number(pagina);
    const paginaValida = Number.isInteger(numPagina) && numPagina >= 1 ? numPagina : 1;

    if (paginaValida > 1) {
      url.searchParams.set(claveParametro, String(paginaValida));
    } else {
      url.searchParams.delete(claveParametro);
    }

    const query = url.searchParams.toString();
    const nuevaUrl = `${url.pathname}${query ? `?${query}` : ''}${url.hash}`;

    if (typeof ventana.history.replaceState === 'function') {
      ventana.history.replaceState(null, '', nuevaUrl);
    }
  } catch {
    // Tolerancia ante entornos sin soporte completo de URL o history
  }
}

/**
 * Renderiza los controles visuales de paginación en el contenedor especificado.
 *
 * Genera el botón «Anterior», los botones numéricos de página y el botón «Siguiente».
 * Desactiva «Anterior» y «Siguiente» en los extremos y marca la página activa con aria-current="page".
 *
 * @param {HTMLElement} contenedor Elemento DOM (ej. <ul id="paginacion-catalogo">) donde renderizar.
 * @param {Object} infoPaginacion Información de paginación devuelta por `paginar()`.
 * @param {number} infoPaginacion.pagina Página actual activa.
 * @param {number} infoPaginacion.totalPaginas Total de páginas disponibles.
 * @param {Object} [opciones={}]
 * @param {Document} [opciones.documento=document] Documento para creación de nodos.
 */
export function renderizarControlesPaginacion(contenedor, infoPaginacion, opciones = {}) {
  if (!contenedor) return;

  const doc = opciones.documento || (typeof document !== 'undefined' ? document : null);
  if (!doc) return;

  const paginaActual = Number(infoPaginacion?.pagina) || 1;
  const totalPaginas = Math.max(1, Number(infoPaginacion?.totalPaginas) || 1);

  // Vaciado seguro del contenedor
  while (contenedor.firstChild) {
    contenedor.removeChild(contenedor.firstChild);
  }

  // 1. Botón «Anterior»
  const liAnterior = doc.createElement('li');
  liAnterior.className = 'page-item';
  if (paginaActual <= 1) {
    liAnterior.classList.add('disabled');
  }

  const btnAnterior = doc.createElement('button');
  btnAnterior.type = 'button';
  btnAnterior.className = 'page-link';
  btnAnterior.dataset.pagina = 'prev';
  btnAnterior.dataset.page = 'prev';
  btnAnterior.setAttribute('aria-label', 'Página anterior');
  btnAnterior.textContent = 'Anterior';
  if (paginaActual <= 1) {
    btnAnterior.disabled = true;
  }
  liAnterior.appendChild(btnAnterior);
  contenedor.appendChild(liAnterior);

  // 2. Botones numéricos de página
  for (let i = 1; i <= totalPaginas; i++) {
    const liNumero = doc.createElement('li');
    liNumero.className = 'page-item';

    const btnNumero = doc.createElement('button');
    btnNumero.type = 'button';
    btnNumero.className = 'page-link';
    btnNumero.dataset.pagina = String(i);
    btnNumero.dataset.page = String(i);
    btnNumero.textContent = String(i);

    if (i === paginaActual) {
      liNumero.classList.add('active');
      btnNumero.setAttribute('aria-current', 'page');
    }

    liNumero.appendChild(btnNumero);
    contenedor.appendChild(liNumero);
  }

  // 3. Botón «Siguiente»
  const liSiguiente = doc.createElement('li');
  liSiguiente.className = 'page-item';
  if (paginaActual >= totalPaginas) {
    liSiguiente.classList.add('disabled');
  }

  const btnSiguiente = doc.createElement('button');
  btnSiguiente.type = 'button';
  btnSiguiente.className = 'page-link';
  btnSiguiente.dataset.pagina = 'next';
  btnSiguiente.dataset.page = 'next';
  btnSiguiente.setAttribute('aria-label', 'Página siguiente');
  btnSiguiente.textContent = 'Siguiente';
  if (paginaActual >= totalPaginas) {
    btnSiguiente.disabled = true;
  }
  liSiguiente.appendChild(btnSiguiente);
  contenedor.appendChild(liSiguiente);
}

/**
 * Conecta la delegación de eventos sobre el contenedor de paginación.
 *
 * Escucha el evento click en fase de burbuja sobre el contenedor común y delega
 * la acción al botón correspondiente mediante `closest()`.
 *
 * @param {HTMLElement} contenedor Elemento DOM contenedor de la lista de paginación.
 * @param {Object} opciones
 * @param {Function} opciones.alCambiarPagina Callback invocado con el nuevo número de página.
 * @param {Function} [opciones.obtenerEstadoActual] Función que devuelve { pagina, totalPaginas }.
 * @param {string} [opciones.claveParametro='pagina'] Clave para URL.
 * @param {Window} [opciones.ventana=window] Objeto de ventana.
 * @returns {Function} Función para desuscribir o retirar el oyente de eventos.
 */
export function conectarPaginacion(contenedor, opciones = {}) {
  if (!contenedor || typeof opciones.alCambiarPagina !== 'function') {
    return () => {};
  }

  const claveParametro = opciones.claveParametro || 'pagina';
  const ventana = opciones.ventana || (typeof window !== 'undefined' ? window : null);

  const manejadorClick = (evento) => {
    const boton = evento.target.closest('button[data-pagina], button[data-page]');
    if (!boton || boton.disabled) return;

    const accion = boton.dataset.pagina || boton.dataset.page;
    if (!accion) return;

    let paginaActual = 1;
    let totalPaginas = 1;

    if (typeof opciones.obtenerEstadoActual === 'function') {
      const estado = opciones.obtenerEstadoActual() || {};
      paginaActual = Number(estado.pagina) || 1;
      totalPaginas = Number(estado.totalPaginas) || 1;
    } else {
      // Intenta inferir la página actual a partir del botón con aria-current="page"
      const botonActivo = contenedor.querySelector('[aria-current="page"]');
      if (botonActivo) {
        paginaActual = Number(botonActivo.dataset.pagina || botonActivo.dataset.page) || 1;
      }
      // Infere totalPaginas buscando los botones numéricos
      const botonesNumeros = contenedor.querySelectorAll(
        'button[data-pagina]:not([data-pagina="prev"]):not([data-pagina="next"])',
      );
      if (botonesNumeros.length > 0) {
        totalPaginas = botonesNumeros.length;
      }
    }

    let nuevaPagina = paginaActual;

    if (accion === 'prev') {
      nuevaPagina = Math.max(1, paginaActual - 1);
    } else if (accion === 'next') {
      nuevaPagina = Math.min(totalPaginas, paginaActual + 1);
    } else {
      const n = Number(accion);
      if (Number.isInteger(n) && n >= 1 && n <= totalPaginas) {
        nuevaPagina = n;
      }
    }

    if (nuevaPagina !== paginaActual) {
      fijarPaginaUrl(nuevaPagina, claveParametro, ventana);
      opciones.alCambiarPagina(nuevaPagina);
    }
  };

  contenedor.addEventListener('click', manejadorClick);

  return function desconectarPaginacion() {
    contenedor.removeEventListener('click', manejadorClick);
  };
}

export default {
  paginar,
  POR_PAGINA_DEFECTO,
  obtenerPaginaUrl,
  fijarPaginaUrl,
  renderizarControlesPaginacion,
  conectarPaginacion,
};
