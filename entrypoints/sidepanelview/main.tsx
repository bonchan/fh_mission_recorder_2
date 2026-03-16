import React from 'react';
import ReactDOM from 'react-dom/client';
import SidePanelView from './SidePanelView';
import { ExtensionStateProvider } from '@/components/ExtensionStateProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ExtensionStateProvider>
      <SidePanelView />
    </ExtensionStateProvider>
  </React.StrictMode>,
);