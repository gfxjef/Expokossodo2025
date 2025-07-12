import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Users, 
  Calendar,
  Building,
  TrendingUp,
  Clock,
  Search,
  Filter,
  Download,
  RefreshCw,
  Home,
  UserCheck,
  Activity,
  X,
  ChevronLeft,
  ChevronRight,
  Target
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { visualizacionService, visualizacionUtils } from '../services/visualizacionService';
import LoadingSpinner from './LoadingSpinner';
import ExportManager from './ExportManager';

// Lazy loading para componentes de gráficos (optimización)
const RegistrosPorDiaChart = lazy(() => import('./charts/RegistrosPorDiaChart'));
const RegistrosPorCharlaChart = lazy(() => import('./charts/RegistrosPorCharlaChart'));
const EstadisticasAvanzadas = lazy(() => import('./charts/EstadisticasAvanzadas'));
const CharlaDetailModal = lazy(() => import('./charts/CharlaDetailModal'));
const EventsGridVisualization = lazy(() => import('./charts/EventsGridVisualization'));

const VisualizacionDashboard = () => {
  // Estados principales
  const [currentTab, setCurrentTab] = useState('resumen'); // 'resumen' | 'graficos' | 'registros'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Datos principales
  const [registros, setRegistros] = useState([]);
  const [eventos, setEventos] = useState({});
  const [stats, setStats] = useState(null);
  
  // Datos procesados
  const [registrosPorDia, setRegistrosPorDia] = useState([]);
  const [registrosPorCharla, setRegistrosPorCharla] = useState([]);
  const [empresasTop, setEmpresasTop] = useState([]);
  const [cargosTop, setCargosTop] = useState([]);
  const [resumenStats, setResumenStats] = useState(null);
  
  // Estados de filtros
  const [filtros, setFiltros] = useState({
    nombre: '',
    empresa: '',
    cargo: '',
    fechaDesde: '',
    fechaHasta: '',
    charlaFiltro: ''
  });
  const [registrosFiltrados, setRegistrosFiltrados] = useState([]);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  
  // Estado para exportación
  const [showExportModal, setShowExportModal] = useState(false);
  
  // Estado para modal de detalles de charla
  const [showCharlaModal, setShowCharlaModal] = useState(false);
  const [selectedCharla, setSelectedCharla] = useState(null);

  // === ESTADO Y LÓGICA PARA NAVEGACIÓN DE FECHAS (como en AdminDashboard) ===
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const eventDates = ['2025-09-02', '2025-09-03', '2025-09-04'];
  const dateNames = ['Día 1 - Martes', 'Día 2 - Miércoles', 'Día 3 - Jueves'];

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
  // ======================================================================

  // Cargar datos al montar el componente
  useEffect(() => {
    loadAllData();
  }, []);

  // Aplicar filtros cuando cambien (memoizado)
  const registrosFiltradosMemo = useMemo(() => {
    if (registros.length > 0) {
      return visualizacionUtils.filtrarRegistros(registros, filtros);
    }
    return [];
  }, [registros, filtros]);

  useEffect(() => {
    setRegistrosFiltrados(registrosFiltradosMemo);
  }, [registrosFiltradosMemo]);

  const loadAllData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Limpiar cache si se fuerza la actualización
      if (forceRefresh) {
        visualizacionService.clearCache();
      }

      // Cargar datos en paralelo
      const [registrosData, eventosData, statsData] = await Promise.all([
        visualizacionService.getRegistros(),
        visualizacionService.getEventos(),
        visualizacionService.getStats()
      ]);

      setRegistros(registrosData);
      setEventos(eventosData);
      setStats(statsData);

      // Procesar datos para visualizaciones (de forma eficiente)
      const processingPromises = [
        Promise.resolve(visualizacionUtils.getRegistrosPorDia(registrosData)),
        Promise.resolve(visualizacionUtils.getRegistrosPorCharla(registrosData)),
        Promise.resolve(visualizacionUtils.getEstadisticasEmpresas(registrosData)),
        Promise.resolve(visualizacionUtils.getEstadisticasCargos(registrosData)),
        Promise.resolve(visualizacionUtils.getResumenEstadisticas(registrosData, eventosData))
      ];

      const [
        registrosPorDiaData,
        registrosPorCharlaData,
        empresasTopData,
        cargosTopData,
        resumenStatsData
      ] = await Promise.all(processingPromises);

      setRegistrosPorDia(registrosPorDiaData);
      setRegistrosPorCharla(registrosPorCharlaData);
      setEmpresasTop(empresasTopData);
      setCargosTop(cargosTopData);
      setResumenStats(resumenStatsData);

      toast.success('Datos cargados correctamente');
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error.message || 'Error al cargar los datos');
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambios en filtros (memoizado)
  const handleFilterChange = useCallback((key, value) => {
    setFiltros(prev => ({ ...prev, [key]: value }));
  }, []);

  // Limpiar filtros (memoizado)
  const clearFilters = useCallback(() => {
    setFiltros({
      nombre: '',
      empresa: '',
      cargo: '',
      fechaDesde: '',
      fechaHasta: '',
      charlaFiltro: ''
    });
  }, []);

  // Ir a la página principal (memoizado)
  const goToHome = useCallback(() => {
    window.location.href = '/';
  }, []);

  // Exportar datos (memoizado)
  const exportData = useCallback(() => {
    setShowExportModal(true);
  }, []);

  // Manejar click en charla (memoizado)
  const handleCharlaClick = useCallback((charla) => {
    setSelectedCharla(charla);
    setShowCharlaModal(true);
  }, []);

  // Ver registrados de una charla específica (memoizado)
  const handleVerRegistrados = useCallback((charla) => {
    // Cambiar a tab registros
    setCurrentTab('registros');
    
    // Crear filtro basado en el título de la charla
    // Usar una porción del título para mayor compatibilidad
    const tituloParaBusqueda = charla.titulo.substring(0, 20);
    
    setFiltros(prev => ({
      ...prev,
      nombre: '', // Limpiar otros filtros
      empresa: '',
      cargo: '',
      fechaDesde: '',
      fechaHasta: '',
      // Usar el campo nombre para buscar en eventos (se puede ajustar)
      charlaFiltro: tituloParaBusqueda
    }));
    
    // Cerrar modal
    setShowCharlaModal(false);
  }, []);

  // Limpiar filtro de charla al cambiar de tab
  useEffect(() => {
    if (currentTab !== 'registros') {
      setFiltros(prev => {
        const { charlaFiltro, ...otrosFiltros } = prev;
        return otrosFiltros;
      });
    }
  }, [currentTab]);

  if (loading) {
    return <LoadingSpinner message="Cargando dashboard de visualización..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error al cargar datos</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={() => loadAllData(true)} className="btn-primary">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const currentEventsByTime = eventos[eventDates[currentDateIndex]] || {};
  const selectedDate = eventDates[currentDateIndex];
  const eventsForDayArray = [];

  // Iteramos sobre las horas (ej: "15:00-15:45")
  for (const hora in currentEventsByTime) {
    if (Object.prototype.hasOwnProperty.call(currentEventsByTime, hora)) {
      const eventsInHour = currentEventsByTime[hora];
      // A cada evento, le inyectamos la fecha y la hora de las claves
      const eventsWithFullData = eventsInHour.map(evento => ({
        ...evento,
        hora: hora,
        fecha: selectedDate
      }));
      eventsForDayArray.push(...eventsWithFullData);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <img 
                src="https://i.ibb.co/rfRZVzQH/logo-expokssd-pequeno.webp"
                alt="EXPO KOSSODO 2025"
                className="h-8 object-contain"
              />
              <h1 className="text-2xl font-bold text-gray-900">
                Dashboard de Visualización
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => loadAllData(true)}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Actualizar</span>
              </button>
              <button
                onClick={exportData}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Exportar</span>
              </button>
              <button
                onClick={goToHome}
                className="flex items-center space-x-2 px-4 py-2 bg-[#6cb79a] text-white rounded-lg hover:bg-[#5aa485] transition-colors"
              >
                <Home className="h-4 w-4" />
                <span>Inicio</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'resumen', label: 'Resumen', icon: BarChart3 },
              { id: 'graficos', label: 'Gráficos', icon: TrendingUp },
              { id: 'programacion', label: 'Programación', icon: Calendar },
              { id: 'registros', label: 'Registros', icon: Users }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-4 border-b-2 font-medium text-sm transition-colors ${
                  currentTab === tab.id
                    ? 'border-[#6cb79a] text-[#6cb79a]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab: Resumen */}
        {currentTab === 'resumen' && resumenStats && (
          <div className="space-y-8">
            {/* Estadísticas principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
              >
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Registros</p>
                    <p className="text-2xl font-bold text-gray-900">{resumenStats.totalRegistros}</p>
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
                    <Target className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Cupos Registrados</p>
                    <p className="text-2xl font-bold text-gray-900">{resumenStats.totalCuposRegistrados}</p>
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
                    <Activity className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Promedio Charlas/Usuario</p>
                    <p className="text-2xl font-bold text-gray-900">{resumenStats.promedioCharlasPorUsuario}</p>
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
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Últimas 24h</p>
                    <p className="text-2xl font-bold text-gray-900">{resumenStats.registrosUltimas24h}</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Top Empresas y Cargos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Top Empresas */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Top Empresas</h3>
                  <Building className="h-5 w-5 text-gray-400" />
                </div>
                <div className="space-y-3">
                  {empresasTop.slice(0, 5).map((empresa, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {empresa.empresa}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">{empresa.cantidad}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Top Cargos */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Top Cargos</h3>
                  <UserCheck className="h-5 w-5 text-gray-400" />
                </div>
                <div className="space-y-3">
                  {cargosTop.slice(0, 5).map((cargo, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-green-600">{index + 1}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {cargo.cargo}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">{cargo.cantidad}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Estadísticas Avanzadas */}
            <Suspense fallback={<LoadingSpinner message="Cargando estadísticas avanzadas..." />}>
              <EstadisticasAvanzadas
                registros={registros}
                empresasTop={empresasTop}
                cargosTop={cargosTop}
                registrosPorDia={registrosPorDia}
                registrosPorCharla={registrosPorCharla}
                resumenStats={resumenStats}
              />
            </Suspense>
          </div>
        )}

        {/* Tab: Gráficos */}
        {currentTab === 'graficos' && (
          <div className="space-y-8">
            {/* Gráfico de Registros por Día */}
            <Suspense fallback={<div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 h-96 flex items-center justify-center"><LoadingSpinner message="Cargando gráfico..." /></div>}>
              <RegistrosPorDiaChart data={registrosPorDia} tipo="bar" />
            </Suspense>
            
            {/* Gráfico de Registros por Charla */}
            <Suspense fallback={<div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 h-96 flex items-center justify-center"><LoadingSpinner message="Cargando gráfico..." /></div>}>
              <RegistrosPorCharlaChart 
                data={registrosPorCharla} 
                tipo="bar" 
                onCharlaClick={handleCharlaClick}
              />
            </Suspense>
            
            {/* Gráficos adicionales en grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Gráfico de línea temporal */}
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Tendencia Temporal</h4>
                <Suspense fallback={<div className="h-64 flex items-center justify-center"><LoadingSpinner message="Cargando..." /></div>}>
                  <RegistrosPorDiaChart data={registrosPorDia} tipo="line" />
                </Suspense>
              </div>
              
              {/* Gráfico circular de distribución */}
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Distribución de Charlas</h4>
                <Suspense fallback={<div className="h-64 flex items-center justify-center"><LoadingSpinner message="Cargando..." /></div>}>
                  <RegistrosPorCharlaChart 
                    data={registrosPorCharla.slice(0, 8)} 
                    tipo="doughnut" 
                    onCharlaClick={handleCharlaClick}
                  />
                </Suspense>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Programación */}
        {currentTab === 'programacion' && (
          <div className="space-y-6">
            {/* === NAVEGACIÓN DE FECHAS (como en AdminDashboard) === */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Programación</h2>
                  <div className="flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-full">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-600">{dateNames[currentDateIndex]}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-1 sm:space-x-3">
                  <button
                    onClick={goToPreviousDate}
                    disabled={currentDateIndex === 0}
                    className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Anterior</span>
                  </button>

                  <div className="flex space-x-1 sm:space-x-2">
                    {eventDates.map((date, index) => (
                      <button
                        key={date}
                        onClick={() => setCurrentDateIndex(index)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          index === currentDateIndex
                            ? 'bg-blue-600 text-white shadow-sm'
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
                    className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="hidden sm:inline">Siguiente</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Componente principal */}
            <Suspense fallback={<LoadingSpinner message="Cargando programación de eventos..." />}>
              <EventsGridVisualization 
                eventos={eventsForDayArray}
                fecha={eventDates[currentDateIndex]}
                onEventClick={handleCharlaClick}
                registrados={registros}
                onVerRegistrados={handleVerRegistrados}
              />
            </Suspense>
          </div>
        )}

        {/* Tab: Registros */}
        {currentTab === 'registros' && (
          <div className="space-y-6">
            {/* Filtros */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Lista de Registrados ({registrosFiltrados.length})
                  </h3>
                  {filtros.charlaFiltro && (
                    <div className="mt-1 flex items-center space-x-2">
                      <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded flex items-center space-x-1">
                        <Users className="h-3 w-3" />
                        <span>Filtrado por charla: "{filtros.charlaFiltro}"</span>
                        <button
                          onClick={() => setFiltros(prev => ({ ...prev, charlaFiltro: '' }))}
                          className="ml-1 text-blue-700 hover:text-blue-900"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setMostrarFiltros(!mostrarFiltros)}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <Filter className="h-4 w-4" />
                  <span>Filtros</span>
                </button>
              </div>

              {mostrarFiltros && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <input
                      type="text"
                      value={filtros.nombre}
                      onChange={(e) => handleFilterChange('nombre', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6cb79a]"
                      placeholder="Buscar por nombre..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                    <input
                      type="text"
                      value={filtros.empresa}
                      onChange={(e) => handleFilterChange('empresa', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6cb79a]"
                      placeholder="Buscar por empresa..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                    <input
                      type="text"
                      value={filtros.cargo}
                      onChange={(e) => handleFilterChange('cargo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6cb79a]"
                      placeholder="Buscar por cargo..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Desde</label>
                    <input
                      type="date"
                      value={filtros.fechaDesde}
                      onChange={(e) => handleFilterChange('fechaDesde', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6cb79a]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Hasta</label>
                    <input
                      type="date"
                      value={filtros.fechaHasta}
                      onChange={(e) => handleFilterChange('fechaHasta', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6cb79a]"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={clearFilters}
                      className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Limpiar Filtros
                    </button>
                  </div>
                </div>
              )}

              {/* Tabla de registros */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Empresa
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cargo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha Registro
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Charlas
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {registrosFiltrados.slice(0, 50).map((registro, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{registro.nombres}</div>
                              <div className="text-sm text-gray-500">{registro.correo}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{registro.empresa}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{registro.cargo}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {visualizacionUtils.formatearFecha(registro.fecha_registro)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {visualizacionUtils.formatearEventos(registro.eventos).length} charlas
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {registrosFiltrados.length > 50 && (
                <div className="mt-4 text-center text-sm text-gray-500">
                  Mostrando 50 de {registrosFiltrados.length} registros
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Export Manager Modal */}
      <ExportManager
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        registros={registros}
        registrosPorDia={registrosPorDia}
        registrosPorCharla={registrosPorCharla}
        empresasTop={empresasTop}
        resumenStats={resumenStats}
      />

      {/* Charla Detail Modal */}
      <Suspense fallback={null}>
        <CharlaDetailModal
          isOpen={showCharlaModal}
          onClose={() => setShowCharlaModal(false)}
          charla={selectedCharla}
          registrados={registros}
          onVerRegistrados={handleVerRegistrados}
        />
      </Suspense>
    </div>
  );
};

export default VisualizacionDashboard; 