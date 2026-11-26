/**
 * Controlador de la vista del catálogo y backlog de videojuegos (`listado.html`).
 *
 * Implementa el Requisito 15 del ENUNCIADO:
 * - Renderizado accesible de videojuegos desde `<template id="tpl-juego">` usando
 *   estrictamente `textContent` y atributos seguros (sin `innerHTML` vulnerable a XSS).
 * - Sustitución atómica del contenido de una sola vez mediante `DocumentFragment`.
 * - Enlace «Editar» dirigido a `ficha.html?id=...`.
 * - Botón «Eliminar» con apertura de diálogo modal nativo `<dialog>` pidiendo confirmación.
 * - Contador dinámico de videojuegos encontrados y Empty State cuando la colección esté vacía.
 * - Integración con paginación accesible (`paginar.js` y `paginacion.js`).
 * - Delegación de eventos en fase de burbuja para las acciones de las tarjetas.
 *
 * HTML requerido en `listado.html`:
 * - `#buscador-catalogo`: Campo de búsqueda (`<input type="search">`) con debounce.
 * - `#contador-resultados`: Contenedor textual del total de videojuegos mostrados (puede incluir `<strong>`).
 * - `#estado-vacio-catalogo`: Bloque Empty State cuya visibilidad se alterna mediante `hidden`.
 * - `#grid-catalogo`: Contenedor rejilla donde se inyectan las tarjetas clonadas.
 * - `#tpl-juego`: Plantilla `<template id="tpl-juego">` con un nodo `.col` y los selectores:
 *   `.gv-card-game`, `.js-juego-consola-img`, `.js-juego-plataforma`, `.js-juego-formato`,
 *   `.js-juego-estado`, `.js-juego-titulo`, `.js-juego-sku`, `.js-juego-horas`,
 *   `.js-juego-detalle-label`, `.js-juego-detalle-valor`, `.js-juego-fecha`, `.js-juego-ean`,
 *   `.js-juego-dlcs`, `.js-btn-girar`, `.js-btn-volver`, `.js-btn-editar` y `.js-btn-eliminar`.
 * - `#paginacion-catalogo`: Lista de controles de paginación accesible.
 * - `#modal-borrar`: Diálogo modal nativo `<dialog id="modal-borrar">` con `#modal-juego-nombre`,
 *   `#btn-cancelar-borrado` y `#btn-confirmar-borrado`.
 * - `#region-avisos`: Contenedor global donde `avisos.js` renderiza eventos `aviso`.
 *
 * @module listado
 */

import { obtenerJuegos, eliminarJuego } from './juegos.js';
import { obtenerSesion } from './sesion.js';
import { lanzarAviso } from './avisos.js';
import { paginar } from './paginar.js';
import {
  obtenerPaginaUrl,
  fijarPaginaUrl,
  renderizarControlesPaginacion,
  conectarPaginacion,
} from './paginacion.js';
import {
  RETARDO_DEBOUNCE_DEFECTO,
  normalizarTextoBusqueda,
  debounce,
  filtrarListaPorTexto,
} from './buscador.js';

export { RETARDO_DEBOUNCE_DEFECTO, normalizarTextoBusqueda, debounce };

/**
 * Número de tarjetas de videojuego mostradas por página por defecto.
 *
 * @type {number}
 */
export const ELEMENTOS_POR_PAGINA_DEFECTO = 6;

/**
 * Mapa de rutas relativas de los renders 3D de estudio por plataforma.
 *
 * @type {Object<string, string>}
 */
export const MAPA_ICONOS_CONSOLAS = {
  PC: 'img/consolas/pc.jpg',
  'PlayStation 5': 'img/consolas/playstation-5.jpg',
  'Xbox Series X': 'img/consolas/xbox-series-x.jpg',
  'Nintendo Switch': 'img/consolas/nintendo-switch.jpg',
  Retro: 'img/consolas/retro.jpg',
};

/**
 * Mapa de claves semánticas de plataforma usadas en `data-platform` para acentos de color.
 *
 * @type {Object<string, string>}
 */
export const MAPA_CLAVES_PLATAFORMA = {
  PC: 'pc',
  'PlayStation 5': 'ps5',
  'Xbox Series X': 'xbox',
  'Nintendo Switch': 'switch',
  Retro: 'retro',
};

const MESES_CORTOS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

/**
 * Capitaliza la primera letra de un texto.
 *
 * @private
 * @param {string} str Cadena de entrada.
 * @returns {string} Cadena con el primer carácter en mayúscula.
 */
function capitalizar(str) {
  if (typeof str !== 'string' || !str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formatea una fecha ISO (`YYYY-MM-DD`) en formato corto legible en español (`25 feb 2024`).
 *
 * @private
 * @param {string} fechaIso Cadena de fecha en formato ISO.
 * @returns {string} Fecha legible o indicador neutro si no es válida.
 */
function formatearFechaCorta(fechaIso) {
  if (typeof fechaIso !== 'string' || !fechaIso.trim()) return 'Sin fecha';
  const partes = fechaIso.trim().split('-').map(Number);
  if (partes.length !== 3 || partes.some(Number.isNaN)) return fechaIso.trim();
  const [anio, mes, dia] = partes;
  const nombreMes = MESES_CORTOS[mes - 1];
  return nombreMes ? `${dia} ${nombreMes} ${anio}` : fechaIso.trim();
}

/**
 * Alterna el giro 3D bidireccional de una tarjeta Spatial Flip asegurando
 * accesibilidad (`aria-hidden`, `inert`, `aria-expanded`) e interacción fiable.
 *
 * @param {HTMLElement | null} tarjeta Nodo `<article class="gv-card-game">`.
 * @param {boolean} [girar] Estado explícito (`true` reverso, `false` portada); si se omite, conmuta.
 * @returns {boolean} Estado final (`true` si muestra el reverso, `false` si muestra la portada).
 */
export function alternarGiroTarjeta(tarjeta, girar) {
  if (!tarjeta) return false;

  const mostrarReverso =
    typeof girar === 'boolean' ? girar : !tarjeta.classList.contains('is-flipped');

  tarjeta.classList.toggle('is-flipped', mostrarReverso);

  const caraFrontal = tarjeta.querySelector('.gv-card-face--front');
  const caraTrasera = tarjeta.querySelector('.gv-card-face--back');
  const btnGirar = tarjeta.querySelector('.js-btn-girar');

  if (caraFrontal) {
    caraFrontal.setAttribute('aria-hidden', String(mostrarReverso));
    caraFrontal.inert = mostrarReverso;
  }

  if (caraTrasera) {
    caraTrasera.setAttribute('aria-hidden', String(!mostrarReverso));
    caraTrasera.inert = !mostrarReverso;
  }

  if (btnGirar) {
    btnGirar.setAttribute('aria-expanded', String(mostrarReverso));
  }

  return mostrarReverso;
}

/**
 * Filtra el catálogo de videojuegos por título, plataforma o SKU
 * ignorando mayúsculas y signos diacríticos (normalización Unicode NFD).
 *
 * @param {Array<Object>} juegos Lista completa de videojuegos del usuario.
 * @param {string} [consulta=''] Texto de búsqueda introducido.
 * @returns {Array<Object>} Subconjunto de videojuegos coincidentes.
 * @example
 * const resultados = filtrarJuegos(catalogo, 'elden');
 */
export function filtrarJuegos(juegos, consulta = '') {
  return filtrarListaPorTexto(juegos, consulta, (juego) => [
    juego.titulo,
    juego.plataforma,
    juego.sku,
  ]);
}

/**
 * Renderiza una tarjeta de videojuego individual a partir del elemento `<template id="tpl-juego">`.
 *
 * Garantiza total protección contra inyecciones XSS asignando los datos exclusivamente
 * mediante `textContent` y atributos de nodo.
 *
 * @param {Object} juego Registro normalizado de videojuego.
 * @param {HTMLTemplateElement} template Elemento `<template id="tpl-juego">`.
 * @returns {HTMLElement | null} Nodo de columna DOM (.col) clonado y poblado.
 */
export function renderizarTarjetaJuego(juego, template) {
  if (
    !juego ||
    typeof juego !== 'object' ||
    !template ||
    !(template instanceof HTMLTemplateElement)
  ) {
    return null;
  }

  const clon = template.content.cloneNode(true);
  const columna = clon.querySelector('.col') || clon.firstElementChild;
  if (!columna) return null;

  const tituloTexto = juego.titulo || 'Sin título';
  const plataformaTexto = juego.plataforma || 'PC';
  const clavePlataforma = MAPA_CLAVES_PLATAFORMA[plataformaTexto] || 'pc';

  const articulo = columna.querySelector('.gv-card-game');
  if (articulo) {
    articulo.dataset.platform = clavePlataforma;
  }

  // 1. Título y SKU
  const elTitulo = columna.querySelector('.js-juego-titulo');
  if (elTitulo) elTitulo.textContent = tituloTexto;

  const elTituloReverso = columna.querySelector('.js-juego-titulo-reverso');
  if (elTituloReverso) elTituloReverso.textContent = tituloTexto;

  const elSku = columna.querySelector('.js-juego-sku');
  if (elSku) elSku.textContent = juego.sku || 'Sin SKU';

  // 2. Plataforma, Formato e imagen de consola en alta resolución
  const elPlataforma = columna.querySelector('.js-juego-plataforma');
  if (elPlataforma) elPlataforma.textContent = plataformaTexto;

  const elPlataformaReverso = columna.querySelector('.js-juego-plataforma-reverso');
  if (elPlataformaReverso) elPlataformaReverso.textContent = plataformaTexto;

  const elFormato = columna.querySelector('.js-juego-formato');
  if (elFormato) {
    elFormato.textContent = juego.formato === 'fisico' ? 'Físico' : 'Digital';
  }

  const imgConsola = columna.querySelector('.js-juego-consola-img');
  if (imgConsola) {
    imgConsola.src = MAPA_ICONOS_CONSOLAS[plataformaTexto] || MAPA_ICONOS_CONSOLAS.PC;
    imgConsola.alt = ''; // Decorativa
  }

  // 3. Estado de progreso y clases badge
  const elEstado = columna.querySelector('.js-juego-estado');
  if (elEstado) {
    const estadoLimpio = (juego.estadoProgreso || 'pendiente').toLowerCase();
    elEstado.textContent = capitalizar(estadoLimpio);
    elEstado.className = `gv-badge gv-badge-${estadoLimpio} js-juego-estado`;
  }

  // 4. Horas jugadas y fecha de adquisición
  const elHoras = columna.querySelector('.js-juego-horas');
  if (elHoras) elHoras.textContent = String(juego.horasJugadas ?? 0);

  const elFecha = columna.querySelector('.js-juego-fecha');
  if (elFecha) elFecha.textContent = formatearFechaCorta(juego.fechaAdquisicion);

  // 5. Detalles condicionales (Ubicación en estantería + EAN-13 vs Tienda digital)
  const elDetalleLabel = columna.querySelector('.js-juego-detalle-label');
  const elDetalleValor = columna.querySelector('.js-juego-detalle-valor');
  const filaEan = columna.querySelector('.js-juego-ean-fila');
  const elEan = columna.querySelector('.js-juego-ean');

  if (juego.formato === 'fisico') {
    if (elDetalleLabel) elDetalleLabel.textContent = 'Ubicación / Balda';
    if (elDetalleValor) elDetalleValor.textContent = juego.ubicacionEstanteria || 'Sin asignar';
    if (filaEan && elEan) {
      if (juego.codigoBarras) {
        elEan.textContent = juego.codigoBarras;
        filaEan.hidden = false;
      } else {
        filaEan.hidden = true;
      }
    }
  } else {
    if (elDetalleLabel) elDetalleLabel.textContent = 'Tienda Digital';
    if (elDetalleValor) elDetalleValor.textContent = juego.tiendaDigital || 'Digital';
    if (filaEan) filaEan.hidden = true;
  }

  // 6. Expansiones / DLCs en el reverso (creación DOM segura contra XSS)
  const dlcs = Array.isArray(juego.dlcs) ? juego.dlcs : [];
  const elDlcsTitulo = columna.querySelector('.js-juego-dlcs-titulo');
  if (elDlcsTitulo) {
    elDlcsTitulo.textContent = `Expansiones / DLCs (${dlcs.length})`;
  }

  const contenedorDlcs = columna.querySelector('.js-juego-dlcs');
  if (contenedorDlcs) {
    const doc = template.ownerDocument || document;
    contenedorDlcs.textContent = '';

    if (dlcs.length === 0) {
      const vacio = doc.createElement('p');
      vacio.className = 'gv-dlc-empty';
      vacio.textContent = 'Sin expansiones añadidas.';
      contenedorDlcs.appendChild(vacio);
    } else {
      dlcs.forEach((dlc) => {
        const estadoDlc = (dlc.estado || 'pendiente').toLowerCase();
        const fila = doc.createElement('div');
        fila.className = 'gv-ios-row';

        const izquierda = doc.createElement('span');
        izquierda.className = 'd-inline-flex align-items-center gap-2 min-w-0';

        const punto = doc.createElement('span');
        punto.className = `gv-dlc-dot gv-dlc-dot--${estadoDlc}`;
        punto.setAttribute('aria-hidden', 'true');

        const nombre = doc.createElement('span');
        nombre.className = 'text-light text-truncate';
        nombre.textContent = dlc.titulo || 'DLC';

        izquierda.appendChild(punto);
        izquierda.appendChild(nombre);

        const estado = doc.createElement('span');
        estado.className = `small fw-semibold flex-shrink-0 gv-dlc-status--${estadoDlc}`;
        estado.textContent = capitalizar(estadoDlc);

        fila.appendChild(izquierda);
        fila.appendChild(estado);
        contenedorDlcs.appendChild(fila);
      });
    }
  }

  // 7. Botones de giro bidireccional, enlace de edición y botón de eliminación
  const btnGirar = columna.querySelector('.js-btn-girar');
  if (btnGirar) {
    btnGirar.setAttribute('aria-label', `Ver ficha técnica de ${tituloTexto}`);
    const textoGirar = btnGirar.querySelector('.js-btn-girar-texto');
    if (textoGirar) {
      textoGirar.textContent =
        dlcs.length > 0
          ? `Ficha · ${dlcs.length} ${dlcs.length === 1 ? 'DLC' : 'DLCs'}`
          : 'Girar ficha';
    }
  }

  const btnVolver = columna.querySelector('.js-btn-volver');
  if (btnVolver) {
    btnVolver.setAttribute('aria-label', `Volver a la portada de ${tituloTexto}`);
  }

  const urlEdicion = `ficha.html?id=${encodeURIComponent(juego.id)}`;
  const enlaceEditar = columna.querySelector('.js-btn-editar');
  if (enlaceEditar) {
    enlaceEditar.href = urlEdicion;
    enlaceEditar.setAttribute('aria-label', `Editar ${tituloTexto}`);
  }

  const enlaceEditarReverso = columna.querySelector('.js-btn-editar-reverso');
  if (enlaceEditarReverso) {
    enlaceEditarReverso.href = urlEdicion;
    enlaceEditarReverso.setAttribute('aria-label', `Editar ficha de ${tituloTexto}`);
  }

  const btnEliminar = columna.querySelector('.js-btn-eliminar');
  if (btnEliminar) {
    btnEliminar.dataset.id = juego.id;
    btnEliminar.dataset.titulo = juego.titulo || '';
    btnEliminar.setAttribute('aria-label', `Eliminar ${tituloTexto}`);
  }

  return columna;
}

/**
 * Sustituye el contenido del contenedor de tarjetas de forma atómica usando DocumentFragment.
 *
 * Cumple estrictamente con el Requisito 15 ("sustituyendo el contenido de una vez").
 *
 * @param {HTMLElement} contenedor Elemento #grid-catalogo.
 * @param {Array<Object>} juegos Lista de videojuegos a renderizar en la página actual.
 * @param {HTMLTemplateElement} template Elemento <template id="tpl-juego">.
 * @returns {void}
 */
export function renderizarListadoJuegos(contenedor, juegos, template) {
  if (!contenedor) return;

  contenedor.innerHTML = '';

  if (!Array.isArray(juegos) || juegos.length === 0 || !template) {
    return;
  }

  const fragmento = document.createDocumentFragment();
  juegos.forEach((juego) => {
    const tarjeta = renderizarTarjetaJuego(juego, template);
    if (tarjeta) fragmento.appendChild(tarjeta);
  });

  contenedor.appendChild(fragmento);
}

/**
 * Actualiza el contador textual accesible de videojuegos encontrados.
 *
 * @param {HTMLElement} elementoContador Elemento #contador-resultados.
 * @param {number} [total=0] Cantidad total de videojuegos disponibles.
 * @returns {void}
 */
export function actualizarContadorResultados(elementoContador, total = 0) {
  if (!elementoContador) return;

  const cantidad = Number.isInteger(total) && total >= 0 ? total : 0;
  const plural = cantidad === 1 ? 'videojuego' : 'videojuegos';
  const doc = elementoContador.ownerDocument || document;

  const strong = elementoContador.querySelector('strong');
  if (strong) {
    strong.textContent = String(cantidad);
    elementoContador.replaceChildren(
      doc.createTextNode('Mostrando '),
      strong,
      doc.createTextNode(` ${plural}`),
    );
  } else {
    elementoContador.textContent = `Mostrando ${cantidad} ${plural}`;
  }
}

/**
 * Conmuta la visibilidad del bloque de estado vacío (#estado-vacio-catalogo).
 *
 * @param {HTMLElement} elementoVacio Elemento #estado-vacio-catalogo.
 * @param {boolean} tieneElementos True si existen videojuegos a mostrar; false si está vacío.
 * @returns {void}
 */
export function alternarEstadoVacio(elementoVacio, tieneElementos) {
  if (!elementoVacio) return;
  elementoVacio.hidden = Boolean(tieneElementos);
}

/**
 * Conecta los manejadores del modal nativo `<dialog id="modal-borrar">`.
 *
 * Gestiona la apertura accesible con `showModal()`, el foco, la confirmación
 * y la cancelación sin dependencias de frameworks externos.
 *
 * @listens click
 * @listens cancel
 * @param {HTMLDialogElement} modal Elemento `<dialog id="modal-borrar">`.
 * @param {Object} [callbacks={}] Callbacks de confirmación y cancelación.
 * @param {Function} [callbacks.alConfirmar] Callback invocado con el ID a eliminar.
 * @param {Function} [callbacks.alCancelar] Callback invocado al cancelar.
 * @returns {{ abrir: Function, cerrar: Function, desconectar: Function }} Controlador del modal.
 */
export function conectarModalBorrado(modal, { alConfirmar, alCancelar } = {}) {
  if (!modal) {
    return { abrir: () => {}, cerrar: () => {}, desconectar: () => {} };
  }

  let idPendiente = null;

  const elNombreJuego = modal.querySelector('#modal-juego-nombre');
  const btnCancelar = modal.querySelector('#btn-cancelar-borrado');
  const btnConfirmar = modal.querySelector('#btn-confirmar-borrado');

  const abrir = (id, titulo = '') => {
    idPendiente = id;
    if (elNombreJuego) {
      elNombreJuego.textContent = titulo ? `«${titulo}»` : 'este videojuego';
    }

    if (typeof modal.showModal === 'function') {
      try {
        modal.showModal();
      } catch {
        modal.setAttribute('open', '');
      }
    } else {
      modal.setAttribute('open', '');
    }

    if (btnCancelar) btnCancelar.focus();
  };

  const cerrar = () => {
    idPendiente = null;
    if (typeof modal.close === 'function') {
      try {
        modal.close();
      } catch {
        modal.removeAttribute('open');
      }
    } else {
      modal.removeAttribute('open');
    }
  };

  const manejadorCancelar = () => {
    cerrar();
    if (typeof alCancelar === 'function') alCancelar();
  };

  const manejadorConfirmar = () => {
    const idParaBorrar = idPendiente;
    cerrar();
    if (idParaBorrar && typeof alConfirmar === 'function') {
      alConfirmar(idParaBorrar);
    }
  };

  // Cierre al pulsar el backdrop nativo
  const manejadorClickBackdrop = (evento) => {
    if (evento.target === modal) {
      manejadorCancelar();
    }
  };

  // Evento nativo de cancelación (tecla Escape)
  const manejadorCancel = () => {
    idPendiente = null;
    if (typeof alCancelar === 'function') alCancelar();
  };

  if (btnCancelar) btnCancelar.addEventListener('click', manejadorCancelar);
  if (btnConfirmar) btnConfirmar.addEventListener('click', manejadorConfirmar);
  modal.addEventListener('click', manejadorClickBackdrop);
  modal.addEventListener('cancel', manejadorCancel);

  const desconectar = () => {
    if (btnCancelar) btnCancelar.removeEventListener('click', manejadorCancelar);
    if (btnConfirmar) btnConfirmar.removeEventListener('click', manejadorConfirmar);
    modal.removeEventListener('click', manejadorClickBackdrop);
    modal.removeEventListener('cancel', manejadorCancel);
  };

  return { abrir, cerrar, desconectar };
}

/**
 * Inicializa la página `listado.html`.
 *
 * Orquesta:
 * 1. La carga y filtrado del catálogo del usuario activo en `localStorage`.
 * 2. La paginación sincronizada con la URL (`?pagina=X`).
 * 3. El renderizado atómico mediante `<template id="tpl-juego">`.
 * 4. La actualización del contador y del estado vacío.
 * 5. La delegación de eventos `click` en `#grid-catalogo` para la eliminación.
 * 6. La confirmación interactiva mediante `<dialog id="modal-borrar">`.
 *
 * @listens input
 * @listens click
 * @fires aviso
 * @param {Document} [documento=document] Objeto Document inyectable.
 * @param {Object} [opciones={}] Opciones de configuración e inyección.
 * @param {Storage} [opciones.almacenLocal] Almacén de persistencia para videojuegos.
 * @param {Storage} [opciones.almacenSesion] Almacén de sesión para consultar usuario activo.
 * @param {string} [opciones.usuario] Nombre del usuario propietario de la biblioteca.
 * @param {Window | Object} [opciones.ventana] Objeto ventana o doble con `location` para pruebas.
 * @param {number} [opciones.porPagina=ELEMENTOS_POR_PAGINA_DEFECTO] Elementos por página.
 * @param {number} [opciones.retardoDebounce=RETARDO_DEBOUNCE_DEFECTO] Retardo del buscador en ms.
 * @param {Function} [opciones.alEliminar] Callback tras eliminar un videojuego.
 * @returns {Function} Función de limpieza para desconectar oyentes.
 */
export function iniciarListado(
  documento = typeof document !== 'undefined' ? document : null,
  opciones = {},
) {
  if (!documento) return () => {};

  const almacenLocal =
    opciones.almacenLocal ?? (typeof window !== 'undefined' ? window.localStorage : null);
  const almacenSesion =
    opciones.almacenSesion ?? (typeof window !== 'undefined' ? window.sessionStorage : null);
  const ventana = opciones.ventana ?? (typeof window !== 'undefined' ? window : null);
  const porPagina = opciones.porPagina || ELEMENTOS_POR_PAGINA_DEFECTO;
  const retardoDebounce = opciones.retardoDebounce ?? RETARDO_DEBOUNCE_DEFECTO;

  const usuario =
    opciones.usuario || (almacenSesion ? obtenerSesion(almacenSesion)?.usuario : '') || '';

  const contenedorGrid = documento.querySelector('#grid-catalogo');
  const templateJuego = documento.querySelector('#tpl-juego');
  const elementoContador = documento.querySelector('#contador-resultados');
  const elementoVacio = documento.querySelector('#estado-vacio-catalogo');
  const contenedorPaginacion = documento.querySelector('#paginacion-catalogo');
  const modalBorrado = documento.querySelector('#modal-borrar');
  const inputBuscador = documento.querySelector('#buscador-catalogo');

  let terminoBusqueda = inputBuscador ? inputBuscador.value : '';
  let desconectarPaginacion = () => {};
  let desconectarModal = () => {};
  let desconectarDelegacion = () => {};
  let desconectarBuscador = () => {};

  // Función interna para refrescar la vista completa
  const refrescar = (paginaExplicita = null) => {
    const todosLosJuegos = usuario ? obtenerJuegos(usuario, almacenLocal) : [];
    const juegosFiltrados = filtrarJuegos(todosLosJuegos, terminoBusqueda);
    const totalResultados = juegosFiltrados.length;

    actualizarContadorResultados(elementoContador, totalResultados);
    alternarEstadoVacio(elementoVacio, totalResultados > 0);

    const paginaActual = paginaExplicita ?? obtenerPaginaUrl('pagina', ventana);
    const resultadoPaginacion = paginar(juegosFiltrados, paginaActual, porPagina);

    // Si la página calculada difiere de la solicitada (por ejemplo tras borrar elementos), actualizamos la URL
    if (resultadoPaginacion.pagina !== paginaActual) {
      fijarPaginaUrl(resultadoPaginacion.pagina, 'pagina', ventana);
    }

    if (contenedorGrid && templateJuego) {
      renderizarListadoJuegos(contenedorGrid, resultadoPaginacion.elementos, templateJuego);
    }

    if (contenedorPaginacion) {
      if (totalResultados > 0) {
        contenedorPaginacion.hidden = false;
        renderizarControlesPaginacion(contenedorPaginacion, resultadoPaginacion);
      } else {
        contenedorPaginacion.hidden = true;
        contenedorPaginacion.innerHTML = '';
      }
    }
  };

  // Conexión del buscador con retardo (debounce) y reinicio a página 1
  if (inputBuscador) {
    const ejecutarBusqueda = debounce((valor) => {
      terminoBusqueda = typeof valor === 'string' ? valor : '';
      fijarPaginaUrl(1, 'pagina', ventana);
      refrescar(1);
    }, retardoDebounce);

    const manejadorInputBusqueda = (evento) => {
      const valorActual =
        evento.target && typeof evento.target.value === 'string'
          ? evento.target.value
          : inputBuscador.value;
      ejecutarBusqueda(valorActual);
    };

    inputBuscador.addEventListener('input', manejadorInputBusqueda);
    desconectarBuscador = () => {
      ejecutarBusqueda.cancelar();
      inputBuscador.removeEventListener('input', manejadorInputBusqueda);
    };
  }

  // Conexión del modal de confirmación de borrado
  let gestorModal = null;
  if (modalBorrado) {
    gestorModal = conectarModalBorrado(modalBorrado, {
      alConfirmar: (id) => {
        if (!usuario) return;
        const exito = eliminarJuego(id, usuario, almacenLocal);
        if (exito) {
          lanzarAviso(
            contenedorGrid || documento,
            'Videojuego eliminado con éxito de tu catálogo',
            'success',
          );
          if (typeof opciones.alEliminar === 'function') {
            opciones.alEliminar(id);
          }
          refrescar();
        } else {
          lanzarAviso(
            contenedorGrid || documento,
            'Error: No se pudo eliminar el videojuego',
            'danger',
          );
        }
      },
    });

    desconectarModal = gestorModal.desconectar;
  }

  // Delegación única de eventos click en #grid-catalogo (giro bidireccional 3D y borrado)
  if (contenedorGrid) {
    const manejadorClickGrid = (evento) => {
      const btnGirar = evento.target.closest('.js-btn-girar');
      if (btnGirar && contenedorGrid.contains(btnGirar)) {
        const tarjeta = btnGirar.closest('.gv-card-game');
        if (tarjeta) {
          alternarGiroTarjeta(tarjeta, true);
          const btnVolver = tarjeta.querySelector('.js-btn-volver');
          if (btnVolver) btnVolver.focus();
        }
        return;
      }

      const btnVolver = evento.target.closest('.js-btn-volver');
      if (btnVolver && contenedorGrid.contains(btnVolver)) {
        const tarjeta = btnVolver.closest('.gv-card-game');
        if (tarjeta) {
          alternarGiroTarjeta(tarjeta, false);
          const btnAbrir = tarjeta.querySelector('.js-btn-girar');
          if (btnAbrir) btnAbrir.focus();
        }
        return;
      }

      if (!gestorModal) return;

      const btnEliminar = evento.target.closest('.js-btn-eliminar');
      if (btnEliminar && contenedorGrid.contains(btnEliminar)) {
        evento.preventDefault();
        const id = btnEliminar.dataset.id;
        const titulo = btnEliminar.dataset.titulo || '';
        if (id) {
          gestorModal.abrir(id, titulo);
        }
      }
    };

    contenedorGrid.addEventListener('click', manejadorClickGrid);
    desconectarDelegacion = () => {
      contenedorGrid.removeEventListener('click', manejadorClickGrid);
    };
  }

  // Conexión del oyente delegado de paginación
  if (contenedorPaginacion) {
    desconectarPaginacion = conectarPaginacion(contenedorPaginacion, {
      claveParametro: 'pagina',
      ventana,
      alCambiarPagina: () => {
        refrescar();
      },
    });
  }

  // Carga inicial
  refrescar();

  return function desconectar() {
    desconectarBuscador();
    desconectarDelegacion();
    desconectarModal();
    desconectarPaginacion();
  };
}

export default {
  ELEMENTOS_POR_PAGINA_DEFECTO,
  RETARDO_DEBOUNCE_DEFECTO,
  MAPA_ICONOS_CONSOLAS,
  MAPA_CLAVES_PLATAFORMA,
  normalizarTextoBusqueda,
  debounce,
  filtrarJuegos,
  alternarGiroTarjeta,
  renderizarTarjetaJuego,
  renderizarListadoJuegos,
  actualizarContadorResultados,
  alternarEstadoVacio,
  conectarModalBorrado,
  iniciarListado,
};
