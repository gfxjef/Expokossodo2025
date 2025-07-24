import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit3, Clock, MapPin, Users, Globe, Image, ToggleLeft, ToggleRight, AlertCircle, Tag } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { adminUtils, adminService } from '../../services/adminService';
import EditEventModal from './EditEventModal';

const AdminEventGrid = ({ eventos, fecha, onEventUpdate }) => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [togglingEvents, setTogglingEvents] = useState(new Set());

  // Organizar eventos por horario y sala
  const eventGrid = adminUtils.organizarEventosPorHorario(eventos);
  
  const horarios = ['15:00-15:45', '16:00-16:45', '17:00-17:45', '18:00-18:45', '19:00-19:45'];
  const salas = [
    { id: 'sala1', name: 'Sala 1' },
    { id: 'sala2', name: 'Sala 2' },
    { id: 'sala3', name: 'Sala 3' },
    { id: 'sala5', name: 'Sala 4' }
  ];

  const handleEditEvent = (evento) => {
    setSelectedEvent(evento);
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setSelectedEvent(null);
  };

  const handleEventSaved = () => {
    handleCloseModal();
    onEventUpdate(); // Recargar datos
  };

  // NUEVA FUNCIÓN: Toggle de disponibilidad
  const handleToggleDisponibilidad = async (evento, e) => {
    e.stopPropagation(); // Evitar que se abra el modal de edición
    
    if (togglingEvents.has(evento.id)) return; // Evitar doble click
    
    try {
      setTogglingEvents(prev => new Set([...prev, evento.id]));
      
      const response = await adminService.toggleEventoDisponibilidad(evento.id);
      
      const accion = response.disponible ? 'activado' : 'desactivado';
      toast.success(`Evento ${accion} exitosamente`);
      
      onEventUpdate(); // Recargar datos
      
    } catch (error) {
      console.error('Error toggling disponibilidad:', error);
      toast.error(error.message || 'Error cambiando disponibilidad del evento');
    } finally {
      setTogglingEvents(prev => {
        const newSet = new Set(prev);
        newSet.delete(evento.id);
        return newSet;
      });
    }
  };

  const getOccupancyColor = (ocupados, disponibles) => {
    const percentage = (ocupados / disponibles) * 100;
    if (percentage >= 90) return 'text-red-600 bg-red-50';
    if (percentage >= 70) return 'text-orange-600 bg-orange-50';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header de la tabla */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Eventos - {new Date(fecha).toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Haz clic en cualquier evento para editarlo • Toggle para activar/desactivar
        </p>
      </div>

      {/* Grid de eventos */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>Horario</span>
                </div>
              </th>
              {salas.map(sala => (
                <th key={sala.id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{sala.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {horarios.map((horario, timeIndex) => (
              <tr key={horario} className="hover:bg-gray-50">
                {/* Columna de horario */}
                <td className="px-4 py-6 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{horario}</div>
                  <div className="text-xs text-gray-500">
                    {timeIndex === 0 && '🌅 Apertura'}
                    {timeIndex === 2 && '🍽️ Almuerzo'}
                    {timeIndex === 4 && '🌅 Cierre'}
                  </div>
                </td>

                {/* Columnas de salas */}
                {salas.map(sala => {
                  const evento = eventGrid[horario][sala.id];
                  
                  if (!evento) {
                    return (
                      <td key={sala.id} className="px-4 py-6">
                        <div className="h-20 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
                          <span className="text-xs text-gray-400">Sin evento</span>
                        </div>
                      </td>
                    );
                  }

                  const isToggling = togglingEvents.has(evento.id);
                  const isDisponible = evento.disponible;

                  return (
                    <td key={sala.id} className="px-4 py-6">
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="relative"
                      >
                        <div
                          onClick={() => handleEditEvent(evento)}
                          className={`relative bg-white border rounded-lg p-4 cursor-pointer hover:shadow-md transition-all duration-200 h-32 ${
                            isDisponible 
                              ? 'border-gray-200 hover:border-indigo-300' 
                              : 'border-red-200 bg-red-50/30'
                          }`}
                        >
                          {/* Header del evento con toggle */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center space-x-1">
                                <Globe className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-500 font-medium">{evento.pais}</span>
                              </div>
                              {evento.imagen_url && (
                                <Image className="h-3 w-3 text-green-500" />
                              )}
                              {!isDisponible && (
                                <AlertCircle className="h-3 w-3 text-red-500" />
                              )}
                            </div>
                            
                            {/* Toggle de disponibilidad */}
                            <button
                              onClick={(e) => handleToggleDisponibilidad(evento, e)}
                              disabled={isToggling}
                              className={`p-1 rounded hover:bg-gray-100 transition-colors ${
                                isToggling ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                              title={`${isDisponible ? 'Desactivar' : 'Activar'} evento`}
                            >
                              {isToggling ? (
                                <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-indigo-600 rounded-full"></div>
                              ) : isDisponible ? (
                                <ToggleRight className="h-4 w-4 text-green-600" />
                              ) : (
                                <ToggleLeft className="h-4 w-4 text-red-500" />
                              )}
                            </button>
                          </div>

                          {/* Título */}
                          <h4 className={`text-sm font-semibold mb-1 line-clamp-2 ${
                            isDisponible ? 'text-gray-900' : 'text-gray-500'
                          }`}>
                            {evento.titulo_charla}
                          </h4>

                          {/* Expositor */}
                          <p className={`text-xs mb-2 truncate ${
                            isDisponible ? 'text-gray-600' : 'text-gray-400'
                          }`}>
                            {evento.expositor}
                          </p>

                          {/* Rubros */}
                          {Array.isArray(evento.rubro) && evento.rubro.length > 0 && (
                            <div className="mb-2">
                              <div className="flex flex-wrap gap-1">
                                {evento.rubro.slice(0, 2).map((rubro) => (
                                  <span
                                    key={rubro}
                                    className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded font-medium"
                                  >
                                    {rubro}
                                  </span>
                                ))}
                                {evento.rubro.length > 2 && (
                                  <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-medium">
                                    +{evento.rubro.length - 2}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Footer con ocupación */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1">
                              <Users className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500">
                                {evento.slots_ocupados}/{evento.slots_disponibles}
                              </span>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                              isDisponible 
                                ? getOccupancyColor(evento.slots_ocupados, evento.slots_disponibles)
                                : 'text-red-600 bg-red-50'
                            }`}>
                              {isDisponible 
                                ? `${Math.round((evento.slots_ocupados / evento.slots_disponibles) * 100)}%`
                                : 'Inactivo'
                              }
                            </div>
                          </div>

                          {/* Overlay para eventos desactivados */}
                          {!isDisponible && (
                            <div className="absolute inset-0 bg-red-500/10 rounded-lg pointer-events-none"></div>
                          )}
                        </div>
                      </motion.div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Leyenda actualizada */}
      <div className="bg-gray-50 border-t border-gray-200 p-4">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Edit3 className="h-4 w-4" />
              <span>Haz clic para editar</span>
            </div>
            <div className="flex items-center space-x-2">
              <ToggleRight className="h-4 w-4 text-green-600" />
              <span>Activar/Desactivar</span>
            </div>
            <div className="flex items-center space-x-2">
              <Image className="h-4 w-4 text-green-500" />
              <span>Tiene imagen</span>
            </div>
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span>Desactivado</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-100 rounded"></div>
              <span>&lt;50%</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-100 rounded"></div>
              <span>50-70%</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-orange-100 rounded"></div>
              <span>70-90%</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-100 rounded"></div>
              <span>&gt;90%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de edición */}
      {showEditModal && selectedEvent && (
        <EditEventModal
          evento={selectedEvent}
          onClose={handleCloseModal}
          onEventSaved={handleEventSaved}
        />
      )}
    </div>
  );
};

export default AdminEventGrid; 