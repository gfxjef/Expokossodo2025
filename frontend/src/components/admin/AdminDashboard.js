import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, BarChart3, Settings, ChevronLeft, ChevronRight, Home, Clock, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { adminService, adminUtils } from '../../services/adminService';
import AdminEventGrid from './AdminEventGrid';
import ScheduleManager from './ScheduleManager';
import DateInfoManager from './DateInfoManager';
import LoadingSpinner from '../LoadingSpinner';
import ConfigDebug from './ConfigDebug'; // Temporal para debug

const AdminDashboard = () => {
  // Estados principales
  const [currentTab, setCurrentTab] = useState('eventos'); // 'eventos' | 'horarios' | 'fechas'
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [eventsData, setEventsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  // Fechas del evento
  const eventDates = ['2025-09-02', '2025-09-03', '2025-09-04'];
  const dateNames = ['Día 1 - Martes', 'Día 2 - Miercoles', 'Día 3 - Jueves'];

  // Cargar datos de eventos al montar el componente
  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await adminService.getEventos();
      setEventsData(data);

      // Calcular estadísticas
      const statsData = adminUtils.getEventosStats(data);
      setStats(statsData);

      toast.success('Eventos cargados correctamente');
    } catch (error) {
      console.error('Error loading events:', error);
      setError(error.message || 'Error al cargar los eventos');
      toast.error('Error al cargar los eventos');
    } finally {
      setLoading(false);
    }
  };

  // Navegación entre fechas
  const goToNextDate = () => {
    if (currentDateIndex < eventDates.length - 1) {
      setCurrentDateIndex(currentDateIndex + 1);
    }
  };

  const goToPreviousDate = () => {
    if (currentDateIndex > 0) {
      setCurrentDateIndex(currentDateIndex - 1);
    }
  };

  // Ir a la página principal
  const goToHome = () => {
    window.location.href = '/';
  };

  // Manejar actualización de evento desde el grid
  const handleEventUpdate = async () => {
    await loadEvents(); // Recargar datos
  };

  if (loading) {
    return <LoadingSpinner message="Cargando panel de administración..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error al cargar datos</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadEvents}
            className="btn-primary"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const currentEvents = eventsData[eventDates[currentDateIndex]] || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Settings className="h-8 w-8 text-indigo-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Panel de Administración</h1>
                  <p className="text-sm text-gray-500">ExpoKossodo 2025</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={goToHome}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Home className="h-4 w-4" />
              <span>Volver al sitio</span>
            </button>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
            >
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Eventos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalEventos}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
            >
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Registros</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalOcupados}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
            >
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Ocupación</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.porcentajeOcupacion}%</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
            >
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Disponibles</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalDisponibles - stats.totalOcupados}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Pestañas de navegación */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <div className="flex space-x-8 px-6">
              <button
                onClick={() => setCurrentTab('eventos')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  currentTab === 'eventos'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Gestión de Eventos</span>
                </div>
              </button>
              
              <button
                onClick={() => setCurrentTab('horarios')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  currentTab === 'horarios'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Gestión de Horarios</span>
                </div>
              </button>

              <button
                onClick={() => setCurrentTab('fechas')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  currentTab === 'fechas'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Info className="h-4 w-4" />
                  <span>Gestión de Fechas</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Contenido de las pestañas */}
        {currentTab === 'eventos' && (
          <>
            {/* Navigation para eventos */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h2 className="text-2xl font-bold text-gray-900">Gestión de Eventos</h2>
                  <div className="flex items-center space-x-2 bg-indigo-50 px-3 py-1 rounded-full">
                    <Calendar className="h-4 w-4 text-indigo-600" />
                    <span className="text-sm font-medium text-indigo-600">{dateNames[currentDateIndex]}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={goToPreviousDate}
                    disabled={currentDateIndex === 0}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Anterior</span>
                  </button>

                  <div className="flex space-x-2">
                    {eventDates.map((date, index) => (
                      <button
                        key={date}
                        onClick={() => setCurrentDateIndex(index)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          index === currentDateIndex
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Día {index + 1}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={goToNextDate}
                    disabled={currentDateIndex === eventDates.length - 1}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <span>Siguiente</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Event Grid */}
            <AdminEventGrid
              eventos={currentEvents}
              fecha={eventDates[currentDateIndex]}
              onEventUpdate={handleEventUpdate}
            />
          </>
        )}

        {currentTab === 'horarios' && (
          <ScheduleManager />
        )}

        {currentTab === 'fechas' && (
          <DateInfoManager />
        )}
      </div>

      {/* Footer */}
      <footer className="mt-12 py-8 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-600">
            <p>Panel de Administración - ExpoKossodo 2025</p>
            <p className="text-sm mt-1">Gestión de eventos y contenido</p>
          </div>
        </div>
      </footer>
      
      {/* Debug Component - TEMPORAL */}
      <ConfigDebug />
    </div>
  );
};

export default AdminDashboard; 