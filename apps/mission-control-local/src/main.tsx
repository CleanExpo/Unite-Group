import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './tokens.css';
import { Screen } from './Screen.tsx';
import { FleetProvider } from './useFleet.tsx';
import type { ScreenId } from '../shared/types.ts';

const screen: ScreenId = window.location.pathname.endsWith('/2') ? '2' : '1';
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <FleetProvider>
        <Screen screen={screen} />
      </FleetProvider>
    </StrictMode>,
  );
}
