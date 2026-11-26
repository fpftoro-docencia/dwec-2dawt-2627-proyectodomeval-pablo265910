/**
 * Controlador de la página de registro (`registro.html`).
 *
 * Gestiona la validación reactiva de la contraseña, control de errores accesible
 * en tiempo real mediante `conectarValidacionTiempoReal`, verificación de
 * disponibilidad del nombre de usuario, registro, auto-login, aviso diferido y redirección.
 *
 * HTML requerido en `registro.html`:
 * - `#form-registro`: Formulario de registro (`novalidate`).
 * - `#reg-usuario`: Campo de texto para el nombre de usuario (`data-validar="usuario"`).
 * - `#reg-email`: Campo de correo electrónico (`data-validar="correo"`).
 * - `#reg-password`: Campo de contraseña (`data-validar="clave"`).
 * - `#reg-password-confirm`: Campo de confirmación (`data-coincidir-con="reg-password"`).
 * - `#reg-condiciones`: Casilla de aceptación de condiciones (`data-validar="terminos"`).
 * - `#btn-submit-registro`: Botón de envío (gestiona `disabled` y clase `.loading`).
 * - `#panel-requisitos-pwd`: Contenedor del indicador visual de requisitos de contraseña:
 *   - `#req-longitud`: Indicador de mínimo 8 caracteres.
 *   - `#req-minuscula`: Indicador de letra minúscula (`\p{Ll}`).
 *   - `#req-mayuscula`: Indicador de letra mayúscula (`\p{Lu}`).
 *   - `#req-numero`: Indicador de dígito numérico (`\d`).
 * - Cajas de error accesibles: `#error-reg-usuario`, `#error-reg-email`, `#error-reg-password`,
 *   `#error-reg-password-confirm`, `#error-reg-condiciones`.
 * - `#region-avisos`: Contenedor global donde `avisos.js` renderiza eventos `aviso`.
 *
 * @module registro
 */

import { haySesion, iniciarSesion } from './sesion.js';
import { existeUsuario, registrarUsuario } from './usuarios.js';
import { guardarAviso, lanzarAviso } from './avisos.js';
import { evaluarRequisitosClave } from './validadores.js';
import { conectarValidacionTiempoReal } from './validacion.js';

/**
 * Inicializa la lógica de la página de registro.
 *
 * @listens input
 * @listens blur
 * @listens change
 * @listens submit
 * @fires aviso
 * @param {Document} [documento=document] Instancia de Document del DOM.
 * @param {Object} [opciones={}] Dobles de prueba para redirección y almacenamiento.
 * @param {Storage} [opciones.almacenSesion] Almacén de sesión (sessionStorage o doble).
 * @param {Storage} [opciones.almacenUsuarios] Almacén de usuarios (localStorage o doble).
 * @param {Function} [opciones.navegar] Función de redirección.
 * @returns {function(): void} Función para desconectar los oyentes de eventos.
 */
export function iniciarRegistro(documento = document, opciones = {}) {
  const {
    almacenSesion = typeof window !== 'undefined' ? window.sessionStorage : null,
    almacenUsuarios = typeof window !== 'undefined' ? window.localStorage : null,
    navegar = (url) => {
      if (typeof window !== 'undefined') window.location.href = url;
    },
  } = opciones;

  // 1. Guarda de ruta: si ya hay sesión iniciada, redirige al catálogo
  if (haySesion(almacenSesion)) {
    navegar('listado.html');
    return () => {};
  }

  const formulario = documento.querySelector('#form-registro');
  if (!formulario) return () => {};

  const inputUsuario = documento.querySelector('#reg-usuario');
  const inputEmail = documento.querySelector('#reg-email');
  const inputPassword = documento.querySelector('#reg-password');
  const btnSubmit = documento.querySelector('#btn-submit-registro');

  // Elementos del indicador de requisitos
  const reqLongitud = documento.querySelector('#req-longitud');
  const reqMinuscula = documento.querySelector('#req-minuscula');
  const reqMayuscula = documento.querySelector('#req-mayuscula');
  const reqNumero = documento.querySelector('#req-numero');

  // --- Indicador visual reactivo de los requisitos de contraseña ---
  const actualizarRequisitosClave = () => {
    const valor = inputPassword?.value || '';
    const evalRequisitos = evaluarRequisitosClave(valor);

    const actualizarItem = (el, cumplido) => {
      if (!el) return;
      el.classList.toggle('requisito-cumplido', cumplido);
      el.classList.toggle('text-success', cumplido);
    };

    actualizarItem(reqLongitud, evalRequisitos.longitud);
    actualizarItem(reqMinuscula, evalRequisitos.minuscula);
    actualizarItem(reqMayuscula, evalRequisitos.mayuscula);
    actualizarItem(reqNumero, evalRequisitos.digito);
  };

  if (inputPassword) {
    inputPassword.addEventListener('input', actualizarRequisitosClave);
  }

  // --- Envío del formulario con protección anti-doble envío ---
  let enviando = false;

  const alEnviarValido = async (e) => {
    e.preventDefault();

    if (enviando) return;

    const usuarioVal = inputUsuario?.value.trim() || '';
    const emailVal = inputEmail?.value.trim() || '';
    const passVal = inputPassword?.value || '';

    // Activar protección anti-doble envío
    enviando = true;
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.classList.add('loading');
    }

    try {
      // 1. Registrar usuario en localStorage (el 1º adquiere 'administrador' automáticamente)
      const nuevoUsuario = await registrarUsuario(
        {
          nombre: usuarioVal,
          correo: emailVal,
          clave: passVal,
        },
        almacenUsuarios,
      );

      // 2. Iniciar sesión automáticamente en sessionStorage
      iniciarSesion(nuevoUsuario.nombre, nuevoUsuario.rol, almacenSesion);

      // 3. Dejar aviso guardado para la siguiente página
      guardarAviso(
        `¡Bienvenido a GameVault, ${nuevoUsuario.nombre}! Tu cuenta ha sido creada con éxito.`,
        'success',
        almacenSesion,
      );

      // 4. Redirección limpia al listado
      navegar('listado.html');
    } catch (err) {
      lanzarAviso(formulario, err.message || 'Error al procesar el registro.', 'danger');
      enviando = false;
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.classList.remove('loading');
      }
    }
  };

  const desconectarValidacion = conectarValidacionTiempoReal(formulario, {
    mensajeErrorFormulario: 'Por favor, corrige los errores antes de continuar.',
    validadoresExtra: {
      usuario: (valor) =>
        existeUsuario(valor, almacenUsuarios) ? 'Este nombre de usuario ya está ocupado.' : '',
    },
    alEnviarValido,
  });

  return function desconectarRegistro() {
    if (inputPassword) {
      inputPassword.removeEventListener('input', actualizarRequisitosClave);
    }
    desconectarValidacion();
  };
}
