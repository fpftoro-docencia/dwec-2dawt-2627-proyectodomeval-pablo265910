/**
 * Controlador de la página de inicio de sesión (`index.html`).
 *
 * Gestiona la autenticación de usuarios mediante resúmenes SHA-256,
 * validación en tiempo real con `conectarValidacionTiempoReal`,
 * protección anti-doble envío, vaciado de contraseña y foco ante error,
 * y redirección automática si ya existe sesión activa.
 *
 * HTML requerido en `index.html`:
 * - `#form-login`: Formulario principal de inicio de sesión (`novalidate`).
 * - `#login-usuario`: Campo de texto para el nombre de usuario (`required`).
 * - `#login-password`: Campo de contraseña (`required`).
 * - `#btn-submit-login`: Botón de envío (gestiona `disabled` y clase `.loading`).
 * - `#error-login-usuario`: Caja de error accesible asociada a `#login-usuario`.
 * - `#error-login-password`: Caja de error accesible asociada a `#login-password`.
 * - `#error-login-general`: Caja de error general para fallos de autenticación.
 * - `#region-avisos`: Contenedor global donde `avisos.js` renderiza eventos `aviso`.
 *
 * @module login
 */

import { haySesion, iniciarSesion } from './sesion.js';
import { autenticarUsuario } from './usuarios.js';
import { guardarAviso, lanzarAviso } from './avisos.js';
import { conectarValidacionTiempoReal } from './validacion.js';

/**
 * Inicializa la lógica de inicio de sesión.
 *
 * @listens blur
 * @listens input
 * @listens change
 * @listens submit
 * @fires aviso
 * @param {Document} [documento=document] Instancia de Document del DOM.
 * @param {Object} [opciones={}] Dobles de prueba para redirección y almacenamiento.
 * @param {Storage} [opciones.almacenSesion] Almacén de sesión (sessionStorage o doble).
 * @param {Storage} [opciones.almacenUsuarios] Almacén de usuarios (localStorage o doble).
 * @param {Function} [opciones.navegar] Función de navegación/redirección.
 * @returns {function(): void} Función para desconectar los oyentes de eventos.
 */
export function iniciarLogin(documento = document, opciones = {}) {
  const {
    almacenSesion = typeof window !== 'undefined' ? window.sessionStorage : null,
    almacenUsuarios = typeof window !== 'undefined' ? window.localStorage : null,
    navegar = (url) => {
      if (typeof window !== 'undefined') window.location.href = url;
    },
  } = opciones;

  // 1. Guarda de ruta: si ya hay sesión activa, va directamente al listado
  if (haySesion(almacenSesion)) {
    navegar('listado.html');
    return () => {};
  }

  const formulario = documento.querySelector('#form-login');
  if (!formulario) return () => {};

  const inputUsuario = documento.querySelector('#login-usuario');
  const inputPassword = documento.querySelector('#login-password');
  const btnSubmit = documento.querySelector('#btn-submit-login');
  const errorGeneral = documento.querySelector('#error-login-general');

  const limpiarErrorGeneral = () => {
    if (errorGeneral) {
      errorGeneral.textContent = '';
      errorGeneral.classList.remove('d-block');
    }
  };

  formulario.addEventListener('input', limpiarErrorGeneral);

  // Envío del formulario y autenticación con protección anti-doble envío
  let enviando = false;

  const alEnviarValido = async (e) => {
    e.preventDefault();

    // Si ya se está procesando un envío, ignorar clics o intros adicionales
    if (enviando) return;

    const usuarioVal = inputUsuario?.value.trim() || '';
    const passVal = inputPassword?.value || '';

    limpiarErrorGeneral();

    // Activar estado de envío y bloquear nuevo envío
    enviando = true;
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.classList.add('loading');
    }

    try {
      // Autenticar credenciales comparando SHA-256
      const usuarioAutenticado = await autenticarUsuario(usuarioVal, passVal, almacenUsuarios);

      if (usuarioAutenticado) {
        // Iniciar sesión
        iniciarSesion(usuarioAutenticado.nombre, usuarioAutenticado.rol, almacenSesion);

        // Guardar aviso de bienvenida para listado.html
        guardarAviso(
          `¡Bienvenido de nuevo, ${usuarioAutenticado.nombre}!`,
          'success',
          almacenSesion,
        );

        // Redirigir al catálogo
        navegar('listado.html');
      } else {
        // Credenciales incorrectas:
        // 1. Desbloquear estado de envío
        enviando = false;
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.classList.remove('loading');
        }

        // 2. Vaciar el campo de contraseña y devolverle el foco
        if (inputPassword) {
          inputPassword.value = '';
          inputPassword.focus();
        }

        // 3. Mostrar error accesible y lanzar evento de aviso
        const mensajeError = 'El usuario o la contraseña no son correctos.';
        if (errorGeneral) {
          errorGeneral.textContent = mensajeError;
          errorGeneral.classList.add('d-block');
        }
        lanzarAviso(formulario, mensajeError, 'danger');
      }
    } catch (err) {
      enviando = false;
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.classList.remove('loading');
      }
      const mensaje = err.message || 'Error inesperado al iniciar sesión.';
      if (errorGeneral) {
        errorGeneral.textContent = mensaje;
        errorGeneral.classList.add('d-block');
      }
      lanzarAviso(formulario, mensaje, 'danger');
    }
  };

  const desconectarValidacion = conectarValidacionTiempoReal(formulario, {
    mensajeErrorFormulario: 'Por favor, introduce tu usuario y contraseña para entrar.',
    alEnviarInvalido: limpiarErrorGeneral,
    alEnviarValido,
  });

  return function desconectarLogin() {
    formulario.removeEventListener('input', limpiarErrorGeneral);
    desconectarValidacion();
  };
}
