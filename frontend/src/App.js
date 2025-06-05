import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import EventRegistration from './components/EventRegistration';
import AdminDashboard from './components/admin/AdminDashboard';
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
          {/* Ruta principal - Registro de eventos */}
          <Route path="/" element={<EventRegistration />} />
          
          {/* Ruta de administración */}
          <Route path="/admin" element={<AdminDashboard />} />
          
          {/* Redirección por defecto */}
          <Route path="*" element={<EventRegistration />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 