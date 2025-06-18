import React, { useRef, useState, useEffect } from 'react';
import ReactFullpage from '@fullpage/react-fullpage';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import LandingPage from './LandingPage';
import EventRegistration from './EventRegistration';
import { Calendar, Clock, Globe, Users, CheckCircle, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { utils } from '../services/api';

const EventRegistrationWithLanding = () => {
  const fullpageRef = useRef(null);

  // === ESTADO Y LÓGICA CENTRALIZADOS ===
  const [isRegistrationActive, setIsRegistrationActive] = useState(false);
  
  // -- Lógica del panel
  const [showEventInfo, setShowEventInfo] = useState(false);
  const [selectedEventInfo, setSelectedEventInfo] = useState(null);
  
  // -- Lógica de selección de eventos (subida desde EventRegistration)
  const [selectedEvents, setSelectedEvents] = useState([]);

  // Efecto para bloquear el scroll de fullpage.js cuando el panel está abierto
  useEffect(() => {
    if (fullpageRef.current?.fullpageApi) {
      if (showEventInfo) {
        fullpageRef.current.fullpageApi.setAllowScrolling(false);
        fullpageRef.current.fullpageApi.setKeyboardScrolling(false);
      } else {
        fullpageRef.current.fullpageApi.setAllowScrolling(true);
        fullpageRef.current.fullpageApi.setKeyboardScrolling(true);
      }
    }
  }, [showEventInfo]);

  const handleClearSelectedEvents = () => {
    setSelectedEvents([]);
  };

  const handleEventSelect = (eventData) => {
    if (!eventData || !eventData.id) {
      console.error('Intento de seleccionar un evento inválido:', eventData);
      toast.error('Error: Datos del evento incompletos.');
      return;
    }

    const isSelected = selectedEvents.some(event => event.id === eventData.id);

    if (isSelected) {
      setSelectedEvents(currentEvents => currentEvents.filter(event => event.id !== eventData.id));
      toast.success('Evento deseleccionado');
      return;
    }
    
    const conflictingEvent = selectedEvents.find(event => 
      event.hora === eventData.hora && event.fecha === eventData.fecha
    );

    if (conflictingEvent) {
      const updatedEvents = selectedEvents.filter(event => 
        !(event.hora === eventData.hora && event.fecha === eventData.fecha)
      );
      setSelectedEvents([...updatedEvents, eventData]);
      toast.success(`Evento intercambiado para el horario ${eventData.hora}.`);
    } else {
      if (!eventData.disponible) {
        toast.error('Este evento ya no tiene cupos disponibles.');
        return;
      }
      setSelectedEvents(currentEvents => [...currentEvents, eventData]);
      toast.success('Evento seleccionado!');
    }
  };

  const handleShowEventInfo = (eventData) => {
    setSelectedEventInfo(eventData);
    setShowEventInfo(true);
  };

  const handleCloseEventInfo = () => {
    setShowEventInfo(false);
    // Pequeño delay para que la animación de salida termine antes de limpiar los datos
    setTimeout(() => setSelectedEventInfo(null), 300);
  };

  // Función para navegar a la siguiente sección
  const scrollToNext = () => {
    if (fullpageRef.current) {
      fullpageRef.current.fullpageApi.moveSectionDown();
    }
  };

  return (
    <>
      <ReactFullpage
        licenseKey="gplv3-license"
        credits={{ enabled: false }}
        scrollingSpeed={1000}
        easing="easeInOutCubic"
        scrollOverflow={true}
        onLeave={(origin, destination, direction) => {
          if (origin.index === 1) {
            setIsRegistrationActive(false);
            handleCloseEventInfo(); // Forzar cierre del panel al salir
          }
        }}
        afterLoad={(origin, destination, direction) => {
          setIsRegistrationActive(destination.index === 1);
        }}
        
        render={({ state, fullpageApi }) => {
          if (fullpageApi && !fullpageRef.current) {
            fullpageRef.current = { fullpageApi };
          }

          return (
            <ReactFullpage.Wrapper>
              <div className="section">
                <LandingPage onScrollToNext={scrollToNext} />
              </div>
              <div className="section fp-auto-height-responsive">
                <div className="h-screen bg-gray-50 relative">
                  <EventRegistration 
                    isActive={isRegistrationActive}
                    onShowEventInfo={handleShowEventInfo}
                    selectedEvents={selectedEvents}
                    onEventSelect={handleEventSelect}
                    onClearSelectedEvents={handleClearSelectedEvents}
                  />
                </div>
              </div>
            </ReactFullpage.Wrapper>
          );
        }}
      />

      {/* === RENDERIZADO DEL PANEL (fuera de Fullpage.js) === */}
      <AnimatePresence>
        {isRegistrationActive && showEventInfo && selectedEventInfo && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseEventInfo}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 220 }}
              className="fixed left-0 top-0 h-screen w-full max-w-md bg-gradient-to-b from-[#01295c] to-[#1d2236] shadow-2xl z-[110] flex flex-col"
            >
              {/* === ÁREA DE CONTENIDO SCROLLEABLE === */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-6">
                  {/* Header del panel */}
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-white">Información del Evento</h3>
                    <button
                      onClick={handleCloseEventInfo}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                      <X className="w-6 h-6 text-white" />
                    </button>
                  </div>

                  {/* Imagen del evento */}
                  <div className="mb-6">
                    {selectedEventInfo.imagen_url ? (
                      <div className="w-full h-48 rounded-lg overflow-hidden shadow-lg">
                        <img 
                          src={selectedEventInfo.imagen_url}
                          alt={selectedEventInfo.titulo_charla}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-48 bg-white/5 rounded-lg flex items-center justify-center border border-dashed border-white/20">
                        <div className="text-center text-white/50">
                          <Users className="w-12 h-12 mx-auto mb-2" />
                          <span className="text-sm">Imagen del Evento</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Título */}
                  <h4 className="text-2xl font-bold text-white mb-2 leading-tight">
                    {selectedEventInfo.titulo_charla}
                  </h4>

                  {/* Expositor */}
                  <p className="text-[#6cb79a] font-medium mb-6 text-lg">
                    {selectedEventInfo.expositor}
                  </p>

                  {/* Detalles del evento */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center space-x-2 text-white/90">
                      <Calendar className="h-4 w-4 text-[#6cb79a]" />
                      <span className="text-sm font-medium">{utils.formatDateNice(selectedEventInfo.fecha)}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-white/90">
                      <Clock className="h-4 w-4 text-[#6cb79a]" />
                      <span className="text-sm font-medium">{selectedEventInfo.hora}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-white/90">
                      <Globe className="h-4 w-4 text-[#6cb79a]" />
                      <span className="text-sm font-medium">{selectedEventInfo.pais}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-white/90">
                      <Users className="h-4 w-4 text-[#6cb79a]" />
                      <span className="text-sm font-medium">
                        {selectedEventInfo.slots_disponibles - selectedEventInfo.slots_ocupados} cupos
                      </span>
                    </div>
                  </div>

                  {/* Descripción en Markdown */}
                  <div className="mb-6">
                    <h5 className="font-semibold text-white mb-3 border-b border-white/20 pb-2">Descripción</h5>
                    <div className="prose prose-sm max-w-none text-white/80 markdown-content pt-2">
                      <ReactMarkdown
                        components={{
                          p: ({node, ...props}) => <p className="mb-2 text-base leading-relaxed" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc list-inside mb-3 space-y-1" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />
                        }}
                      >
                        {selectedEventInfo.descripcion || 'Descripción no disponible para este evento.'}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>

              {/* === BOTÓN DE ACCIÓN FIJO (STICKY) === */}
              <div className="p-6 bg-[#01295c]/80 backdrop-blur-sm border-t border-white/20">
                {selectedEvents.some(event => event.id === selectedEventInfo.id) ? (
                  <div className="flex w-full rounded-lg overflow-hidden border border-[#6cb79a]">
                    <div className="flex-1 bg-[#6cb79a]/20 text-[#6cb79a] py-3 px-4 flex items-center justify-center font-bold text-lg">
                      <CheckCircle className="h-6 w-6 mr-3" />
                      <span>Seleccionado</span>
                    </div>
                    <button
                      onClick={() => handleEventSelect(selectedEventInfo)}
                      className="w-20 bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors group"
                      title="Remover selección"
                    >
                      <X className="h-6 w-6 group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                ) : selectedEventInfo.disponible ? (
                  <button 
                    onClick={() => {
                      handleEventSelect(selectedEventInfo);
                      handleCloseEventInfo();
                    }}
                    className="w-full bg-[#6cb79a] hover:bg-[#5aa485] text-white py-3 px-4 rounded-lg font-bold transition-colors text-lg"
                  >
                    Seleccionar Evento
                  </button>
                ) : (
                  <button className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-bold text-lg cursor-not-allowed" disabled>
                    Sin cupos disponibles
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default EventRegistrationWithLanding; 