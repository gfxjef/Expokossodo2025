import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, RefreshCw, Users, Calendar, TrendingUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { asesoresService } from '../../services/asesoresService';
import DayNavigation from './DayNavigation';
import AsesoresEventGrid from './AsesoresEventGrid';
import RegistrosAsesores from './RegistrosAsesores';
import LoadingSpinner from '../LoadingSpinner';

const AsesoresDashboard = () => {
  // Estados principales
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  
  // Estado para mostrar sección de registros
  const [showRegistros, setShowRegistros] = useState(false);

  // Configuración de fechas
  const eventDates = asesoresService.getEventDates();
  const dateNames = asesoresService.getDateNames();

  // Cargar eventos del día actual
  const loadEventos = useCallback(async (dateIndex = currentDateIndex) => {
    try {
      setLoading(true);
      setError(null);

      const fecha = eventDates[dateIndex];
      console.log(`📅 Cargando eventos para: ${fecha}`);

      const eventosDelDia = await asesoresService.getEventosByDay(fecha);
      setEventos(eventosDelDia);

      // Calcular estadísticas
      const statsDelDia = asesoresService.getStatsByDay(eventosDelDia);
      setStats(statsDelDia);

      console.log(`✅ Eventos cargados: ${eventosDelDia.length} eventos`);
      toast.success(`Eventos del ${dateNames[dateIndex]} cargados correctamente`);
    } catch (error) {
      console.error('Error cargando eventos:', error);
      setError(error.message || 'Error al cargar los eventos');
      toast.error('Error al cargar los eventos');
    } finally {
      setLoading(false);
    }
  }, [currentDateIndex, eventDates, dateNames]);

  // Cargar datos iniciales
  useEffect(() => {
    loadEventos();
  }, []);

  // Navegación entre fechas
  const handleDateChange = useCallback((newIndex) => {
    setCurrentDateIndex(newIndex);
    loadEventos(newIndex);
  }, [loadEventos]);

  const goToNextDate = useCallback(() => {
    if (currentDateIndex < eventDates.length - 1) {
      handleDateChange(currentDateIndex + 1);
    }
  }, [currentDateIndex, eventDates.length, handleDateChange]);

  const goToPreviousDate = useCallback(() => {
    if (currentDateIndex > 0) {
      handleDateChange(currentDateIndex - 1);
    }
  }, [currentDateIndex, handleDateChange]);

  // Recargar datos
  const handleRefresh = useCallback(() => {
    asesoresService.clearCache();
    loadEventos();
  }, [loadEventos]);

  // Ir a la página principal
  const goToHome = () => {
    window.location.href = '/';
  };

  // Manejar cambio a sección de registros
  const handleShowRegistros = () => {
    setShowRegistros(true);
  };

  // Manejar regreso a eventos
  const handleBackToEventos = () => {
    setShowRegistros(false);
  };

  // Estados de navegación
  const canGoPrevious = currentDateIndex > 0;
  const canGoNext = currentDateIndex < eventDates.length - 1;

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error al cargar datos</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleRefresh}
              className="btn-primary"
            >
              Reintentar
            </button>
            <button
              onClick={goToHome}
              className="btn-secondary"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            {/* Logo y título */}
            <div className="flex items-center space-x-4">
              <img 
                src="https://i.ibb.co/rfRZVzQH/logo-expokssd-pequeno.webp"
                alt="EXPO KOSSODO 2025"
                className="w-32 h-10 object-contain"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Panel de Asesores
                </h1>
                <p className="text-sm text-gray-600">
                  Gestión y visualización de eventos
                </p>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-[#6cb79a] text-white rounded-lg hover:bg-[#5ca085] transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Actualizar</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleShowRegistros}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Users className="w-4 h-4" />
                <span>Registros</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={goToHome}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>Volver al sitio</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mostrar sección de registros o eventos según el estado */}
        {showRegistros ? (
          <RegistrosAsesores onBack={handleBackToEventos} />
        ) : (
          <>
            {/* Navegación por días */}
            <DayNavigation
              currentDateIndex={currentDateIndex}
              onDateChange={handleDateChange}
              eventDates={eventDates}
              dateNames={dateNames}
              onPrevious={goToPreviousDate}
              onNext={goToNextDate}
              canGoPrevious={canGoPrevious}
              canGoNext={canGoNext}
            />

            {/* Indicador de carga */}
            {loading && (
              <div className="flex justify-center py-8">
                <LoadingSpinner message="Cargando eventos..." />
              </div>
            )}

            {/* Grilla de eventos */}
            <AnimatePresence mode="wait">
              {!loading && (
                <motion.div
                  key={currentDateIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <AsesoresEventGrid
                    eventos={eventos}
                    loading={loading}
                    stats={stats}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Información adicional */}
            {!loading && eventos.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-8 text-center text-sm text-gray-500"
              >
                <p>
                  💡 <strong>Consejo:</strong> Usa los filtros y búsqueda para encontrar eventos específicos rápidamente
                </p>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AsesoresDashboard; 