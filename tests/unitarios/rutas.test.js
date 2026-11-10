import { describe, it, expect, beforeEach } from 'vitest';
import { AlmacenFalso } from '../AlmacenFalso.js';
import { protegerPaginaPrivada, protegerPaginaAdmin } from '../../js/rutas.js';
import { iniciarSesion } from '../../js/sesion.js';
import { consumirAviso } from '../../js/avisos.js';

describe('módulo rutas.js (protección de páginas privadas)', () => {
  let almacen;
  let urlReemplazada;

  const mockReemplazar = (url) => {
    urlReemplazada = url;
  };

  beforeEach(() => {
    almacen = new AlmacenFalso();
    urlReemplazada = null;
  });

  describe('protegerPaginaPrivada', () => {
    it('sin sesión activa redirige a index.html con location.replace', () => {
      const acceso = protegerPaginaPrivada({
        almacen,
        reemplazar: mockReemplazar,
      });

      expect(acceso).toBe(false);
      expect(urlReemplazada).toBe('index.html');
    });

    it('con sesión de usuario permite el acceso y no redirige', () => {
      iniciarSesion('pablo_dev', 'usuario', almacen);

      const acceso = protegerPaginaPrivada({
        almacen,
        reemplazar: mockReemplazar,
      });

      expect(acceso).toBe(true);
      expect(urlReemplazada).toBeNull();
    });

    it('con sesión de administrador permite el acceso y no redirige', () => {
      iniciarSesion('super_admin', 'administrador', almacen);

      const acceso = protegerPaginaPrivada({
        almacen,
        reemplazar: mockReemplazar,
      });

      expect(acceso).toBe(true);
      expect(urlReemplazada).toBeNull();
    });
  });

  describe('protegerPaginaAdmin', () => {
    it('sin sesión activa redirige a index.html', () => {
      const acceso = protegerPaginaAdmin({
        almacen,
        reemplazar: mockReemplazar,
      });

      expect(acceso).toBe(false);
      expect(urlReemplazada).toBe('index.html');
      expect(consumirAviso(almacen)).toBeNull();
    });

    it('con sesión de usuario no administrador redirige a listado.html y guarda aviso de error', () => {
      iniciarSesion('jugador_comun', 'usuario', almacen);

      const acceso = protegerPaginaAdmin({
        almacen,
        reemplazar: mockReemplazar,
      });

      expect(acceso).toBe(false);
      expect(urlReemplazada).toBe('listado.html');

      // Verifica que se guardó el aviso de error para la página destino
      const aviso = consumirAviso(almacen);
      expect(aviso).not.toBeNull();
      expect(aviso?.tipo).toBe('danger');
      expect(aviso?.mensaje).toMatch(/permisos de Administrador/i);
    });

    it('con sesión de administrador permite el acceso a usuarios.html', () => {
      iniciarSesion('admin_jefe', 'administrador', almacen);

      const acceso = protegerPaginaAdmin({
        almacen,
        reemplazar: mockReemplazar,
      });

      expect(acceso).toBe(true);
      expect(urlReemplazada).toBeNull();
      expect(consumirAviso(almacen)).toBeNull();
    });
  });
});
