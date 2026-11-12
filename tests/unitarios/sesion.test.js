import { describe, it, expect, beforeEach } from 'vitest';
import { AlmacenFalso } from '../AlmacenFalso.js';
import {
  obtenerSesion,
  iniciarSesion,
  guardarSesion,
  cerrarSesion,
  haySesion,
  esAdministrador,
  esAdmin,
  CLAVE_SESION,
} from '../../js/sesion.js';

describe('módulo sesion.js', () => {
  let almacen;

  beforeEach(() => {
    almacen = new AlmacenFalso();
  });

  describe('lectura y estado de sesión (obtenerSesion, haySesion)', () => {
    it('obtenerSesion devuelve null cuando el almacén está vacío', () => {
      expect(obtenerSesion(almacen)).toBeNull();
      expect(haySesion(almacen)).toBe(false);
    });

    it('devuelve null si se le pasa un almacén null o undefined sin lanzar excepción', () => {
      expect(obtenerSesion(null)).toBeNull();
      expect(obtenerSesion(undefined)).toBeNull();
      expect(haySesion(null)).toBe(false);
    });

    it('devuelve los datos limpios si la sesión es válida', () => {
      almacen.setItem(CLAVE_SESION, JSON.stringify({ usuario: '  samus_aran  ', rol: 'usuario' }));
      const sesion = obtenerSesion(almacen);
      expect(sesion).toEqual({ usuario: 'samus_aran', rol: 'usuario' });
      expect(haySesion(almacen)).toBe(true);
    });
  });

  describe('inicio y guardado de sesión (iniciarSesion, guardarSesion)', () => {
    it('iniciarSesion persiste usuario y rol válidos', () => {
      const sesion = iniciarSesion('pablo_dev', 'usuario', almacen);
      expect(sesion).toEqual({ usuario: 'pablo_dev', rol: 'usuario' });
      expect(almacen.getItem(CLAVE_SESION)).toBe(
        JSON.stringify({ usuario: 'pablo_dev', rol: 'usuario' }),
      );
      expect(haySesion(almacen)).toBe(true);
      expect(esAdministrador(almacen)).toBe(false);
      expect(esAdmin(almacen)).toBe(false);
    });

    it('guardarSesion es un alias funcional de iniciarSesion', () => {
      expect(guardarSesion).toBe(iniciarSesion);
      const sesion = guardarSesion('geralt_rivia', 'usuario', almacen);
      expect(sesion).toEqual({ usuario: 'geralt_rivia', rol: 'usuario' });
      expect(obtenerSesion(almacen)?.usuario).toBe('geralt_rivia');
    });

    it('iniciarSesion permite rol administrador y esAdministrador / esAdmin lo detectan', () => {
      iniciarSesion('super_admin', 'administrador', almacen);
      expect(esAdministrador(almacen)).toBe(true);
      expect(esAdmin(almacen)).toBe(true);
      const actual = obtenerSesion(almacen);
      expect(actual?.rol).toBe('administrador');
    });

    it('iniciarSesion limpia espacios en blanco en el nombre de usuario', () => {
      const sesion = iniciarSesion('   link_hyrule   ', 'usuario', almacen);
      expect(sesion.usuario).toBe('link_hyrule');
      expect(obtenerSesion(almacen)?.usuario).toBe('link_hyrule');
    });

    it('iniciarSesion rechaza nombres vacíos o que no sean cadenas', () => {
      expect(() => iniciarSesion('', 'usuario', almacen)).toThrow(
        /nombre de usuario es obligatorio/i,
      );
      expect(() => iniciarSesion('   ', 'usuario', almacen)).toThrow();
      expect(() => iniciarSesion(null, 'usuario', almacen)).toThrow();
      expect(() => iniciarSesion(undefined, 'usuario', almacen)).toThrow();
      expect(() => iniciarSesion(12345, 'usuario', almacen)).toThrow();
    });

    it('iniciarSesion rechaza roles inválidos', () => {
      expect(() => iniciarSesion('user1', 'moderador', almacen)).toThrow(
        /rol debe ser 'usuario' o 'administrador'/i,
      );
      expect(() => iniciarSesion('user1', '', almacen)).toThrow();
      expect(() => iniciarSesion('user1', null, almacen)).toThrow();
      expect(() => iniciarSesion('user1', 99, almacen)).toThrow();
    });
  });

  describe('cierre de sesión (cerrarSesion)', () => {
    it('cerrarSesion elimina los datos de sesión del almacenamiento', () => {
      iniciarSesion('pablo_dev', 'usuario', almacen);
      expect(haySesion(almacen)).toBe(true);

      cerrarSesion(almacen);
      expect(haySesion(almacen)).toBe(false);
      expect(obtenerSesion(almacen)).toBeNull();
      expect(almacen.getItem(CLAVE_SESION)).toBeNull();
    });

    it('cerrarSesion no lanza error si el almacén es nulo o indefinido', () => {
      expect(() => cerrarSesion(null)).not.toThrow();
      expect(() => cerrarSesion(undefined)).not.toThrow();
    });

    it('cerrarSesion no falla si removeItem lanza una excepción', () => {
      const almacenDefectuoso = {
        removeItem() {
          throw new Error('Almacén bloqueado');
        },
      };
      expect(() => cerrarSesion(almacenDefectuoso)).not.toThrow();
    });
  });

  describe('resiliencia y tolerancia a fallos ante datos corruptos', () => {
    it('devuelve null si el contenido no es JSON parseable', () => {
      almacen.setItem(CLAVE_SESION, '{json-invalido--corrupto');
      expect(obtenerSesion(almacen)).toBeNull();
      expect(haySesion(almacen)).toBe(false);
    });

    it('devuelve null si el JSON es un tipo primitivo (string, number, boolean)', () => {
      almacen.setItem(CLAVE_SESION, JSON.stringify('solo un texto'));
      expect(obtenerSesion(almacen)).toBeNull();

      almacen.setItem(CLAVE_SESION, JSON.stringify(12345));
      expect(obtenerSesion(almacen)).toBeNull();

      almacen.setItem(CLAVE_SESION, JSON.stringify(true));
      expect(obtenerSesion(almacen)).toBeNull();
    });

    it('devuelve null si el JSON es un array', () => {
      almacen.setItem(CLAVE_SESION, JSON.stringify(['usuario', 'administrador']));
      expect(obtenerSesion(almacen)).toBeNull();
    });

    it('devuelve null si falta la propiedad rol', () => {
      almacen.setItem(CLAVE_SESION, JSON.stringify({ usuario: 'solo_usuario' }));
      expect(obtenerSesion(almacen)).toBeNull();
    });

    it('devuelve null si falta la propiedad usuario o está vacía', () => {
      almacen.setItem(CLAVE_SESION, JSON.stringify({ rol: 'usuario' }));
      expect(obtenerSesion(almacen)).toBeNull();

      almacen.setItem(CLAVE_SESION, JSON.stringify({ usuario: '   ', rol: 'usuario' }));
      expect(obtenerSesion(almacen)).toBeNull();
    });

    it('devuelve null si el rol guardado no es usuario ni administrador', () => {
      almacen.setItem(CLAVE_SESION, JSON.stringify({ usuario: 'hacker', rol: 'superroot' }));
      expect(obtenerSesion(almacen)).toBeNull();
      expect(esAdministrador(almacen)).toBe(false);
    });

    it('devuelve null si getItem lanza una excepción', () => {
      const almacenConError = {
        getItem() {
          throw new Error('Permiso denegado en almacenamiento');
        },
      };
      expect(obtenerSesion(almacenConError)).toBeNull();
    });
  });
});
