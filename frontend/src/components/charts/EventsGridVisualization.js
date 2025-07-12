import React from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, Users, Globe, Calendar, Eye } from 'lucide-react';
import LoadingSpinner from '../LoadingSpinner';

const EventsGridVisualization = ({ eventos, fecha, onEventClick, registrados, onVerRegistrados }) => {
  // Horarios y salas definidos (IGUAL que AdminEventGrid)
  const horarios = ['15:00-15:45', '16:00-16:45', '17:00-17:45', '18:00-18:45', '19:00-19:45'];
  const salas = [
    { id: 'sala1', name: 'Sala 1' },
    { id: 'sala2', name: 'Sala 2' },
    { id: 'sala3', name: 'Sala 3' },
    { id: 'sala5', name: 'Sala 4' } // Nota: sala5 en lugar de sala4 (igual que admin)
  ];

  // Organizar eventos por horario y sala (IGUAL que adminUtils.organizarEventosPorHorario)
  const organizarEventosPorHorario = (eventosArray) => {
    const grid = {};
    
    horarios.forEach(horario => {
      grid[horario] = {};
      salas.forEach(sala => {
        const evento = eventosArray.find(e => e.hora === horario && e.sala === sala.id);
        grid[horario][sala.id] = evento || null;
      });
    });
    
    return grid;
  };

  const eventGrid = organizarEventosPorHorario(eventos || []);

  const handleEventClick = (evento) => {
    if (onEventClick) {
      onEventClick(evento);
    }
  };

  const getOccupancyColor = (ocupados, disponibles) => {
    const percentage = (ocupados / disponibles) * 100;
    
    if (percentage >= 90) return 'text-red-600 bg-red-50';
    if (percentage >= 70) return 'text-orange-600 bg-orange-50';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getCountryFlag = (pais) => {
    const flags = {
      'Argentina': '🇦🇷',
      'Brasil': '🇧🇷',
      'Colombia': '🇨🇴',
      'Peru': '🇵🇪',
      'Perú': '🇵🇪',
      'Venezuela': '🇻🇪',
      'España': '🇪🇸',
      'Chile': '🇨🇱',
      'México': '🇲🇽',
      'Ecuador': '🇪🇨'
    };
    return flags[pais] || '🌐';
  };

  if (!eventos || eventos.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <LoadingSpinner />
        <p className="text-gray-500 mt-4">No hay eventos disponibles para esta fecha.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header de la tabla */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
              <Calendar className="h-6 w-6 text-blue-600" />
              <span>Programación de Eventos</span>
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {fecha ? new Date(fecha).toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }) : 'Todos los días'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">
              👆 <span className="font-medium">Clickeable</span>
            </div>
            <div className="text-xs text-gray-400">
              Haz clic en cualquier evento para ver detalles
            </div>
          </div>
        </div>
      </div>

      {/* Grid de eventos */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Horario</span>
                </div>
              </th>
              {salas.map(sala => (
                <th key={sala.id} className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>{sala.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {horarios.map((horario, timeIndex) => (
              <tr key={horario} className="hover:bg-gray-50/50">
                {/* Columna de horario */}
                <td className="px-6 py-6 whitespace-nowrap">
                  <div className="text-sm font-bold text-gray-900">{horario}</div>
                  <div className="text-xs text-gray-500 mt-1">
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
                      <td key={sala.id} className="px-6 py-6">
                        <div className="h-28 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
                          <span className="text-xs text-gray-400">Sin evento</span>
                        </div>
                      </td>
                    );
                  }

                  const isDisponible = evento.disponible !== false;
                  const percentage = evento.slots_disponibles ? 
                    Math.round((evento.slots_ocupados / evento.slots_disponibles) * 100) : 0;

                  return (
                    <td key={sala.id} className="px-6 py-6">
                      <motion.div
                        whileHover={{ scale: 1.02, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                        whileTap={{ scale: 0.98 }}
                        className="relative group"
                      >
                        <div
                          onClick={() => handleEventClick(evento)}
                          className={`relative bg-white border rounded-lg p-4 cursor-pointer transition-all duration-200 h-32 ${
                            isDisponible 
                              ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30' 
                              : 'border-red-200 bg-red-50/30'
                          }`}
                        >
                          {/* Header del evento con país */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">{getCountryFlag(evento.pais)}</span>
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                {evento.pais}
                              </span>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Eye className="h-4 w-4 text-blue-500" />
                            </div>
                          </div>

                          {/* Título del evento */}
                          <h4 className={`text-sm font-semibold mb-1 line-clamp-2 leading-tight ${
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

                          {/* Footer con ocupación */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1">
                              <Users className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500">
                                {evento.slots_ocupados || 0}/{evento.slots_disponibles || 60}
                              </span>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                              isDisponible 
                                ? getOccupancyColor(evento.slots_ocupados || 0, evento.slots_disponibles || 60)
                                : 'text-red-600 bg-red-50'
                            }`}>
                              {isDisponible 
                                ? `${percentage}%`
                                : 'Inactivo'
                              }
                            </div>
                          </div>

                          {/* Overlay para eventos desactivados */}
                          {!isDisponible && (
                            <div className="absolute inset-0 bg-red-50/50 rounded-lg flex items-center justify-center">
                              <span className="text-xs text-red-600 font-medium">INACTIVO</span>
                            </div>
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

      {/* Footer con estadísticas */}
      <div className="bg-gray-50 border-t border-gray-200 p-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Total de eventos: {eventos.length}</span>
          <span>Eventos activos: {eventos.filter(e => e.disponible !== false).length}</span>
        </div>
      </div>
    </div>
  );
};

export default EventsGridVisualization; 