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
  // const [validationErrors, setValidationErrors] = useState({});
  
  // Fechas del evento
  const eventDates = ['2024-07-22', '2024-07-23', '2024-07-24', '2024-07-25'];
  const dateNames = ['Día 1 - Lunes', 'Día 2 - Martes', 'Día 3 - Miércoles', 'Día 4 - Jueves'];
  
  // Cargar datos de eventos al montar el componente
  useEffect(() => {
    loadEvents();
  }, []);
  
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
              className="fixed left-0 top-0 h-full w-96 bg-white shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6">
                {/* Header del panel */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-800">Información del Evento</h3>
                  <button
                    onClick={handleCloseEventInfo}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <h4 className="text-lg font-bold text-gray-800 mb-2">
                  {selectedEventInfo.titulo_charla}
                </h4>

                {/* Expositor */}
                <p className="text-gray-700 font-medium mb-4">
                  {selectedEventInfo.expositor}
                </p>

                {/* Detalles del evento - Layout 2x2 */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">{utils.formatDateNice(selectedEventInfo.fecha)}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Clock className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">{selectedEventInfo.hora}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Globe className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">{selectedEventInfo.pais}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Users className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">
                      {selectedEventInfo.slots_disponibles - selectedEventInfo.slots_ocupados} cupos
                    </span>
                  </div>
                </div>

                {/* Descripción en Markdown */}
                <div className="mb-6">
                  <h5 className="font-semibold text-gray-800 mb-3">Descripción del Evento</h5>
                  <div className="prose prose-sm max-w-none text-gray-600 markdown-content">
                    <ReactMarkdown
                      components={{
                        h2: ({node, ...props}) => <h2 className="text-lg font-bold text-gray-800 mb-2 mt-4" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-md font-semibold text-gray-700 mb-2 mt-3" {...props} />,
                        p: ({node, ...props}) => <p className="mb-2 text-sm leading-relaxed text-gray-600" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside mb-3 text-sm space-y-1" {...props} />,
                        li: ({node, ...props}) => <li className="text-gray-600" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold text-gray-800" {...props} />
                      }}
                    >
                      {selectedEventInfo.descripcion || 'Descripción no disponible para este evento.'}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* Botón de acción */}
                <div className="space-y-3">
                  {selectedEvents.some(event => event.id === selectedEventInfo.id) ? (
                    // Botón dividido: 80% "Ya seleccionado" + 20% "Cancelar selección"
                    <div className="flex w-full rounded-lg overflow-hidden border border-gray-300">
                      {/* 80% - Estado seleccionado */}
                      <div className="flex-1 bg-green-50 text-green-700 py-3 px-4 flex items-center justify-center">
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
                      className="w-full btn-primary"
                    >
                      Seleccionar Evento
                    </button>
                  ) : (
                    <button className="w-full btn-secondary text-red-600 cursor-not-allowed">
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
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-bold text-gradient mb-2"
            >
              ExpoKossodo 2024
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-gray-600"
            >
              El evento médico más importante del año • 22-25 Julio 2024
            </motion.p>
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
              {/* Información de la fecha actual */}
              <div className="mb-8">
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-8 w-8 text-primary-600" />
                      <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                          {dateNames[currentDateIndex]}
                        </h2>
                        <p className="text-gray-600">
                          {utils.formatDate(eventDates[currentDateIndex])}
                        </p>
                      </div>
                    </div>
                    
                    {/* Indicador de progreso */}
                    <div className="flex items-center space-x-2">
                      {eventDates.map((_, index) => (
                        <div
                          key={index}
                          className={`w-3 h-3 rounded-full transition-all duration-200 ${
                            index === currentDateIndex 
                              ? 'bg-primary-600 scale-125' 
                              : index < currentDateIndex
                                ? 'bg-primary-300'
                                : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  
                  {/* Estadísticas del día */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <Clock className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                      <p className="text-sm text-gray-600">Horarios</p>
                      <p className="font-semibold text-gray-800">5</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <MapPin className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                      <p className="text-sm text-gray-600">Salas</p>
                      <p className="font-semibold text-gray-800">4</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <Users className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                      <p className="text-sm text-gray-600">Seleccionados</p>
                      <p className="font-semibold text-primary-600">
                        {utils.countEventsByDate(selectedEvents, eventDates[currentDateIndex])}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <Globe className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                      <p className="text-sm text-gray-600">Países</p>
                      <p className="font-semibold text-gray-800">12+</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Calendario de eventos */}
              <EventCalendar
                eventsData={eventsData}
                currentDate={eventDates[currentDateIndex]}
                selectedEvents={selectedEvents}
                onEventSelect={handleEventSelect}
                onShowEventInfo={handleShowEventInfo}
              />
              
              {/* Botones de navegación */}
              <div className="mt-8 flex justify-between items-center">
                <div className="flex space-x-3">
                  {currentDateIndex > 0 && (
                    <motion.button
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={goToPreviousDate}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      <ChevronLeft className="h-5 w-5" />
                      <span>Fecha Anterior</span>
                    </motion.button>
                  )}
                </div>
                
                {/* Botón culminar registro siempre visible */}
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={proceedToRegistration}
                  className="btn-primary flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                  disabled={selectedEvents.length === 0}
                >
                  <Users className="h-5 w-5" />
                  <span>Culminar Registro</span>
                </motion.button>
                
                <div className="flex space-x-3">
                  {currentDateIndex < eventDates.length - 1 && (
                    <motion.button
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={goToNextDate}
                      className="btn-primary flex items-center space-x-2"
                    >
                      <span>Siguiente Fecha</span>
                      <ChevronRight className="h-5 w-5" />
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