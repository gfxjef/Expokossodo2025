import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import EventRegistrationWithLanding from './components/EventRegistrationWithLanding';
import AdminDashboard from './components/admin/AdminDashboard';
import VerificadorGeneral from './components/VerificadorGeneral';
import SelectorCharlas from './components/SelectorCharlas';
import VerificadorSala from './components/VerificadorSala';
import ChatWidget from './components/ChatWidget';
import './index.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              theme: {
                primary: '#4aed88',
              },
            },
          }}
        />
        
        <Routes>
          {/* Ruta principal - Registro de eventos con landing */}
          <Route path="/" element={<EventRegistrationWithLanding />} />
          
          {/* Ruta de administración */}
          <Route path="/admin" element={<AdminDashboard />} />
          
          {/* Rutas de verificación QR */}
          <Route path="/verificar" element={<VerificadorGeneral />} />
          <Route path="/verificarSala" element={<SelectorCharlas />} />
          <Route path="/verificarSala/:eventoId" element={<VerificadorSala />} />
          
          {/* Redirección por defecto */}
          <Route path="*" element={<EventRegistrationWithLanding />} />
        </Routes>
        
        {/* Chat Widget - Se muestra en todas las páginas */}
        <ChatWidget />
      </div>
    </Router>
  );
}

export default App; 