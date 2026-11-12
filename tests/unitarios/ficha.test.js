import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AlmacenFalso } from '../AlmacenFalso.js';
import { crearJuego, obtenerJuegos } from '../../js/juegos.js';
import { CLAVE_AVISO_SESION } from '../../js/avisos.js';
import {
  MAX_DLCS,
  MIN_DLCS,
  generarIdDlc,
  resetearContadorDlc,
  sincronizarBotonAnadirDlc,
  anadirFilaDlc,
  quitarFilaDlc,
  conectarDlcs,
  inyectarFechaMaxima,
  alternarSeccionFormato,
  leerDatosFormulario,
  rellenarFormulario,
  iniciarFicha,
} from '../../js/ficha.js';

describe('módulo ficha.js (campos base, condicionales, DLCs y fecha dinámica)', () => {
  let formulario;
  let templateDlc;
  let contenedorDlcs;
  let btnAnadirDlc;

  beforeEach(() => {
    document.body.innerHTML = '';
    resetearContadorDlc();

    const titulo = document.createElement('h1');
    titulo.id = 'titulo-pagina-ficha';
    titulo.textContent = 'Alta y Edición de Videojuego';
    document.body.appendChild(titulo);

    formulario = document.createElement('form');
    formulario.id = 'form-ficha';
    formulario.innerHTML = `
      <input type="hidden" id="ficha-id" name="id" value="" />
      <input type="text" id="ficha-titulo" name="titulo" value="" required data-validar="titulo" aria-describedby="error-ficha-titulo" />
      <div id="error-ficha-titulo" class="field-error"></div>

      <select id="ficha-plataforma" name="plataforma" required data-validar="plataforma" aria-describedby="error-ficha-plataforma">
        <option value="">Selecciona...</option>
        <option value="PC">PC</option>
        <option value="PlayStation 5">PlayStation 5</option>
        <option value="Nintendo Switch">Nintendo Switch</option>
      </select>
      <div id="error-ficha-plataforma" class="field-error"></div>

      <input type="text" id="ficha-sku" name="sku" value="" data-validar="sku" aria-describedby="error-ficha-sku" />
      <div id="error-ficha-sku" class="field-error"></div>

      <input type="date" id="ficha-fecha" name="fechaAdquisicion" value="" required data-validar="fecha" aria-describedby="error-ficha-fecha" />
      <div id="error-ficha-fecha" class="field-error"></div>

      <input type="number" id="ficha-horas" name="horasJugadas" value="0" required data-validar="horas" aria-describedby="error-ficha-horas" />
      <div id="error-ficha-horas" class="field-error"></div>

      <select id="ficha-estado" name="estado" required data-validar="estado" aria-describedby="error-ficha-estado">
        <option value="pendiente">Pendiente</option>
        <option value="jugando">Jugando</option>
        <option value="completado">Completado</option>
      </select>
      <div id="error-ficha-estado" class="field-error"></div>

      <div class="gv-radio-card-group">
        <input type="radio" id="formato-fisico" name="formato" value="fisico" required data-validar="formato" aria-describedby="error-ficha-formato" />
        <input type="radio" id="formato-digital" name="formato" value="digital" checked required data-validar="formato" aria-describedby="error-ficha-formato" />
      </div>
      <div id="error-ficha-formato" class="field-error"></div>

      <fieldset id="bloque-fisico" hidden disabled>
        <input type="text" id="ficha-ean" name="ean13" value="" data-validar="ean13" aria-describedby="error-ficha-ean" disabled />
        <div id="error-ficha-ean" class="field-error"></div>
        <input type="text" id="ficha-ubicacion" name="ubicacion" value="" data-validar="estanteria" aria-describedby="error-ficha-ubicacion" disabled />
        <div id="error-ficha-ubicacion" class="field-error"></div>
      </fieldset>

      <fieldset id="bloque-digital" hidden disabled>
        <select id="ficha-tienda" name="tiendaDigital" data-validar="tienda" aria-describedby="error-ficha-tienda" disabled>
          <option value="">Selecciona...</option>
          <option value="Steam">Steam</option>
          <option value="PlayStation Store">PlayStation Store</option>
        </select>
        <div id="error-ficha-tienda" class="field-error"></div>
      </fieldset>

      <div id="seccion-dlcs">
        <button type="button" id="btn-anadir-dlc">+ Añadir DLC</button>
        <div id="lista-dlcs"></div>
      </div>

      <button type="submit" id="btn-guardar-ficha">
        <span class="btn-text">Guardar videojuego</span>
      </button>
    `;
    document.body.appendChild(formulario);

    contenedorDlcs = formulario.querySelector('#lista-dlcs');
    btnAnadirDlc = formulario.querySelector('#btn-anadir-dlc');

    templateDlc = document.createElement('template');
    templateDlc.id = 'tpl-dlc';
    templateDlc.innerHTML = `
      <div class="gv-dlc-row js-fila-dlc">
        <label for="dlc-nombre-0" class="js-label-dlc-nombre">Nombre del DLC</label>
        <input type="text" id="dlc-nombre-0" name="dlcNombre[]" class="js-input-dlc-nombre" />
        <div id="error-dlc-nombre-0" class="field-error js-error-dlc-nombre"></div>

        <label for="dlc-estado-0" class="js-label-dlc-estado">Estado del DLC</label>
        <select id="dlc-estado-0" name="dlcEstado[]" class="form-select js-select-dlc-estado">
          <option value="pendiente">Pendiente</option>
          <option value="jugando">Jugando</option>
          <option value="completado">Completado</option>
        </select>
        <div id="error-dlc-estado-0" class="field-error js-error-dlc-estado"></div>

        <button type="button" class="js-btn-quitar-dlc">Quitar</button>
      </div>
    `;
    document.body.appendChild(templateDlc);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('inyectarFechaMaxima', () => {
    it('establece el atributo max con la fecha de hoy formateada YYYY-MM-DD', () => {
      const input = document.createElement('input');
      input.type = 'date';
      const fechaFija = new Date(2026, 10, 12); // 12 de noviembre de 2026

      const resultado = inyectarFechaMaxima(input, fechaFija);

      expect(resultado).toBe('2026-11-12');
      expect(input.max).toBe('2026-11-12');
    });

    it('añade ceros a la izquierda en mes y día menores a 10', () => {
      const input = document.createElement('input');
      const fechaPequena = new Date(2026, 3, 5); // 5 de abril de 2026

      const resultado = inyectarFechaMaxima(input, fechaPequena);

      expect(resultado).toBe('2026-04-05');
      expect(input.max).toBe('2026-04-05');
    });

    it('no falla si el input es null o undefined', () => {
      expect(() => inyectarFechaMaxima(null)).not.toThrow();
      expect(() => inyectarFechaMaxima(undefined)).not.toThrow();
    });
  });

  describe('alternarSeccionFormato', () => {
    it('activa el bloque físico y desactiva el digital al seleccionar formato fisico', () => {
      alternarSeccionFormato(formulario, 'fisico');

      const bloqueFisico = formulario.querySelector('#bloque-fisico');
      const bloqueDigital = formulario.querySelector('#bloque-digital');
      const inputEan = formulario.querySelector('#ficha-ean');
      const inputUbicacion = formulario.querySelector('#ficha-ubicacion');
      const selectTienda = formulario.querySelector('#ficha-tienda');

      expect(bloqueFisico.hidden).toBe(false);
      expect(bloqueFisico.disabled).toBe(false);
      expect(inputEan.disabled).toBe(false);
      expect(inputUbicacion.disabled).toBe(false);

      expect(bloqueDigital.hidden).toBe(true);
      expect(bloqueDigital.disabled).toBe(true);
      expect(selectTienda.disabled).toBe(true);
    });

    it('activa el bloque digital y desactiva el físico al seleccionar formato digital', () => {
      alternarSeccionFormato(formulario, 'digital');

      const bloqueFisico = formulario.querySelector('#bloque-fisico');
      const bloqueDigital = formulario.querySelector('#bloque-digital');
      const inputEan = formulario.querySelector('#ficha-ean');
      const inputUbicacion = formulario.querySelector('#ficha-ubicacion');
      const selectTienda = formulario.querySelector('#ficha-tienda');

      expect(bloqueDigital.hidden).toBe(false);
      expect(bloqueDigital.disabled).toBe(false);
      expect(selectTienda.disabled).toBe(false);

      expect(bloqueFisico.hidden).toBe(true);
      expect(bloqueFisico.disabled).toBe(true);
      expect(inputEan.disabled).toBe(true);
      expect(inputUbicacion.disabled).toBe(true);
    });

    it('oculta y deshabilita ambos bloques si el formato es null o desconocido', () => {
      alternarSeccionFormato(formulario, null);

      const bloqueFisico = formulario.querySelector('#bloque-fisico');
      const bloqueDigital = formulario.querySelector('#bloque-digital');

      expect(bloqueFisico.hidden).toBe(true);
      expect(bloqueFisico.disabled).toBe(true);
      expect(bloqueDigital.hidden).toBe(true);
      expect(bloqueDigital.disabled).toBe(true);
    });

    it('limpia clases de error, resetea aria-invalid y borra mensajes al desactivar un bloque', () => {
      const inputEan = formulario.querySelector('#ficha-ean');
      const cajaErrorEan = formulario.querySelector('#error-ficha-ean');

      inputEan.classList.add('is-invalid');
      inputEan.setAttribute('aria-invalid', 'true');
      cajaErrorEan.textContent = 'Código erróneo';

      // Conmutamos a digital (lo que debe deshabilitar y limpiar el bloque físico)
      alternarSeccionFormato(formulario, 'digital');

      expect(inputEan.classList.contains('is-invalid')).toBe(false);
      expect(inputEan.getAttribute('aria-invalid')).toBe('false');
      expect(cajaErrorEan.textContent).toBe('');
      expect(inputEan.disabled).toBe(true);
    });

    it('no falla ante formularios nulos o sin bloques condicionales', () => {
      expect(() => alternarSeccionFormato(null, 'fisico')).not.toThrow();
      expect(() => alternarSeccionFormato(document.createElement('form'), 'digital')).not.toThrow();
    });
  });

  describe('leerDatosFormulario con FormData', () => {
    it('lee y normaliza los 7 campos base del videojuego', () => {
      formulario.querySelector('#ficha-titulo').value = '  Elden Ring  ';
      formulario.querySelector('#ficha-plataforma').value = 'PC';
      formulario.querySelector('#ficha-sku').value = '  GAME-RPG-0042  ';
      formulario.querySelector('#ficha-fecha').value = '2024-06-21';
      formulario.querySelector('#ficha-horas').value = '120';
      formulario.querySelector('#ficha-estado').value = 'completado';
      formulario.querySelector('#formato-digital').checked = true;
      formulario.querySelector('#ficha-tienda').value = 'Steam';

      const datos = leerDatosFormulario(formulario);

      expect(datos.titulo).toBe('Elden Ring');
      expect(datos.plataforma).toBe('PC');
      expect(datos.sku).toBe('GAME-RPG-0042');
      expect(datos.fechaAdquisicion).toBe('2024-06-21');
      expect(datos.horasJugadas).toBe(120);
      expect(datos.estadoProgreso).toBe('completado');
      expect(datos.formato).toBe('digital');
      expect(datos.tiendaDigital).toBe('Steam');
      expect(datos.codigoBarras).toBeNull();
      expect(datos.ubicacionEstanteria).toBeNull();
    });

    it('lee correctamente los campos condicionales cuando el formato es físico', () => {
      formulario.querySelector('#ficha-titulo').value = 'Zelda';
      formulario.querySelector('#formato-fisico').checked = true;
      formulario.querySelector('#formato-digital').checked = false;
      alternarSeccionFormato(formulario, 'fisico');
      formulario.querySelector('#ficha-ean').value = '4020628663124';
      formulario.querySelector('#ficha-ubicacion').value = 'EST-A-03';
      formulario.querySelector('#ficha-tienda').value = 'Steam'; // Aunque tenga valor, formato físico lo anula

      const datos = leerDatosFormulario(formulario);

      expect(datos.formato).toBe('fisico');
      expect(datos.codigoBarras).toBe('4020628663124');
      expect(datos.ubicacionEstanteria).toBe('EST-A-03');
      expect(datos.tiendaDigital).toBeNull();
    });

    it('lee correctamente el ID si está presente en el campo oculto', () => {
      formulario.querySelector('#ficha-id').value = 'gv_12345_abc';
      const datos = leerDatosFormulario(formulario);
      expect(datos.id).toBe('gv_12345_abc');
    });

    it('devuelve id como null si el campo oculto está vacío', () => {
      formulario.querySelector('#ficha-id').value = '   ';
      const datos = leerDatosFormulario(formulario);
      expect(datos.id).toBeNull();
    });

    it('lee las expansiones dinámicas de DLC mediante FormData.getAll()', () => {
      const dlcNombre1 = document.createElement('input');
      dlcNombre1.name = 'dlcNombre[]';
      dlcNombre1.value = 'Shadow of the Erdtree';

      const dlcEstado1 = document.createElement('select');
      dlcEstado1.name = 'dlcEstado[]';
      dlcEstado1.innerHTML = '<option value="completado" selected>Completado</option>';

      formulario.appendChild(dlcNombre1);
      formulario.appendChild(dlcEstado1);

      const datos = leerDatosFormulario(formulario);

      expect(datos.dlcs).toHaveLength(1);
      expect(datos.dlcs[0]).toEqual({
        titulo: 'Shadow of the Erdtree',
        estado: 'completado',
      });
    });

    it('ignora DLCs vacíos y no supera el máximo de 3 expansiones', () => {
      for (let i = 1; i <= 5; i++) {
        const nom = document.createElement('input');
        nom.name = 'dlcNombre[]';
        nom.value = `DLC ${i}`;

        const est = document.createElement('select');
        est.name = 'dlcEstado[]';
        est.innerHTML = '<option value="pendiente" selected>Pendiente</option>';

        formulario.appendChild(nom);
        formulario.appendChild(est);
      }

      const datos = leerDatosFormulario(formulario);
      expect(datos.dlcs).toHaveLength(3);
      expect(datos.dlcs[0].titulo).toBe('DLC 1');
      expect(datos.dlcs[2].titulo).toBe('DLC 3');
    });

    it('devuelve valores por defecto seguros si el formulario no es válido', () => {
      expect(leerDatosFormulario(null).titulo).toBe('');
      expect(leerDatosFormulario(null).dlcs).toEqual([]);
      expect(leerDatosFormulario({}).formato).toBe('digital');
    });
  });

  describe('gestión de DLCs dinámicos con <template>', () => {
    it('define los límites oficiales de 0 a 3 DLCs', () => {
      expect(MIN_DLCS).toBe(0);
      expect(MAX_DLCS).toBe(3);
    });

    describe('generarIdDlc y resetearContadorDlc', () => {
      it('genera identificadores correlativos únicos', () => {
        resetearContadorDlc();
        const id1 = generarIdDlc();
        const id2 = generarIdDlc();
        expect(id1).not.toBe(id2);
        expect(id1).toMatch(/^dlc-\d+-1$/);
        expect(id2).toMatch(/^dlc-\d+-2$/);
      });
    });

    describe('sincronizarBotonAnadirDlc', () => {
      it('mantiene el botón habilitado si hay menos de 3 DLCs', () => {
        sincronizarBotonAnadirDlc(contenedorDlcs, btnAnadirDlc, 3);
        expect(btnAnadirDlc.disabled).toBe(false);
        expect(btnAnadirDlc.hasAttribute('aria-disabled')).toBe(false);
      });

      it('deshabilita el botón si se alcanza el máximo de 3 DLCs', () => {
        for (let i = 0; i < 3; i++) {
          const fila = document.createElement('div');
          fila.className = 'js-fila-dlc';
          contenedorDlcs.appendChild(fila);
        }

        sincronizarBotonAnadirDlc(contenedorDlcs, btnAnadirDlc, 3);
        expect(btnAnadirDlc.disabled).toBe(true);
        expect(btnAnadirDlc.getAttribute('aria-disabled')).toBe('true');
      });

      it('no falla si el contenedor o el botón son nulos', () => {
        expect(() => sincronizarBotonAnadirDlc(null, btnAnadirDlc)).not.toThrow();
        expect(() => sincronizarBotonAnadirDlc(contenedorDlcs, null)).not.toThrow();
      });
    });

    describe('anadirFilaDlc', () => {
      it('clona la plantilla, asigna identificadores únicos e inserta la fila en el contenedor', () => {
        const fila = anadirFilaDlc(
          contenedorDlcs,
          templateDlc,
          {
            titulo: 'Blood and Wine',
            estado: 'completado',
          },
          btnAnadirDlc,
        );

        expect(fila).not.toBeNull();
        expect(contenedorDlcs.contains(fila)).toBe(true);

        const inputNombre = fila.querySelector('.js-input-dlc-nombre');
        const labelNombre = fila.querySelector('.js-label-dlc-nombre');
        const errorNombre = fila.querySelector('.js-error-dlc-nombre');

        expect(inputNombre.value).toBe('Blood and Wine');
        expect(inputNombre.id).toMatch(/^input-nombre-dlc-\d+-\d+$/);
        expect(labelNombre.htmlFor).toBe(inputNombre.id);
        expect(inputNombre.getAttribute('aria-describedby')).toBe(errorNombre.id);

        const selectEstado = fila.querySelector('.js-select-dlc-estado');
        const labelEstado = fila.querySelector('.js-label-dlc-estado');
        const errorEstado = fila.querySelector('.js-error-dlc-estado');

        expect(selectEstado.value).toBe('completado');
        expect(selectEstado.id).toMatch(/^select-estado-dlc-\d+-\d+$/);
        expect(labelEstado.htmlFor).toBe(selectEstado.id);
        expect(selectEstado.getAttribute('aria-describedby')).toBe(errorEstado.id);

        expect(btnAnadirDlc.disabled).toBe(false);
      });

      it('deshabilita el botón al añadir la tercera fila (máximo 3)', () => {
        anadirFilaDlc(contenedorDlcs, templateDlc, { titulo: 'DLC 1' }, btnAnadirDlc);
        expect(btnAnadirDlc.disabled).toBe(false);

        anadirFilaDlc(contenedorDlcs, templateDlc, { titulo: 'DLC 2' }, btnAnadirDlc);
        expect(btnAnadirDlc.disabled).toBe(false);

        anadirFilaDlc(contenedorDlcs, templateDlc, { titulo: 'DLC 3' }, btnAnadirDlc);
        expect(btnAnadirDlc.disabled).toBe(true);
        expect(btnAnadirDlc.getAttribute('aria-disabled')).toBe('true');
      });

      it('rechaza añadir una cuarta fila devolviendo null cuando ya hay 3', () => {
        anadirFilaDlc(contenedorDlcs, templateDlc, { titulo: 'DLC 1' }, btnAnadirDlc);
        anadirFilaDlc(contenedorDlcs, templateDlc, { titulo: 'DLC 2' }, btnAnadirDlc);
        anadirFilaDlc(contenedorDlcs, templateDlc, { titulo: 'DLC 3' }, btnAnadirDlc);

        const filaExtra = anadirFilaDlc(
          contenedorDlcs,
          templateDlc,
          { titulo: 'DLC 4' },
          btnAnadirDlc,
        );
        expect(filaExtra).toBeNull();
        expect(contenedorDlcs.querySelectorAll('.js-fila-dlc')).toHaveLength(3);
      });

      it('devuelve null y es resiliente ante parámetros nulos', () => {
        expect(anadirFilaDlc(null, templateDlc)).toBeNull();
        expect(anadirFilaDlc(contenedorDlcs, null)).toBeNull();
        expect(anadirFilaDlc(contenedorDlcs, document.createElement('div'))).toBeNull();
      });
    });

    describe('quitarFilaDlc', () => {
      it('elimina la fila y reactiva el botón si estaba desactivado', () => {
        anadirFilaDlc(contenedorDlcs, templateDlc, { titulo: 'DLC 1' }, btnAnadirDlc);
        anadirFilaDlc(contenedorDlcs, templateDlc, { titulo: 'DLC 2' }, btnAnadirDlc);
        const fila3 = anadirFilaDlc(contenedorDlcs, templateDlc, { titulo: 'DLC 3' }, btnAnadirDlc);

        expect(btnAnadirDlc.disabled).toBe(true);

        quitarFilaDlc(fila3, contenedorDlcs, btnAnadirDlc);

        expect(contenedorDlcs.querySelectorAll('.js-fila-dlc')).toHaveLength(2);
        expect(btnAnadirDlc.disabled).toBe(false);
        expect(btnAnadirDlc.hasAttribute('aria-disabled')).toBe(false);
      });

      it('no falla si la fila o el contenedor son nulos', () => {
        expect(() => quitarFilaDlc(null, contenedorDlcs)).not.toThrow();
        expect(() =>
          quitarFilaDlc(document.createElement('div'), null, btnAnadirDlc),
        ).not.toThrow();
      });
    });

    describe('conectarDlcs', () => {
      it('añade y quita filas mediante eventos interactivos con delegación', () => {
        const desconectar = conectarDlcs(contenedorDlcs, templateDlc, btnAnadirDlc);

        // Añadimos una fila haciendo clic en el botón
        btnAnadirDlc.click();
        expect(contenedorDlcs.querySelectorAll('.js-fila-dlc')).toHaveLength(1);

        // Añadimos dos más hasta llegar al límite
        btnAnadirDlc.click();
        btnAnadirDlc.click();
        expect(contenedorDlcs.querySelectorAll('.js-fila-dlc')).toHaveLength(3);
        expect(btnAnadirDlc.disabled).toBe(true);

        // Pulsamos en el botón "Quitar" de la segunda fila
        const filas = contenedorDlcs.querySelectorAll('.js-fila-dlc');
        const btnQuitarFila2 = filas[1].querySelector('.js-btn-quitar-dlc');
        btnQuitarFila2.click();

        expect(contenedorDlcs.querySelectorAll('.js-fila-dlc')).toHaveLength(2);
        expect(btnAnadirDlc.disabled).toBe(false);

        desconectar();

        // Tras desconectar, un clic en el botón no añade más filas
        btnAnadirDlc.click();
        expect(contenedorDlcs.querySelectorAll('.js-fila-dlc')).toHaveLength(2);
      });

      it('devuelve función no-op si faltan elementos requeridos', () => {
        const desconectar = conectarDlcs(null, templateDlc, btnAnadirDlc);
        expect(typeof desconectar).toBe('function');
        expect(() => desconectar()).not.toThrow();
      });
    });
  });

  describe('rellenarFormulario', () => {
    it('puebla los campos base y condicionales para un juego físico', () => {
      const datosJuego = {
        id: 'gv_1731200000_xyz',
        titulo: 'Super Mario Odyssey',
        plataforma: 'Nintendo Switch',
        sku: 'GAME-ADV-0010',
        fechaAdquisicion: '2023-10-01',
        horasJugadas: 45,
        estadoProgreso: 'completado',
        formato: 'fisico',
        codigoBarras: '4020628663124',
        ubicacionEstanteria: 'EST-B-04',
      };

      rellenarFormulario(formulario, datosJuego);

      expect(formulario.querySelector('#ficha-id').value).toBe('gv_1731200000_xyz');
      expect(formulario.querySelector('#ficha-titulo').value).toBe('Super Mario Odyssey');
      expect(formulario.querySelector('#ficha-plataforma').value).toBe('Nintendo Switch');
      expect(formulario.querySelector('#ficha-sku').value).toBe('GAME-ADV-0010');
      expect(formulario.querySelector('#ficha-fecha').value).toBe('2023-10-01');
      expect(formulario.querySelector('#ficha-horas').value).toBe('45');
      expect(formulario.querySelector('#ficha-estado').value).toBe('completado');
      expect(formulario.querySelector('#formato-fisico').checked).toBe(true);

      // Bloques condicionales sincronizados
      expect(formulario.querySelector('#bloque-fisico').hidden).toBe(false);
      expect(formulario.querySelector('#ficha-ean').value).toBe('4020628663124');
      expect(formulario.querySelector('#ficha-ubicacion').value).toBe('EST-B-04');
      expect(formulario.querySelector('#bloque-digital').hidden).toBe(true);
    });

    it('puebla los campos base y condicionales para un juego digital', () => {
      const datosDigital = {
        titulo: 'Half-Life 2',
        formato: 'digital',
        tiendaDigital: 'Steam',
      };

      rellenarFormulario(formulario, datosDigital);

      expect(formulario.querySelector('#formato-digital').checked).toBe(true);
      expect(formulario.querySelector('#bloque-digital').hidden).toBe(false);
      expect(formulario.querySelector('#ficha-tienda').value).toBe('Steam');
      expect(formulario.querySelector('#bloque-fisico').hidden).toBe(true);
    });

    it('puebla las expansiones dinámicas de DLC respetando el límite', () => {
      const datosConDlcs = {
        titulo: 'The Witcher 3',
        dlcs: [
          { titulo: 'Hearts of Stone', estado: 'completado' },
          { titulo: 'Blood and Wine', estado: 'jugando' },
        ],
      };

      rellenarFormulario(formulario, datosConDlcs);

      const filas = contenedorDlcs.querySelectorAll('.js-fila-dlc');
      expect(filas).toHaveLength(2);
      expect(filas[0].querySelector('.js-input-dlc-nombre').value).toBe('Hearts of Stone');
      expect(filas[0].querySelector('.js-select-dlc-estado').value).toBe('completado');
      expect(filas[1].querySelector('.js-input-dlc-nombre').value).toBe('Blood and Wine');
      expect(filas[1].querySelector('.js-select-dlc-estado').value).toBe('jugando');
      expect(btnAnadirDlc.disabled).toBe(false);
    });

    it('no falla si datos o formulario son nulos', () => {
      expect(() => rellenarFormulario(null, {})).not.toThrow();
      expect(() => rellenarFormulario(formulario, null)).not.toThrow();
    });
  });

  describe('iniciarFicha', () => {
    it('inyecta la fecha máxima en #ficha-fecha al inicializar', () => {
      const fechaFija = new Date(2026, 10, 12);
      iniciarFicha(document, { fechaReferencia: fechaFija });

      const inputFecha = document.querySelector('#ficha-fecha');
      expect(inputFecha.max).toBe('2026-11-12');
    });

    it('sincroniza el formato inicial según el radio marcado en el DOM', () => {
      formulario.querySelector('#formato-digital').checked = true;
      iniciarFicha(document);

      expect(formulario.querySelector('#bloque-digital').hidden).toBe(false);
      expect(formulario.querySelector('#bloque-fisico').hidden).toBe(true);
    });

    it('conmuta dinámicamente los bloques al cambiar de radio button (evento change)', () => {
      const desconectar = iniciarFicha(document);

      const radioFisico = formulario.querySelector('#formato-fisico');
      radioFisico.checked = true;
      radioFisico.dispatchEvent(new Event('change', { bubbles: true }));

      expect(formulario.querySelector('#bloque-fisico').hidden).toBe(false);
      expect(formulario.querySelector('#bloque-fisico').disabled).toBe(false);
      expect(formulario.querySelector('#bloque-digital').hidden).toBe(true);

      const radioDigital = formulario.querySelector('#formato-digital');
      radioDigital.checked = true;
      radioDigital.dispatchEvent(new Event('change', { bubbles: true }));

      expect(formulario.querySelector('#bloque-digital').hidden).toBe(false);
      expect(formulario.querySelector('#bloque-fisico').hidden).toBe(true);

      desconectar();
    });

    it('no conmuta tras llamar a la función de desconexión devuelta', () => {
      const desconectar = iniciarFicha(document, { formatoInicial: 'digital' });
      desconectar();

      const radioFisico = formulario.querySelector('#formato-fisico');
      radioFisico.checked = true;
      radioFisico.dispatchEvent(new Event('change', { bubbles: true }));

      // No debe haber cambiado porque el listener fue desconectado
      expect(formulario.querySelector('#bloque-digital').hidden).toBe(false);
      expect(formulario.querySelector('#bloque-fisico').hidden).toBe(true);
    });

    it('inicializa los DLCs si se pasan en opciones.dlcsIniciales', () => {
      const desconectar = iniciarFicha(document, {
        dlcsIniciales: [
          { titulo: 'DLC Alfa', estado: 'pendiente' },
          { titulo: 'DLC Beta', estado: 'completado' },
        ],
      });

      const filas = contenedorDlcs.querySelectorAll('.js-fila-dlc');
      expect(filas).toHaveLength(2);
      expect(filas[0].querySelector('.js-input-dlc-nombre').value).toBe('DLC Alfa');
      expect(filas[1].querySelector('.js-input-dlc-nombre').value).toBe('DLC Beta');

      desconectar();
    });

    it('no falla si el documento es nulo o no contiene #ficha-fecha', () => {
      expect(() => iniciarFicha(null)).not.toThrow();
      expect(() => iniciarFicha(document.createElement('div'))).not.toThrow();
    });
  });

  describe('flujo completo de alta y edición con persistencia y navegación', () => {
    let almacenLocal;
    let almacenSesion;
    let navegar;
    const usuarioPrueba = 'pablo_dev';

    beforeEach(() => {
      almacenLocal = new AlmacenFalso();
      almacenSesion = new AlmacenFalso();
      navegar = vi.fn();
    });

    describe('Modo Alta (sin id)', () => {
      it('ajusta los textos de cabecera y botón a modo alta', () => {
        iniciarFicha(document, {
          almacenLocal,
          almacenSesion,
          navegar,
          usuario: usuarioPrueba,
          id: null,
        });

        expect(document.querySelector('#titulo-pagina-ficha').textContent).toBe(
          'Alta de Videojuego',
        );
        expect(document.querySelector('#btn-guardar-ficha .btn-text').textContent).toBe(
          'Guardar videojuego',
        );
      });

      it('al enviar datos válidos, crea el juego en localStorage, guarda aviso de éxito y redirige a listado.html', () => {
        const alGuardar = vi.fn();
        const fechaAyer = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        formulario.querySelector('#ficha-titulo').value = 'Hollow Knight';
        formulario.querySelector('#ficha-plataforma').value = 'PC';
        formulario.querySelector('#ficha-sku').value = 'GAME-ACT-0001';
        formulario.querySelector('#ficha-fecha').value = fechaAyer;
        formulario.querySelector('#ficha-horas').value = '45';
        formulario.querySelector('#ficha-estado').value = 'completado';

        const radioDigital = formulario.querySelector('#formato-digital');
        radioDigital.checked = true;

        iniciarFicha(document, {
          almacenLocal,
          almacenSesion,
          navegar,
          usuario: usuarioPrueba,
          id: null,
          alGuardar,
        });

        const selectTienda = formulario.querySelector('#ficha-tienda');
        selectTienda.value = 'Steam';

        formulario.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

        const juegosGuardados = obtenerJuegos(usuarioPrueba, almacenLocal);
        expect(juegosGuardados).toHaveLength(1);
        expect(juegosGuardados[0].titulo).toBe('Hollow Knight');
        expect(juegosGuardados[0].plataforma).toBe('PC');
        expect(juegosGuardados[0].formato).toBe('digital');
        expect(juegosGuardados[0].tiendaDigital).toBe('Steam');
        expect(juegosGuardados[0].horasJugadas).toBe(45);
        expect(juegosGuardados[0].estadoProgreso).toBe('completado');

        const avisoGuardado = JSON.parse(almacenSesion.getItem(CLAVE_AVISO_SESION));
        expect(avisoGuardado.tipo).toBe('success');
        expect(avisoGuardado.mensaje).toContain('éxito');

        expect(navegar).toHaveBeenCalledWith('listado.html');
        expect(alGuardar).toHaveBeenCalledWith(
          expect.objectContaining({ modo: 'alta', juego: expect.any(Object) }),
        );
      });

      it('al enviar datos inválidos (título vacío), detiene el envío, no persiste y enfoca el error', () => {
        formulario.querySelector('#ficha-titulo').value = '';
        formulario.querySelector('#ficha-plataforma').value = 'PC';
        formulario.querySelector('#ficha-fecha').value = '2026-01-01';

        iniciarFicha(document, {
          almacenLocal,
          almacenSesion,
          navegar,
          usuario: usuarioPrueba,
          id: null,
        });

        const inputTitulo = formulario.querySelector('#ficha-titulo');
        const spyFocus = vi.spyOn(inputTitulo, 'focus');

        const eventoSubmit = new Event('submit', { bubbles: true, cancelable: true });
        formulario.dispatchEvent(eventoSubmit);

        expect(eventoSubmit.defaultPrevented).toBe(true);
        expect(obtenerJuegos(usuarioPrueba, almacenLocal)).toHaveLength(0);
        expect(navegar).not.toHaveBeenCalled();
        expect(inputTitulo.getAttribute('aria-invalid')).toBe('true');
        expect(spyFocus).toHaveBeenCalled();
      });
    });

    describe('Modo Edición (con id)', () => {
      let juegoExistente;

      beforeEach(() => {
        juegoExistente = crearJuego(
          {
            titulo: 'Elden Ring',
            plataforma: 'PlayStation 5',
            formato: 'fisico',
            fechaAdquisicion: '2026-02-25',
            horasJugadas: 120,
            estadoProgreso: 'jugando',
            sku: 'GAME-RPG-0042',
            codigoBarras: '4020628663124',
            ubicacionEstanteria: 'EST-A-01',
            tiendaDigital: null,
            dlcs: [{ titulo: 'Shadow of the Erdtree', estado: 'pendiente' }],
          },
          usuarioPrueba,
          almacenLocal,
        );
      });

      it('si el id existe, cambia textos, rellena el formulario y conmuta formato', () => {
        iniciarFicha(document, {
          almacenLocal,
          almacenSesion,
          navegar,
          usuario: usuarioPrueba,
          id: juegoExistente.id,
        });

        expect(document.querySelector('#titulo-pagina-ficha').textContent).toBe(
          'Edición de Videojuego',
        );
        expect(document.querySelector('#btn-guardar-ficha .btn-text').textContent).toBe(
          'Guardar cambios',
        );

        expect(formulario.querySelector('#ficha-id').value).toBe(juegoExistente.id);
        expect(formulario.querySelector('#ficha-titulo').value).toBe('Elden Ring');
        expect(formulario.querySelector('#ficha-plataforma').value).toBe('PlayStation 5');
        expect(formulario.querySelector('#ficha-horas').value).toBe('120');
        expect(formulario.querySelector('#ficha-estado').value).toBe('jugando');
        expect(formulario.querySelector('#formato-fisico').checked).toBe(true);
        expect(formulario.querySelector('#bloque-fisico').hidden).toBe(false);
        expect(formulario.querySelector('#ficha-ean').value).toBe('4020628663124');
        expect(formulario.querySelector('#ficha-ubicacion').value).toBe('EST-A-01');

        const filasDlc = contenedorDlcs.querySelectorAll('.js-fila-dlc');
        expect(filasDlc).toHaveLength(1);
        expect(filasDlc[0].querySelector('.js-input-dlc-nombre').value).toBe(
          'Shadow of the Erdtree',
        );
      });

      it('detecta el id automáticamente desde ventana.location.search (?id=...)', () => {
        const ventanaMock = {
          location: {
            search: `?id=${juegoExistente.id}`,
            href: '',
          },
        };

        iniciarFicha(document, {
          almacenLocal,
          almacenSesion,
          navegar,
          usuario: usuarioPrueba,
          ventana: ventanaMock,
        });

        expect(document.querySelector('#titulo-pagina-ficha').textContent).toBe(
          'Edición de Videojuego',
        );
        expect(formulario.querySelector('#ficha-titulo').value).toBe('Elden Ring');
      });

      it('al enviar modificaciones válidas, actualiza el juego existente preservando ID original y redirige', () => {
        const alGuardar = vi.fn();

        iniciarFicha(document, {
          almacenLocal,
          almacenSesion,
          navegar,
          usuario: usuarioPrueba,
          id: juegoExistente.id,
          alGuardar,
        });

        formulario.querySelector('#ficha-titulo').value = 'Elden Ring Deluxe Edition';
        formulario.querySelector('#ficha-horas').value = '150';
        formulario.querySelector('#ficha-estado').value = 'completado';

        formulario.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

        const juegos = obtenerJuegos(usuarioPrueba, almacenLocal);
        expect(juegos).toHaveLength(1);
        expect(juegos[0].id).toBe(juegoExistente.id);
        expect(juegos[0].titulo).toBe('Elden Ring Deluxe Edition');
        expect(juegos[0].horasJugadas).toBe(150);
        expect(juegos[0].estadoProgreso).toBe('completado');

        const aviso = JSON.parse(almacenSesion.getItem(CLAVE_AVISO_SESION));
        expect(aviso.tipo).toBe('success');
        expect(aviso.mensaje).toContain('actualizado con éxito');

        expect(navegar).toHaveBeenCalledWith('listado.html');
        expect(alGuardar).toHaveBeenCalledWith(
          expect.objectContaining({ modo: 'edicion', juego: expect.any(Object) }),
        );
      });

      it('permite cambiar el formato de físico a digital al editar y actualiza propiedades', () => {
        iniciarFicha(document, {
          almacenLocal,
          almacenSesion,
          navegar,
          usuario: usuarioPrueba,
          id: juegoExistente.id,
        });

        const radioDigital = formulario.querySelector('#formato-digital');
        radioDigital.checked = true;
        radioDigital.dispatchEvent(new Event('change', { bubbles: true }));

        formulario.querySelector('#ficha-tienda').value = 'PlayStation Store';

        formulario.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

        const actualizado = obtenerJuegos(usuarioPrueba, almacenLocal)[0];
        expect(actualizado.formato).toBe('digital');
        expect(actualizado.tiendaDigital).toBe('PlayStation Store');
        expect(actualizado.codigoBarras).toBeNull();
        expect(actualizado.ubicacionEstanteria).toBeNull();
      });

      it('si el id no existe, guarda aviso de error en sessionStorage y redirige a listado.html inmediatamente', () => {
        iniciarFicha(document, {
          almacenLocal,
          almacenSesion,
          navegar,
          usuario: usuarioPrueba,
          id: 'id_que_no_existe_9999',
        });

        const aviso = JSON.parse(almacenSesion.getItem(CLAVE_AVISO_SESION));
        expect(aviso.tipo).toBe('danger');
        expect(aviso.mensaje).toContain('no existe');
        expect(navegar).toHaveBeenCalledWith('listado.html');
      });

      it('no permite editar un videojuego perteneciente a otro usuario (aislamiento multiusuario)', () => {
        const juegoOtroUsuario = crearJuego(
          {
            titulo: 'Zelda Tears of the Kingdom',
            plataforma: 'Nintendo Switch',
            formato: 'fisico',
            fechaAdquisicion: '2026-05-12',
            horasJugadas: 80,
            estadoProgreso: 'completado',
            sku: 'GAME-ADV-0010',
          },
          'otro_usuario',
          almacenLocal,
        );

        iniciarFicha(document, {
          almacenLocal,
          almacenSesion,
          navegar,
          usuario: usuarioPrueba,
          id: juegoOtroUsuario.id,
        });

        const aviso = JSON.parse(almacenSesion.getItem(CLAVE_AVISO_SESION));
        expect(aviso.tipo).toBe('danger');
        expect(navegar).toHaveBeenCalledWith('listado.html');
      });
    });

    describe('Seguridad y robustez', () => {
      it('si no hay sesión activa ni usuario, lanza aviso y no persiste', () => {
        const fechaValida = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        formulario.querySelector('#ficha-titulo').value = 'Dark Souls';
        formulario.querySelector('#ficha-plataforma').value = 'PC';
        formulario.querySelector('#ficha-fecha').value = fechaValida;
        formulario.querySelector('#formato-digital').checked = true;

        iniciarFicha(document, {
          almacenLocal,
          almacenSesion,
          navegar,
          usuario: '',
          id: null,
        });

        formulario.querySelector('#ficha-tienda').value = 'Steam';

        formulario.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

        expect(navegar).not.toHaveBeenCalled();
        expect(almacenLocal.length).toBe(0);
      });
    });
  });
});
