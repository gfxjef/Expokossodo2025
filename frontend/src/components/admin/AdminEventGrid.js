import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit3, Clock, MapPin, Users, Globe, Image } from 'lucide-react';
import { adminUtils } from '../../services/adminService';
import EditEventModal from './EditEventModal';

const AdminEventGrid = ({ eventos, fecha, onEventUpdate }) => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Organizar eventos por horario y sala
  const eventGrid = adminUtils.organizarEventosPorHorario(eventos);
  
  const horarios = ['09:00-10:00', '10:30-11:30', '12:00-13:00', '14:00-15:00', '15:30-16:30'];
  const salas = [
    { id: 'sala1', name: 'Auditorio Principal' },
    { id: 'sala2', name: 'Sala Cardio' },
    { id: 'sala3', name: 'Sala Neuro' },
    { id: 'sala5', name: 'Sala de Innovación' }
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
          Haz clic en cualquier evento para editarlo
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

                  return (
                    <td key={sala.id} className="px-4 py-6">
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="relative"
                      >
                        <div
                          onClick={() => handleEditEvent(evento)}
                          className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all duration-200 h-32"
                        >
                          {/* Header del evento */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center space-x-1">
                                <Globe className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-500 font-medium">{evento.pais}</span>
                              </div>
                              {evento.imagen_url && (
                                <Image className="h-3 w-3 text-green-500" />
                              )}
                            </div>
                            <Edit3 className="h-4 w-4 text-gray-400 group-hover:text-indigo-600" />
                          </div>

                          {/* Título */}
                          <h4 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">
                            {evento.titulo_charla}
                          </h4>

                          {/* Expositor */}
                          <p className="text-xs text-gray-600 mb-2 truncate">
                            {evento.expositor}
                          </p>

                          {/* Footer con ocupación */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1">
                              <Users className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500">
                                {evento.slots_ocupados}/{evento.slots_disponibles}
                              </span>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-medium ${getOccupancyColor(evento.slots_ocupados, evento.slots_disponibles)}`}>
                              {Math.round((evento.slots_ocupados / evento.slots_disponibles) * 100)}%
                            </div>
                          </div>
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

      {/* Leyenda */}
      <div className="bg-gray-50 border-t border-gray-200 p-4">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Edit3 className="h-4 w-4" />
              <span>Haz clic para editar</span>
            </div>
            <div className="flex items-center space-x-2">
              <Image className="h-4 w-4 text-green-500" />
              <span>Tiene imagen</span>
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