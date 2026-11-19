import { Toaster as Sonner } from 'sonner';
import { useTema } from '@/lib/tema';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { tema } = useTema();

  return (
    <Sonner
      theme={tema === 'oscuro' ? 'dark' : 'light'}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-superficie group-[.toaster]:text-texto group-[.toaster]:border-borde group-[.toaster]:shadow-lg group-[.toaster]:rounded-[6px]',
          description: 'group-[.toast]:text-texto-2',
          actionButton:
            'group-[.toast]:bg-[#FCBD17] group-[.toast]:text-sobre-acento group-[.toast]:font-bold',
          cancelButton:
            'group-[.toast]:bg-superficie-2 group-[.toast]:text-texto-2',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
