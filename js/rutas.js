/**
 * Control de acceso y protección de rutas privadas (Requisito 7).
 *
 * Protege las páginas que requieren autenticación previa o rol de administrador,
 * redirigiendo mediante `location.replace` para no dejar la página protegida en el
 * historial de navegación:
 * - `listado.html` y `ficha.html`: páginas privadas estándar protegidas mediante {@link module:rutas.protegerPaginaPrivada}.
 * - `usuarios.html`: página exclusiva de administración protegida mediante {@link module:rutas.protegerPaginaAdmin}.
 *
 * Cuando un usuario autenticado sin rol de administrador intenta acceder a `usuarios.html`,
 * se persiste un aviso diferido de error en `sessionStorage` (clave `gamevault_aviso_pendiente`
 * mediante {@link module:avisos.guardarAviso}) antes de redirigir a `listado.html` para que el
 * mensaje se muestre tras la navegación.
 *
 * @module rutas
 */

import { haySesion, esAdministrador } from './sesion.js';
import { guardarAviso } from './avisos.js';

/**
 * Protege una página privada estándar (`listado.html`, `ficha.html`).
 * Si no existe sesión activa en `sessionStorage`, redirige inmediatamente a `'index.html'`.
 *
 * @param {Object} [opciones={}] Configuración e inyección de dependencias.
 * @param {Storage} [opciones.almacen=window.sessionStorage] Almacén de sesión a consultar.
 * @param {function(string): void} [opciones.reemplazar] Función de reemplazo de URL (`location.replace`).
 * @returns {boolean} `true` si el usuario tiene acceso permitido, `false` si es redirigido.
 */
export function protegerPaginaPrivada(opciones = {}) {
  const {
    almacen = typeof window !== 'undefined' ? window.sessionStorage : null,
    reemplazar = (url) => {
      if (typeof window !== 'undefined' && window.location) {
        window.location.replace(url);
      }
    },
  } = opciones;

  if (!haySesion(almacen)) {
    reemplazar('index.html');
    return false;
  }

  return true;
}

/**
 * Protege una página privada exclusiva de administradores (`usuarios.html`).
 * - Sin sesión activa: redirige a `'index.html'`.
 * - Con sesión activa pero sin rol `'administrador'`: guarda un aviso diferido de error en
 *   `sessionStorage` (`gamevault_aviso_pendiente`) y redirige a `'listado.html'`.
 *
 * @param {Object} [opciones={}] Configuración e inyección de dependencias.
 * @param {Storage} [opciones.almacen=window.sessionStorage] Almacén de sesión a consultar y donde guardar el aviso diferido.
 * @param {function(string): void} [opciones.reemplazar] Función de reemplazo de URL (`location.replace`).
 * @returns {boolean} `true` si el usuario es administrador y tiene acceso, `false` si es redirigido.
 */
export function protegerPaginaAdmin(opciones = {}) {
  const {
    almacen = typeof window !== 'undefined' ? window.sessionStorage : null,
    reemplazar = (url) => {
      if (typeof window !== 'undefined' && window.location) {
        window.location.replace(url);
      }
    },
  } = opciones;

  if (!haySesion(almacen)) {
    reemplazar('index.html');
    return false;
  }

  if (!esAdministrador(almacen)) {
    guardarAviso(
      'Acceso denegado: se requieren permisos de Administrador para acceder a esa sección.',
      'danger',
      almacen,
    );
    reemplazar('listado.html');
    return false;
  }

  return true;
}
