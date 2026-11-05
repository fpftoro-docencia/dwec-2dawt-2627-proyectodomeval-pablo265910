import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AlmacenFalso } from '../AlmacenFalso.js';
import { cargarPagina } from '../pagina.js';
import { iniciarSesion } from '../../js/sesion.js';
import { iniciarCabecera } from '../../js/cabecera.js';

describe('componente cabecera.js', () => {
  let almacen;

  beforeEach(() => {
    almacen = new AlmacenFalso();
    cargarPagina('listado.html');
  });

  it('muestra datos de usuario y oculta enlace de administración para rol usuario', () => {
    iniciarSesion('jugador_normal', 'usuario', almacen);
    iniciarCabecera(document, { almacen });

    const nombre = document.querySelector('#usuario-activo-nombre');
    const rol = document.querySelector('#usuario-activo-rol');
    const itemAdmin = document.querySelector('#nav-item-admin');

    expect(nombre.textContent).toBe('jugador_normal');
    expect(rol.textContent).toBe('Usuario');
    expect(rol.classList.contains('steam-badge--rol-usuario')).toBe(true);
    expect(itemAdmin.hidden).toBe(true);
  });

  it('muestra enlace de administración para rol administrador', () => {
    iniciarSesion('admin_master', 'administrador', almacen);
    iniciarCabecera(document, { almacen });

    const nombre = document.querySelector('#usuario-activo-nombre');
    const rol = document.querySelector('#usuario-activo-rol');
    const itemAdmin = document.querySelector('#nav-item-admin');

    expect(nombre.textContent).toBe('admin_master');
    expect(rol.textContent).toBe('Administrador');
    expect(rol.classList.contains('steam-badge--rol-admin')).toBe(true);
    expect(itemAdmin.hidden).toBe(false);
  });

  it('el botón de cerrar sesión elimina la sesión y llama a la navegación', () => {
    iniciarSesion('jugador_salir', 'usuario', almacen);
    const alCerrarSesion = vi.fn();
    iniciarCabecera(document, { almacen, alCerrarSesion });

    const btnCerrar = document.querySelector('#btn-cerrar-sesion');
    btnCerrar.click();

    expect(almacen.getItem('gamevault_sesion')).toBeNull();
    expect(alCerrarSesion).toHaveBeenCalledTimes(1);
  });
});
