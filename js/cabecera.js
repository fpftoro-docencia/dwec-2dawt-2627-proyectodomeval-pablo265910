/**
 * Componente de cabecera común y barra de navegación para páginas privadas
 * (`listado.html`, `ficha.html`, `usuarios.html`).
 *
 * Muestra el usuario activo, su rol y controla la visibilidad del enlace
 * a la zona de administración. Gestiona el cierre de sesión.
 *
 * Selectores HTML utilizados en la cabecera de las páginas privadas:
 * - `#panel-sesion`: Contenedor del panel de sesión (se oculta con `hidden` si no hay sesión).
 * - `#sesion-usuario`, `#usuario-activo-nombre`: Elemento donde se muestra el nombre del usuario activo (o `'Invitado'`).
 * - `#sesion-rol`, `#usuario-activo-rol`: Insignia de rol (`'Administrador'`, `'Usuario'` o `'Sin sesión'`).
 * - `#nav-link-admin`, `#enlace-admin`, `#nav-item-admin`: Enlace de navegación hacia `usuarios.html`, visible solo para administradores.
 * - `#btn-cerrar-sesion`: Botón encargado de cerrar sesión al hacer clic.
 *
 * @module cabecera
 */

import { obtenerSesion, cerrarSesion } from './sesion.js';

/**
 * Inicializa la cabecera común de la aplicación en el documento dado.
 * Sincroniza el nombre de usuario, la insignia de rol, la visibilidad de `#panel-sesion`
 * y `#nav-link-admin`, y asocia el evento `click` en `#btn-cerrar-sesion`.
 *
 * @listens click
 * @param {Document} [documento=document] Árbol DOM donde se encuentra la cabecera.
 * @param {Object} [opciones={}] Configuración y dobles de prueba para navegación y almacenamiento.
 * @param {Storage} [opciones.almacen=window.sessionStorage] Almacén de sesión.
 * @param {function(): void} [opciones.alCerrarSesion] Función a ejecutar tras cerrar sesión.
 * @returns {void}
 */
export function iniciarCabecera(documento = document, opciones = {}) {
  const {
    almacen = typeof window !== 'undefined' ? window.sessionStorage : null,
    alCerrarSesion = () => {
      if (typeof window !== 'undefined' && window.location) {
        if (typeof window.location.replace === 'function') {
          window.location.replace('index.html');
        } else {
          window.location.href = 'index.html';
        }
      }
    },
  } = opciones;

  const sesion = obtenerSesion(almacen);
  const esAdmin = Boolean(sesion && sesion.rol === 'administrador');

  // 1. Mostrar nombre de usuario activo
  const nombreElemento = documento.querySelector('#sesion-usuario, #usuario-activo-nombre');
  if (nombreElemento) {
    nombreElemento.textContent = sesion ? sesion.usuario : 'Invitado';
  }

  // 2. Mostrar insignia de rol (Usuario vs Administrador)
  const rolElemento = documento.querySelector('#sesion-rol, #usuario-activo-rol');
  if (rolElemento) {
    if (sesion) {
      rolElemento.textContent = esAdmin ? 'Administrador' : 'Usuario';
      rolElemento.classList.toggle('gv-badge-admin', esAdmin);
      rolElemento.classList.toggle('gv-badge-meta', !esAdmin);
      rolElemento.classList.toggle('steam-badge--rol-admin', esAdmin);
      rolElemento.classList.toggle('steam-badge--rol-usuario', !esAdmin);
    } else {
      rolElemento.textContent = 'Sin sesión';
      rolElemento.classList.remove('gv-badge-admin', 'steam-badge--rol-admin');
      rolElemento.classList.add('gv-badge-meta', 'steam-badge--rol-usuario');
    }
  }

  // 3. Panel de sesión (si existe, se muestra u oculta según haya sesión activa)
  const panelSesion = documento.querySelector('#panel-sesion');
  if (panelSesion) {
    panelSesion.hidden = !sesion;
  }

  // 4. Control de visibilidad del enlace de Administración (solo administradores)
  const enlaceAdmin = documento.querySelector('#nav-link-admin, #enlace-admin, #nav-item-admin');
  if (enlaceAdmin) {
    enlaceAdmin.hidden = !esAdmin;
  }

  // 5. Manejador para el botón de cerrar sesión
  const btnCerrarSesion = documento.querySelector('#btn-cerrar-sesion');
  if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', () => {
      cerrarSesion(almacen);
      alCerrarSesion();
    });
  }
}
