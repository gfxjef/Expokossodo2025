import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, Users, MapPin, Globe, Clock, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { eventService, utils } from '../services/api';
import EventCalendar from './EventCalendar';
import RegistrationForm from './RegistrationForm';
import LoadingSpinner from './LoadingSpinner';

const EventRegistration = ({ isActive, onShowEventInfo, selectedEvents, onEventSelect, onClearSelectedEvents, eventsData, loading }) => {
  // Estados principales
  const [currentStep, setCurrentStep] = useState('calendar'); // 'calendar' | 'registration' | 'success'
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  
  // Debug: Log de props recibidas
  console.log('🏥 EventRegistration recibió props:', {
    eventsData,
    loading,
    eventsDataKeys: eventsData ? Object.keys(eventsData) : 'NO_DATA',
    eventsDataType: typeof eventsData,
    totalEvents: eventsData ? Object.values(eventsData).flat().length : 0
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showEventInfo, setShowEventInfo] = useState(false);
  const [selectedEventInfo, setSelectedEventInfo] = useState(null);
  // Nuevo estado para fechas info
  const [fechasInfo, setFechasInfo] = useState([]);
  const [imageCache, setImageCache] = useState({});
  const [dataLoaded, setDataLoaded] = useState(false);
  const [timeSlots, setTimeSlots] = useState([]);
  // const [validationErrors, setValidationErrors] = useState({});
  
  // Fechas del evento
  const eventDates = ['2024-07-22', '2024-07-23', '2024-07-24', '2024-07-25'];
  const dateNames = ['Día 1 - Lunes', 'Día 2 - Martes', 'Día 3 - Miércoles', 'Día 4 - Jueves'];
  
  // Cargar datos adicionales al montar el componente (eventsData ya viene como prop)
  useEffect(() => {
    loadFechasInfo();
    loadTimeSlots();
  }, []);

  const loadFechasInfo = async () => {
    try {
      const fechasData = await eventService.getFechasInfoActivas();
      console.log('Fechas data received:', fechasData);
      
      // Verificar que sea un array
      if (Array.isArray(fechasData)) {
        setFechasInfo(fechasData);
        setDataLoaded(true);
        
        // Precargar imágenes en background para transiciones fluidas
        preloadImages(fechasData);
      } else {
        console.warn('Fechas data is not an array:', fechasData);
        setFechasInfo([]);
      }
    } catch (error) {
      console.error('Error loading fechas info:', error);
      setFechasInfo([]); // Asegurar que sea un array vacío en caso de error
    }
  };

  // Función para precargar imágenes
  const preloadImages = (fechasData) => {
    const newImageCache = {};
    
    fechasData.forEach((fecha, index) => {
      if (fecha.imagen_url) {
        const img = new Image();
        img.onload = () => {
          newImageCache[fecha.fecha] = {
            loaded: true,
            url: fecha.imagen_url,
            element: img
          };
          setImageCache(prev => ({ ...prev, ...newImageCache }));
          console.log(`✅ Imagen precargada para ${fecha.fecha}`);
        };
        img.onerror = () => {
          console.warn(`❌ Error cargando imagen para ${fecha.fecha}`);
          newImageCache[fecha.fecha] = { loaded: false, url: null };
          setImageCache(prev => ({ ...prev, ...newImageCache }));
        };
        img.src = fecha.imagen_url;
      }
    });
  };

  // Función para cargar horarios (en paralelo con fechas)
  const loadTimeSlots = async () => {
    try {
      const activeSlots = await eventService.getActiveTimeSlots();
      setTimeSlots(activeSlots);
      console.log('✅ Horarios precargados:', activeSlots);
    } catch (error) {
      console.error('Error loading time slots:', error);
      // Fallback a horarios por defecto
      const fallbackSlots = ['09:00-10:00', '10:30-11:30', '12:00-13:00', '14:00-15:00', '15:30-16:30'];
      setTimeSlots(fallbackSlots);
      console.log('⚠️ Usando horarios por defecto');
    }
  };

  // Obtener información de la fecha actual
  const getCurrentFechaInfo = () => {
    const currentDate = eventDates[currentDateIndex];
    // Verificar que fechasInfo sea un array válido
    if (!Array.isArray(fechasInfo) || fechasInfo.length === 0) {
      return null;
    }
    return fechasInfo.find(fecha => fecha.fecha === currentDate) || null;
  };
  
  // Función de recarga manual si es necesario (los datos principales vienen como prop)
  const reloadEvents = () => {
    // Esta función podría usarse para forzar una recarga desde el componente padre
    // Por ahora solo mostramos un mensaje
    toast.info('Los eventos se cargan automáticamente');
  };
  
    // Función de validación - comentada porque ahora manejamos intercambio directo
  // const validateSelection = (newEvent, currentSelections) => {
  //   const errors = {};
  //   
  //   // Validar que el evento tenga los datos básicos
  //   if (!newEvent || !newEvent.hora || !newEvent.id) {
  //     errors.invalidData = 'Datos del evento incompletos';
  //     return errors;
  //   }
  //   
  //   // Verificar si el horario ya está ocupado EN LA MISMA FECHA
  //   const timeConflict = currentSelections.some(event => 
  //     event.hora === newEvent.hora && 
  //     event.fecha === newEvent.fecha && 
  //     event.id !== newEvent.id
  //   );
  //   
  //   if (timeConflict) {
  //     errors.timeSlot = `Ya tienes un evento seleccionado para el horario ${newEvent.hora} en esta fecha`;
  //   }
  //   
  //   // Verificar disponibilidad
  //   if (!newEvent.disponible) {
  //     errors.availability = 'Este evento ya no tiene cupos disponibles';
  //   }
  //   
  //   return errors;
  // };
  
  // Navegación entre fechas optimizada
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
  
  // Proceder al formulario de registro
  const proceedToRegistration = () => {
    if (selectedEvents.length === 0) {
      toast.error('Debes seleccionar al menos un evento');
      return;
    }
    
    setCurrentStep('registration');
  };
  
  // Volver al calendario
  const backToCalendar = () => {
    setCurrentStep('calendar');
    setError(null); // Limpiar errores al volver
  };
  
  // Completar registro
  const handleRegistrationComplete = async (formData) => {
    try {
      setSubmitting(true);
      setError(null);
      
      // Validar que aún haya eventos seleccionados
      if (selectedEvents.length === 0) {
        throw new Error('No hay eventos seleccionados');
      }
      
      const registrationData = {
        ...formData,
        eventos_seleccionados: selectedEvents.map(event => event.id)
      };
      
      await eventService.createRegistration(registrationData);
      
      toast.success('¡Registro completado exitosamente! Revisa tu email para la confirmación.');
      
      // Resetear el formulario - Llamada a la función del padre
      onClearSelectedEvents();
      setCurrentStep('success');
      setCurrentDateIndex(0);
      
      // Los eventos se actualizan automáticamente desde el componente padre
      // await loadEvents(); // Ya no necesario
      
    } catch (error) {
      console.error('Registration error:', error);
      
      // Manejar específicamente el error de correo electrónico duplicado
      let errorMessage = error.message || 'Error en el registro';
      
      // Verificar si es un error de correo duplicado
      if (error.message && (
        error.message.toLowerCase().includes('email') || 
        error.message.toLowerCase().includes('correo') ||
        error.message.toLowerCase().includes('duplicate') ||
        error.message.toLowerCase().includes('duplicado') ||
        error.message.toLowerCase().includes('already exists') ||
        error.message.toLowerCase().includes('ya existe') ||
        error.message.toLowerCase().includes('unique constraint') ||
        error.message.toLowerCase().includes('already registered')
      )) {
        errorMessage = `Este correo electrónico ya se ha registrado anteriormente. 
        Por favor, utilice un correo electrónico diferente o contáctese con la administración 
        para cambiar su registro existente.`;
        
        toast.error(errorMessage, {
          duration: 6000,
          style: {
            background: '#fee2e2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            maxWidth: '500px',
          }
        });
      } else {
        toast.error('Error en el registro: ' + errorMessage);
      }
      
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };
  
  const resetRegistration = () => {
    onClearSelectedEvents(); // Limpiar eventos en el padre
    setCurrentStep('calendar');
    setCurrentDateIndex(0);
    setError(null);
  };

  // Función para limpiar errores
  const clearError = () => {
    setError(null);
  };

  // Mostrar información del evento
  const handleShowEventInfo = (eventData) => {
    const eventWithDate = {
      ...eventData,
      fecha: eventDates[currentDateIndex],
      hora: eventData.hora || 'No definido'
    };
    onShowEventInfo(eventWithDate);
  };

  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (error && currentStep !== 'registration') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="text-center">
            <AlertTriangle className="text-red-500 text-6xl mb-4 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Error de Conexión</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <button 
                onClick={reloadEvents}
                className="btn-primary w-full"
                disabled={loading}
              >
                {loading ? 'Cargando...' : 'Reintentar'}
              </button>
              <button 
                onClick={resetRegistration}
                className="btn-secondary w-full"
              >
                Reiniciar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 relative">
      {/* Header */}
      {currentStep !== 'success' && (
        <header className="relative bg-gradient-to-r from-[#1d2236] to-[#01295c] shadow-lg z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <div className="flex items-center justify-center">
              {/* Logo de EXPO KOSSODO 2025 */}
              <img 
                src="https://i.ibb.co/rfRZVzQH/logo-expokssd-pequeno.webp"
                alt="EXPO KOSSODO 2025"
                className="w-48 h-16 object-contain"
                onError={(e) => {
                  console.log('Error loading header logo image');
                  e.target.style.display = 'none';
                }}
              />
            </div>
          </div>
        </header>
      )}
      
      <main className={currentStep !== 'success' ? "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" : ""}>
        <AnimatePresence mode="wait">
          {currentStep === 'calendar' ? (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.3 }}
            >
              {/* Información dinámica de la fecha actual con transiciones fluidas */}
              <div className="mb-8 relative z-20">
                <div 
                  className="relative bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100"
                  style={{
                    minHeight: '350px' // Altura fija para evitar saltos
                  }}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`fecha-info-${currentDateIndex}`}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ 
                        duration: 0.4,
                        ease: "easeInOut"
                      }}
                      className="absolute inset-0"
                    >
                      {(() => {
                        const fechaInfo = getCurrentFechaInfo();
                        const currentDate = eventDates[currentDateIndex];
                        const cachedImage = imageCache[currentDate];
                        
                        // Si no hay información específica, mostrar fallback
                        if (!fechaInfo) {
                          return (
                            <div 
                              className="w-full h-full flex items-center justify-center"
                              style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                              }}
                            >
                              <div className="text-center text-white p-8">
                                <Calendar className="h-16 w-16 mx-auto mb-4 text-white" />
                                <h2 className="text-3xl font-bold mb-2">
                          {dateNames[currentDateIndex]}
                        </h2>
                                <p className="text-lg text-gray-200">
                          {utils.formatDate(eventDates[currentDateIndex])}
                        </p>
                                <p className="text-gray-300 mt-4">
                                  Información de esta fecha no disponible
                                </p>
                      </div>
                    </div>
                          );
                        }

                        // Determinar imagen de fondo
                        const backgroundImage = cachedImage?.loaded 
                          ? `url(${cachedImage.url})` 
                          : fechaInfo.imagen_url 
                            ? `url(${fechaInfo.imagen_url})`
                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

                        return (
                          <div 
                            className="w-full h-full"
                            style={{
                              backgroundImage,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center'
                            }}
                          >
                            {/* Overlay para mejorar la legibilidad */}
                            <div className="absolute inset-0 bg-black bg-opacity-50"></div>
                            
                            {/* Contenido con animaciones */}
                            <div className="relative z-10 p-8 text-white h-full flex flex-col justify-center">
                              {/* Rubro del Día */}
                              <motion.div 
                                className="mb-6"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1, duration: 0.3 }}
                              >
                                <h1 className="text-4xl font-bold mb-2">
                                  {fechaInfo.rubro || 'Rubro del Día'}
                                </h1>
                                <p className="text-xl text-gray-200">
                                  {dateNames[currentDateIndex]} • {utils.formatDate(eventDates[currentDateIndex])}
                                </p>
                              </motion.div>

                              {/* Descripción */}
                              <motion.div 
                                className="mb-6"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.3 }}
                              >
                                <p className="text-lg leading-relaxed text-gray-100 max-w-4xl">
                                  {fechaInfo.descripcion 
                                    ? (fechaInfo.descripcion.length > 400 
                                        ? fechaInfo.descripcion.substring(0, 400) + '...' 
                                        : fechaInfo.descripcion)
                                    : 'Descripción del día no disponible.'
                                  }
                                </p>
                              </motion.div>

                              {/* Ponentes Destacados */}
                              <motion.div 
                                className="mb-6"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.3 }}
                              >
                                <h3 className="text-xl font-semibold mb-3">Ponentes Destacados</h3>
                                <div className="flex flex-wrap gap-2">
                                  {fechaInfo.ponentes_destacados && fechaInfo.ponentes_destacados.length > 0 ? (
                                    fechaInfo.ponentes_destacados.map((ponente, index) => (
                                      <motion.span 
                                        key={`${ponente}-${index}`}
                                        className="bg-white bg-opacity-20 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.4 + (index * 0.1), duration: 0.2 }}
                                      >
                                        {ponente}
                                      </motion.span>
                                    ))
                                  ) : (
                                    <span className="text-gray-300">Información de ponentes no disponible</span>
                                  )}
                                </div>
                              </motion.div>

                              {/* Info adicional (Marcas y Países) */}
                              <motion.div 
                                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5, duration: 0.3 }}
                              >
                                {/* Marcas Patrocinadoras */}
                                {fechaInfo.marcas_patrocinadoras && fechaInfo.marcas_patrocinadoras.length > 0 && (
                                  <div>
                                    <h3 className="text-lg font-semibold mb-2">Marcas Patrocinadoras</h3>
                                    <div className="flex flex-wrap gap-1">
                                      {fechaInfo.marcas_patrocinadoras.map((marca, index) => (
                                        <span key={index} className="text-sm text-gray-200">
                                          {marca}
                                          {index < fechaInfo.marcas_patrocinadoras.length - 1 && ', '}
                                        </span>
                      ))}
                    </div>
                  </div>
                                )}
                  
                                {/* Países Participantes */}
                                {fechaInfo.paises_participantes && fechaInfo.paises_participantes.length > 0 && (
                                  <div>
                                    <h3 className="text-lg font-semibold mb-2">Países Participantes</h3>
                                    <div className="flex flex-wrap gap-2">
                                      {fechaInfo.paises_participantes.map((pais, index) => (
                                        <span key={index} className="inline-flex items-center space-x-1 text-sm">
                                          <Globe className="h-4 w-4" />
                                          <span className="text-gray-200">{pais}</span>
                                        </span>
                                      ))}
                    </div>
                    </div>
                                )}
                              </motion.div>
                    </div>
                  </div>
                        );
                      })()}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
              
              {/* Calendario de eventos */}
              <div className="relative z-20">
                <EventCalendar
                  eventsData={eventsData}
                  currentDate={eventDates[currentDateIndex]}
                  selectedEvents={selectedEvents}
                  onEventSelect={onEventSelect}
                  onShowEventInfo={handleShowEventInfo}
                  timeSlots={timeSlots}
                  key={`calendar-${currentDateIndex}`} // Forzar re-render al cambiar fecha
                />
              </div>
              
              {/* Botones de navegación mejorados */}
              <div className="mt-8 flex justify-between items-center relative z-20">
                <div className="flex space-x-3">
                  {currentDateIndex > 0 && (
                    <motion.button
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={goToPreviousDate}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="btn-secondary flex items-center space-x-2 group"
                    >
                      <ChevronLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                      <div className="text-left">
                        <span className="block text-sm">Fecha Anterior</span>
                        <span className="block text-xs text-gray-500">
                          {dateNames[currentDateIndex - 1]}
                        </span>
                      </div>
                    </motion.button>
                  )}
                </div>
                
                {/* Indicadores de navegación */}
                <div className="flex items-center space-x-4">
                  {/* Indicadores de progreso */}
                  <div className="flex items-center space-x-2">
                    {eventDates.map((_, index) => (
                      <motion.button
                        key={index}
                        onClick={() => setCurrentDateIndex(index)}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        className={`w-3 h-3 rounded-full transition-all duration-200 ${
                          index === currentDateIndex 
                            ? 'bg-primary-600 scale-125' 
                            : index < currentDateIndex
                              ? 'bg-primary-300 hover:bg-primary-400'
                              : 'bg-gray-300 hover:bg-gray-400'
                        }`}
                        title={dateNames[index]}
                      />
                    ))}
                  </div>

                  {/* Botón culminar registro */}
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={proceedToRegistration}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-primary flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                    disabled={selectedEvents.length === 0}
                  >
                    <Users className="h-5 w-5" />
                    <span>Culminar Registro</span>
                  </motion.button>
                </div>
                
                <div className="flex space-x-3">
                  {currentDateIndex < eventDates.length - 1 && (
                    <motion.button
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={goToNextDate}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="btn-primary flex items-center space-x-2 group"
                    >
                      <div className="text-right">
                        <span className="block text-sm">Siguiente Fecha</span>
                        <span className="block text-xs text-blue-200">
                          {dateNames[currentDateIndex + 1]}
                        </span>
                      </div>
                      <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                  )}
                </div>
              </div>
              
              {/* Resumen de selecciones */}
              {selectedEvents.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 bg-[#01295c] rounded-xl shadow-lg p-6"
                >
                  <h3 className="text-xl font-bold text-white mb-4">
                    Eventos Seleccionados ({selectedEvents.length})
                  </h3>
                  <div className="grid gap-4">
                    {selectedEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-4 bg-white rounded-xl"
                      >
                        <div className="flex-1 pr-4">
                          <h4 className="font-bold text-gray-900">{event.titulo_charla}</h4>
                          <p className="text-sm text-gray-600 mt-1">{event.expositor}</p>
                          <div className="text-sm text-[#6cb79a] font-medium mt-2 flex items-center space-x-1.5">
                            <span>{utils.formatDate(event.fecha)}</span>
                            <span>•</span>
                            <span>{event.hora}</span>
                            <span>•</span>
                            <span>{event.sala}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => onEventSelect(event)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors"
                          title="Remover selección"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : currentStep === 'registration' ? (
            <motion.div
              key="registration"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <RegistrationForm
                selectedEvents={selectedEvents}
                onSubmit={handleRegistrationComplete}
                onBack={backToCalendar}
                submitting={submitting}
                externalError={error}
                onClearError={clearError}
              />
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="min-h-screen bg-gradient-to-b from-[#01295c] to-[#1d2236] flex items-center justify-center text-center px-4"
            >
              {/* SVG Animado */}
              <div className="flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ 
                    duration: 0.8, 
                    delay: 0.2,
                    type: "spring",
                    stiffness: 200,
                    damping: 15
                  }}
                  className="mb-8"
                >
                  <svg 
                    width="300"
                    height="300"
                    className="mx-auto"
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 262.15 262.15"
                  >
                    <defs>
                      <style>
                        {`.cls-1 { fill: #6cb69a; }`}
                      </style>
                    </defs>
                    <motion.polygon 
                      className="cls-1" 
                      points="106.79 187.14 64.44 144.79 78.59 130.65 106.79 158.86 183.57 82.08 197.71 96.23 106.79 187.14"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.8 }}
                    />
                    <motion.path 
                      className="cls-1" 
                      d="M131.08,262.15C58.8,262.15,0,203.35,0,131.08S58.8,0,131.08,0s131.08,58.8,131.08,131.08-58.8,131.08-131.08,131.08ZM131.08,20c-61.25,0-111.08,49.83-111.08,111.08s49.83,111.08,111.08,111.08,111.08-49.83,111.08-111.08S192.32,20,131.08,20Z"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                    />
                  </svg>
                </motion.div>

                {/* Título Principal */}
                <motion.h2 
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="font-bold text-white mb-4"
                  style={{ fontSize: '3.25rem' }}
                >
                  ¡Te esperamos!
                </motion.h2>

                {/* Subtítulo */}
                <motion.p 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                  className="text-lg text-white/90 mb-8 leading-relaxed max-w-lg"
                >
                  Gracias por registrarte. Te hemos enviado un correo 
                  electrónico con la confirmación del registro.
                </motion.p>

                {/* Botón */}
                <motion.button
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 1.0 }}
                  onClick={resetRegistration}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-[#6cb79a] hover:bg-[#5ca085] text-white font-semibold py-4 px-16 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Volver al inicio
                </motion.button>

                {/* Información adicional */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 1.2 }}
                  className="mt-8 pt-6 border-t border-white/20"
                >
                  <p className="text-sm text-white/70">
                    📧 Revisa tu bandeja de entrada y spam
                  </p>
                  <p className="text-xs text-white/60 mt-2">
                    ¿Dudas? Contacta: <span className="text-[#6cb79a]">jcamacho@kossodo.com</span>
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default EventRegistration; 