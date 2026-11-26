import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cargarPagina, escribir, salir } from '../pagina.js';
import { AlmacenFalso } from '../AlmacenFalso.js';
import { iniciarLogin } from '../../js/login.js';
import { registrarUsuario } from '../../js/usuarios.js';
import { obtenerSesion, CLAVE_SESION } from '../../js/sesion.js';
import { consumirAviso } from '../../js/avisos.js';

describe('integración página de login (index.html + iniciarLogin)', () => {
  let almacenSesion;
  let almacenUsuarios;
  let mockNavegar;
  let desconectar;

  beforeEach(async () => {
    cargarPagina('index.html');
    almacenSesion = new AlmacenFalso();
    almacenUsuarios = new AlmacenFalso();
    mockNavegar = vi.fn();
    desconectar = () => {};

    await registrarUsuario(
      {
        nombre: 'pablo_dev',
        correo: 'pablo@gamevault.org',
        clave: 'Password123',
      },
      almacenUsuarios,
    );
  });

  afterEach(() => {
    desconectar();
    document.body.innerHTML = '';
  });

  it('si ya hay sesión activa, redirige inmediatamente a listado.html', () => {
    almacenSesion.setItem(CLAVE_SESION, JSON.stringify({ usuario: 'ya_logueado', rol: 'usuario' }));

    desconectar = iniciarLogin(document, {
      almacenSesion,
      almacenUsuarios,
      navegar: mockNavegar,
    });

    expect(mockNavegar).toHaveBeenCalledWith('listado.html');
  });

  it('valida al salir (blur), limpia al escribir (input), avisa y enfoca el primer error al enviar', () => {
    let avisoCapturado = null;
    document.addEventListener('aviso', (e) => {
      avisoCapturado = e.detail;
    });

    desconectar = iniciarLogin(document, {
      almacenSesion,
      almacenUsuarios,
      navegar: mockNavegar,
    });

    const inputUser = document.querySelector('#login-usuario');
    const errorUser = document.querySelector('#error-login-usuario');
    const errorPass = document.querySelector('#error-login-password');
    const form = document.querySelector('#form-login');

    // Validación al salir vacío (blur en captura) y limpieza en vivo (input)
    salir(inputUser);
    expect(inputUser.classList.contains('is-invalid')).toBe(true);
    expect(errorUser.textContent).toMatch(/introduce tu nombre de usuario/i);

    escribir(inputUser, 'pablo_dev');
    expect(inputUser.classList.contains('is-invalid')).toBe(false);
    expect(errorUser.textContent).toBe('');

    // Envío con campos vacíos -> aviso, clases Bootstrap y foco en el primer campo inválido
    escribir(inputUser, '');
    form.requestSubmit();

    expect(errorUser.textContent).toMatch(/introduce tu nombre de usuario/i);
    expect(errorPass.textContent).toMatch(/introduce tu contraseña/i);
    expect(document.activeElement).toBe(inputUser);
    expect(avisoCapturado).not.toBeNull();
    expect(avisoCapturado.tipo).toBe('danger');
    expect(mockNavegar).not.toHaveBeenCalled();
  });

  it('con contraseña incorrecta: muestra error, vacía contraseña, da foco y no navega', async () => {
    let eventoAvisoCapturado = null;
    document.addEventListener('aviso', (e) => {
      eventoAvisoCapturado = e.detail;
    });

    desconectar = iniciarLogin(document, {
      almacenSesion,
      almacenUsuarios,
      navegar: mockNavegar,
    });

    const inputUser = document.querySelector('#login-usuario');
    const inputPass = document.querySelector('#login-password');
    const form = document.querySelector('#form-login');

    escribir(inputUser, 'pablo_dev');
    escribir(inputPass, 'ClaveEquivocada99');
    form.requestSubmit();

    await new Promise((r) => setTimeout(r, 60));

    expect(inputPass.value).toBe('');
    expect(document.activeElement).toBe(inputPass);

    const errorGeneral = document.querySelector('#error-login-general');
    expect(errorGeneral.textContent).toMatch(/usuario o la contraseña no son correctos/i);
    expect(eventoAvisoCapturado).not.toBeNull();
    expect(eventoAvisoCapturado.tipo).toBe('danger');
    expect(obtenerSesion(almacenSesion)).toBeNull();
    expect(mockNavegar).not.toHaveBeenCalled();
  });

  it('con credenciales correctas: inicia sesión, guarda aviso y redirige a listado.html', async () => {
    desconectar = iniciarLogin(document, {
      almacenSesion,
      almacenUsuarios,
      navegar: mockNavegar,
    });

    escribir(document.querySelector('#login-usuario'), 'pablo_dev');
    escribir(document.querySelector('#login-password'), 'Password123');
    document.querySelector('#form-login').requestSubmit();

    await new Promise((r) => setTimeout(r, 60));

    const sesion = obtenerSesion(almacenSesion);
    expect(sesion).not.toBeNull();
    expect(sesion.usuario).toBe('pablo_dev');
    expect(sesion.rol).toBe('administrador');

    const aviso = consumirAviso(almacenSesion);
    expect(aviso).not.toBeNull();
    expect(aviso.tipo).toBe('success');
    expect(aviso.mensaje).toContain('pablo_dev');
    expect(mockNavegar).toHaveBeenCalledWith('listado.html');
  });
});
