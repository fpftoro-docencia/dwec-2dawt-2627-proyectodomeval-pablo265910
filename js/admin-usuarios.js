/**
 * Controlador de la zona de administración de usuarios (`usuarios.html`).
 *
 * Implementa el Requisito 18 y 20 del ENUNCIADO:
 * - Renderizado seguro de filas de usuario desde `<template id="tpl-usuario">` usando `textContent`.
 * - Inserción atómica del cuerpo de tabla mediante `DocumentFragment`.
 * - Buscador con retardo (debounce) y normalización Unicode NFD (reutilizando `buscador.js`).
 * - Paginación común accesible y sincronizada con la URL (reutilizando `paginar.js` y `paginacion.js`).
 * - Delegación de eventos `click` en `#tabla-usuarios-body` para alternar roles (`usuario` <-> `administrador`).
 * - Protección contra auto-revocación: el botón del administrador con sesión activa se muestra
 *   deshabilitado (`disabled`) con mensaje explicativo y queda bloqueado también en capa lógica.
 *
 * HTML requerido en `usuarios.html`:
 * - `#buscador-usuarios`: Campo de búsqueda (`<input type="search">`) por nombre o correo.
 * - `#tabla-usuarios-body`: Cuerpo `<tbody>` de la tabla donde se insertan las filas de usuario.
 * - `#estado-vacio-usuarios`: Contenedor de estado vacío cuando no hay coincidencias (controlado vía `hidden`).
 * - `#paginacion-usuarios`: Contenedor de controles de paginación accesible.
 * - `#tpl-usuario`: Plantilla `<template id="tpl-usuario">` con fila `.js-fila-usuario` y los selectores:
 *   `.js-usuario-nombre`, `.js-usuario-email`, `.js-usuario-rol-badge` y `.js-btn-alternar-rol`.
 * - `#region-avisos`: Contenedor global donde `avisos.js` renderiza eventos `aviso`.
 *
 * @module admin-usuarios
 */

import { obtenerUsuarios, obtenerUsuarioPorNombre, cambiarRolUsuario } from './usuarios.js';
import { obtenerSesion } from './sesion.js';
import { lanzarAviso } from './avisos.js';
import { paginar } from './paginar.js';
import {
  obtenerPaginaUrl,
  fijarPaginaUrl,
  renderizarControlesPaginacion,
  conectarPaginacion,
} from './paginacion.js';
import { RETARDO_DEBOUNCE_DEFECTO, debounce, filtrarListaPorTexto } from './buscador.js';

/**
 * Número de filas de usuario mostradas por página por defecto.
 *
 * @type {number}
 */
export const USUARIOS_POR_PAGINA_DEFECTO = 8;

/**
 * Mensaje informativo y accesible mostrado para impedir la auto-revocación del administrador activo.
 *
 * @type {string}
 */
export const MENSAJE_AUTO_REVOCACION = 'No puedes retirar tu propio rol de administrador';

/**
 * Filtra la lista de usuarios por nombre de usuario o correo electrónico
 * ignorando mayúsculas y tildes (normalización Unicode NFD).
 *
 * @param {Array<Object>} usuarios Lista completa de usuarios registrados.
 * @param {string} [consulta=''] Texto de búsqueda introducido.
 * @returns {Array<Object>} Subconjunto de usuarios coincidentes.
 * @example
 * const filtrados = filtrarUsuarios(listaUsuarios, 'admin');
 */
export function filtrarUsuarios(usuarios, consulta = '') {
  return filtrarListaPorTexto(usuarios, consulta, (u) => [u.nombre || u.usuario, u.correo]);
}

/**
 * Configura el botón de alternancia de rol respetando la protección contra auto-revocación.
 *
 * @private
 * @param {HTMLButtonElement} boton Botón `.js-btn-alternar-rol`.
 * @param {string} nombreUsuario Nombre del usuario de la fila.
 * @param {boolean} esAdmin Si el usuario de la fila tiene rol `'administrador'`.
 * @param {boolean} esUsuarioActual Si la fila corresponde al administrador autenticado.
 * @returns {void}
 */
function configurarBotonRol(boton, nombreUsuario, esAdmin, esUsuarioActual) {
  if (!boton) return;

  boton.dataset.usuario = nombreUsuario;
  boton.dataset.rolActual = esAdmin ? 'administrador' : 'usuario';
  boton.setAttribute('aria-checked', String(esAdmin));

  if (esUsuarioActual) {
    boton.disabled = true;
    boton.setAttribute('aria-disabled', 'true');
    boton.setAttribute('title', MENSAJE_AUTO_REVOCACION);
    boton.setAttribute('aria-label', `Tu cuenta (${nombreUsuario}): ${MENSAJE_AUTO_REVOCACION}`);
    boton.textContent = 'No puedes retirar tu propio rol';
    return;
  }

  boton.disabled = false;
  boton.removeAttribute('aria-disabled');
  boton.removeAttribute('title');

  const rolDestino = esAdmin ? 'Usuario' : 'Administrador';
  boton.textContent = `Cambiar a ${rolDestino}`;
  boton.setAttribute('aria-label', `Cambiar rol de ${nombreUsuario} a ${rolDestino}`);
}

/**
 * Renderiza una fila individual de usuario a partir de `<template id="tpl-usuario">`.
 *
 * Garantiza seguridad frente a XSS asignando todos los datos de usuario con `textContent`.
 *
 * @param {Object} usuario Registro de usuario (`{ nombre, correo, rol }`).
 * @param {HTMLTemplateElement} template Plantilla `<template id="tpl-usuario">`.
 * @param {string} [usuarioActual=''] Nombre del administrador actualmente autenticado.
 * @returns {HTMLTableRowElement | null} Fila `<tr>` clonada y poblada.
 */
export function renderizarFilaUsuario(usuario, template, usuarioActual = '') {
  if (
    !usuario ||
    typeof usuario !== 'object' ||
    !template ||
    !(template instanceof HTMLTemplateElement)
  ) {
    return null;
  }

  const clon = template.content.cloneNode(true);
  const fila = clon.querySelector('.js-fila-usuario') || clon.firstElementChild;
  if (!fila) return null;

  const nombreUsuario = (usuario.nombre || usuario.usuario || '').trim();
  const esAdmin = usuario.rol === 'administrador';
  const usuarioActualLimpio = typeof usuarioActual === 'string' ? usuarioActual.trim() : '';
  const esUsuarioActual = Boolean(
    usuarioActualLimpio && nombreUsuario.toLowerCase() === usuarioActualLimpio.toLowerCase(),
  );

  const elNombre = fila.querySelector('.js-usuario-nombre');
  if (elNombre) elNombre.textContent = nombreUsuario || 'Sin nombre';

  const elCorreo = fila.querySelector('.js-usuario-email');
  if (elCorreo) elCorreo.textContent = usuario.correo || 'Sin correo';

  const elBadgeRol = fila.querySelector('.js-usuario-rol-badge');
  if (elBadgeRol) {
    elBadgeRol.textContent = esAdmin ? 'Administrador' : 'Usuario';
    elBadgeRol.className = `gv-badge ${
      esAdmin ? 'gv-badge-admin' : 'gv-badge-meta'
    } js-usuario-rol-badge`;
  }

  const btnRol = fila.querySelector('.js-btn-alternar-rol');
  configurarBotonRol(btnRol, nombreUsuario, esAdmin, esUsuarioActual);

  return fila;
}

/**
 * Sustituye el contenido del cuerpo de tabla (`#tabla-usuarios-body`) de forma atómica
 * utilizando `DocumentFragment`.
 *
 * @param {HTMLElement} cuerpoTabla Elemento `<tbody>` destino.
 * @param {Array<Object>} usuarios Lista de usuarios de la página actual.
 * @param {HTMLTemplateElement} template Plantilla `<template id="tpl-usuario">`.
 * @param {string} [usuarioActual=''] Nombre del administrador con sesión activa.
 * @returns {void}
 */
export function renderizarTablaUsuarios(cuerpoTabla, usuarios, template, usuarioActual = '') {
  if (!cuerpoTabla) return;

  cuerpoTabla.innerHTML = '';

  if (!Array.isArray(usuarios) || usuarios.length === 0 || !template) {
    return;
  }

  const fragmento = document.createDocumentFragment();
  usuarios.forEach((usuario) => {
    const fila = renderizarFilaUsuario(usuario, template, usuarioActual);
    if (fila) fragmento.appendChild(fila);
  });

  cuerpoTabla.appendChild(fragmento);
}

/**
 * Inicializa la página de administración de usuarios (`usuarios.html`).
 *
 * Orquesta:
 * 1. Lectura de la lista de usuarios y sesión activa.
 * 2. Filtrado por usuario o correo mediante `#buscador-usuarios` con debounce y reseteo a página 1.
 * 3. Paginación reutilizable sincronizada con `?pagina=X`.
 * 4. Delegación de eventos `click` en `#tabla-usuarios-body` para alternar roles con protección
 *    frente a auto-revocación.
 *
 * @listens input
 * @listens click
 * @fires aviso
 * @param {Document} [documento=document] Objeto Document inyectable.
 * @param {Object} [opciones={}] Opciones de configuración e inyección para pruebas.
 * @param {Storage} [opciones.almacenLocal] Almacén de usuarios (`localStorage`).
 * @param {Storage} [opciones.almacenSesion] Almacén de sesión (`sessionStorage`).
 * @param {string} [opciones.usuarioActual] Nombre del administrador en sesión.
 * @param {Window | Object} [opciones.ventana] Objeto ventana o doble con `location` para pruebas.
 * @param {number} [opciones.porPagina=USUARIOS_POR_PAGINA_DEFECTO] Filas por página.
 * @param {number} [opciones.retardoDebounce=RETARDO_DEBOUNCE_DEFECTO] Retardo del buscador en ms.
 * @param {Function} [opciones.alCambiarRol] Callback tras modificar un rol.
 * @returns {Function} Función de limpieza para desconectar todos los oyentes y temporizadores.
 */
export function iniciarAdminUsuarios(
  documento = typeof document !== 'undefined' ? document : null,
  opciones = {},
) {
  if (!documento) return () => {};

  const almacenLocal =
    opciones.almacenLocal ?? (typeof window !== 'undefined' ? window.localStorage : null);
  const almacenSesion =
    opciones.almacenSesion ?? (typeof window !== 'undefined' ? window.sessionStorage : null);
  const ventana = opciones.ventana ?? (typeof window !== 'undefined' ? window : null);
  const porPagina = opciones.porPagina || USUARIOS_POR_PAGINA_DEFECTO;
  const retardoDebounce = opciones.retardoDebounce ?? RETARDO_DEBOUNCE_DEFECTO;

  const sesion = almacenSesion ? obtenerSesion(almacenSesion) : null;
  const usuarioActual = opciones.usuarioActual || sesion?.usuario || '';

  const cuerpoTabla = documento.querySelector('#tabla-usuarios-body');
  const templateUsuario = documento.querySelector('#tpl-usuario');
  const elementoVacio = documento.querySelector('#estado-vacio-usuarios');
  const contenedorPaginacion = documento.querySelector('#paginacion-usuarios');
  const inputBuscador = documento.querySelector('#buscador-usuarios');

  let terminoBusqueda = inputBuscador ? inputBuscador.value : '';
  let desconectarBuscador = () => {};
  let desconectarDelegacion = () => {};
  let desconectarPaginacion = () => {};

  const refrescar = (paginaExplicita = null) => {
    const todos = obtenerUsuarios(almacenLocal);
    const filtrados = filtrarUsuarios(todos, terminoBusqueda);
    const totalResultados = filtrados.length;

    if (elementoVacio) {
      elementoVacio.hidden = totalResultados > 0;
    }

    const paginaActual = paginaExplicita ?? obtenerPaginaUrl('pagina', ventana);
    const resultadoPaginacion = paginar(filtrados, paginaActual, porPagina);

    if (resultadoPaginacion.pagina !== paginaActual) {
      fijarPaginaUrl(resultadoPaginacion.pagina, 'pagina', ventana);
    }

    if (cuerpoTabla && templateUsuario) {
      renderizarTablaUsuarios(
        cuerpoTabla,
        resultadoPaginacion.elementos,
        templateUsuario,
        usuarioActual,
      );
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

  // Buscador con debounce y reinicio automático a página 1
  if (inputBuscador) {
    const ejecutarBusqueda = debounce((valor) => {
      terminoBusqueda = typeof valor === 'string' ? valor : '';
      fijarPaginaUrl(1, 'pagina', ventana);
      refrescar(1);
    }, retardoDebounce);

    const manejadorInput = (evento) => {
      const valorActual =
        evento.target && typeof evento.target.value === 'string'
          ? evento.target.value
          : inputBuscador.value;
      ejecutarBusqueda(valorActual);
    };

    inputBuscador.addEventListener('input', manejadorInput);
    desconectarBuscador = () => {
      ejecutarBusqueda.cancelar();
      inputBuscador.removeEventListener('input', manejadorInput);
    };
  }

  // Delegación de eventos click en #tabla-usuarios-body para alternar roles
  if (cuerpoTabla) {
    const manejadorClickTabla = (evento) => {
      const btnAlternar = evento.target.closest('.js-btn-alternar-rol');
      if (!btnAlternar || !cuerpoTabla.contains(btnAlternar)) return;

      const nombreObjetivo = (btnAlternar.dataset.usuario || '').trim();
      if (!nombreObjetivo) return;

      // Salvaguarda en capa lógica frente a intentos de auto-revocación
      if (usuarioActual && nombreObjetivo.toLowerCase() === usuarioActual.trim().toLowerCase()) {
        lanzarAviso(cuerpoTabla, `${MENSAJE_AUTO_REVOCACION}.`, 'warning');
        return;
      }

      const usuarioObjetivo = obtenerUsuarioPorNombre(nombreObjetivo, almacenLocal);
      if (!usuarioObjetivo) {
        lanzarAviso(cuerpoTabla, `No se encontró el usuario «${nombreObjetivo}».`, 'danger');
        refrescar();
        return;
      }

      const nuevoRol = usuarioObjetivo.rol === 'administrador' ? 'usuario' : 'administrador';
      const actualizado = cambiarRolUsuario(nombreObjetivo, nuevoRol, almacenLocal);

      if (actualizado) {
        lanzarAviso(
          cuerpoTabla,
          `Rol de «${actualizado.nombre}» cambiado a ${actualizado.rol}.`,
          'success',
        );
        if (typeof opciones.alCambiarRol === 'function') {
          opciones.alCambiarRol(actualizado);
        }
        refrescar();
      }
    };

    cuerpoTabla.addEventListener('click', manejadorClickTabla);
    desconectarDelegacion = () => {
      cuerpoTabla.removeEventListener('click', manejadorClickTabla);
    };
  }

  // Paginación compartida con delegación de eventos
  if (contenedorPaginacion) {
    desconectarPaginacion = conectarPaginacion(contenedorPaginacion, {
      claveParametro: 'pagina',
      ventana,
      alCambiarPagina: () => {
        refrescar();
      },
    });
  }

  // Renderizado inicial
  refrescar();

  return function desconectar() {
    desconectarBuscador();
    desconectarDelegacion();
    desconectarPaginacion();
  };
}

export default {
  USUARIOS_POR_PAGINA_DEFECTO,
  MENSAJE_AUTO_REVOCACION,
  filtrarUsuarios,
  renderizarFilaUsuario,
  renderizarTablaUsuarios,
  iniciarAdminUsuarios,
};
