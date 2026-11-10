import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AlmacenFalso } from '../AlmacenFalso.js';
import { cargarPagina } from '../pagina.js';
import {
  NOMBRE_EVENTO_AVISO,
  CLAVE_AVISO_SESION,
  normalizarTipoAviso,
  lanzarAviso,
  guardarAviso,
  consumirAviso,
  renderizarAviso,
  iniciarAvisos,
} from '../../js/avisos.js';

describe('módulo avisos.js (Requisito 8: Avisos y CustomEvent)', () => {
  let almacen;
  let limpiarAvisos;

  beforeEach(() => {
    vi.useFakeTimers();
    almacen = new AlmacenFalso();
    cargarPagina('index.html');
  });

  afterEach(() => {
    if (typeof limpiarAvisos === 'function') {
      limpiarAvisos();
      limpiarAvisos = null;
    }
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('normalizarTipoAviso', () => {
    it('normaliza sinónimos y tipos válidos a clases de Bootstrap', () => {
      expect(normalizarTipoAviso('success')).toBe('success');
      expect(normalizarTipoAviso('exito')).toBe('success');
      expect(normalizarTipoAviso('error')).toBe('danger');
      expect(normalizarTipoAviso('danger')).toBe('danger');
      expect(normalizarTipoAviso('warning')).toBe('warning');
      expect(normalizarTipoAviso('alerta')).toBe('warning');
      expect(normalizarTipoAviso('info')).toBe('info');
      expect(normalizarTipoAviso('desconocido')).toBe('info');
      expect(normalizarTipoAviso(null)).toBe('info');
    });
  });

  describe('lanzarAviso', () => {
    it('lanza un CustomEvent con nombre "aviso", bubbles=true y el detalle correcto', () => {
      const receptor = vi.fn();
      document.addEventListener(NOMBRE_EVENTO_AVISO, receptor);

      const evento = lanzarAviso(document, 'Operación realizada', 'success');

      expect(evento).toBeInstanceOf(CustomEvent);
      expect(evento.type).toBe('aviso');
      expect(evento.bubbles).toBe(true);
      expect(evento.detail).toEqual({
        mensaje: 'Operación realizada',
        tipo: 'success',
      });
      expect(receptor).toHaveBeenCalledTimes(1);

      document.removeEventListener(NOMBRE_EVENTO_AVISO, receptor);
    });

    it('el evento asciende por burbujeo desde un botón hijo hasta document', () => {
      const boton =
        document.querySelector('button[type="submit"]') || document.createElement('button');
      document.body.appendChild(boton);

      const oyenteDocumento = vi.fn();
      document.addEventListener(NOMBRE_EVENTO_AVISO, oyenteDocumento);

      lanzarAviso(boton, 'Aviso desde botón', 'danger');

      expect(oyenteDocumento).toHaveBeenCalledTimes(1);
      const eventoRecibido = oyenteDocumento.mock.calls[0][0];
      expect(eventoRecibido.detail.mensaje).toBe('Aviso desde botón');
      expect(eventoRecibido.detail.tipo).toBe('danger');

      document.removeEventListener(NOMBRE_EVENTO_AVISO, oyenteDocumento);
    });

    it('lanza excepción si el mensaje es inválido o está vacío', () => {
      expect(() => lanzarAviso(document, '')).toThrow();
      expect(() => lanzarAviso(document, '   ')).toThrow();
      expect(() => lanzarAviso(document, null)).toThrow();
    });
  });

  describe('guardarAviso y consumirAviso (persistencia entre páginas)', () => {
    it('guarda un aviso en el almacén y lo consume eliminándolo', () => {
      guardarAviso('Te has registrado con éxito', 'success', almacen);

      expect(almacen.getItem(CLAVE_AVISO_SESION)).not.toBeNull();

      const aviso = consumirAviso(almacen);
      expect(aviso).toEqual({
        mensaje: 'Te has registrado con éxito',
        tipo: 'success',
      });

      // El aviso ya fue consumido
      expect(almacen.getItem(CLAVE_AVISO_SESION)).toBeNull();
      expect(consumirAviso(almacen)).toBeNull();
    });

    it('devuelve null y limpia el almacenamiento si los datos están corruptos', () => {
      almacen.setItem(CLAVE_AVISO_SESION, 'json-invalido-{{{');
      expect(consumirAviso(almacen)).toBeNull();
      expect(almacen.getItem(CLAVE_AVISO_SESION)).toBeNull();
    });
  });

  describe('renderizarAviso', () => {
    it('crea un elemento con clases de alerta Bootstrap, texto seguro y botón de cierre', () => {
      const region = document.querySelector('#region-avisos');
      const alerta = renderizarAviso(region, 'Error en el servidor', 'danger', {
        duracionMs: 0,
        documento: document,
      });

      expect(alerta.classList.contains('alert')).toBe(true);
      expect(alerta.classList.contains('alert-danger')).toBe(true);
      expect(alerta.getAttribute('role')).toBe('alert');
      expect(region.contains(alerta)).toBe(true);

      const texto = alerta.querySelector('.gv-toast-mensaje');
      expect(texto.textContent).toBe('Error en el servidor');

      // Botón de cierre
      const btnCerrar = alerta.querySelector('button.btn-close');
      expect(btnCerrar).not.toBeNull();
      btnCerrar.click();
      expect(region.contains(alerta)).toBe(false);
    });

    it('se auto-elimina tras cumplirse el tiempo de desaparición', () => {
      const region = document.querySelector('#region-avisos');
      const alerta = renderizarAviso(region, 'Aviso temporal', 'info', {
        duracionMs: 3000,
        documento: document,
      });

      expect(region.contains(alerta)).toBe(true);
      vi.advanceTimersByTime(2999);
      expect(region.contains(alerta)).toBe(true);

      vi.advanceTimersByTime(2);
      expect(region.contains(alerta)).toBe(false);
    });
  });

  describe('iniciarAvisos (oyente único en document e integración)', () => {
    it('captura eventos de aviso disparados desde cualquier parte y los muestra en la región', () => {
      limpiarAvisos = iniciarAvisos(document, { almacen, duracionMs: 0 });

      const boton = document.querySelector('button');
      lanzarAviso(boton, '¡Partida guardada!', 'success');

      const region = document.querySelector('#region-avisos');
      const alerta = region.querySelector('.alert-success');
      expect(alerta).not.toBeNull();
      expect(alerta.textContent).toContain('¡Partida guardada!');
    });

    it('muestra automáticamente el aviso guardado en sesión al iniciar la página', () => {
      guardarAviso('Bienvenido de nuevo', 'info', almacen);

      limpiarAvisos = iniciarAvisos(document, { almacen, duracionMs: 0 });

      const region = document.querySelector('#region-avisos');
      const alerta = region.querySelector('.alert-info');
      expect(alerta).not.toBeNull();
      expect(alerta.textContent).toContain('Bienvenido de nuevo');
      expect(almacen.getItem(CLAVE_AVISO_SESION)).toBeNull();
    });

    it('la función de limpieza cancela el oyente en document', () => {
      const limpieza = iniciarAvisos(document, { almacen, duracionMs: 0 });
      limpieza();

      lanzarAviso(document, 'Mensaje ignorado', 'warning');

      const region = document.querySelector('#region-avisos');
      expect(region.querySelector('.alert')).toBeNull();
    });
  });
});
