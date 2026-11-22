import { Routes, Route } from 'react-router-dom';
import { OperadorTerminalPage } from './OperadorTerminalPage';
import { AbrirTurnoPage } from './AbrirTurnoPage';

export default function OperadorFeatureRoutes() {
  return (
    <Routes>
      <Route path="abrir-turno" element={<AbrirTurnoPage />} />
      <Route path="*" element={<OperadorTerminalPage />} />
    </Routes>
  );
}

export { OperadorTerminalPage as OperadorPage };
