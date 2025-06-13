import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Save, 
  ToggleLeft, 
  ToggleRight, 
  Edit3, 
  X, 
  Image, 
  Users, 
  Building, 
  Globe,
  AlertCircle,
  CheckCircle,
  Tag
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { adminService } from '../../services/adminService';

const DateInfoManager = () => {
  const [fechasInfo, setFechasInfo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingFecha, setEditingFecha] = useState(null);
  const [editData, setEditData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFechasInfo();
  }, []);

  const loadFechasInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getFechasInfo();
      setFechasInfo(data.fechas_info || []);
    } catch (error) {
      console.error('Error cargando fechas info:', error);
      setError('Error al cargar la información de fechas');
      toast.error('Error al cargar la información');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (fecha) => {
    setEditingFecha(fecha.id);
    setEditData({
      rubro: fecha.rubro,
      titulo_dia: fecha.titulo_dia,
      descripcion: fecha.descripcion,
      ponentes_destacados: fecha.ponentes_destacados,
      marcas_patrocinadoras: fecha.marcas_patrocinadoras,
      paises_participantes: fecha.paises_participantes,
      imagen_url: fecha.imagen_url
    });
  };

  const handleCancelEdit = () => {
    setEditingFecha(null);
    setEditData({});
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);
      await adminService.updateFechaInfo(editingFecha, editData);
      toast.success('Información actualizada exitosamente');
      await loadFechasInfo();
      setEditingFecha(null);
      setEditData({});
    } catch (error) {
      console.error('Error actualizando fecha info:', error);
      toast.error('Error al actualizar la información');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (fechaId) => {
    try {
      const result = await adminService.toggleFechaInfo(fechaId);
      toast.success(result.message);
      await loadFechasInfo();
    } catch (error) {
      console.error('Error toggle fecha info:', error);
      toast.error('Error al cambiar el estado');
    }
  };

  const handleInputChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayChange = (field, index, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (field) => {
    setEditData(prev => ({
      ...prev,
      [field]: [...(prev[field] || []), '']
    }));
  };

  const removeArrayItem = (field, index) => {
    setEditData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">Cargando información de fechas...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
          <div>
            <h3 className="text-red-800 font-medium">Error de Carga</h3>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
        <button 
          onClick={loadFechasInfo}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <Calendar className="h-7 w-7 text-primary-600 mr-3" />
              Gestión de Información por Fecha
            </h2>
            <p className="text-gray-600 mt-1">
              Administra la información específica de cada día del evento
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary-600">{fechasInfo.length}</div>
            <div className="text-sm text-gray-500">fechas configuradas</div>
          </div>
        </div>
      </div>

      {/* Lista de fechas */}
      <div className="grid gap-6">
        {fechasInfo.map((fecha) => (
          <motion.div
            key={fecha.id}
            layout
            className={`bg-white rounded-lg shadow-md border-2 transition-all duration-200 ${
              fecha.activo ? 'border-green-200' : 'border-red-200'
            }`}
          >
            {/* Header de la tarjeta */}
            <div className={`p-4 rounded-t-lg ${
              fecha.activo ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    fecha.activo ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <Calendar className={`h-5 w-5 ${
                      fecha.activo ? 'text-green-600' : 'text-red-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {fecha.fecha} - {fecha.titulo_dia}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <Tag className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">{fecha.rubro}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Estado */}
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    fecha.activo 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {fecha.activo ? 'Activa' : 'Inactiva'}
                  </div>
                  
                  {/* Botones de acción */}
                  {editingFecha === fecha.id ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSave}
                        disabled={submitting}
                        className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        title="Guardar cambios"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={submitting}
                        className="bg-gray-600 text-white p-2 rounded-lg hover:bg-gray-700 transition-colors"
                        title="Cancelar"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(fecha)}
                        className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
                        title="Editar información"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggle(fecha.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          fecha.activo 
                            ? 'bg-red-600 hover:bg-red-700 text-white' 
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                        title={fecha.activo ? 'Desactivar' : 'Activar'}
                      >
                        {fecha.activo ? 
                          <ToggleRight className="h-4 w-4" /> : 
                          <ToggleLeft className="h-4 w-4" />
                        }
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Contenido de la tarjeta */}
            <div className="p-6">
              {editingFecha === fecha.id ? (
                /* Modo edición */
                <div className="space-y-6">
                  {/* Información básica */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rubro del Día
                      </label>
                      <input
                        type="text"
                        value={editData.rubro || ''}
                        onChange={(e) => handleInputChange('rubro', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Ej: Inteligencia Artificial y Diagnóstico"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Título del Día
                      </label>
                      <input
                        type="text"
                        value={editData.titulo_dia || ''}
                        onChange={(e) => handleInputChange('titulo_dia', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Ej: Día 1 - IA Revolucionando la Medicina"
                      />
                    </div>
                  </div>

                  {/* Descripción */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción
                    </label>
                    <textarea
                      value={editData.descripcion || ''}
                      onChange={(e) => handleInputChange('descripcion', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Descripción del día..."
                    />
                  </div>

                  {/* URL de imagen */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      URL de Imagen
                    </label>
                    <input
                      type="url"
                      value={editData.imagen_url || ''}
                      onChange={(e) => handleInputChange('imagen_url', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                      placeholder="https://..."
                    />
                  </div>

                  {/* Arrays editables */}
                  {['ponentes_destacados', 'marcas_patrocinadoras', 'paises_participantes'].map((field) => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field === 'ponentes_destacados' && 'Ponentes Destacados'}
                        {field === 'marcas_patrocinadoras' && 'Marcas Patrocinadoras'}
                        {field === 'paises_participantes' && 'Países Participantes'}
                      </label>
                      <div className="space-y-2">
                        {(editData[field] || []).map((item, index) => (
                          <div key={index} className="flex space-x-2">
                            <input
                              type="text"
                              value={item}
                              onChange={(e) => handleArrayChange(field, index, e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                              placeholder={`${field === 'ponentes_destacados' ? 'Dr. ' : ''}...`}
                            />
                            <button
                              onClick={() => removeArrayItem(field, index)}
                              className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => addArrayItem(field)}
                          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm"
                        >
                          + Agregar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Modo vista */
                <div className="space-y-6">
                  {/* Descripción */}
                  <div>
                    <p className="text-gray-700 leading-relaxed">{fecha.descripcion}</p>
                  </div>

                  {/* Imagen */}
                  {fecha.imagen_url && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Image className="h-4 w-4 mr-2" />
                        Imagen del Día
                      </h4>
                      <img 
                        src={fecha.imagen_url} 
                        alt={fecha.titulo_dia}
                        className="w-full h-48 object-cover rounded-lg"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* Información en grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Ponentes */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        Ponentes Destacados
                      </h4>
                      <div className="space-y-1">
                        {fecha.ponentes_destacados.map((ponente, index) => (
                          <div key={index} className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded">
                            {ponente}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Marcas */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                        <Building className="h-4 w-4 mr-2" />
                        Marcas Patrocinadoras
                      </h4>
                      <div className="space-y-1">
                        {fecha.marcas_patrocinadoras.map((marca, index) => (
                          <div key={index} className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded">
                            {marca}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Países */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                        <Globe className="h-4 w-4 mr-2" />
                        Países Participantes
                      </h4>
                      <div className="space-y-1">
                        {fecha.paises_participantes.map((pais, index) => (
                          <div key={index} className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded">
                            {pais}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default DateInfoManager; 