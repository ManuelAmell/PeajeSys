import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './input';
import { Label } from './label';
import { Badge } from './badge';
import { Checkbox } from './checkbox';
import { RadioGroup, RadioGroupItem } from './radio-group';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from './table';
import { Separator } from './separator';
import { Skeleton } from './skeleton';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from './tooltip';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from './select';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from './form';
import { useForm } from 'react-hook-form';

describe('Componentes shadcn/ui estilizados', () => {
  describe('Input y Label', () => {
    it('renderiza Input con estilos y soporte de error accesible', () => {
      render(
        <div>
          <Label htmlFor="placa">Placa vehicular</Label>
          <Input id="placa" placeholder="HKL123" error={true} />
        </div>,
      );

      const input = screen.getByPlaceholderText('HKL123');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText('Placa vehicular')).toBeInTheDocument();
    });
  });

  describe('Badge', () => {
    it('renderiza variantes de estado de negocio y pago', () => {
      render(
        <div>
          <Badge variant="correcto">ABIERTO</Badge>
          <Badge variant="error">FALTANTE</Badge>
          <Badge variant="aviso">SOBRANTE</Badge>
          <Badge variant="telepeaje">TELEPEAJE</Badge>
          <Badge variant="efectivo">EFECTIVO</Badge>
          <Badge variant="exento">EXENTO</Badge>
        </div>,
      );

      expect(screen.getByText('ABIERTO')).toBeInTheDocument();
      expect(screen.getByText('FALTANTE')).toBeInTheDocument();
      expect(screen.getByText('SOBRANTE')).toBeInTheDocument();
      expect(screen.getByText('TELEPEAJE')).toBeInTheDocument();
      expect(screen.getByText('EFECTIVO')).toBeInTheDocument();
      expect(screen.getByText('EXENTO')).toBeInTheDocument();
    });
  });

  describe('Checkbox', () => {
    it('permite alternar estado al hacer clic', async () => {
      const user = userEvent.setup();
      render(<Checkbox aria-label="Aceptar términos" />);

      const checkbox = screen.getByRole('checkbox', {
        name: /aceptar términos/i,
      });
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();
    });
  });

  describe('RadioGroup', () => {
    it('permite seleccionar una opción entre varias', async () => {
      const user = userEvent.setup();
      render(
        <RadioGroup defaultValue="efectivo">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="efectivo" id="r-efectivo" />
            <Label htmlFor="r-efectivo">Efectivo</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="telepeaje" id="r-telepeaje" />
            <Label htmlFor="r-telepeaje">Telepeaje</Label>
          </div>
        </RadioGroup>,
      );

      const radioEfectivo = screen.getByRole('radio', { name: /efectivo/i });
      const radioTelepeaje = screen.getByRole('radio', { name: /telepeaje/i });

      expect(radioEfectivo).toBeChecked();
      expect(radioTelepeaje).not.toBeChecked();

      await user.click(radioTelepeaje);
      expect(radioTelepeaje).toBeChecked();
      expect(radioEfectivo).not.toBeChecked();
    });
  });

  describe('Tabs', () => {
    it('muestra el contenido de la pestaña seleccionada', async () => {
      const user = userEvent.setup();
      render(
        <Tabs defaultValue="tarifa">
          <TabsList>
            <TabsTrigger value="tarifa">Tarifas</TabsTrigger>
            <TabsTrigger value="recaudo">Recaudo</TabsTrigger>
          </TabsList>
          <TabsContent value="tarifa">Panel de Tarifas</TabsContent>
          <TabsContent value="recaudo">Panel de Recaudo</TabsContent>
        </Tabs>,
      );

      expect(screen.getByText('Panel de Tarifas')).toBeInTheDocument();
      expect(screen.queryByText('Panel de Recaudo')).not.toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: /recaudo/i }));
      expect(screen.getByText('Panel de Recaudo')).toBeInTheDocument();
      expect(screen.queryByText('Panel de Tarifas')).not.toBeInTheDocument();
    });
  });

  describe('Table', () => {
    it('renderiza estructura semántica de tabla de datos', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Turno</TableHead>
              <TableHead>Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>5</TableCell>
              <TableCell>$ 420.000</TableCell>
            </TableRow>
          </TableBody>
        </Table>,
      );

      expect(screen.getByText('Turno')).toBeInTheDocument();
      expect(screen.getByText('$ 420.000')).toBeInTheDocument();
    });
  });

  describe('Separator y Skeleton', () => {
    it('renderiza Separator y Skeleton correctamente', () => {
      const { container } = render(
        <div>
          <Skeleton className="h-6 w-24" data-testid="esqueleto" />
          <Separator />
        </div>,
      );

      expect(screen.getByTestId('esqueleto')).toBeInTheDocument();
      expect(container.querySelector('div[role="none"]')).toBeInTheDocument();
    });
  });

  describe('Tooltip', () => {
    it('renderiza trigger y proveedor de tooltip', () => {
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button>Info</button>
            </TooltipTrigger>
            <TooltipContent>Información detallada</TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );

      expect(screen.getByRole('button', { name: /info/i })).toBeInTheDocument();
    });
  });

  describe('Select', () => {
    it('renderiza SelectTrigger con valor inicial', () => {
      render(
        <Select defaultValue="cat1">
          <SelectTrigger aria-label="Seleccionar categoría">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cat1">Categoría I</SelectItem>
            <SelectItem value="cat2">Categoría II</SelectItem>
          </SelectContent>
        </Select>,
      );

      expect(
        screen.getByRole('combobox', { name: /seleccionar categoría/i }),
      ).toBeInTheDocument();
    });
  });

  describe('Form', () => {
    it('renderiza un formulario accesible con control y descripción', () => {
      function FormularioPrueba() {
        const form = useForm({ defaultValues: { placa: '' } });
        return (
          <Form {...form}>
            <form>
              <FormField
                control={form.control}
                name="placa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Placa vehicular</FormLabel>
                    <FormControl>
                      <Input placeholder="ABC123" {...field} />
                    </FormControl>
                    <FormDescription>6 caracteres</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        );
      }

      render(<FormularioPrueba />);
      expect(screen.getByText('Placa vehicular')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('ABC123')).toBeInTheDocument();
      expect(screen.getByText('6 caracteres')).toBeInTheDocument();
    });
  });
});
