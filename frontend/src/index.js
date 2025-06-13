import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // StrictMode temporalmente desactivado para evitar llamadas duplicadas en desarrollo
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
); 