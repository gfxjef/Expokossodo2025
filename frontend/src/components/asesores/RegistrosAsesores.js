import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  X, 
  UserCheck, 
  Mail, 
  Building, 
  Calendar,
  Users,
  ChevronLeft
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { visualizacionService, visualizacionUtils } from '../../services/visualizacionService';
import LoadingSpinner from '../LoadingSpinner';
import UserCharlasModalAsesores from './UserCharlasModalAsesores';

const RegistrosAsesores = ({ onBack }) => {
  // Estados principales
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados de filtros
  const [filtros, setFiltros] = useState({
    nombre: '',
    empresa: '',
    cargo: '',
    fechaDesde: '',
    fechaHasta: ''
  });
  const [registrosFiltrados, setRegistrosFiltrados] = useState([]);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  
  // Estado para modal de charlas del usuario
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Cargar datos al montar el componente
  useEffect(() => {
    loadRegistros();
  }, []);

  // Aplicar filtros cuando cambien (memoizado)
  const registrosFiltradosMemo = useMemo(() => {
    if (registros.length > 0) {
      return visualizacionUtils.filtrarRegistros(registros, filtros);
    }
    return [];
  }, [registros, filtros]);

  useEffect(() => {
    setRegistrosFiltrados(registrosFiltradosMemo);
  }, [registrosFiltradosMemo]);

  const loadRegistros = async () => {
    try {
      setLoading(true);
      setError(null);

      const registrosData = await visualizacionService.getRegistros();
      setRegistros(registrosData);

      toast.success('Registros cargados correctamente');
    } catch (error) {
      console.error('Error loading registros:', error);
      setError(error.message || 'Error al cargar los registros');
      toast.error('Error al cargar los registros');
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambios en filtros (memoizado)
  const handleFilterChange = useCallback((key, value) => {
    setFiltros(prev => ({ ...prev, [key]: value }));
  }, []);

  // Limpiar filtros (memoizado)
  const clearFilters = useCallback(() => {
    setFiltros({
      nombre: '',
      empresa: '',
      cargo: '',
      fechaDesde: '',
      fechaHasta: ''
    });
  }, []);

  // Manejar click en usuario para ver sus charlas (memoizado)
  const handleUserClick = useCallback((usuario) => {
    setSelectedUser(usuario);
    setShowUserModal(true);
  }, []);

  if (loading) {
    return <LoadingSpinner message="Cargando registros..." />;
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Error al cargar registros</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={loadRegistros} className="btn-primary">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con botón de regreso */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Volver a eventos</span>
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h2 className="text-2xl font-bold text-gray-900">Lista de Registrados</h2>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            {registrosFiltrados.length} registros
          </span>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Filtros de búsqueda
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              👆 Haz clic en cualquier registro para ver sus charlas registradas
            </p>
          </div>
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Filter className="h-4 w-4" />
            <span>Filtros</span>
          </button>
        </div>

        {mostrarFiltros && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={filtros.nombre}
                onChange={(e) => handleFilterChange('nombre', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6cb79a]"
                placeholder="Buscar por nombre..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
              <input
                type="text"
                value={filtros.empresa}
                onChange={(e) => handleFilterChange('empresa', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6cb79a]"
                placeholder="Buscar por empresa..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
              <input
                type="text"
                value={filtros.cargo}
                onChange={(e) => handleFilterChange('cargo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6cb79a]"
                placeholder="Buscar por cargo..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Desde</label>
              <input
                type="date"
                value={filtros.fechaDesde}
                onChange={(e) => handleFilterChange('fechaDesde', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6cb79a]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Hasta</label>
              <input
                type="date"
                value={filtros.fechaHasta}
                onChange={(e) => handleFilterChange('fechaHasta', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6cb79a]"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        )}

        {/* Tabla de registros */}
        <div className="overflow-x-auto">
          <table className="w-full table-fixed divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                                 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '30%' }}>
                   <div className="flex items-center space-x-1">
                     <UserCheck className="h-3 w-3" />
                     <span>Nombres</span>
                   </div>
                 </th>
                 
                 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '25%' }}>
                   <div className="flex items-center space-x-1">
                     <Building className="h-3 w-3" />
                     <span>Empresa</span>
                   </div>
                 </th>
                 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '20%' }}>
                   <div className="flex items-center space-x-1">
                     <UserCheck className="h-3 w-3" />
                     <span>Cargo</span>
                   </div>
                 </th>
                 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '15%' }}>
                   <div className="flex items-center space-x-1">
                     <Calendar className="h-3 w-3" />
                     <span>Fecha</span>
                   </div>
                 </th>
                 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '10%' }}>
                   <div className="flex items-center space-x-1">
                     <Users className="h-3 w-3" />
                     <span>Charlas</span>
                   </div>
                 </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {registrosFiltrados.slice(0, 50).map((registro, index) => (
                <motion.tr 
                  key={index} 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => handleUserClick(registro)}
                  title="Haz clic para ver las charlas registradas"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      <div className="ml-2">
                        <div className="text-sm font-medium text-gray-900 truncate">{registro.nombres}</div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900 truncate" title={registro.empresa}>
                      {registro.empresa || 'No especificada'}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900 truncate" title={registro.cargo}>
                      {registro.cargo || 'No especificado'}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-xs text-gray-900">
                      {visualizacionUtils.formatearFecha(registro.fecha_registro)}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="text-sm font-semibold text-blue-600">
                      {visualizacionUtils.formatearEventos(registro.eventos).length}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {registrosFiltrados.length > 50 && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Mostrando 50 de {registrosFiltrados.length} registros
          </div>
        )}

        {registrosFiltrados.length === 0 && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No se encontraron registros con los filtros aplicados</p>
          </div>
        )}
      </div>

      {/* User Charlas Modal */}
      <UserCharlasModalAsesores
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        usuario={selectedUser}
      />
    </div>
  );
};

export default RegistrosAsesores; 