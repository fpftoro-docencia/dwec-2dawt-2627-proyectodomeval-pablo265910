import { describe, it, expect, beforeEach } from 'vitest';
import { AlmacenFalso } from '../AlmacenFalso.js';
import {
  obtenerSesion,
  iniciarSesion,
  cerrarSesion,
  haySesion,
  esAdministrador,
  CLAVE_SESION,
} from '../../js/sesion.js';

describe('módulo sesion.js', () => {
  let almacen;

  beforeEach(() => {
    almacen = new AlmacenFalso();
  });

  it('obtenerSesion devuelve null cuando el almacén está vacío', () => {
    expect(obtenerSesion(almacen)).toBeNull();
    expect(haySesion(almacen)).toBe(false);
  });

  it('iniciarSesion persiste usuario y rol válidos', () => {
    const sesion = iniciarSesion('pablo_dev', 'usuario', almacen);
    expect(sesion).toEqual({ usuario: 'pablo_dev', rol: 'usuario' });
    expect(almacen.getItem(CLAVE_SESION)).toBe(
      JSON.stringify({ usuario: 'pablo_dev', rol: 'usuario' })
    );
    expect(haySesion(almacen)).toBe(true);
    expect(esAdministrador(almacen)).toBe(false);
  });

  it('iniciarSesion permite rol administrador y esAdministrador lo detecta', () => {
    iniciarSesion('super_admin', 'administrador', almacen);
    expect(esAdministrador(almacen)).toBe(true);
    const actual = obtenerSesion(almacen);
    expect(actual.rol).toBe('administrador');
  });

  it('iniciarSesion rechaza roles inválidos o usuarios vacíos', () => {
    expect(() => iniciarSesion('', 'usuario', almacen)).toThrow();
    expect(() => iniciarSesion('user1', 'moderador', almacen)).toThrow();
  });

  it('obtenerSesion devuelve null si el JSON está corrompido (resiliencia)', () => {
    almacen.setItem(CLAVE_SESION, '{json-invalido--corrupto');
    expect(obtenerSesion(almacen)).toBeNull();
  });

  it('obtenerSesion devuelve null si faltan propiedades obligatorias', () => {
    almacen.setItem(CLAVE_SESION, JSON.stringify({ usuario: 'solo_usuario' }));
    expect(obtenerSesion(almacen)).toBeNull();
  });

  it('cerrarSesion elimina los datos de sesión', () => {
    iniciarSesion('pablo_dev', 'usuario', almacen);
    expect(haySesion(almacen)).toBe(true);
    cerrarSesion(almacen);
    expect(haySesion(almacen)).toBe(false);
    expect(obtenerSesion(almacen)).toBeNull();
  });
});
