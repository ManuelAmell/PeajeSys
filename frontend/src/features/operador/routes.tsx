import { LayoutApp } from '@/components/layout/LayoutApp';

export default function OperadorPage() {
  return (
    <LayoutApp titulo="Terminal de cobro">
      <div className="p-6 md:p-10 max-w-4xl mx-auto flex flex-col gap-4">
        <h1 className="text-[28px] md:text-[32px] font-bold text-texto m-0">
          Terminal de cobro
        </h1>
        <p className="text-[17px] text-texto-2 m-0">En construcción</p>
      </div>
    </LayoutApp>
  );
}
