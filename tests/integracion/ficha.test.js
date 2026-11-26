import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cargarPagina, escribir, salir } from '../pagina.js';
import { AlmacenFalso } from '../AlmacenFalso.js';
import { iniciarFicha } from '../../js/ficha.js';
import { iniciarSesion } from '../../js/sesion.js';
import { crearJuego, obtenerJuegos, obtenerJuegoPorId } from '../../js/juegos.js';
import { consumirAviso } from '../../js/avisos.js';

describe('integración ficha.html (validación en salida/escritura y guardado exacto)', () => {
  let almacenLocal;
  let almacenSesion;
  let destinoNavegacion;
  let desconectar;

  const mockNavegar = (url) => {
    destinoNavegacion = url;
  };

  beforeEach(() => {
    cargarPagina('ficha.html');
    almacenLocal = new AlmacenFalso();
    almacenSesion = new AlmacenFalso();
    iniciarSesion('pablo_dev', 'usuario', almacenSesion);
    destinoNavegacion = null;
    desconectar = () => {};
  });

  afterEach(() => {
    desconectar();
    document.body.innerHTML = '';
  });

  it('valida un campo al salir (blur en captura) y limpia el error al corregir escribiendo (input)', () => {
    desconectar = iniciarFicha(document, {
      almacenLocal,
      almacenSesion,
      navegar: mockNavegar,
      fechaReferencia: '2026-11-17',
    });

    const inputTitulo = document.querySelector('#ficha-titulo');
    const errorTitulo = document.querySelector('#error-ficha-titulo');
    const inputSku = document.querySelector('#ficha-sku');
    const errorSku = document.querySelector('#error-ficha-sku');

    // Al salir vacío de Título -> marca error accesible
    salir(inputTitulo);
    expect(inputTitulo.getAttribute('aria-invalid')).toBe('true');
    expect(errorTitulo.textContent).toMatch(/obligatorio/i);

    // Al escribir valor válido tras haber sido tocado -> desaparece el error al instante
    escribir(inputTitulo, 'Elden Ring');
    expect(inputTitulo.getAttribute('aria-invalid')).toBe('false');
    expect(errorTitulo.textContent).toBe('');

    // SKU con patrón erróneo -> error en salida; corregido -> válido en escritura
    escribir(inputSku, 'MAL-SKU');
    salir(inputSku);
    expect(inputSku.getAttribute('aria-invalid')).toBe('true');
    expect(errorSku.textContent).toMatch(/GAME-XXX-0000/);

    escribir(inputSku, 'GAME-RPG-0042');
    expect(inputSku.getAttribute('aria-invalid')).toBe('false');
    expect(errorSku.textContent).toBe('');
  });

  it('impide guardar con datos inválidos y guarda exactamente un juego físico con DLCs al corregir', () => {
    desconectar = iniciarFicha(document, {
      almacenLocal,
      almacenSesion,
      navegar: mockNavegar,
      fechaReferencia: '2026-11-17',
    });

    const formulario = document.querySelector('#form-ficha');
    let avisoInvalido = null;
    document.addEventListener('aviso', (e) => {
      avisoInvalido = e.detail;
    });

    // Intento de envío vacío -> bloqueado, avisa y foco en primer campo erróneo
    formulario.requestSubmit();
    expect(obtenerJuegos('pablo_dev', almacenLocal)).toHaveLength(0);
    expect(destinoNavegacion).toBeNull();
    expect(document.activeElement).toBe(document.querySelector('#ficha-titulo'));
    expect(avisoInvalido).not.toBeNull();
    expect(avisoInvalido.tipo).toBe('danger');

    // Rellenar formulario completo como Edición Física + 1 DLC
    escribir(document.querySelector('#ficha-titulo'), 'The Legend of Zelda: Tears of the Kingdom');

    const selectPlataforma = document.querySelector('#ficha-plataforma');
    selectPlataforma.value = 'Nintendo Switch';
    selectPlataforma.dispatchEvent(new Event('change', { bubbles: true }));

    escribir(document.querySelector('#ficha-sku'), 'GAME-ADV-0001');
    escribir(document.querySelector('#ficha-fecha'), '2026-05-12');
    escribir(document.querySelector('#ficha-horas'), '95');

    const selectEstado = document.querySelector('#ficha-estado');
    selectEstado.value = 'completado';
    selectEstado.dispatchEvent(new Event('change', { bubbles: true }));

    // Activar formato físico (habilita bloque físico)
    const radioFisico = document.querySelector('#formato-fisico');
    radioFisico.checked = true;
    radioFisico.dispatchEvent(new Event('change', { bubbles: true }));

    expect(document.querySelector('#bloque-fisico').hidden).toBe(false);
    expect(document.querySelector('#ficha-ean').disabled).toBe(false);

    escribir(document.querySelector('#ficha-ean'), '4020628663124');
    escribir(document.querySelector('#ficha-ubicacion'), 'EST-A-03');

    // Añadir 1 DLC dinámico desde <template id="tpl-dlc">
    document.querySelector('#btn-anadir-dlc').click();
    const filaDlc = document.querySelector('.js-fila-dlc');
    expect(filaDlc).not.toBeNull();

    escribir(filaDlc.querySelector('.js-input-dlc-nombre'), 'Master Trials');
    const selectEstadoDlc = filaDlc.querySelector('.js-select-dlc-estado');
    selectEstadoDlc.value = 'completado';
    selectEstadoDlc.dispatchEvent(new Event('change', { bubbles: true }));

    formulario.requestSubmit();

    const guardados = obtenerJuegos('pablo_dev', almacenLocal);
    expect(guardados).toHaveLength(1);
    expect(guardados[0]).toMatchObject({
      titulo: 'The Legend of Zelda: Tears of the Kingdom',
      plataforma: 'Nintendo Switch',
      sku: 'GAME-ADV-0001',
      fechaAdquisicion: '2026-05-12',
      horasJugadas: 95,
      estadoProgreso: 'completado',
      formato: 'fisico',
      codigoBarras: '4020628663124',
      ubicacionEstanteria: 'EST-A-03',
      tiendaDigital: null,
      dlcs: [{ titulo: 'Master Trials', estado: 'completado' }],
    });

    expect(consumirAviso(almacenSesion)).toEqual({
      mensaje: 'Videojuego añadido con éxito a tu catálogo',
      tipo: 'success',
    });
    expect(destinoNavegacion).toBe('listado.html');
  });

  it('carga un juego en modo edición (?id=...) y guarda los cambios conmutando a formato digital', () => {
    const juegoExistente = crearJuego(
      {
        titulo: 'Hollow Knight',
        plataforma: 'Nintendo Switch',
        formato: 'fisico',
        fechaAdquisicion: '2026-01-10',
        horasJugadas: 20,
        estadoProgreso: 'jugando',
        sku: 'GAME-IND-0010',
        codigoBarras: '4020628663124',
        ubicacionEstanteria: 'EST-B-02',
      },
      'pablo_dev',
      almacenLocal,
    );

    desconectar = iniciarFicha(document, {
      almacenLocal,
      almacenSesion,
      navegar: mockNavegar,
      fechaReferencia: '2026-11-17',
      ventana: { location: { search: `?id=${juegoExistente.id}` } },
    });

    expect(document.querySelector('#titulo-pagina-ficha').textContent).toBe(
      'Edición de Videojuego',
    );
    expect(document.querySelector('#ficha-titulo').value).toBe('Hollow Knight');
    expect(document.querySelector('#ficha-ean').value).toBe('4020628663124');

    // Cambiar a edición digital y tienda Steam
    const radioDigital = document.querySelector('#formato-digital');
    radioDigital.checked = true;
    radioDigital.dispatchEvent(new Event('change', { bubbles: true }));

    expect(document.querySelector('#bloque-fisico').disabled).toBe(true);
    expect(document.querySelector('#bloque-digital').hidden).toBe(false);

    const selectTienda = document.querySelector('#ficha-tienda');
    selectTienda.value = 'Steam';
    selectTienda.dispatchEvent(new Event('change', { bubbles: true }));

    escribir(document.querySelector('#ficha-horas'), '48');
    document.querySelector('#form-ficha').requestSubmit();

    const actualizado = obtenerJuegoPorId(juegoExistente.id, 'pablo_dev', almacenLocal);
    expect(actualizado.formato).toBe('digital');
    expect(actualizado.tiendaDigital).toBe('Steam');
    expect(actualizado.codigoBarras).toBeNull();
    expect(actualizado.ubicacionEstanteria).toBeNull();
    expect(actualizado.horasJugadas).toBe(48);
    expect(destinoNavegacion).toBe('listado.html');
  });

  it('redirige a listado.html con aviso de error si el id de la URL no existe para el usuario', () => {
    desconectar = iniciarFicha(document, {
      almacenLocal,
      almacenSesion,
      navegar: mockNavegar,
      ventana: { location: { search: '?id=gv_inexistente' } },
    });

    expect(destinoNavegacion).toBe('listado.html');
    expect(consumirAviso(almacenSesion)).toEqual({
      mensaje: 'El videojuego solicitado no existe o no pertenece a tu catálogo',
      tipo: 'danger',
    });
  });
});
