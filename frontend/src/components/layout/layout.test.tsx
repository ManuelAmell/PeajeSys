import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderConProveedores } from '@/test/render';
import { Cabecera } from './Cabecera';
import { Franja } from './Franja';
import { LayoutApp } from './LayoutApp';
import { Usuario } from '@/lib/roles';

const mockUsuario: Usuario = {
  id: 'EMP-001',
  nombre: 'María López',
  rol: 'RECAUDADOR',
};

describe('Componentes de Layout', () => {
  describe('Franja', () => {
    it('renderiza la franja vial decorativa con aria-hidden', () => {
      const { container } = renderConProveedores(<Franja />);
      const franja = container.querySelector('.ps-franja-diagonal');
      expect(franja).toBeInTheDocument();
      expect(franja).toHaveAttribute('aria-hidden', 'true');
    });

    it('soporta variante de altura reducida', () => {
      const { container } = renderConProveedores(<Franja altura="sm" />);
      const franja = container.querySelector('.ps-franja-diagonal-sm');
      expect(franja).toBeInTheDocument();
    });
  });

  describe('Cabecera', () => {
    it('muestra el logo, título y datos del usuario cuando hay sesión activa', () => {
      renderConProveedores(
        <Cabecera titulo="Terminal de cobro" subtitulo="Estación Gambote" />,
        { usuarioInicial: mockUsuario },
      );

      expect(screen.getByAltText('PeajeSys')).toBeInTheDocument();
      expect(screen.getByText('Terminal de cobro')).toBeInTheDocument();
      expect(screen.getByText('Estación Gambote')).toBeInTheDocument();
      expect(screen.getByText('María López')).toBeInTheDocument();
      expect(screen.getByText('RECAUDADOR')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /cerrar sesión/i }),
      ).toBeInTheDocument();
    });

    it('permite cerrar sesión pulsando el botón correspondiente', async () => {
      const user = userEvent.setup();

      renderConProveedores(<Cabecera titulo="Panel de control" />, {
        usuarioInicial: mockUsuario,
        initialEntries: ['/operador'],
      });

      const botonCerrar = screen.getByRole('button', {
        name: /cerrar sesión/i,
      });
      await user.click(botonCerrar);

      // Al cerrar sesión ya no se muestra el botón de cerrar sesión
      expect(
        screen.queryByRole('button', { name: /cerrar sesión/i }),
      ).not.toBeInTheDocument();
    });

    it('no muestra datos de usuario si no hay sesión iniciada', () => {
      renderConProveedores(<Cabecera titulo="Inicio" />, {
        usuarioInicial: null,
      });

      expect(screen.getByText('Inicio')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /cerrar sesión/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('LayoutApp', () => {
    it('incluye enlace para saltar al contenido, cabecera, franja y contenedor principal', () => {
      renderConProveedores(
        <LayoutApp titulo="Vista principal">
          <h1>Título de contenido</h1>
          <p>Texto dentro del layout</p>
        </LayoutApp>,
        { usuarioInicial: mockUsuario },
      );

      const skipLink = screen.getByText('Saltar al contenido');
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#contenido-principal');

      const main = screen.getByRole('main');
      expect(main).toHaveAttribute('id', 'contenido-principal');
      expect(screen.getByText('Texto dentro del layout')).toBeInTheDocument();
    });
  });
});
