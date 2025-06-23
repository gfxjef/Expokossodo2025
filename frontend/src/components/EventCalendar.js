import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, MapPin, Users, Globe, Star, AlertCircle, CheckCircle } from 'lucide-react';
import { eventService } from '../services/api';

const EventCalendar = ({ eventsData, currentDate, selectedEvents, onEventSelect, onShowEventInfo, timeSlots = [] }) => {
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [hoveredEvent, setHoveredEvent] = useState(null);
  
  // Salas fijas (estas no cambiarán)
  const rooms = ['sala1', 'sala2', 'sala3', 'sala5'];
  const roomNames = {
    'sala1': 'Auditorio Principal',
    'sala2': 'Sala Cardio',
    'sala3': 'Sala Neuro',
    'sala5': 'Sala de Innovación'
  };

  // Obtener eventos para la fecha actual
  const currentDateEvents = eventsData[currentDate] || {};
  
  // Verificar si un evento está seleccionado
  const isEventSelected = (eventId) => {
    return selectedEvents.some(event => event.id === eventId);
  };
  
  // Verificar si un horario ya está ocupado por una selección EN LA FECHA ACTUAL
  const isTimeSlotTaken = (timeSlot) => {
    return selectedEvents.some(event => 
      event.hora === timeSlot && event.fecha === currentDate
    );
  };

  // Obtener estadísticas del calendario
  const getCalendarStats = () => {
    const totalEvents = Object.values(currentDateEvents).flat().length;
    const availableEvents = Object.values(currentDateEvents).flat().filter(e => e.disponible).length;
    const selectedCount = selectedEvents.filter(e => e.fecha === currentDate).length;
    
    return { totalEvents, availableEvents, selectedCount };
  };

  const stats = getCalendarStats();

  // Expandir/contraer detalles del evento
  const toggleEventDetails = (eventId) => {
    setExpandedEvent(expandedEvent === eventId ? null : eventId);
  };
  
  // Renderizar una tarjeta de evento
  const renderEventCard = (timeSlot, room) => {
    const eventsForSlot = currentDateEvents[timeSlot] || [];
    const eventForRoom = eventsForSlot.find(event => event.sala === room);
    
    if (!eventForRoom) {
      return (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-36 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center group hover:border-gray-300 transition-colors"
        >
          <div className="text-center text-gray-400">
            <MapPin className="h-6 w-6 mx-auto mb-2 group-hover:text-gray-500 transition-colors" />
            <span className="text-sm">Sin evento programado</span>
          </div>
        </motion.div>
      );
    }
    
    const isSelected = isEventSelected(eventForRoom.id);
    const isTimeSlotConflict = isTimeSlotTaken(timeSlot) && !isSelected;
    const isAvailable = eventForRoom.disponible;
    const slotsLeft = eventForRoom.slots_disponibles - eventForRoom.slots_ocupados;
    const isHovered = hoveredEvent === eventForRoom.id;
    
    // Definir estilos según el estado
    let cardClasses = "h-36 p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 relative overflow-hidden ";
    let statusIcon = null;
    let statusText = "";
    let statusColor = "";
    
    if (isSelected) {
      // 🔵 AZUL: Evento seleccionado
      cardClasses += "border-blue-500 bg-blue-50 shadow-xl scale-105 ring-2 ring-blue-200";
      statusIcon = <Star className="h-4 w-4 text-blue-600" fill="currentColor" />;
      statusText = "Seleccionado";
      statusColor = "text-blue-600";
    } else if (!isAvailable) {
      // 🔴 ROJO: Sin cupos (siempre rojo, prioridad máxima)
      cardClasses += "border-red-400 bg-red-50 opacity-80 cursor-not-allowed";
      statusIcon = <AlertCircle className="h-4 w-4 text-red-500" />;
      statusText = "Sin cupos";
      statusColor = "text-red-600";
    } else if (isTimeSlotConflict) {
      // ⚫ PLOMO: Mismo horario, disponible a elección/intercambio
      cardClasses += "border-gray-400 bg-gray-100 hover:border-gray-500 hover:bg-gray-150 cursor-pointer";
      statusIcon = <Users className="h-4 w-4 text-gray-600" />;
      statusText = "Disponible a elección";
      statusColor = "text-gray-600";
    } else {
      // ⚪ BLANCO: Disponible normal
      cardClasses += "border-gray-200 bg-white hover:border-primary-300 hover:shadow-lg hover:scale-102";
      statusIcon = <Users className="h-4 w-4 text-green-500" />;
      statusText = `${slotsLeft} cupos`;
      statusColor = "text-green-600";
    }
    
    // Puede seleccionar si está disponible (incluso si hay conflicto de horario para intercambiar)
    const canSelect = isAvailable;
    
    return (
      <motion.div
        key={eventForRoom.id}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={canSelect ? { y: -4, scale: 1.02 } : {}}
        whileTap={canSelect ? { scale: 0.98 } : {}}
        className={cardClasses}
        onClick={() => {
          // Cambio: Ahora al hacer click abre la información del evento
          const eventWithHour = {
            ...eventForRoom,
            hora: timeSlot
          };
          onShowEventInfo && onShowEventInfo(eventWithHour);
        }}
        onMouseEnter={() => setHoveredEvent(eventForRoom.id)}
        onMouseLeave={() => setHoveredEvent(null)}
      >
        {/* Efecto de gradiente para eventos seleccionados */}
        {isSelected && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-purple-500/10 pointer-events-none" />
        )}
        
        {/* Header con estado y país */}
        <div className="flex items-center justify-between mb-2 relative z-10">
          <div className="flex items-center space-x-1">
            {statusIcon}
            <span className={`text-xs font-medium ${statusColor}`}>{statusText}</span>
          </div>
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <Globe className="h-3 w-3" />
            <span className="font-medium">{eventForRoom.pais}</span>
          </div>
        </div>
        
        {/* Contenido principal */}
        <div className="flex-1 relative z-10">
          <h4 className="font-semibold text-sm text-gray-800 mb-2 line-clamp-2 leading-tight">
            {eventForRoom.titulo_charla}
          </h4>
          <p className="text-xs text-gray-600 mb-2 font-medium">
            {eventForRoom.expositor}
          </p>
          

        </div>
        
        {/* Footer con selección */}
        <div className="flex justify-end relative z-10">
          {isSelected && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-xs text-blue-600 font-bold flex items-center space-x-1"
            >
              <CheckCircle className="h-3 w-3" />
              <span>Seleccionado</span>
            </motion.div>
          )}
        </div>
        
        {/* Efecto hover */}
        <AnimatePresence>
          {isHovered && canSelect && !isSelected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`absolute inset-0 pointer-events-none rounded-lg ${
                isTimeSlotConflict 
                  ? 'bg-gray-500/10' // Hover plomo para eventos disponibles a elección
                  : 'bg-primary-500/5' // Hover verde para eventos normales
              }`}
            />
          )}
        </AnimatePresence>
      </motion.div>
    );
  };
  
  // Si no hay timeSlots, mostrar fallback pero sin loading
  const displayTimeSlots = timeSlots.length > 0 
    ? timeSlots 
    : ['09:00-10:00', '10:30-11:30', '12:00-13:00', '14:00-15:00', '15:30-16:30'];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
    >

      
      {/* Leyenda con instrucciones */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {/* Leyenda de estados */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-white border-2 border-gray-200 rounded"></div>
              <span className="text-gray-600">Disponible</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-50 border-2 border-blue-500 rounded"></div>
              <span className="text-gray-600">Seleccionado</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-100 border-2 border-gray-400 rounded"></div>
              <span className="text-gray-600">Disponible a elección</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-50 border-2 border-red-400 rounded"></div>
              <span className="text-gray-600">Sin cupos</span>
            </div>
          </div>
          
          {/* Instrucciones compactas */}
          <div className="text-right text-xs text-gray-500 max-w-xs">
            <p className="font-medium">Clic en evento → Ver info → Seleccionar</p>
            <p className="hidden md:block">Un evento por horario máximo</p>
          </div>
        </div>
      </div>
      
      {/* Grid principal del calendario */}
      <div className="p-6">
        <div className="overflow-x-auto">
          <div className="grid grid-cols-[60px_repeat(4,1fr)] md:grid-cols-5 gap-2 md:gap-4 min-w-[600px] md:min-w-[800px]">
            {/* Header con horarios */}
            <div className="font-medium text-gray-600 text-center py-1 md:py-2">
              <Clock className="h-4 w-4 md:h-5 md:w-5 mx-auto mb-1" />
              <span className="text-xs md:text-sm">Horarios</span>
            </div>
            {rooms.map(room => (
              <div key={room} className="font-medium text-gray-600 text-center py-2">
                <MapPin className="h-5 w-5 mx-auto mb-1" />
                <span className="text-sm font-semibold">{roomNames[room]}</span>
                <span className="text-xs text-gray-500 block">{room}</span>
              </div>
            ))}
            
            {/* Filas de eventos por horario */}
            {displayTimeSlots.map((timeSlot, timeIndex) => (
              <React.Fragment key={timeSlot}>
                {/* Columna de horario */}
                <div className="flex items-center justify-center p-1 md:p-3 bg-gray-50 rounded-lg border">
                  <div className="text-center">
                    <div className="font-semibold text-gray-800 text-[10px] md:text-sm leading-tight">{timeSlot}</div>
                    <div className="hidden md:block text-xs text-gray-500 mt-1">
                      {isTimeSlotTaken(timeSlot) ? "Ocupado" : "Disponible"}
                    </div>
                  </div>
                </div>
                
                {/* Columnas de salas */}
                {rooms.map(room => (
                  <motion.div
                    key={`${timeSlot}-${room}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: timeIndex * 0.1 }}
                  >
                    {renderEventCard(timeSlot, room)}
                  </motion.div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      

    </motion.div>
  );
};

export default EventCalendar; 