import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  esCampoValidable,
  obtenerCajaError,
  mostrarErrorCampo,
  validarCampo,
  validarFormulario,
  conectarValidacionTiempoReal,
} from '../../js/validacion.js';
import { MENSAJES_ERROR } from '../../js/validadores.js';

describe('módulo validacion.js (Motor genérico de validación en tiempo real y accesibilidad)', () => {
  let formulario;

  beforeEach(() => {
    document.body.innerHTML = '';
    formulario = document.createElement('form');
    formulario.id = 'form-test';
    formulario.innerHTML = `
      <div class="mb-3">
        <label for="campo-titulo">Título *</label>
        <input
          type="text"
          id="campo-titulo"
          name="titulo"
          required
          data-validar="titulo"
          aria-invalid="false"
          aria-describedby="error-titulo"
        />
        <div id="error-titulo" class="field-error" role="alert" aria-live="polite"></div>
      </div>

      <div class="mb-3">
        <label for="campo-sku">SKU</label>
        <input
          type="text"
          id="campo-sku"
          name="sku"
          data-validar="sku"
          aria-invalid="false"
          aria-describedby="error-sku"
        />
        <div id="error-sku" class="field-error" role="alert" aria-live="polite"></div>
      </div>

      <div class="mb-3">
        <label for="campo-pwd">Contraseña *</label>
        <input
          type="password"
          id="campo-pwd"
          name="password"
          required
          data-validar="clave"
          aria-invalid="false"
          aria-describedby="error-pwd"
        />
        <div id="error-pwd" class="field-error" role="alert"></div>
      </div>

      <div class="mb-3">
        <label for="campo-rep-pwd">Repetir Contraseña *</label>
        <input
          type="password"
          id="campo-rep-pwd"
          name="passwordConfirm"
          required
          data-coincidir-con="campo-pwd"
          aria-invalid="false"
          aria-describedby="error-rep-pwd"
        />
        <div id="error-rep-pwd" class="field-error" role="alert"></div>
      </div>

      <div class="mb-3">
        <input
          type="checkbox"
          id="campo-terminos"
          name="terminos"
          required
          aria-describedby="error-terminos"
        />
        <div id="error-terminos" class="field-error" role="alert"></div>
      </div>

      <div class="mb-3">
        <input type="radio" id="rad-a" name="opcion" value="A" required aria-describedby="error-radio" />
        <input type="radio" id="rad-b" name="opcion" value="B" required aria-describedby="error-radio" />
        <div id="error-radio" class="field-error" role="alert"></div>
      </div>

      <div class="mb-3">
        <input type="text" id="campo-deshabilitado" name="deshabilitado" disabled data-validar="sku" />
      </div>

      <button type="submit" id="btn-enviar">Enviar</button>
    `;
    document.body.appendChild(formulario);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('esCampoValidable', () => {
    it('reconoce controles válidos como inputs de texto, selects y textareas', () => {
      const input = document.createElement('input');
      const select = document.createElement('select');
      const textarea = document.createElement('textarea');

      expect(esCampoValidable(input)).toBe(true);
      expect(esCampoValidable(select)).toBe(true);
      expect(esCampoValidable(textarea)).toBe(true);
    });

    it('descarta campos deshabilitados, botones y controles no visuales', () => {
      const inputDisabled = document.createElement('input');
      inputDisabled.disabled = true;

      const inputHidden = document.createElement('input');
      inputHidden.type = 'hidden';

      const inputSubmit = document.createElement('input');
      inputSubmit.type = 'submit';

      const button = document.createElement('button');

      expect(esCampoValidable(inputDisabled)).toBe(false);
      expect(esCampoValidable(inputHidden)).toBe(false);
      expect(esCampoValidable(inputSubmit)).toBe(false);
      expect(esCampoValidable(button)).toBe(false);
      expect(esCampoValidable(null)).toBe(false);
      expect(esCampoValidable({})).toBe(false);
    });
  });

  describe('obtenerCajaError', () => {
    it('encuentra la caja de error vinculada mediante aria-describedby', () => {
      const inputTitulo = formulario.querySelector('#campo-titulo');
      const caja = obtenerCajaError(inputTitulo, formulario);

      expect(caja).not.toBeNull();
      expect(caja.id).toBe('error-titulo');
    });

    it('encuentra la caja por convención #error-<id> si no hay aria-describedby', () => {
      const inputLibre = document.createElement('input');
      inputLibre.id = 'prueba';
      const caja = document.createElement('div');
      caja.id = 'error-prueba';
      formulario.appendChild(inputLibre);
      formulario.appendChild(caja);

      expect(obtenerCajaError(inputLibre, formulario)).toBe(caja);
    });

    it('devuelve null si el campo es nulo o no tiene contenedor de error asociado', () => {
      expect(obtenerCajaError(null)).toBeNull();
      const inputHuerfano = document.createElement('input');
      expect(obtenerCajaError(inputHuerfano, document.createElement('div'))).toBeNull();
    });
  });

  describe('mostrarErrorCampo', () => {
    it('refleja mensaje, añade .is-invalid, asigna aria-invalid="true" y setCustomValidity', () => {
      const inputTitulo = formulario.querySelector('#campo-titulo');
      const cajaError = formulario.querySelector('#error-titulo');

      mostrarErrorCampo(inputTitulo, 'Título demasiado corto', formulario);

      expect(inputTitulo.classList.contains('is-invalid')).toBe(true);
      expect(inputTitulo.getAttribute('aria-invalid')).toBe('true');
      expect(inputTitulo.validationMessage).toBe('Título demasiado corto');
      expect(cajaError.textContent).toBe('Título demasiado corto');
      expect(cajaError.classList.contains('d-block')).toBe(true);
    });

    it('limpia errores, retira .is-invalid, asigna aria-invalid="false" y vacía setCustomValidity', () => {
      const inputTitulo = formulario.querySelector('#campo-titulo');
      const cajaError = formulario.querySelector('#error-titulo');

      mostrarErrorCampo(inputTitulo, 'Error previo', formulario);
      inputTitulo.value = 'Texto Válido';
      mostrarErrorCampo(inputTitulo, '', formulario);

      expect(inputTitulo.classList.contains('is-invalid')).toBe(false);
      expect(inputTitulo.getAttribute('aria-invalid')).toBe('false');
      expect(inputTitulo.validationMessage).toBe('');
      expect(cajaError.textContent).toBe('');
      expect(cajaError.classList.contains('d-block')).toBe(false);
    });

    it('no falla si el campo es nulo', () => {
      expect(() => mostrarErrorCampo(null, 'Error')).not.toThrow();
    });
  });

  describe('validarCampo', () => {
    it('invalida campos requeridos vacíos con su mensaje correspondiente', () => {
      const inputTitulo = formulario.querySelector('#campo-titulo');
      inputTitulo.value = '   ';

      const res = validarCampo(inputTitulo);

      expect(res.valido).toBe(false);
      expect(res.mensaje).toBe(MENSAJES_ERROR.titulo);
      expect(inputTitulo.classList.contains('is-invalid')).toBe(true);
    });

    it('valida campos con valor correcto según el validador registrado', () => {
      const inputTitulo = formulario.querySelector('#campo-titulo');
      inputTitulo.value = 'Elden Ring';

      const res = validarCampo(inputTitulo);

      expect(res.valido).toBe(true);
      expect(res.mensaje).toBe('');
      expect(inputTitulo.classList.contains('is-invalid')).toBe(false);
    });

    it('valida formatos específicos mediante expresiones regulares (ej. SKU)', () => {
      const inputSku = formulario.querySelector('#campo-sku');
      inputSku.value = 'SKU-MAL';

      const resInvalido = validarCampo(inputSku);
      expect(resInvalido.valido).toBe(false);
      expect(resInvalido.mensaje).toBe(MENSAJES_ERROR.sku);

      inputSku.value = 'GAME-RPG-0042';
      const resValido = validarCampo(inputSku);
      expect(resValido.valido).toBe(true);
    });

    it('valida casillas de verificación requeridas (checkbox)', () => {
      const chk = formulario.querySelector('#campo-terminos');
      chk.checked = false;

      const resInvalido = validarCampo(chk);
      expect(resInvalido.valido).toBe(false);
      expect(resInvalido.mensaje).toBe(MENSAJES_ERROR.terminos);

      chk.checked = true;
      const resValido = validarCampo(chk);
      expect(resValido.valido).toBe(true);
    });

    it('valida grupos de botones de opción (radio)', () => {
      const radA = formulario.querySelector('#rad-a');
      const radB = formulario.querySelector('#rad-b');
      radA.checked = false;
      radB.checked = false;

      const resInvalido = validarCampo(radA);
      expect(resInvalido.valido).toBe(false);
      expect(resInvalido.mensaje).toBe(MENSAJES_ERROR.formato);

      radB.checked = true;
      const resValido = validarCampo(radA);
      expect(resValido.valido).toBe(true);
    });

    it('valida coincidencia entre campos dependientes (repetir contraseña)', () => {
      const inputPwd = formulario.querySelector('#campo-pwd');
      const inputRep = formulario.querySelector('#campo-rep-pwd');

      inputPwd.value = 'Secret2026!';
      inputRep.value = 'SecretDiferente!';

      const resInvalido = validarCampo(inputRep);
      expect(resInvalido.valido).toBe(false);
      expect(resInvalido.mensaje).toBe(MENSAJES_ERROR.repetirClave);

      inputRep.value = 'Secret2026!';
      const resValido = validarCampo(inputRep);
      expect(resValido.valido).toBe(true);
    });

    it('ignora campos deshabilitados devolviendo siempre válido', () => {
      const inputDisabled = formulario.querySelector('#campo-deshabilitado');
      inputDisabled.value = 'VALOR-INVALIDO';

      const res = validarCampo(inputDisabled);
      expect(res.valido).toBe(true);
      expect(res.mensaje).toBe('');
      expect(inputDisabled.classList.contains('is-invalid')).toBe(false);
    });
  });

  describe('validarFormulario', () => {
    it('detecta errores globales, recopila lista y sitúa el foco en el primer inválido', () => {
      const inputTitulo = formulario.querySelector('#campo-titulo');
      const spyFocus = vi.spyOn(inputTitulo, 'focus');

      const res = validarFormulario(formulario);

      expect(res.esValido).toBe(false);
      expect(res.primerInvalido).toBe(inputTitulo);
      expect(res.errores.length).toBeGreaterThan(0);
      expect(spyFocus).toHaveBeenCalled();
    });

    it('devuelve válido cuando todos los campos obligatorios cumplen sus reglas', () => {
      formulario.querySelector('#campo-titulo').value = 'God of War';
      formulario.querySelector('#campo-sku').value = 'GAME-ACT-0001';
      formulario.querySelector('#campo-pwd').value = 'Password123!';
      formulario.querySelector('#campo-rep-pwd').value = 'Password123!';
      formulario.querySelector('#campo-terminos').checked = true;
      formulario.querySelector('#rad-a').checked = true;

      const res = validarFormulario(formulario);

      expect(res.esValido).toBe(true);
      expect(res.primerInvalido).toBeNull();
      expect(res.errores).toHaveLength(0);
    });

    it('no falla ante formularios nulos', () => {
      const res = validarFormulario(null);
      expect(res.esValido).toBe(true);
      expect(res.primerInvalido).toBeNull();
    });
  });

  describe('conectarValidacionTiempoReal', () => {
    it('añade novalidate al formulario al conectarse', () => {
      conectarValidacionTiempoReal(formulario);
      expect(formulario.noValidate).toBe(true);
    });

    it('valida al salir del campo por primera vez mediante oyente blur en fase de captura', () => {
      conectarValidacionTiempoReal(formulario);
      const inputTitulo = formulario.querySelector('#campo-titulo');

      // Antes de salir no está marcado como inválido
      expect(inputTitulo.classList.contains('is-invalid')).toBe(false);

      // Disparamos blur (simulando que el usuario abandona el campo vacío)
      inputTitulo.dispatchEvent(new Event('blur', { bubbles: false }));

      expect(inputTitulo.classList.contains('is-invalid')).toBe(true);
      expect(formulario.querySelector('#error-titulo').textContent).toBe(MENSAJES_ERROR.titulo);
    });

    it('valida reactivamente en cada evento input o change tras haber sido visitado', () => {
      conectarValidacionTiempoReal(formulario);
      const inputTitulo = formulario.querySelector('#campo-titulo');

      // 1. Visitamos el campo vacío (blur)
      inputTitulo.dispatchEvent(new Event('blur', { bubbles: false }));
      expect(inputTitulo.classList.contains('is-invalid')).toBe(true);

      // 2. El usuario empieza a teclear (evento input)
      inputTitulo.value = 'Sekiro';
      inputTitulo.dispatchEvent(new Event('input', { bubbles: true }));

      expect(inputTitulo.classList.contains('is-invalid')).toBe(false);
      expect(formulario.querySelector('#error-titulo').textContent).toBe('');
    });

    it('no valida prematuramente en evento input si el campo no ha sido visitado ni tiene error', () => {
      conectarValidacionTiempoReal(formulario);
      const inputSku = formulario.querySelector('#campo-sku');

      // Teclea texto incompleto sin haber abandonado el campo aún
      inputSku.value = 'G';
      inputSku.dispatchEvent(new Event('input', { bubbles: true }));

      expect(inputSku.classList.contains('is-invalid')).toBe(false);
    });

    it('revalida campos dependientes cuando cambia el campo principal', () => {
      conectarValidacionTiempoReal(formulario);
      const inputPwd = formulario.querySelector('#campo-pwd');
      const inputRep = formulario.querySelector('#campo-rep-pwd');

      inputPwd.value = 'Password123!';
      inputRep.value = 'Password123!';

      // Salimos del campo de repetición para marcarlo como visitado
      inputRep.dispatchEvent(new Event('blur', { bubbles: false }));
      expect(inputRep.classList.contains('is-invalid')).toBe(false);

      // El usuario cambia la contraseña original
      inputPwd.value = 'PasswordCambiada99!';
      inputPwd.dispatchEvent(new Event('input', { bubbles: true }));

      // El campo de repetición debe revalidarse de forma automática
      expect(inputRep.classList.contains('is-invalid')).toBe(true);
      expect(formulario.querySelector('#error-rep-pwd').textContent).toBe(
        MENSAJES_ERROR.repetirClave,
      );
    });

    it('bloquea el submit y da foco al primer error si el formulario no es válido', () => {
      conectarValidacionTiempoReal(formulario);
      const inputTitulo = formulario.querySelector('#campo-titulo');
      const spyFocus = vi.spyOn(inputTitulo, 'focus');

      const eventoSubmit = new Event('submit', { bubbles: true, cancelable: true });
      formulario.dispatchEvent(eventoSubmit);

      expect(eventoSubmit.defaultPrevented).toBe(true);
      expect(spyFocus).toHaveBeenCalled();
    });

    it('ejecuta alEnviarValido si todos los campos son válidos', () => {
      const spyAlEnviar = vi.fn();
      conectarValidacionTiempoReal(formulario, { alEnviarValido: spyAlEnviar });

      formulario.querySelector('#campo-titulo').value = 'Cyberpunk 2077';
      formulario.querySelector('#campo-sku').value = 'GAME-RPG-0099';
      formulario.querySelector('#campo-pwd').value = 'Password123!';
      formulario.querySelector('#campo-rep-pwd').value = 'Password123!';
      formulario.querySelector('#campo-terminos').checked = true;
      formulario.querySelector('#rad-a').checked = true;

      const eventoSubmit = new Event('submit', { bubbles: true, cancelable: true });
      formulario.dispatchEvent(eventoSubmit);

      expect(spyAlEnviar).toHaveBeenCalled();
    });

    it('desconecta los oyentes limpiamente al invocar la función de retorno', () => {
      const desconectar = conectarValidacionTiempoReal(formulario);
      desconectar();

      const inputTitulo = formulario.querySelector('#campo-titulo');
      inputTitulo.dispatchEvent(new Event('blur', { bubbles: false }));

      expect(inputTitulo.classList.contains('is-invalid')).toBe(false);
    });

    it('devuelve función no-op si el formulario es nulo', () => {
      const desconectar = conectarValidacionTiempoReal(null);
      expect(typeof desconectar).toBe('function');
      expect(() => desconectar()).not.toThrow();
    });
  });
});
