/**
 * Controlador de la vista del catálogo y backlog de videojuegos (listado.html).
 *
 * Implementa el Requisito 15 del ENUNCIADO:
 * - Renderizado accesible de videojuegos desde `<template id="tpl-juego">` usando
 *   estrictamente textContent y atributos seguros (sin innerHTML vulnerable a XSS).
 * - Sustitución atómica del contenido de una sola vez mediante DocumentFragment.
 * - Enlace «Editar» dirigido a `ficha.html?id=...`.
 * - Botón «Eliminar» con apertura de diálogo modal nativo `<dialog>` pidiendo confirmación.
 * - Contador dinámico de videojuegos encontrados y Empty State cuando la colección esté vacía.
 * - Integración con paginación accesible (paginar.js y paginacion.js).
 * - Delegación de eventos en fase de burbuja para las acciones de las tarjetas.
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

export const ELEMENTOS_POR_PAGINA_DEFECTO = 6;

/**
 * Mapa de rutas relativas de iconos SVG vectoriales por plataforma.
 */
export const MAPA_ICONOS_CONSOLAS = {
  PC: 'img/consolas/pc.svg',
  'PlayStation 5': 'img/consolas/playstation-5.svg',
  'Xbox Series X': 'img/consolas/xbox-series-x.svg',
  'Nintendo Switch': 'img/consolas/nintendo-switch.svg',
  Retro: 'img/consolas/retro.svg',
};

/**
 * Capitaliza la primera letra de un texto.
 *
 * @param {string} str
 * @returns {string}
 */
function capitalizar(str) {
  if (typeof str !== 'string' || !str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
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

  // 1. Título y SKU
  const elTitulo = columna.querySelector('.js-juego-titulo');
  if (elTitulo) elTitulo.textContent = juego.titulo || 'Sin título';

  const elSku = columna.querySelector('.js-juego-sku');
  if (elSku) elSku.textContent = juego.sku || 'Sin SKU';

  // 2. Plataforma, Formato e Icono decorativo de consola
  const elPlataforma = columna.querySelector('.js-juego-plataforma');
  if (elPlataforma) elPlataforma.textContent = juego.plataforma || 'PC';

  const elFormato = columna.querySelector('.js-juego-formato');
  if (elFormato) {
    elFormato.textContent = juego.formato === 'fisico' ? 'Físico' : 'Digital';
  }

  const imgConsola = columna.querySelector('.js-juego-consola-img');
  if (imgConsola) {
    imgConsola.src = MAPA_ICONOS_CONSOLAS[juego.plataforma] || 'img/consolas/pc.svg';
    imgConsola.alt = ''; // Decorativa
  }

  // 3. Estado de progreso y clases badge
  const elEstado = columna.querySelector('.js-juego-estado');
  if (elEstado) {
    const estadoLimpio = (juego.estadoProgreso || 'pendiente').toLowerCase();
    elEstado.textContent = capitalizar(estadoLimpio);
    elEstado.className = `gv-badge gv-badge-${estadoLimpio} js-juego-estado`;
    elEstado.style.marginLeft = 'auto';
  }

  // 4. Horas jugadas
  const elHoras = columna.querySelector('.js-juego-horas');
  if (elHoras) elHoras.textContent = String(juego.horasJugadas ?? 0);

  // 5. Detalles condicionales (Ubicación en estantería vs Tienda digital)
  const elDetalleLabel = columna.querySelector('.js-juego-detalle-label');
  const elDetalleValor = columna.querySelector('.js-juego-detalle-valor');

  if (juego.formato === 'fisico') {
    if (elDetalleLabel) elDetalleLabel.textContent = 'Ubicación / Balda';
    if (elDetalleValor) elDetalleValor.textContent = juego.ubicacionEstanteria || 'Sin asignar';
  } else {
    if (elDetalleLabel) elDetalleLabel.textContent = 'Tienda Digital';
    if (elDetalleValor) elDetalleValor.textContent = juego.tiendaDigital || 'Digital';
  }

  // 6. Enlace de edición y botón de eliminación
  const enlaceEditar = columna.querySelector('.js-btn-editar');
  if (enlaceEditar) {
    enlaceEditar.href = `ficha.html?id=${encodeURIComponent(juego.id)}`;
    enlaceEditar.setAttribute('aria-label', `Editar ${juego.titulo || 'videojuego'}`);
  }

  const btnEliminar = columna.querySelector('.js-btn-eliminar');
  if (btnEliminar) {
    btnEliminar.dataset.id = juego.id;
    btnEliminar.dataset.titulo = juego.titulo || '';
    btnEliminar.setAttribute('aria-label', `Eliminar ${juego.titulo || 'videojuego'}`);
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
 * @param {number} total Cantidad total de videojuegos disponibles.
 */
export function actualizarContadorResultados(elementoContador, total = 0) {
  if (!elementoContador) return;

  const cantidad = Number.isInteger(total) && total >= 0 ? total : 0;
  const plural = cantidad === 1 ? 'videojuego' : 'videojuegos';

  const strong = elementoContador.querySelector('strong');
  if (strong) {
    strong.textContent = String(cantidad);
    // Preservar estructura existente asegurando el plural correcto
    elementoContador.innerHTML = `Mostrando <strong class="text-light font-mono">${cantidad}</strong> ${plural}`;
  } else {
    elementoContador.textContent = `Mostrando ${cantidad} ${plural}`;
  }
}

/**
 * Conmuta la visibilidad del bloque de estado vacío (#estado-vacio-catalogo).
 *
 * @param {HTMLElement} elementoVacio Elemento #estado-vacio-catalogo.
 * @param {boolean} tieneElementos True si existen videojuegos a mostrar; false si está vacío.
 */
export function alternarEstadoVacio(elementoVacio, tieneElementos) {
  if (!elementoVacio) return;
  elementoVacio.hidden = Boolean(tieneElementos);
}

/**
 * Conecta los manejadores del modal nativo `<dialog id="modal-borrar">`.
 *
 * Gestiona la apertura accesible con showModal(), el foco, la confirmación
 * y la cancelación sin dependencias de frameworks externos.
 *
 * @param {HTMLDialogElement} modal Elemento <dialog id="modal-borrar">.
 * @param {Object} callbacks
 * @param {Function} callbacks.alConfirmar Callback invocado con el ID a eliminar.
 * @param {Function} [callbacks.alCancelar] Callback invocado al cancelar.
 * @returns {{ abrir: Function, cerrar: Function, desconectar: Function }}
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
 * Inicializa la página listado.html.
 *
 * Orquesta:
 * 1. La carga y filtrado del catálogo del usuario activo en localStorage.
 * 2. La paginación sincronizada con la URL (?pagina=X).
 * 3. El renderizado atómico mediante <template id="tpl-juego">.
 * 4. La actualización del contador y del estado vacío.
 * 5. La delegación de eventos click en #grid-catalogo para la eliminación.
 * 6. La confirmación interactiva mediante <dialog id="modal-borrar">.
 *
 * @param {Document} [documento=document] Objeto Document inyectable.
 * @param {Object} [opciones={}] Opciones de configuración e inyección.
 * @param {Storage} [opciones.almacenLocal] Almacén de persistencia para videojuegos.
 * @param {Storage} [opciones.almacenSesion] Almacén de sesión para consultar usuario activo.
 * @param {string} [opciones.usuario] Nombre del usuario propietario de la biblioteca.
 * @param {Window | { location: { search: string, href?: string } }} [opciones.ventana] Objeto ventana.
 * @param {number} [opciones.porPagina=ELEMENTOS_POR_PAGINA_DEFECTO] Elementos por página.
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

  const usuario =
    opciones.usuario || (almacenSesion ? obtenerSesion(almacenSesion)?.usuario : '') || '';

  const contenedorGrid = documento.querySelector('#grid-catalogo');
  const templateJuego = documento.querySelector('#tpl-juego');
  const elementoContador = documento.querySelector('#contador-resultados');
  const elementoVacio = documento.querySelector('#estado-vacio-catalogo');
  const contenedorPaginacion = documento.querySelector('#paginacion-catalogo');
  const modalBorrado = documento.querySelector('#modal-borrar');

  let desconectarPaginacion = () => {};
  let desconectarModal = () => {};
  let desconectarDelegacion = () => {};

  // Función interna para refrescar la vista completa
  const refrescar = () => {
    const todosLosJuegos = usuario ? obtenerJuegos(usuario, almacenLocal) : [];
    const totalJuegos = todosLosJuegos.length;

    actualizarContadorResultados(elementoContador, totalJuegos);
    alternarEstadoVacio(elementoVacio, totalJuegos > 0);

    const paginaActual = obtenerPaginaUrl('pagina', ventana);
    const resultadoPaginacion = paginar(todosLosJuegos, paginaActual, porPagina);

    // Si la página calculada difiere de la solicitada (por ejemplo tras borrar elementos), actualizamos la URL
    if (resultadoPaginacion.pagina !== paginaActual) {
      fijarPaginaUrl(resultadoPaginacion.pagina, 'pagina', ventana);
    }

    if (contenedorGrid && templateJuego) {
      renderizarListadoJuegos(contenedorGrid, resultadoPaginacion.elementos, templateJuego);
    }

    if (contenedorPaginacion) {
      if (totalJuegos > 0) {
        contenedorPaginacion.hidden = false;
        renderizarControlesPaginacion(contenedorPaginacion, resultadoPaginacion);
      } else {
        contenedorPaginacion.hidden = true;
        contenedorPaginacion.innerHTML = '';
      }
    }
  };

  // Conexión del modal de confirmación de borrado
  if (modalBorrado) {
    const gestorModal = conectarModalBorrado(modalBorrado, {
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

    // Conexión de delegación de eventos click en #grid-catalogo para el botón Eliminar
    if (contenedorGrid) {
      const manejadorClickGrid = (evento) => {
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
    desconectarDelegacion();
    desconectarModal();
    desconectarPaginacion();
  };
}

export default {
  ELEMENTOS_POR_PAGINA_DEFECTO,
  MAPA_ICONOS_CONSOLAS,
  renderizarTarjetaJuego,
  renderizarListadoJuegos,
  actualizarContadorResultados,
  alternarEstadoVacio,
  conectarModalBorrado,
  iniciarListado,
};
