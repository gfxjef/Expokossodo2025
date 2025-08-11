import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, Users, MapPin, Globe, Clock, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { eventService, utils } from '../services/api';
import { analyticsService } from '../services/analytics';
import EventCalendar from './EventCalendar';
import RegistrationForm from './RegistrationForm';
import LoadingSpinner from './LoadingSpinner';
import ChatWidget from './ChatWidget';
import SimpleMenu from './SimpleMenu';

const EventRegistration = ({ isActive, onShowEventInfo, selectedEvents, onEventSelect, onClearSelectedEvents, eventsData, loading, onSectionChange }) => {
  // Estados principales
  const [currentStep, setCurrentStep] = useState('calendar'); // 'calendar' | 'registration' | 'success'
  const [currentDateIndex, setCurrentDateIndex] = useState(0);

  // Estado para el hover del cuadro de ubicación
  const [isLocationHovered, setIsLocationHovered] = useState(false);

  // Estado para la animación de color de fondo
  const [colorIndex, setColorIndex] = useState(0);

  // Colores para la animación
  const colors = ['#1d2237', '#6db69d'];

  // Función para abrir Google Maps
  const handleOpenLocation = () => {
    window.open('https://maps.app.goo.gl/23RUxnvSqbNm4wrb8', '_blank');
  };

  // Animación de color de fondo
  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex(prev => (prev + 1) % 2);
    }, 2000); // Cambiar cada 2 segundos

    return () => clearInterval(interval);
  }, []);

  // Función para manejar el cambio de sección
  const handleSectionChange = (sectionId) => {
    if (onSectionChange) {
      onSectionChange(sectionId);
    }
  };
  
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
  const eventDates = ['2025-09-02', '2025-09-03', '2025-09-04'];
  const dateNames = ['Día 1', 'Día 2', 'Día 3'];
  
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
      const fallbackSlots = ['15:00-15:45', '16:00-16:45', '17:00-17:45', '18:00-18:45', '19:00-19:45'];
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
      
      analyticsService.trackRegistration(selectedEvents.length, formData.tipo_usuario || 'general');
      toast.success('¡Registro completado exitosamente! Revisa tu email para la confirmación.');
      
      // Resetear el formulario - Llamada a la función del padre
      onClearSelectedEvents();
      setCurrentStep('success');
      setCurrentDateIndex(0);
      
      // Los eventos se actualizan automáticamente desde el componente padre
      // await loadEvents(); // Ya no necesario
      
    } catch (error) {
      console.error('Registration error:', error);
      analyticsService.trackFormError('Registro', error.message || 'Error desconocido');
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
            <div className="flex items-center justify-between">
              {/* Logo y botón "Evento Presencial" */}
              <div className="flex items-center space-x-4 md:space-x-6">
                {/* Logo de EXPO KOSSODO 2025 */}
                <div className="flex-shrink-0">
                  <img 
                    src="https://i.ibb.co/rfRZVzQH/logo-expokssd-pequeno.webp"
                    alt="EXPO KOSSODO 2025"
                    className="w-32 h-10 md:w-48 md:h-16 object-contain"
                    onError={(e) => {
                      console.log('Error loading header logo image');
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
                
                {/* Botón "Evento Presencial" */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="hidden md:block"
                >
                  <motion.button
                    onMouseEnter={() => setIsLocationHovered(true)}
                    onMouseLeave={() => setIsLocationHovered(false)}
                    onClick={handleOpenLocation}
                    className="group relative transition-all duration-300 rounded-lg px-4 md:px-6 shadow-lg hover:shadow-xl cursor-pointer flex items-center justify-center"
                    style={{
                      backgroundColor: colors[colorIndex],
                      height: '48px', // Altura fija más grande
                      minWidth: '160px' // Ancho mínimo más grande
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <AnimatePresence mode="wait">
                      {!isLocationHovered ? (
                        <motion.div
                          key="evento-presencial"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center space-x-2"
                        >
                          <span className="text-white font-semibold text-base md:text-lg whitespace-nowrap">
                            Evento Presencial
                          </span>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="abrir-ubicacion"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center space-x-2"
                        >
                          <MapPin className="w-5 h-5 md:w-6 md:h-6 text-white" />
                          <span className="text-white font-semibold text-base md:text-lg whitespace-nowrap">
                            Abrir Ubicación
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </motion.div>
              </div>
              
              {/* Menú simple */}
              <SimpleMenu 
                activeSection="registro"
                onSectionChange={handleSectionChange}
                textColor="text-white"
                hoverColor="hover:text-[#6cb79a]"
                mobileMenuBg="bg-white/95"
                logoUrl="https://i.ibb.co/rfRZVzQH/logo-expokssd-pequeno.webp"
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
              <div className="mb-0 md:mb-8 relative z-20">
                <div 
                  className="relative bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 min-h-[250px] md:min-h-[350px]"
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
                            <div className="relative z-10 p-4 md:p-8 text-white h-full flex flex-col justify-center">
                              {/* Rubro del Día */}
                              <motion.div 
                                className="mb-4 md:mb-6"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1, duration: 0.3 }}
                              >
                                <h1 className="text-2xl md:text-4xl font-bold mb-2">
                                  <span className="md:hidden">{fechaInfo.rubro || 'Rubro del Día'} - {new Date(eventDates[currentDateIndex]).getDate()} {new Date(eventDates[currentDateIndex]).toLocaleDateString('es', { month: 'long' }).charAt(0).toUpperCase() + new Date(eventDates[currentDateIndex]).toLocaleDateString('es', { month: 'long' }).slice(1)}</span>
                                  <span className="hidden md:inline">{fechaInfo.rubro || 'Rubro del Día'}</span>
                                </h1>
                                <p className="hidden md:block text-xl text-gray-200">
                                  {dateNames[currentDateIndex]} • {utils.formatDate(eventDates[currentDateIndex])}
                                </p>
                              </motion.div>

                              {/* Descripción */}
                              <motion.div 
                                className="mb-4 md:mb-6"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.3 }}
                              >
                                <p className="text-sm md:text-lg leading-relaxed text-gray-100 max-w-4xl">
                                  {(() => {
                                    if (!fechaInfo.descripcion) {
                                      return 'Descripción del día no disponible.';
                                    }

                                    // Calcular número aproximado de caracteres para 3 líneas
                                    // En móvil: ~40 caracteres por línea, en desktop: ~80 caracteres por línea
                                    const isMobile = window.innerWidth < 768;
                                    const maxCharsPerLine = isMobile ? 40 : 80;
                                    const maxCharsFor3Lines = maxCharsPerLine * 3;

                                    if (fechaInfo.descripcion.length > maxCharsFor3Lines) {
                                      // Buscar el último espacio antes del límite para no cortar palabras
                                      let cutPoint = maxCharsFor3Lines;
                                      while (cutPoint > 0 && fechaInfo.descripcion[cutPoint] !== ' ') {
                                        cutPoint--;
                                      }
                                      // Si no encuentra espacio, usar el límite directo
                                      if (cutPoint === 0) cutPoint = maxCharsFor3Lines;
                                      
                                      return fechaInfo.descripcion.substring(0, cutPoint).trim() + '...';
                                    }
                                    
                                    return fechaInfo.descripcion;
                                  })()}
                                </p>
                              </motion.div>

                              {/* Info adicional (Marcas y Países) - Oculto en móvil */}
                              <motion.div 
                                className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-6"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.3 }}
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
                  
                                {/* Sectores/Industrias Presentes */}
                                {fechaInfo.paises_participantes && fechaInfo.paises_participantes.length > 0 && (
                                  <div>
                                    <h3 className="text-lg font-semibold mb-2">Sectores Presentes</h3>
                                    <div className="flex flex-wrap gap-2">
                                      {fechaInfo.paises_participantes.map((pais, index) => (
                                        <span key={index} className="inline-flex items-center space-x-1 text-sm">
                                          <span className="text-gray-200">
                                            {pais}
                                            {index < fechaInfo.paises_participantes.length - 1 && ' • '}
                                          </span>
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
                  // Nuevas props para navegación de fechas
                  currentDateIndex={currentDateIndex}
                  totalDates={eventDates.length}
                  dateNames={dateNames}
                  onNextDate={goToNextDate}
                  onPreviousDate={goToPreviousDate}
                  onDateSelect={setCurrentDateIndex}
                  mobileButtons={
                    <div className="grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 2fr 1fr' }}>
                      {/* Columna izquierda - Botón anterior */}
                      <div className="flex justify-start">
                        {currentDateIndex > 0 ? (
                          <motion.button
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            onClick={goToPreviousDate}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="btn-secondary flex items-center space-x-1 group px-2 py-2 text-xs w-full max-w-[80px]"
                          >
                            <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-xs">Día {currentDateIndex}</span>
                          </motion.button>
                        ) : (
                          <div className="w-full max-w-[80px]"></div>
                        )}
                      </div>
                      
                      {/* Columna central - Botón cerrar registro */}
                      <div className="flex justify-center">
                        <motion.button
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={selectedEvents.length > 0 ? proceedToRegistration : undefined}
                          whileHover={selectedEvents.length > 0 ? { scale: 1.02 } : {}}
                          whileTap={selectedEvents.length > 0 ? { scale: 0.98 } : {}}
                          className={`flex items-center justify-center space-x-1 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 w-full ${
                            selectedEvents.length > 0
                              ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer shadow-md'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
                          }`}
                          disabled={selectedEvents.length === 0}
                        >
                          <Users className="h-3.5 w-3.5" />
                          <span>Cerrar Registro</span>
                        </motion.button>
                      </div>
                      
                      {/* Columna derecha - Botón siguiente */}
                      <div className="flex justify-end">
                        {currentDateIndex < eventDates.length - 1 ? (
                          <motion.button
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            onClick={goToNextDate}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="btn-primary flex items-center space-x-1 group px-2 py-2 text-xs w-full max-w-[80px]"
                          >
                            <span className="text-xs">Día {currentDateIndex + 2}</span>
                            <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                          </motion.button>
                        ) : (
                          <div className="w-full max-w-[80px]"></div>
                        )}
                      </div>
                    </div>
                  }
                />
              </div>

              {/* Botón "Culminar registro" - Solo visible cuando hay eventos seleccionados */}
              {selectedEvents.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8"
                >
                  <motion.button
                    onClick={proceedToRegistration}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-gradient-to-r from-[#6cb79a] to-[#5aa485] hover:from-[#5aa485] hover:to-[#4a9375] text-white px-8 py-5 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-3 text-lg"
                  >
                    <Users className="h-6 w-6" />
                    <span>Culminar Registro ({selectedEvents.length} eventos)</span>
                  </motion.button>
                </motion.div>
              )}
              

              
              {/* Resumen de selecciones */}
              {selectedEvents.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 bg-[#01295c] rounded-xl shadow-lg p-6"
                >
                  <h3 className="text-xl font-bold text-white mb-4">
                    Selecciona uno o más eventos para poder registrarte ({selectedEvents.length})
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
      
      {/* Chat Widget */}
      <ChatWidget />
    </div>
  );
};

export default EventRegistration; 