import { LayoutApp } from '@/components/layout/LayoutApp';

export default function SupervisorPage() {
  return (
    <LayoutApp titulo="Supervisión">
      <div className="p-6 md:p-10 max-w-7xl mx-auto flex flex-col gap-4">
        <h1 className="text-[32px] md:text-[36px] font-bold text-texto">
          Supervisión
        </h1>
        <p className="text-[18px] text-texto-2">En construcción</p>
      </div>
    </LayoutApp>
  );
}
