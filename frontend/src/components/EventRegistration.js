import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, Users, MapPin, Globe, Clock, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { eventService, utils } from '../services/api';
import EventCalendar from './EventCalendar';
import RegistrationForm from './RegistrationForm';
import LoadingSpinner from './LoadingSpinner';

const EventRegistration = () => {
  // Estados principales
  const [currentStep, setCurrentStep] = useState('calendar'); // 'calendar' | 'registration' | 'success'
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [eventsData, setEventsData] = useState({});
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
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
  
  // Cargar datos de eventos al montar el componente
  useEffect(() => {
    loadEvents();
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
  
  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await eventService.getEvents();
      setEventsData(data);
      
      toast.success('Eventos cargados correctamente');
    } catch (error) {
      console.error('Error loading events:', error);
      setError(error.message || 'Error al cargar los eventos');
      toast.error('Error al cargar los eventos');
    } finally {
      setLoading(false);
    }
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
  
  // Manejo de selección de eventos
  const handleEventSelect = (eventData) => {
    // Validar que el evento tenga los datos necesarios
    if (!eventData || !eventData.hora || !eventData.id) {
      console.error('Evento inválido:', eventData);
      toast.error('Error: Datos del evento incompletos');
      return;
    }

    // Asegurarse de que el evento tenga la fecha actual
    const eventWithDate = {
      ...eventData,
      fecha: eventDates[currentDateIndex]
    };

    console.log('Procesando evento:', eventWithDate); // Debug

    const eventId = eventWithDate.id;
    const isSelected = selectedEvents.some(event => event.id === eventId);

    if (isSelected) {
      // Deseleccionar evento
      setSelectedEvents(selectedEvents.filter(event => event.id !== eventId));
      toast.success('Evento deseleccionado');
      return;
    }

    // Verificar conflicto de horario EN LA MISMA FECHA
    const conflictingEvent = selectedEvents.find(event => 
      event.hora === eventWithDate.hora && event.fecha === eventWithDate.fecha
    );
    
    if (conflictingEvent) {
      // INTERCAMBIO DIRECTO: Reemplazar evento conflictivo del mismo horario y fecha
      const updatedEvents = selectedEvents.filter(event => 
        !(event.hora === eventWithDate.hora && event.fecha === eventWithDate.fecha)
      );
      setSelectedEvents([...updatedEvents, eventWithDate]);
      toast.success(`Evento intercambiado en horario ${eventWithDate.hora}`);
    } else {
      // Verificar disponibilidad antes de agregar
      if (!eventWithDate.disponible) {
        toast.error('Este evento ya no tiene cupos disponibles');
        return;
      }
      
      // Agregar nuevo evento
      setSelectedEvents([...selectedEvents, eventWithDate]);
      toast.success('Evento seleccionado');
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
      
      // Resetear el formulario
      setSelectedEvents([]);
      setCurrentStep('success');
      setCurrentDateIndex(0);
      
      // Recargar eventos para actualizar disponibilidad
      await loadEvents();
      
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message || 'Error en el registro');
      toast.error('Error en el registro: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };
  
  const resetRegistration = () => {
    setSelectedEvents([]);
    setCurrentStep('calendar');
    setCurrentDateIndex(0);
    setError(null);
    setShowEventInfo(false);
    setSelectedEventInfo(null);
  };

  // Mostrar información del evento
  const handleShowEventInfo = (eventData) => {
    const eventWithDate = {
      ...eventData,
      fecha: eventDates[currentDateIndex],
      hora: eventData.hora || 'No definido'
    };
    setSelectedEventInfo(eventWithDate);
    setShowEventInfo(true);
  };

  // Cerrar panel de información
  const handleCloseEventInfo = () => {
    setShowEventInfo(false);
    setSelectedEventInfo(null);
  };

  // Deseleccionar un evento específico
  const handleDeselectEvent = (eventData) => {
    setSelectedEvents(selectedEvents.filter(event => event.id !== eventData.id));
    toast.success('Evento deseleccionado');
    handleCloseEventInfo();
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Cargando eventos...</p>
        </div>
      </div>
    );
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
                onClick={loadEvents}
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
      {/* Panel de información del evento */}
      <AnimatePresence>
        {showEventInfo && selectedEventInfo && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseEventInfo}
              className="fixed inset-0 bg-black/50 z-40"
            />
            
            {/* Panel deslizante */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="fixed left-0 top-0 h-full w-96 bg-gradient-to-b from-[#01295c] to-[#1d2236] shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6">
                {/* Header del panel */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white">Información del Evento</h3>
                  <button
                    onClick={handleCloseEventInfo}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Imagen del evento */}
                <div className="mb-6">
                  {selectedEventInfo.imagen_url ? (
                    <div className="w-full h-48 rounded-lg overflow-hidden">
                      <img 
                        src={selectedEventInfo.imagen_url}
                        alt={selectedEventInfo.titulo_charla}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback si la imagen no carga
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg hidden items-center justify-center">
                        <div className="text-center text-gray-600">
                          <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <span className="text-sm">Imagen del Evento</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                      <div className="text-center text-gray-600">
                        <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        <span className="text-sm">Imagen del Evento</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Título */}
                <h4 className="text-xl text-white mb-4" style={{ lineHeight: '2.5' }}>
                  {selectedEventInfo.titulo_charla}
                </h4>

                {/* Descripción en Markdown */}
                <div className="mb-6">
                  <h5 className="font-semibold text-white mb-3">Descripción del Evento</h5>
                  <div className="prose prose-sm max-w-none text-white/80 markdown-content">
                    <ReactMarkdown
                      components={{
                        h2: ({node, ...props}) => <h2 className="text-lg font-bold text-white mb-2 mt-4" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-md font-semibold text-white/90 mb-2 mt-3" {...props} />,
                        p: ({node, ...props}) => <p className="mb-2 text-sm leading-relaxed text-white/80" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside mb-3 text-sm space-y-1" {...props} />,
                        li: ({node, ...props}) => <li className="text-white/80" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />
                      }}
                    >
                      {selectedEventInfo.descripcion || 'Descripción no disponible para este evento.'}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* Expositor */}
                <p className="text-[#6cb79a] font-medium mb-6 text-lg">
                  {selectedEventInfo.expositor}
                </p>

                {/* Detalles del evento - Layout 2x2 */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center space-x-2 text-white">
                    <Calendar className="h-4 w-4 text-[#6cb79a]" />
                    <span className="text-sm font-medium">{utils.formatDateNice(selectedEventInfo.fecha)}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-white">
                    <Clock className="h-4 w-4 text-[#6cb79a]" />
                    <span className="text-sm font-medium">{selectedEventInfo.hora}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-white">
                    <Globe className="h-4 w-4 text-[#6cb79a]" />
                    <span className="text-sm font-medium">{selectedEventInfo.pais}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-white">
                    <Users className="h-4 w-4 text-[#6cb79a]" />
                    <span className="text-sm font-medium">
                      {selectedEventInfo.slots_disponibles - selectedEventInfo.slots_ocupados} cupos
                    </span>
                  </div>
                </div>

                {/* Botón de acción */}
                <div className="space-y-3">
                  {selectedEvents.some(event => event.id === selectedEventInfo.id) ? (
                    // Botón dividido: 80% "Ya seleccionado" + 20% "Cancelar selección"
                    <div className="flex w-full rounded-lg overflow-hidden border border-[#6cb79a]">
                      {/* 80% - Estado seleccionado */}
                      <div className="flex-1 bg-[#6cb79a]/20 text-[#6cb79a] py-3 px-4 flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        <span className="font-medium">Ya seleccionado</span>
                      </div>
                      
                      {/* 20% - Botón cancelar */}
                      <button
                        onClick={() => handleDeselectEvent(selectedEventInfo)}
                        className="w-16 bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors group"
                        title="Cancelar selección"
                      >
                        <X className="h-4 w-4 group-hover:scale-110 transition-transform" />
                      </button>
                    </div>
                  ) : selectedEventInfo.disponible ? (
                    <button 
                      onClick={() => {
                        handleEventSelect(selectedEventInfo);
                        handleCloseEventInfo();
                      }}
                      className="w-full bg-[#6cb79a] hover:bg-[#248660] text-white py-3 px-4 rounded-lg border border-[#6cb79a] font-medium transition-colors"
                    >
                      Seleccionar Evento
                    </button>
                  ) : (
                    <button className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg border border-gray-600 font-medium cursor-not-allowed">
                      Sin cupos disponibles
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="relative bg-gradient-to-r from-[#1d2236] to-[#01295c] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center justify-center">
            {/* Logo SVG */}
            <svg 
              className="w-48 h-16" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 174.68 68.94"
            >
              <defs>
                <style>
                  {`.cls-1 { fill: #fff; } .cls-2 { fill: none; } .cls-3 { fill: #6cb79a; }`}
                </style>
              </defs>
              <g>
                <path className="cls-1" d="M84.7,10.93h8.87v1.31h-7.38v4.93h6.78v1.21h-6.78v5.33h7.58v1.31h-9.07v-14.08Z"/>
                <path className="cls-1" d="M100.87,18.91l-4.3,6.09h-1.67l5.15-7.28-4.81-6.8h1.65l3.98,5.63,3.98-5.63h1.67l-4.81,6.82,5.13,7.26h-1.67l-4.3-6.09Z"/>
                <path className="cls-1" d="M108.49,10.93h5.07c3.24,0,4.91,1.63,4.91,4.3s-1.67,4.26-4.91,4.26h-3.58v5.51h-1.49v-14.08ZM116.96,15.23c0-1.95-1.17-3-3.46-3h-3.52v5.93h3.52c2.29,0,3.46-1.05,3.46-2.94Z"/>
                <path className="cls-1" d="M120,17.97c0-4.71,2.74-7.22,6.35-7.22s6.33,2.51,6.33,7.22-2.74,7.24-6.33,7.24-6.35-2.53-6.35-7.24ZM131.18,17.97c0-3.94-2.05-5.93-4.83-5.93s-4.85,1.99-4.85,5.93,2.05,5.95,4.85,5.95,4.83-1.99,4.83-5.95Z"/>
                <path className="cls-1" d="M84.7,30.91h1.49v7.98l7.2-7.98h1.77l-5.87,6.52,6.38,7.56h-1.75l-5.55-6.54-2.17,2.39v4.14h-1.49v-14.08Z"/>
                <path className="cls-1" d="M95.91,37.95c0-4.71,2.74-7.22,6.35-7.22s6.33,2.51,6.33,7.22-2.74,7.24-6.33,7.24-6.35-2.53-6.35-7.24ZM107.09,37.95c0-3.94-2.05-5.93-4.83-5.93s-4.85,1.99-4.85,5.93,2.05,5.95,4.85,5.95,4.83-1.99,4.83-5.95Z"/>
                <path className="cls-1" d="M110.32,40.96h1.49c.1,1.65,1.25,2.96,3.86,2.96,2.41,0,3.6-1.13,3.6-2.78s-1.21-2.31-2.9-2.65l-1.85-.38c-2.49-.5-3.78-1.71-3.78-3.66,0-2.23,1.65-3.72,4.81-3.72s4.83,1.49,4.83,3.68h-1.47c-.08-1.37-1.11-2.41-3.38-2.41s-3.26,1.07-3.26,2.45c0,1.21.74,2.07,2.67,2.47l1.81.36c2.47.48,4.04,1.53,4.04,3.84,0,2.55-1.91,4.06-5.15,4.06-3.52,0-5.33-1.79-5.33-4.22Z"/>
                <path className="cls-1" d="M122.53,40.96h1.49c.1,1.65,1.25,2.96,3.86,2.96,2.41,0,3.6-1.13,3.6-2.78s-1.21-2.31-2.9-2.65l-1.85-.38c-2.49-.5-3.78-1.71-3.78-3.66,0-2.23,1.65-3.72,4.81-3.72s4.83,1.49,4.83,3.68h-1.47c-.08-1.37-1.11-2.41-3.38-2.41s-3.26,1.07-3.26,2.45c0,1.21.74,2.07,2.67,2.47l1.81.36c2.47.48,4.04,1.53,4.04,3.84,0,2.55-1.91,4.06-5.15,4.06-3.52,0-5.33-1.79-5.33-4.22Z"/>
                <path className="cls-1" d="M134.74,37.95c0-4.71,2.74-7.22,6.35-7.22s6.33,2.51,6.33,7.22-2.74,7.24-6.33,7.24-6.35-2.53-6.35-7.24ZM145.92,37.95c0-3.94-2.05-5.93-4.83-5.93s-4.85,1.99-4.85,5.93,2.05,5.95,4.85,5.95,4.83-1.99,4.83-5.95Z"/>
                <path className="cls-1" d="M149.14,30.91h4.46c4.44,0,6.66,2.55,6.66,7.04s-2.21,7.04-6.66,7.04h-4.46v-14.08ZM158.75,37.95c0-3.86-1.63-5.73-5.29-5.73h-2.84v11.46h2.84c3.66,0,5.29-1.89,5.29-5.73Z"/>
                <path className="cls-1" d="M161.99,37.95c0-4.71,2.74-7.22,6.35-7.22s6.33,2.51,6.33,7.22-2.74,7.24-6.33,7.24-6.35-2.53-6.35-7.24ZM173.17,37.95c0-3.94-2.05-5.93-4.83-5.93s-4.85,1.99-4.85,5.93,2.05,5.95,4.85,5.95,4.83-1.99,4.83-5.95Z"/>
                <path className="cls-1" d="M88.22,58.53c2.01-1.23,3.5-1.97,3.5-3.72.02-1.59-1.13-2.37-2.57-2.37s-2.65.87-2.65,2.76v.28h-1.97v-.38c0-2.51,1.55-4.38,4.65-4.38,2.94,0,4.59,1.67,4.59,4,0,2.53-1.91,3.66-3.86,4.79-2.13,1.29-3.24,2.27-3.24,3.66v.1h7.14v1.71h-9.45v-.58c0-2.51.95-4.1,3.88-5.85Z"/>
                <path className="cls-1" d="M95.52,57.93c0-4.99,2.55-7.22,5.49-7.22s5.51,2.23,5.51,7.22-2.55,7.24-5.51,7.24-5.49-2.21-5.49-7.24ZM104.57,57.93c0-3.22-1.21-5.49-3.56-5.49s-3.56,2.27-3.56,5.49,1.21,5.51,3.56,5.51,3.56-2.27,3.56-5.51Z"/>
                <path className="cls-1" d="M112.03,58.53c2.01-1.23,3.5-1.97,3.5-3.72.02-1.59-1.13-2.37-2.57-2.37s-2.65.87-2.65,2.76v.28h-1.97v-.38c0-2.51,1.55-4.38,4.65-4.38,2.94,0,4.59,1.67,4.59,4,0,2.53-1.91,3.66-3.86,4.79-2.13,1.29-3.24,2.27-3.24,3.66v.1h7.14v1.71h-9.45v-.58c0-2.51.95-4.1,3.88-5.85Z"/>
                <path className="cls-1" d="M119.43,60.64h1.85c.06,1.83,1.43,2.86,3.1,2.86s3.14-.97,3.14-3.28-1.51-3.28-3.1-3.28c-1.17,0-2.21.5-2.78,1.47h-1.93l1.15-7.52h7.42v1.71h-5.99l-.66,4.12c.4-.54,1.49-1.37,3.28-1.37,2.63,0,4.63,1.81,4.63,4.87s-2.03,4.95-5.11,4.95-4.99-1.93-4.99-4.53Z"/>
              </g>
              <g>
                <g>
                  <path className="cls-3" d="M51.06,40.78c-3.73,7.79-3.73,16.01-3.72,23.26v2.41c-.46.19-.92.36-1.39.53v-2.94c0-7.4,0-15.78,3.86-23.86,2.99-6.26,7.59-11.64,13.27-15.56,1.19-.83,2.42-1.58,3.68-2.25.16.44.32.87.46,1.32-1.15.62-2.26,1.31-3.35,2.06-5.49,3.79-9.92,8.98-12.81,15.03Z"/>
                  <path className="cls-3" d="M63.73,46.7c1.21-2.51,2.82-4.8,4.77-6.75-.14.9-.32,1.78-.53,2.65-1.17,1.43-2.18,3.01-2.98,4.69-.91,1.89-1.44,3.97-1.76,6.18-.52.79-1.07,1.56-1.66,2.29.26-3.26.85-6.32,2.16-9.07Z"/>
                  <path className="cls-3" d="M58.03,44.04c-2.71,5.66-2.96,11.93-2.98,18.09-.46.34-.93.67-1.4.99,0-6.63.14-13.43,3.12-19.67,2.43-5.06,6.13-9.42,10.71-12.58.39-.27.78-.52,1.18-.77.07.51.12,1.02.16,1.54-.18.12-.37.24-.54.37-4.39,3.03-7.93,7.19-10.25,12.04Z"/>
                  <path className="cls-3" d="M64.04,16.75c-1.57.82-3.1,1.74-4.58,2.77-6.58,4.55-11.89,10.77-15.36,18.02-2.36,4.94-3.7,10.3-4.21,16.86v.28s-.02,0-.02,0c-.24,3.32-.24,6.52-.24,9.38v4.51c-.46.07-.92.13-1.39.18v-4.69c0-2.91,0-6.21.25-9.68-.46-6.59-1.7-12.31-3.81-17.49-.03-.08-.06-.15-.1-.23-.33-.8-.68-1.6-1.05-2.38-4.04-8.44-10.23-15.7-17.91-21-1.76-1.22-3.56-2.3-5.43-3.28.35-.34.7-.68,1.06-1.01,1.76.95,3.48,2,5.16,3.15,7.88,5.44,14.24,12.89,18.38,21.54.19.4.37.8.55,1.2l.53-1.2c4.14-8.65,10.49-16.1,18.37-21.54,1.33-.92,2.68-1.76,4.07-2.55.34.33.68.67,1.02,1.02-1.46.81-2.9,1.7-4.3,2.67-7.68,5.3-13.87,12.56-17.91,21l-1.04,2.38c1.45,3.64,2.49,7.53,3.15,11.8.16-.91.33-1.8.53-2.67.74-3.17,1.74-6.06,3.07-8.84,3.57-7.46,9.04-13.87,15.82-18.55,1.51-1.04,3.05-1.97,4.63-2.81.26.39.5.78.74,1.18Z"/>
                  <path className="cls-3" d="M32.43,64.05v4.84c-.47-.03-.93-.06-1.39-.11v-4.73c0-7.65,0-17.18-4.46-26.52-3.46-7.24-8.78-13.47-15.36-18.02-1.9-1.31-3.85-2.45-5.9-3.44.25-.39.5-.78.77-1.16,2.05,1,4.02,2.15,5.93,3.46,6.78,4.68,12.25,11.09,15.82,18.55,4.61,9.62,4.6,19.32,4.6,27.11Z"/>
                  <path className="cls-3" d="M6.94,46.7c1.61,3.36,2.13,7.17,2.3,11.25-.51-.55-1.01-1.12-1.49-1.71-.24-3.25-.79-6.28-2.06-8.94-1.28-2.67-3.05-5.06-5.2-7.05-.12-.68-.21-1.37-.28-2.07,2.84,2.28,5.15,5.2,6.74,8.53Z"/>
                  <path className="cls-3" d="M13.9,43.45c3.12,6.52,3.12,13.68,3.12,20.59v.16c-.47-.27-.94-.56-1.39-.86,0-6.54-.1-13.27-2.98-19.3-2.32-4.85-5.87-9.01-10.26-12.04-.71-.49-1.43-.94-2.18-1.36.05-.5.12-.99.19-1.48.95.51,1.88,1.08,2.78,1.7,4.59,3.16,8.29,7.52,10.72,12.58Z"/>
                  <path className="cls-3" d="M24.73,64.05v3.5c-.47-.14-.94-.28-1.39-.44v-3.06c0-7.25,0-15.47-3.72-23.26-2.89-6.05-7.32-11.24-12.81-15.03-1.55-1.07-3.15-2.01-4.83-2.82.15-.44.32-.87.49-1.3,1.78.85,3.48,1.84,5.13,2.98,5.68,3.93,10.27,9.31,13.27,15.56,3.86,8.07,3.86,16.46,3.86,23.86Z"/>
                </g>
                <path className="cls-2" d="M68.94,34.47c0,1.87-.15,3.7-.44,5.48-.14.9-.32,1.78-.53,2.65-.95,3.93-2.58,7.6-4.74,10.87-.52.79-1.07,1.56-1.66,2.29-1.89,2.39-4.08,4.54-6.52,6.36-.46.34-.93.67-1.4.99-1.97,1.32-4.08,2.45-6.31,3.34-.46.19-.92.36-1.39.53-2.02.72-4.13,1.25-6.32,1.57-.46.07-.92.13-1.39.18-1.24.13-2.5.2-3.77.2-.69,0-1.36-.02-2.04-.06-.47-.03-.93-.06-1.39-.11-2.17-.21-4.28-.63-6.31-1.23-.47-.14-.94-.28-1.39-.44-2.22-.75-4.33-1.73-6.32-2.9-.47-.27-.94-.56-1.39-.86-2.34-1.53-4.49-3.34-6.4-5.38-.51-.55-1.01-1.12-1.49-1.71-3.69-4.52-6.25-9.99-7.26-15.99-.12-.68-.21-1.37-.28-2.07-.13-1.22-.2-2.45-.2-3.7s.07-2.57.21-3.83c.05-.5.12-.99.19-1.48.33-2.15.86-4.23,1.57-6.22.15-.44.32-.87.49-1.3.78-1.95,1.74-3.81,2.85-5.57.25-.39.5-.78.77-1.16,1.22-1.77,2.6-3.42,4.12-4.93.35-.34.7-.68,1.06-1.01C17.38,3.4,25.53,0,34.47,0s17.66,3.65,23.85,9.58c.34.33.68.67,1.02,1.02,1.46,1.53,2.79,3.19,3.95,4.97.26.39.5.78.74,1.18,1.07,1.77,1.98,3.66,2.72,5.63.16.44.32.87.46,1.32.68,2.05,1.16,4.19,1.44,6.4.07.51.12,1.02.16,1.54.08.94.12,1.88.12,2.84Z"/>
              </g>
            </svg>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <div className="mb-8">
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
              <EventCalendar
                eventsData={eventsData}
                currentDate={eventDates[currentDateIndex]}
                selectedEvents={selectedEvents}
                onEventSelect={handleEventSelect}
                onShowEventInfo={handleShowEventInfo}
                timeSlots={timeSlots}
                key={`calendar-${currentDateIndex}`} // Forzar re-render al cambiar fecha
              />
              
              {/* Botones de navegación mejorados */}
              <div className="mt-8 flex justify-between items-center">
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
                  className="mt-8 bg-white rounded-xl shadow-lg p-6 border border-gray-100"
                >
                  <h3 className="text-xl font-bold text-gray-800 mb-4">
                    Eventos Seleccionados ({selectedEvents.length})
                  </h3>
                  <div className="grid gap-3">
                    {selectedEvents.map((event, index) => (
                      <div 
                        key={event.id}
                        className="flex items-center justify-between p-3 bg-primary-50 rounded-lg border border-primary-200"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                            <span>{utils.formatDateShort(event.fecha)}</span>
                            <span>•</span>
                            <span>{event.hora}</span>
                            <span>•</span>
                            <span>{event.sala}</span>
                          </div>
                          <h4 className="font-semibold text-gray-800">{event.titulo_charla}</h4>
                          <p className="text-sm text-gray-600">
                            {event.expositor} • {event.pais}
                          </p>
                        </div>
                        <button
                          onClick={() => handleEventSelect(event)}
                          className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remover selección"
                        >
                          ✕
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
              />
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center">
                <CheckCircle className="text-green-500 text-6xl mb-4 mx-auto" />
                <h2 className="text-2xl font-bold text-gray-800 mb-4">¡Registro Completado!</h2>
                <p className="text-gray-600 mb-6">Gracias por registrarte. Te hemos enviado un correo electrónico con la confirmación del registro.</p>
                <button 
                  onClick={resetRegistration}
                  className="btn-primary w-full"
                >
                  Volver al inicio
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default EventRegistration; 