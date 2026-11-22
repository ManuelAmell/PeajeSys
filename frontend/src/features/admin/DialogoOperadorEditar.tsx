import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ErrorApi } from '@/api/clienteHttp';
import { useActualizarOperador } from '@/api/recursos/operadores';
import type { Operador } from '@/types';
import { CampoSelect, CampoTexto } from './CamposFormulario';
import { MarcoDialogoOperador } from './MarcoDialogoOperador';
import {
  ETIQUETA_ROL,
  ROLES_FORMULARIO,
  esquemaFormularioOperadorEdicion,
  rolDesdeApi,
  rolParaApi,
  type DatosFormularioOperadorEdicion,
  type ValoresFormularioOperadorEdicion,
} from './esquemaOperadorForm';

export interface DialogoOperadorEditarProps {
  operador: Operador;
  onCerrar: () => void;
  onGuardado: (operador: Operador) => void;
}

/** Edición parcial de nombres, apellidos y rol (PATCH /api/operadores/{id}). */
export function DialogoOperadorEditar({
  operador,
  onCerrar,
  onGuardado,
}: DialogoOperadorEditarProps) {
  const actualizar = useActualizarOperador();
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<
    ValoresFormularioOperadorEdicion,
    unknown,
    DatosFormularioOperadorEdicion
  >({
    resolver: zodResolver(esquemaFormularioOperadorEdicion),
    defaultValues: {
      nombres: operador.nombres,
      apellidos: operador.apellidos,
      rol: rolDesdeApi(operador.rol),
    },
  });

  const enviar = async (datos: DatosFormularioOperadorEdicion) => {
    setErrorServidor(null);
    try {
      const guardado = await actualizar.mutateAsync({
        id: operador.id_operador,
        datos: {
          nombres: datos.nombres,
          apellidos: datos.apellidos,
          rol: rolParaApi(datos.rol),
        },
      });
      onGuardado(guardado);
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
      idTitulo="op-t-editar"
      titulo="Editar operador"
      descripcion={`${operador.codigo_empleado} · documento ${operador.numero_documento}.`}
      textoEnviar="Guardar cambios"
      enviando={isSubmitting || actualizar.isPending}
      errorServidor={errorServidor}
      onCerrar={onCerrar}
      onSubmit={handleSubmit(enviar)}
    >
      <CampoTexto
        id="op-ed-nombres"
        etiqueta="Nombres"
        autoComplete="off"
        maxLength={100}
        error={errors.nombres?.message}
        {...register('nombres')}
      />
      <CampoTexto
        id="op-ed-apellidos"
        etiqueta="Apellidos"
        autoComplete="off"
        maxLength={100}
        error={errors.apellidos?.message}
        {...register('apellidos')}
      />
      <CampoSelect
        id="op-ed-rol"
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
    </MarcoDialogoOperador>
  );
}
