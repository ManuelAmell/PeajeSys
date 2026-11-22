import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ErrorApi } from '@/api/clienteHttp';
import { useActualizarOperador } from '@/api/recursos/operadores';
import type { Operador } from '@/types';
import { BotonMostrarClave, CampoTexto } from './CamposFormulario';
import { useVisibilidadClave } from './useVisibilidadClave';
import { MarcoDialogoOperador } from './MarcoDialogoOperador';
import {
  esquemaFormularioPassword,
  type DatosFormularioPassword,
  type ValoresFormularioPassword,
} from './esquemaOperadorForm';

export interface DialogoOperadorPasswordProps {
  operador: Operador;
  onCerrar: () => void;
  onCambiada: (operador: Operador) => void;
}

/** Cambio de contraseña: PATCH /api/operadores/{id} solo con password. */
export function DialogoOperadorPassword({
  operador,
  onCerrar,
  onCambiada,
}: DialogoOperadorPasswordProps) {
  const actualizar = useActualizarOperador();
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const clave = useVisibilidadClave();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ValoresFormularioPassword, unknown, DatosFormularioPassword>({
    resolver: zodResolver(esquemaFormularioPassword),
    defaultValues: { password: '', confirmacion: '' },
  });

  const enviar = async (datos: DatosFormularioPassword) => {
    setErrorServidor(null);
    try {
      const guardado = await actualizar.mutateAsync({
        id: operador.id_operador,
        datos: { password: datos.password },
      });
      onCambiada(guardado);
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
      idTitulo="op-t-password"
      titulo="Cambiar contraseña"
      descripcion={`${operador.nombres} ${operador.apellidos} (${operador.codigo_empleado}). La contraseña anterior deja de servir.`}
      textoEnviar="Guardar contraseña"
      enviando={isSubmitting || actualizar.isPending}
      errorServidor={errorServidor}
      onCerrar={onCerrar}
      onSubmit={handleSubmit(enviar)}
    >
      <CampoTexto
        id="op-pw-nueva"
        etiqueta="Nueva contraseña"
        type={clave.tipo}
        autoComplete="new-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <CampoTexto
        id="op-pw-confirmacion"
        etiqueta="Confirmar contraseña"
        type={clave.tipo}
        autoComplete="new-password"
        error={errors.confirmacion?.message}
        {...register('confirmacion')}
      />
      <BotonMostrarClave visible={clave.visible} onAlternar={clave.alternar} />
    </MarcoDialogoOperador>
  );
}
