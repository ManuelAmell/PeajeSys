import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useSesion } from '@/lib/sesion';
import { useLogin } from '@/api/recursos/auth';
import type { RespuestaLogin } from '@/api/recursos/auth';
import { ErrorApi } from '@/api/clienteHttp';
import { Button } from '@/components/ui/button';
import { DatosLogin, esquemaLogin } from './esquemaLogin';
import { TarjetaIrA } from './TarjetaIrA';

export interface PrecargaCredenciales {
  codigo: string;
  clave: string;
}

export interface FormularioLoginProps {
  precarga?: PrecargaCredenciales | null;
}

/**
 * Formulario de inicio de sesión de Login.dc.html con React Hook Form + Zod.
 * Llama a POST /api/auth/login mediante el hook useLogin de src/api y, al entrar,
 * guarda la sesión de B0 y muestra la tarjeta «Ir a …».
 */
export function FormularioLogin({ precarga = null }: FormularioLoginProps) {
  const { iniciarSesion, cerrarSesion } = useSesion();
  const navigate = useNavigate();
  const iniciar = useLogin();
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [ingresado, setIngresado] = useState<RespuestaLogin['usuario'] | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<DatosLogin>({
    resolver: zodResolver(esquemaLogin),
    defaultValues: { codigo: '', clave: '' },
  });

  useEffect(() => {
    if (precarga) {
      setValue('codigo', precarga.codigo);
      setValue('clave', precarga.clave);
      clearErrors();
      setErrorServidor(null);
    }
  }, [precarga, setValue, clearErrors]);

  const enviar = async (datos: DatosLogin) => {
    setErrorServidor(null);
    try {
      const respuesta = await iniciar.mutateAsync({
        codigo: datos.codigo,
        clave: datos.clave,
      });
      iniciarSesion({
        id: respuesta.usuario.id,
        nombre: respuesta.usuario.nombre_completo ?? respuesta.usuario.nombre,
        rol: respuesta.usuario.rol,
        codigo: respuesta.usuario.codigo,
      });
      setIngresado(respuesta.usuario);
    } catch (error) {
      const errorApi = error instanceof ErrorApi ? error : null;
      if (errorApi?.campos?.codigo) {
        setError(
          'codigo',
          { type: 'servidor', message: errorApi.campos.codigo },
          { shouldFocus: true },
        );
      } else if (errorApi?.campos?.clave) {
        setError(
          'clave',
          { type: 'servidor', message: errorApi.campos.clave },
          { shouldFocus: true },
        );
      } else {
        setErrorServidor(
          errorApi?.message ?? 'No se pudo conectar con el servidor.',
        );
      }
    }
  };

  const limpiarError = () => {
    clearErrors();
    setErrorServidor(null);
  };

  const volver = () => {
    cerrarSesion();
    setIngresado(null);
    setValue('clave', '');
    clearErrors();
    setErrorServidor(null);
  };

  if (ingresado) {
    return (
      <TarjetaIrA
        nombre={ingresado.nombre}
        rolTxt={ingresado.rol_txt}
        codigo={ingresado.codigo}
        destinoTxt={ingresado.destino_txt}
        alNavegar={() => navigate(ingresado.destino)}
        alVolver={volver}
      />
    );
  }

  const campoError = errors.codigo ? 'codigo' : errors.clave ? 'clave' : null;
  const mensajeError =
    errors.codigo?.message ?? errors.clave?.message ?? errorServidor;
  const cargando = isSubmitting || iniciar.isPending;

  return (
    <form
      onSubmit={handleSubmit(enviar)}
      noValidate
      className="flex flex-col gap-[18px]"
    >
      <div className="flex flex-col gap-[8px]">
        <label htmlFor="lg-codigo" className="text-[16px] font-semibold">
          Código de empleado
        </label>
        <input
          id="lg-codigo"
          type="text"
          autoComplete="username"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="EMP-000"
          maxLength={8}
          aria-invalid={campoError === 'codigo'}
          aria-describedby={campoError === 'codigo' ? 'lg-error' : undefined}
          className={`h-[56px] rounded-[6px] border-2 bg-superficie px-[16px] text-[22px] font-semibold uppercase tracking-[0.04em] text-texto ${
            campoError === 'codigo' ? 'border-error' : 'border-borde-fuerte'
          }`}
          {...register('codigo', { onChange: limpiarError })}
        />
      </div>
      <div className="flex flex-col gap-[8px]">
        <label htmlFor="lg-clave" className="text-[16px] font-semibold">
          Contraseña
        </label>
        <input
          id="lg-clave"
          type="password"
          autoComplete="current-password"
          aria-invalid={campoError === 'clave'}
          aria-describedby={campoError === 'clave' ? 'lg-error' : undefined}
          className={`h-[56px] rounded-[6px] border-2 bg-superficie px-[16px] text-[20px] font-medium text-texto ${
            campoError === 'clave' ? 'border-error' : 'border-borde-fuerte'
          }`}
          {...register('clave', { onChange: limpiarError })}
        />
      </div>
      {mensajeError && (
        <p
          id="lg-error"
          role="alert"
          className="m-0 rounded-[6px] bg-error-fondo p-[12px] px-[14px] text-[16px] font-semibold text-error"
        >
          {mensajeError}
        </p>
      )}
      <Button
        type="submit"
        variant="primario"
        disabled={cargando}
        className="h-[60px] border-[3px] text-[20px]"
      >
        Ingresar
      </Button>
    </form>
  );
}
