import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import EventRegistrationWithLanding from './components/EventRegistrationWithLanding';
import AdminDashboard from './components/admin/AdminDashboard';
import VerificadorGeneral from './components/VerificadorGeneral';
import SelectorCharlas from './components/SelectorCharlas';
import VerificadorSala from './components/VerificadorSala';
import VisualizacionDashboard from './components/VisualizacionDashboard';
import AsesoresDashboard from './components/asesores/AsesoresDashboard';
import ChatWidget from './components/ChatWidget';
import { analyticsService } from './services/analytics';
import './index.css';

// Componente para trackear cambios de ruta
function RouteTracker() {
  const location = useLocation();

  useEffect(() => {
    // Trackear vista de página cuando cambia la ruta
    analyticsService.trackPageView(location.pathname);
    
    // Trackear navegación entre secciones
    const currentSection = getSectionFromPath(location.pathname);
    analyticsService.trackNavigation('Navegación', currentSection);
    
    console.log('📊 Ruta cambiada:', location.pathname);
  }, [location]);

  // Función para obtener la sección desde la ruta
  const getSectionFromPath = (path) => {
    if (path === '/') return 'Landing Principal';
    if (path === '/admin') return 'Panel Administración';
    if (path === '/visualizacion') return 'Dashboard Visualización';
    if (path === '/asesores') return 'Panel Asesores';
    if (path.startsWith('/verificar')) return 'Verificación QR';
    if (path.startsWith('/charla/')) return 'Charlas Específicas';
    if (path === '/registrate') return 'Registro Directo';
    return 'Otra Sección';
  };

  return null;
}

function App() {
  // Inicializar Google Analytics al cargar la aplicación
  useEffect(() => {
    const initSuccess = analyticsService.init();
    if (initSuccess) {
      console.log('📊 Google Analytics configurado en App.js');
      
      // Trackear información de la sesión
      const sessionInfo = analyticsService.getSessionInfo();
      console.log('📊 Info de sesión:', sessionInfo);
    } else {
      console.warn('⚠️ Google Analytics no se pudo inicializar');
    }
  }, []);

  return (
    <Router>
      <div className="App">
        {/* Componente para trackear rutas */}
        <RouteTracker />
        
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
          
          {/* Ruta de visualización para gestores */}
          <Route path="/visualizacion" element={<VisualizacionDashboard />} />
          
          {/* Ruta de asesores */}
          <Route path="/asesores" element={<AsesoresDashboard />} />
          
          {/* Rutas de verificación QR */}
          <Route path="/verificar" element={<VerificadorGeneral />} />
          <Route path="/verificarSala" element={<SelectorCharlas />} />
          <Route path="/verificarSala/:eventoId" element={<VerificadorSala />} />
          
          {/* Ruta directa a charlas específicas */}
          <Route path="/charla/:slug" element={<EventRegistrationWithLanding />} />
          
          {/* Ruta directa para registro */}
          <Route path="/registrate" element={<EventRegistrationWithLanding />} />
          
          {/* Redirección por defecto */}
          <Route path="*" element={<EventRegistrationWithLanding />} />
        </Routes>
        
        {/* Chat Widget - Ahora se muestra solo en páginas principales */}
      </div>
    </Router>
  );
}

export default App; 