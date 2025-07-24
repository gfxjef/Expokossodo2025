import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, Users, Calendar, Building2, Globe } from 'lucide-react';

const EventRow = memo(({ evento, index }) => {
  // Calcular porcentaje de ocupación
  const ocupacionPorcentaje = evento.slots_disponibles > 0 
    ? Math.round((evento.slots_ocupados / evento.slots_disponibles) * 100) 
    : 0;

  // Determinar color de ocupación
  const getOcupacionColor = (porcentaje) => {
    if (porcentaje < 50) return 'bg-green-500';
    if (porcentaje < 70) return 'bg-yellow-500';
    if (porcentaje < 90) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Determinar color de estado
  const getEstadoColor = (disponible) => {
    return disponible 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-red-100 text-red-800 border-red-200';
  };

  // Formatear hora para mostrar
  const formatHora = (hora) => {
    return hora.replace('-', ' - ');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-300 hover:border-[#6cb79a]/30"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Hora - 2 columnas */}
        <div className="lg:col-span-2 flex items-center space-x-2">
          <Clock className="w-4 h-4 text-[#6cb79a]" />
          <div>
            <span className="font-semibold text-gray-800 text-sm">
              {formatHora(evento.hora)}
            </span>
          </div>
        </div>
        
        {/* Sala - 1 columna */}
        <div className="lg:col-span-1 flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600 font-medium">
            {evento.sala}
          </span>
        </div>
        
        {/* Título - 4 columnas */}
        <div className="lg:col-span-4">
          <h3 className="font-medium text-gray-900 text-sm leading-tight mb-1">
            {evento.titulo_charla}
          </h3>
          {evento.marca_nombre && (
            <div className="flex items-center space-x-2">
              <Building2 className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-500 font-medium">
                {evento.marca_nombre}
              </span>
            </div>
          )}
        </div>
        
        {/* Expositor - 2 columnas */}
        <div className="lg:col-span-2">
          <div className="flex items-center space-x-2 mb-1">
            <Users className="w-4 h-4 text-[#6cb79a]" />
            <p className="text-sm text-gray-700 font-medium">
              {evento.expositor}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Globe className="w-3 h-3 text-gray-400" />
            <p className="text-xs text-gray-500">
              {evento.pais}
            </p>
          </div>
        </div>
        
        {/* Cupos - 2 columnas */}
        <div className="lg:col-span-2">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-800">
                {evento.slots_ocupados}/{evento.slots_disponibles}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div 
                className={`h-2 rounded-full ${getOcupacionColor(ocupacionPorcentaje)}`}
                initial={{ width: 0 }}
                animate={{ width: `${ocupacionPorcentaje}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {ocupacionPorcentaje}% ocupado
            </p>
          </div>
        </div>
        
        {/* Estado - 1 columna */}
        <div className="lg:col-span-1">
          <div className="flex justify-center">
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getEstadoColor(evento.disponible)}`}>
              {evento.disponible ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>
      </div>

      {/* Información adicional en móvil */}
      <div className="lg:hidden mt-4 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-[#6cb79a]" />
            <span className="text-gray-600">{formatHora(evento.hora)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">{evento.sala}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-[#6cb79a]" />
            <span className="text-gray-600">{evento.expositor}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{evento.pais}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

EventRow.displayName = 'EventRow';

export default EventRow; 