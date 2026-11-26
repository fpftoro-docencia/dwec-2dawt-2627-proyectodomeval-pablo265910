import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cargarPagina, escribir, salir } from '../pagina.js';
import { AlmacenFalso } from '../AlmacenFalso.js';
import { iniciarRegistro } from '../../js/registro.js';
import { obtenerSesion, CLAVE_SESION } from '../../js/sesion.js';
import { obtenerUsuarios } from '../../js/usuarios.js';
import { consumirAviso } from '../../js/avisos.js';

describe('integración página de registro (registro.html + iniciarRegistro)', () => {
  let almacenSesion;
  let almacenUsuarios;
  let mockNavegar;
  let desconectar;

  beforeEach(() => {
    cargarPagina('registro.html');
    almacenSesion = new AlmacenFalso();
    almacenUsuarios = new AlmacenFalso();
    mockNavegar = vi.fn();
    desconectar = () => {};
  });

  afterEach(() => {
    desconectar();
    document.body.innerHTML = '';
  });

  it('si ya hay sesión activa, redirige inmediatamente a listado.html', () => {
    almacenSesion.setItem(CLAVE_SESION, JSON.stringify({ usuario: 'ya_logueado', rol: 'usuario' }));

    desconectar = iniciarRegistro(document, {
      almacenSesion,
      almacenUsuarios,
      navegar: mockNavegar,
    });

    expect(mockNavegar).toHaveBeenCalledWith('listado.html');
  });

  it('actualiza los requisitos de clave y revalida la confirmación al cambiar la primera clave', () => {
    desconectar = iniciarRegistro(document, {
      almacenSesion,
      almacenUsuarios,
      navegar: mockNavegar,
    });

    const inputPass = document.querySelector('#reg-password');
    const inputConfirm = document.querySelector('#reg-password-confirm');
    const reqLongitud = document.querySelector('#req-longitud');
    const reqMayus = document.querySelector('#req-mayuscula');

    escribir(inputPass, 'abc');
    expect(reqLongitud.classList.contains('requisito-cumplido')).toBe(false);

    escribir(inputPass, 'Password123');
    expect(reqLongitud.classList.contains('requisito-cumplido')).toBe(true);
    expect(reqMayus.classList.contains('requisito-cumplido')).toBe(true);

    // Repetir contraseña mal -> error al salir, desaparece al corregir la primera contraseña
    escribir(inputConfirm, 'Password999');
    salir(inputConfirm);
    expect(inputConfirm.classList.contains('is-invalid')).toBe(true);
    expect(inputConfirm.getAttribute('aria-invalid')).toBe('true');

    escribir(inputPass, 'Password999');
    expect(inputConfirm.classList.contains('is-invalid')).toBe(false);
    expect(inputConfirm.getAttribute('aria-invalid')).toBe('false');
  });

  it('muestra errores Bootstrap, emite aviso y enfoca el primer campo al enviar vacío', () => {
    let avisoCapturado = null;
    document.addEventListener('aviso', (e) => {
      avisoCapturado = e.detail;
    });

    desconectar = iniciarRegistro(document, {
      almacenSesion,
      almacenUsuarios,
      navegar: mockNavegar,
    });

    const form = document.querySelector('#form-registro');
    form.requestSubmit();

    const inputUsuario = document.querySelector('#reg-usuario');
    const errorUsuario = document.querySelector('#error-reg-usuario');
    const errorEmail = document.querySelector('#error-reg-email');

    expect(inputUsuario.classList.contains('is-invalid')).toBe(true);
    expect(errorUsuario.textContent).toMatch(/3 y 15 caracteres/i);
    expect(errorEmail.textContent).toMatch(/correo electrónico válida/i);
    expect(document.activeElement).toBe(inputUsuario);
    expect(avisoCapturado).not.toBeNull();
    expect(avisoCapturado.tipo).toBe('danger');
    expect(mockNavegar).not.toHaveBeenCalled();
  });

  it('completa el registro con éxito: crea usuario, auto-login, aviso y redirección', async () => {
    desconectar = iniciarRegistro(document, {
      almacenSesion,
      almacenUsuarios,
      navegar: mockNavegar,
    });

    escribir(document.querySelector('#reg-usuario'), 'jugador_nuevo');
    escribir(document.querySelector('#reg-email'), 'nuevo@gamevault.org');
    escribir(document.querySelector('#reg-password'), 'Password2026!');
    escribir(document.querySelector('#reg-password-confirm'), 'Password2026!');

    const chkCondiciones = document.querySelector('#reg-condiciones');
    chkCondiciones.checked = true;
    chkCondiciones.dispatchEvent(new Event('change', { bubbles: true }));

    document.querySelector('#form-registro').requestSubmit();

    await new Promise((r) => setTimeout(r, 50));

    const usuarios = obtenerUsuarios(almacenUsuarios);
    expect(usuarios).toHaveLength(1);
    expect(usuarios[0].nombre).toBe('jugador_nuevo');
    expect(usuarios[0].rol).toBe('administrador');

    const sesion = obtenerSesion(almacenSesion);
    expect(sesion).toEqual({ usuario: 'jugador_nuevo', rol: 'administrador' });

    const aviso = consumirAviso(almacenSesion);
    expect(aviso).not.toBeNull();
    expect(aviso.tipo).toBe('success');
    expect(aviso.mensaje).toContain('jugador_nuevo');
    expect(mockNavegar).toHaveBeenCalledWith('listado.html');
  });
});
