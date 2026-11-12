import { describe, it, expect, beforeEach } from 'vitest';
import { AlmacenFalso } from '../AlmacenFalso.js';
import { iniciarRegistro } from '../../js/registro.js';
import { obtenerSesion, CLAVE_SESION } from '../../js/sesion.js';
import { obtenerUsuarios } from '../../js/usuarios.js';
import { consumirAviso } from '../../js/avisos.js';

describe('integración página de registro (iniciarRegistro)', () => {
  let almacenSesion;
  let almacenUsuarios;
  let documento;
  let navegacionUrl;

  const mockNavegar = (url) => {
    navegacionUrl = url;
  };

  beforeEach(() => {
    almacenSesion = new AlmacenFalso();
    almacenUsuarios = new AlmacenFalso();
    navegacionUrl = null;

    // Montar árbol DOM simulado de registro.html
    document.body.innerHTML = `
      <form id="form-registro" novalidate>
        <input type="text" id="reg-usuario">
        <div id="error-reg-usuario" class="field-error"></div>

        <input type="email" id="reg-email">
        <div id="error-reg-email" class="field-error"></div>

        <input type="password" id="reg-password">
        <ul id="panel-requisitos-pwd">
          <li id="req-longitud"></li>
          <li id="req-minuscula"></li>
          <li id="req-mayuscula"></li>
          <li id="req-numero"></li>
        </ul>
        <div id="error-reg-password" class="field-error"></div>

        <input type="password" id="reg-password-confirm">
        <div id="error-reg-password-confirm" class="field-error"></div>

        <input type="checkbox" id="reg-condiciones">
        <div id="error-reg-condiciones" class="field-error"></div>

        <button type="submit" id="btn-submit-registro">Completar registro</button>
      </form>
      <div id="region-avisos"></div>
    `;

    documento = document;
  });

  it('si ya hay sesión activa, redirige inmediatamente a listado.html', () => {
    almacenSesion.setItem(CLAVE_SESION, JSON.stringify({ usuario: 'ya_logueado', rol: 'usuario' }));

    iniciarRegistro(documento, {
      almacenSesion,
      almacenUsuarios,
      navegar: mockNavegar,
    });

    expect(navegacionUrl).toBe('listado.html');
  });

  it('actualiza el panel reactivo de requisitos al escribir en el campo de contraseña', () => {
    iniciarRegistro(documento, {
      almacenSesion,
      almacenUsuarios,
      navegar: mockNavegar,
    });

    const inputPass = documento.querySelector('#reg-password');
    const reqLongitud = documento.querySelector('#req-longitud');
    const reqMayus = documento.querySelector('#req-mayuscula');

    inputPass.value = 'abc';
    inputPass.dispatchEvent(new Event('input'));
    expect(reqLongitud.classList.contains('requisito-cumplido')).toBe(false);

    inputPass.value = 'Password123';
    inputPass.dispatchEvent(new Event('input'));
    expect(reqLongitud.classList.contains('requisito-cumplido')).toBe(true);
    expect(reqMayus.classList.contains('requisito-cumplido')).toBe(true);
  });

  it('muestra errores accesibles al enviar con campos vacíos o inválidos', async () => {
    iniciarRegistro(documento, {
      almacenSesion,
      almacenUsuarios,
      navegar: mockNavegar,
    });

    const form = documento.querySelector('#form-registro');
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    const errorUsuario = documento.querySelector('#error-reg-usuario');
    const errorEmail = documento.querySelector('#error-reg-email');

    expect(errorUsuario.textContent).toMatch(/3.*15 caracteres/i);
    expect(errorEmail.textContent).toMatch(/correo electrónico válida/i);
    expect(navegacionUrl).toBeNull();
  });

  it('completa el registro con éxito: crea usuario, auto-login, aviso y redirección', async () => {
    iniciarRegistro(documento, {
      almacenSesion,
      almacenUsuarios,
      navegar: mockNavegar,
    });

    documento.querySelector('#reg-usuario').value = 'jugador_nuevo';
    documento.querySelector('#reg-email').value = 'nuevo@gamevault.org';
    documento.querySelector('#reg-password').value = 'Password2026!';
    documento.querySelector('#reg-password-confirm').value = 'Password2026!';
    documento.querySelector('#reg-condiciones').checked = true;

    const form = documento.querySelector('#form-registro');
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    // Esperar microtareas asíncronas de hashing y guardado
    await new Promise((r) => setTimeout(r, 50));

    // 1. Verificación de almacenamiento de usuarios (el 1º es admin)
    const usuarios = obtenerUsuarios(almacenUsuarios);
    expect(usuarios).toHaveLength(1);
    expect(usuarios[0].nombre).toBe('jugador_nuevo');
    expect(usuarios[0].rol).toBe('administrador');

    // 2. Verificación de auto-login en sesión
    const sesion = obtenerSesion(almacenSesion);
    expect(sesion).toEqual({ usuario: 'jugador_nuevo', rol: 'administrador' });

    // 3. Verificación de aviso diferido
    const aviso = consumirAviso(almacenSesion);
    expect(aviso).not.toBeNull();
    expect(aviso.tipo).toBe('success');
    expect(aviso.mensaje).toContain('jugador_nuevo');

    // 4. Verificación de redirección
    expect(navegacionUrl).toBe('listado.html');
  });
});
