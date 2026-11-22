import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ErrorApi } from '@/api/clienteHttp';
import { useCrearOperador } from '@/api/recursos/operadores';
import type { Operador } from '@/types';
import { BotonMostrarClave, CampoSelect, CampoTexto } from './CamposFormulario';
import { useVisibilidadClave } from './useVisibilidadClave';
import { MarcoDialogoOperador } from './MarcoDialogoOperador';
import {
  ETIQUETA_ROL,
  ROLES_FORMULARIO,
  esquemaFormularioOperadorNuevo,
  rolParaApi,
  type DatosFormularioOperadorNuevo,
  type ValoresFormularioOperadorNuevo,
} from './esquemaOperadorForm';

export interface DialogoOperadorNuevoProps {
  onCerrar: () => void;
  onCreado: (operador: Operador) => void;
}

/** Alta de operador con contraseña (POST /api/operadores). */
export function DialogoOperadorNuevo({
  onCerrar,
  onCreado,
}: DialogoOperadorNuevoProps) {
  const crear = useCrearOperador();
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const clave = useVisibilidadClave();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<
    ValoresFormularioOperadorNuevo,
    unknown,
    DatosFormularioOperadorNuevo
  >({
    resolver: zodResolver(esquemaFormularioOperadorNuevo),
    defaultValues: {
      documento: '',
      nombres: '',
      apellidos: '',
      codigo: '',
      rol: 'RECAUDADOR',
      password: '',
      confirmacion: '',
    },
  });

  const enviar = async (datos: DatosFormularioOperadorNuevo) => {
    setErrorServidor(null);
    try {
      const creado = await crear.mutateAsync({
        numero_documento: datos.documento,
        nombres: datos.nombres,
        apellidos: datos.apellidos,
        codigo_empleado: datos.codigo,
        rol: rolParaApi(datos.rol),
        password: datos.password,
      });
      onCreado(creado);
    } catch (error) {
      setErrorServidor(
        error instanceof ErrorApi
          ? error.message
          : 'No se pudo conectar con el servidor.',
      );
    }
  };

  return (
    <MarcoDialogoOperador
      idTitulo="op-t-nuevo"
      titulo="Nuevo operador"
      descripcion="El operador podrá iniciar sesión con su código de empleado y esta contraseña."
      textoEnviar="Crear operador"
      enviando={isSubmitting || crear.isPending}
      errorServidor={errorServidor}
      onCerrar={onCerrar}
      onSubmit={handleSubmit(enviar)}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto
          id="op-documento"
          etiqueta="Documento"
          inputMode="numeric"
          autoComplete="off"
          maxLength={20}
          error={errors.documento?.message}
          {...register('documento')}
        />
        <CampoTexto
          id="op-codigo"
          etiqueta="Código de empleado"
          autoComplete="off"
          maxLength={20}
          placeholder="REC-010"
          error={errors.codigo?.message}
          {...register('codigo')}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto
          id="op-nombres"
          etiqueta="Nombres"
          autoComplete="off"
          maxLength={100}
          error={errors.nombres?.message}
          {...register('nombres')}
        />
        <CampoTexto
          id="op-apellidos"
          etiqueta="Apellidos"
          autoComplete="off"
          maxLength={100}
          error={errors.apellidos?.message}
          {...register('apellidos')}
        />
      </div>
      <CampoSelect
        id="op-rol"
        etiqueta="Rol"
        error={errors.rol?.message}
        {...register('rol')}
      >
        {ROLES_FORMULARIO.map((rol) => (
          <option key={rol} value={rol}>
            {ETIQUETA_ROL[rol]}
          </option>
        ))}
      </CampoSelect>
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto
          id="op-password"
          etiqueta="Contraseña"
          type={clave.tipo}
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <CampoTexto
          id="op-confirmacion"
          etiqueta="Confirmar contraseña"
          type={clave.tipo}
          autoComplete="new-password"
          error={errors.confirmacion?.message}
          {...register('confirmacion')}
        />
      </div>
      <BotonMostrarClave visible={clave.visible} onAlternar={clave.alternar} />
    </MarcoDialogoOperador>
  );
}
