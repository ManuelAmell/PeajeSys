import { Link } from 'react-router-dom';
import { LayoutApp } from '@/components/layout/LayoutApp';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <LayoutApp titulo="Página no encontrada">
      <div className="flex flex-col items-center justify-center p-8 md:p-16 text-center max-w-xl mx-auto gap-5">
        <span className="text-[64px] font-bold text-acento-texto leading-none">
          404
        </span>
        <h1 className="text-[32px] md:text-[36px] font-bold text-texto m-0">
          Página no encontrada
        </h1>
        <p className="text-[18px] text-texto-2 m-0">
          La ruta que intentas consultar no existe o ha sido movida dentro del
          sistema de peajes.
        </p>
        <Button asChild variant="primario" className="mt-4">
          <Link to="/">Volver al inicio</Link>
        </Button>
      </div>
    </LayoutApp>
  );
}
