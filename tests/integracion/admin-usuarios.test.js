import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cargarPagina, escribir } from '../pagina.js';
import { AlmacenFalso } from '../AlmacenFalso.js';
import { protegerPaginaAdmin } from '../../js/rutas.js';
import { iniciarAdminUsuarios } from '../../js/admin-usuarios.js';
import { iniciarAvisos, consumirAviso } from '../../js/avisos.js';
import { iniciarSesion } from '../../js/sesion.js';
import { registrarUsuario, obtenerUsuarios } from '../../js/usuarios.js';

describe('integración usuarios.html (control de rol y panel de administración)', () => {
  let almacenLocal;
  let almacenSesion;
  let desconectar;
  let desconectarAvisos;

  beforeEach(() => {
    cargarPagina('usuarios.html');
    almacenLocal = new AlmacenFalso();
    almacenSesion = new AlmacenFalso();
    desconectar = () => {};
    desconectarAvisos = () => {};
  });

  afterEach(() => {
    desconectar();
    desconectarAvisos();
    vi.useRealTimers();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('expulsa a un usuario sin sesión hacia index.html', () => {
    let urlRedirigida = null;
    const permitido = protegerPaginaAdmin({
      almacen: almacenSesion,
      reemplazar: (url) => {
        urlRedirigida = url;
      },
    });

    expect(permitido).toBe(false);
    expect(urlRedirigida).toBe('index.html');
  });

  it('expulsa a un usuario estándar hacia listado.html guardando un aviso diferido de denegación', () => {
    iniciarSesion('jugador_normal', 'usuario', almacenSesion);

    let urlRedirigida = null;
    const permitido = protegerPaginaAdmin({
      almacen: almacenSesion,
      reemplazar: (url) => {
        urlRedirigida = url;
      },
    });

    expect(permitido).toBe(false);
    expect(urlRedirigida).toBe('listado.html');

    const avisoDiferido = consumirAviso(almacenSesion);
    expect(avisoDiferido).not.toBeNull();
    expect(avisoDiferido.tipo).toBe('danger');
    expect(avisoDiferido.mensaje).toMatch(/permisos de Administrador/i);
  });

  it('permite al administrador gestionar roles desde usuarios.html sin poder revocarse a sí mismo', async () => {
    vi.useFakeTimers();

    await registrarUsuario(
      { nombre: 'admin_vault', correo: 'admin@gamevault.es', clave: 'Password1' },
      almacenLocal,
    );
    await registrarUsuario(
      { nombre: 'maría_gamer', correo: 'maria@gamevault.es', clave: 'Password1' },
      almacenLocal,
    );
    iniciarSesion('admin_vault', 'administrador', almacenSesion);

    let urlRedirigida = null;
    const permitido = protegerPaginaAdmin({
      almacen: almacenSesion,
      reemplazar: (url) => {
        urlRedirigida = url;
      },
    });
    expect(permitido).toBe(true);
    expect(urlRedirigida).toBeNull();

    desconectarAvisos = iniciarAvisos(document, { almacenSesion });
    desconectar = iniciarAdminUsuarios(document, { almacenLocal, almacenSesion });

    const filas = document.querySelectorAll('#tabla-usuarios-body .js-fila-usuario');
    expect(filas).toHaveLength(2);

    // El botón propio está deshabilitado con explicación
    const btnAdmin = filas[0].querySelector('.js-btn-alternar-rol');
    expect(btnAdmin.disabled).toBe(true);
    expect(btnAdmin.textContent).toContain('No puedes retirar tu propio rol');

    // Cambiar rol del segundo usuario y verificar persistencia + aviso
    const btnMaria = filas[1].querySelector('.js-btn-alternar-rol');
    expect(btnMaria.disabled).toBe(false);
    btnMaria.click();

    expect(obtenerUsuarios(almacenLocal)[1].rol).toBe('administrador');
    expect(document.querySelector('#region-avisos').textContent).toContain(
      'Rol de «maría_gamer» cambiado a administrador.',
    );

    // Filtrar con el buscador real de usuarios.html (sin tildes, con debounce)
    escribir(document.querySelector('#buscador-usuarios'), 'maria');
    vi.advanceTimersByTime(300);

    const filasFiltradas = document.querySelectorAll('#tabla-usuarios-body .js-fila-usuario');
    expect(filasFiltradas).toHaveLength(1);
    expect(filasFiltradas[0].querySelector('.js-usuario-nombre').textContent).toBe('maría_gamer');
  });
});
