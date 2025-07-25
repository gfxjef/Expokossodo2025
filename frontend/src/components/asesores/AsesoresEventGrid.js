import React, { memo, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Calendar, Users, TrendingUp } from 'lucide-react';
import EventRow from './EventRow';

const AsesoresEventGrid = memo(({ eventos, loading, stats }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all'); // 'all', 'active', 'inactive', 'available'
  const [sortBy, setSortBy] = useState('hora'); // 'hora', 'sala', 'ocupacion'

  // Memoizar eventos procesados para evitar re-renders innecesarios
  const processedEventos = useMemo(() => {
    if (!eventos) return [];

    let filtered = eventos;

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(evento =>
        evento.titulo_charla.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evento.expositor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evento.sala.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evento.pais.toLowerCase().includes(searchTerm.toLowerCase()) ||
        // Agregar búsqueda por rubros
        (Array.isArray(evento.rubro) && evento.rubro.some(rubro => 
          rubro.toLowerCase().includes(searchTerm.toLowerCase())
        ))
      );
    }

    // Filtrar por estado
    switch (filterBy) {
      case 'active':
        filtered = filtered.filter(evento => evento.disponible);
        break;
      case 'inactive':
        filtered = filtered.filter(evento => !evento.disponible);
        break;
      case 'available':
        filtered = filtered.filter(evento => 
          evento.disponible && evento.slots_ocupados < evento.slots_disponibles
        );
        break;
      default:
        break;
    }

    // Ordenar eventos
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'hora':
          return a.hora.localeCompare(b.hora);
        case 'sala':
          return a.sala.localeCompare(b.sala);
        case 'ocupacion':
          const ocupacionA = (a.slots_ocupados / a.slots_disponibles) * 100;
          const ocupacionB = (b.slots_ocupados / b.slots_disponibles) * 100;
          return ocupacionB - ocupacionA; // Mayor ocupación primero
        default:
          return 0;
      }
    });

    return filtered;
  }, [eventos, searchTerm, filterBy, sortBy]);

  // Estados de carga y error
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
              <div className="lg:col-span-1">
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="lg:col-span-4">
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
              <div className="lg:col-span-2">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
              <div className="lg:col-span-2">
                <div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div>
              </div>
              <div className="lg:col-span-1">
                <div className="h-6 bg-gray-200 rounded-full w-16 mx-auto"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#6cb79a]/10 to-[#1f2f56]/10 rounded-lg p-6 border border-[#6cb79a]/20"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Calendar className="w-5 h-5 text-[#6cb79a]" />
              </div>
              <div className="text-2xl font-bold text-gray-800">{stats.totalEventos}</div>
              <div className="text-sm text-gray-600">Total Eventos</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="w-5 h-5 text-[#6cb79a]" />
              </div>
              <div className="text-2xl font-bold text-gray-800">{stats.totalCupos}</div>
              <div className="text-sm text-gray-600">Total Cupos</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="w-5 h-5 text-[#6cb79a]" />
              </div>
              <div className="text-2xl font-bold text-gray-800">{stats.ocupacionPorcentaje}%</div>
              <div className="text-sm text-gray-600">Ocupación</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-5 h-5 bg-green-500 rounded-full"></div>
              </div>
              <div className="text-2xl font-bold text-gray-800">{stats.eventosActivos}</div>
              <div className="text-sm text-gray-600">Eventos Activos</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Controles de búsqueda y filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar eventos, expositores, salas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6cb79a] focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtros */}
          <div className="flex gap-2">
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6cb79a] focus:border-transparent"
            >
              <option value="all">Todos los eventos</option>
              <option value="active">Solo activos</option>
              <option value="inactive">Solo inactivos</option>
              <option value="available">Con cupos disponibles</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6cb79a] focus:border-transparent"
            >
              <option value="hora">Ordenar por hora</option>
              <option value="sala">Ordenar por sala</option>
              <option value="ocupacion">Ordenar por ocupación</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de eventos */}
      <div className="space-y-4">
        {processedEventos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 bg-white rounded-lg border border-gray-200"
          >
            <div className="text-gray-400 mb-4">
              <Search className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              No se encontraron eventos
            </h3>
            <p className="text-gray-500">
              {searchTerm 
                ? `No hay eventos que coincidan con "${searchTerm}"`
                : 'No hay eventos disponibles para mostrar'
              }
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {processedEventos.map((evento, index) => (
              <EventRow 
                key={evento.id} 
                evento={evento} 
                index={index}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Contador de resultados */}
      {processedEventos.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          Mostrando {processedEventos.length} de {eventos?.length || 0} eventos
        </div>
      )}
    </div>
  );
});

AsesoresEventGrid.displayName = 'AsesoresEventGrid';

export default AsesoresEventGrid; 