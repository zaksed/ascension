import { createRoot } from 'react-dom/client';
import { App } from './App';
import { setupPwa } from './pwa';
import './index.css';

// Pas de <StrictMode> : les séances tirent leurs questions à l'initialisation (effet de bord voulu).
createRoot(document.getElementById('root')!).render(<App />);

if (import.meta.env.PROD) setupPwa();
