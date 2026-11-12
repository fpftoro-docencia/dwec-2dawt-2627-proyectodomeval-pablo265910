import { describe, it, expect, beforeEach } from 'vitest';
import { AlmacenFalso } from '../AlmacenFalso.js';
import { iniciarLogin } from '../../js/login.js';
import { registrarUsuario } from '../../js/usuarios.js';
import { obtenerSesion, CLAVE_SESION } from '../../js/sesion.js';
import { consumirAviso } from '../../js/avisos.js';

describe('integración página de login (iniciarLogin)', () => {
  let almacenSesion;
  let almacenUsuarios;
  let documento;
  let navegacionUrl;

  const mockNavegar = (url) => {
    navegacionUrl = url;
  };

  beforeEach(async () => {
    almacenSesion = new AlmacenFalso();
    almacenUsuarios = new AlmacenFalso();
    navegacionUrl = null;

    // Crear un usuario de prueba en localStorage
    await registrarUsuario(
      {
        nombre: 'pablo_dev',
        correo: 'pablo@gamevault.org',
        clave: 'Password123',
      },
      almacenUsuarios,
    );

    // Montar árbol DOM simulado de index.html
    document.body.innerHTML = `
      <form id="form-login" novalidate>
        <input type="text" id="login-usuario">
        <div id="error-login-usuario" class="field-error"></div>

        <input type="password" id="login-password">
        <div id="error-login-password" class="field-error"></div>

        <div id="error-login-general" class="field-error"></div>

        <button type="submit" id="btn-submit-login">Entrar</button>
      </form>
      <div id="region-avisos"></div>
    `;

    documento = document;
  });

  it('si ya hay sesión activa, redirige inmediatamente a listado.html', () => {
    almacenSesion.setItem(CLAVE_SESION, JSON.stringify({ usuario: 'ya_logueado', rol: 'usuario' }));

    iniciarLogin(documento, {
      almacenSesion,
      almacenUsuarios,
      navegar: mockNavegar,
    });

    expect(navegacionUrl).toBe('listado.html');
  });

  it('muestra errores si se envían campos vacíos', async () => {
    iniciarLogin(documento, {
      almacenSesion,
      almacenUsuarios,
      navegar: mockNavegar,
    });

    const form = documento.querySelector('#form-login');
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    const errorUser = documento.querySelector('#error-login-usuario');
    const errorPass = documento.querySelector('#error-login-password');

    expect(errorUser.textContent).toMatch(/introduce tu nombre de usuario/i);
    expect(errorPass.textContent).toMatch(/introduce tu contraseña/i);
    expect(navegacionUrl).toBeNull();
  });

  it('con contraseña incorrecta: muestra error, vacía contraseña y no navega', async () => {
    let eventoAvisoCapturado = null;
    documento.addEventListener('aviso', (e) => {
      eventoAvisoCapturado = e.detail;
    });

    iniciarLogin(documento, {
      almacenSesion,
      almacenUsuarios,
      navegar: mockNavegar,
    });

    const inputUser = documento.querySelector('#login-usuario');
    const inputPass = documento.querySelector('#login-password');

    inputUser.value = 'pablo_dev';
    inputPass.value = 'ClaveEquivocada99';

    const form = documento.querySelector('#form-login');
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    await new Promise((r) => setTimeout(r, 60));

    // 1. Vacía el campo de contraseña
    expect(inputPass.value).toBe('');

    // 2. Muestra mensaje de error
    const errorGeneral = documento.querySelector('#error-login-general');
    expect(errorGeneral.textContent).toMatch(/usuario o la contraseña no son correctos/i);

    // 3. Emite evento de aviso de error
    expect(eventoAvisoCapturado).not.toBeNull();
    expect(eventoAvisoCapturado.tipo).toBe('danger');

    // 4. No hay sesión ni redirección
    expect(obtenerSesion(almacenSesion)).toBeNull();
    expect(navegacionUrl).toBeNull();
  });

  it('con credenciales correctas: inicia sesión, guarda aviso y redirige a listado.html', async () => {
    iniciarLogin(documento, {
      almacenSesion,
      almacenUsuarios,
      navegar: mockNavegar,
    });

    documento.querySelector('#login-usuario').value = 'pablo_dev';
    documento.querySelector('#login-password').value = 'Password123';

    const form = documento.querySelector('#form-login');
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    await new Promise((r) => setTimeout(r, 60));

    // 1. Sesión activa en sessionStorage
    const sesion = obtenerSesion(almacenSesion);
    expect(sesion).not.toBeNull();
    expect(sesion.usuario).toBe('pablo_dev');
    expect(sesion.rol).toBe('administrador'); // Primer usuario registrado es admin

    // 2. Aviso diferido para la página siguiente
    const aviso = consumirAviso(almacenSesion);
    expect(aviso).not.toBeNull();
    expect(aviso.tipo).toBe('success');
    expect(aviso.mensaje).toContain('pablo_dev');

    // 3. Redirección a listado.html
    expect(navegacionUrl).toBe('listado.html');
  });
});
