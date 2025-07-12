import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Calendar, Clock, MapPin, Globe, User, FileText, Image, AlertCircle, ToggleRight, Building2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { adminService, adminValidators } from '../../services/adminService';

const EditEventModal = ({ evento, onClose, onEventSaved }) => {
  const [formData, setFormData] = useState({
    titulo_charla: '',
    expositor: '',
    pais: '',
    descripcion: '',
    imagen_url: '',
    disponible: true,
    marca_id: null
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [marcas, setMarcas] = useState([]);
  const [loadingMarcas, setLoadingMarcas] = useState(true);

  useEffect(() => {
    if (evento) {
      setFormData({
        titulo_charla: evento.titulo_charla || '',
        expositor: evento.expositor || '',
        pais: evento.pais || '',
        descripcion: evento.descripcion || '',
        imagen_url: evento.imagen_url || '',
        disponible: evento.disponible !== undefined ? evento.disponible : true,
        marca_id: evento.marca_id || null
      });
    }
  }, [evento]);

  // Cargar marcas disponibles
  useEffect(() => {
    const fetchMarcas = async () => {
      try {
        setLoadingMarcas(true);
        const response = await adminService.getMarcas();
        setMarcas(response.marcas || []);
      } catch (error) {
        console.error('Error cargando marcas:', error);
        toast.error('Error al cargar las marcas');
      } finally {
        setLoadingMarcas(false);
      }
    };

    fetchMarcas();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Limpiar error del campo al escribir
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateForm = () => {
    const validation = adminValidators.validateEvento(formData);
    setErrors(validation.errors);
    return validation.isValid;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Por favor corrige los errores en el formulario');
      return;
    }

    try {
      setSaving(true);
      
      await adminService.updateEvento(evento.id, formData);
      
      toast.success('Evento actualizado exitosamente');
      onEventSaved();
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error(error.message || 'Error al actualizar el evento');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto" onKeyDown={handleKeyDown}>
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50"
        />

        {/* Modal */}
        <div className="flex min-h-screen items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl bg-white rounded-lg shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-indigo-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Editar Evento</h2>
                  <p className="text-indigo-100 text-sm mt-1">
                    {evento.fecha} - {evento.hora} - {evento.sala}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex h-[600px]">
              {/* Form Section */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-6">
                  {/* Información fija */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Información del Evento</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Fecha:</span>
                        <span className="font-medium">{evento.fecha}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Horario:</span>
                        <span className="font-medium">{evento.hora}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Sala:</span>
                        <span className="font-medium">{evento.sala}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600">Registros:</span>
                        <span className="font-medium">{evento.slots_ocupados}/{evento.slots_disponibles}</span>
                      </div>
                    </div>
                  </div>

                  {/* Título de la charla */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FileText className="h-4 w-4 inline mr-1" />
                      Título de la Charla *
                    </label>
                    <input
                      type="text"
                      value={formData.titulo_charla}
                      onChange={(e) => handleInputChange('titulo_charla', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        errors.titulo_charla ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Ingrese el título de la charla"
                    />
                    {errors.titulo_charla && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.titulo_charla}
                      </p>
                    )}
                  </div>

                  {/* Expositor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="h-4 w-4 inline mr-1" />
                      Expositor *
                    </label>
                    <input
                      type="text"
                      value={formData.expositor}
                      onChange={(e) => handleInputChange('expositor', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        errors.expositor ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Ej: Dr. María González"
                    />
                    {errors.expositor && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.expositor}
                      </p>
                    )}
                  </div>

                  {/* País */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Globe className="h-4 w-4 inline mr-1" />
                      País *
                    </label>
                    <input
                      type="text"
                      value={formData.pais}
                      onChange={(e) => handleInputChange('pais', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        errors.pais ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Ej: España"
                    />
                    {errors.pais && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.pais}
                      </p>
                    )}
                  </div>

                  {/* Marca Patrocinadora */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Building2 className="h-4 w-4 inline mr-1" />
                      Marca Patrocinadora
                    </label>
                    <select
                      value={formData.marca_id || ''}
                      onChange={(e) => handleInputChange('marca_id', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={loadingMarcas}
                    >
                      <option value="">-- Sin marca asignada --</option>
                      {marcas.map((marca) => (
                        <option key={marca.id} value={marca.id}>
                          {marca.marca} {marca.expositor ? `(${marca.expositor})` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Selecciona la marca que patrocina esta charla
                    </p>
                  </div>

                  {/* Disponibilidad del evento */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <ToggleRight className="h-4 w-4 inline mr-1" />
                      Disponibilidad del Evento
                    </label>
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="disponible"
                          checked={formData.disponible}
                          onChange={(e) => handleInputChange('disponible', e.target.checked)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="disponible" className="text-sm font-medium text-gray-700">
                          Evento disponible para registro
                        </label>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        formData.disponible 
                          ? 'text-green-700 bg-green-100' 
                          : 'text-red-700 bg-red-100'
                      }`}>
                        {formData.disponible ? 'Activo' : 'Inactivo'}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Cuando está desactivado, los usuarios no podrán seleccionar este evento para registro
                    </p>
                  </div>

                  {/* URL de la imagen */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Image className="h-4 w-4 inline mr-1" />
                      URL de la Imagen
                    </label>
                    <input
                      type="url"
                      value={formData.imagen_url}
                      onChange={(e) => handleInputChange('imagen_url', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        errors.imagen_url ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="https://ejemplo.com/imagen.jpg"
                    />
                    {errors.imagen_url && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.imagen_url}
                      </p>
                    )}
                  </div>

                  {/* Descripción */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        <FileText className="h-4 w-4 inline mr-1" />
                        Descripción (Markdown)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPreview(!showPreview)}
                        className="text-sm text-indigo-600 hover:text-indigo-700"
                      >
                        {showPreview ? 'Editar' : 'Vista Previa'}
                      </button>
                    </div>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => handleInputChange('descripcion', e.target.value)}
                      rows={8}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                        errors.descripcion ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="## Título del evento&#10;&#10;Descripción del evento en **markdown**..."
                    />
                    {errors.descripcion && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {errors.descripcion}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview Section */}
              {showPreview && (
                <div className="flex-1 border-l border-gray-200 bg-gray-50">
                  <div className="p-6 h-full overflow-y-auto">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Vista Previa</h3>
                    
                    {/* Preview de imagen */}
                    {formData.imagen_url && (
                      <div className="mb-4">
                        <img
                          src={formData.imagen_url}
                          alt="Preview"
                          className="w-full h-32 object-cover rounded-lg"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {/* Preview de contenido */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <h4 className="text-xl font-bold text-gray-900 mb-2">
                        {formData.titulo_charla || 'Título de la charla'}
                      </h4>
                      <p className="text-gray-700 font-medium mb-4">
                        {formData.expositor || 'Expositor'} • {formData.pais || 'País'}
                      </p>
                      {formData.marca_id && (
                        <p className="text-sm text-indigo-600 font-medium mb-4">
                          <Building2 className="h-4 w-4 inline mr-1" />
                          {marcas.find(m => m.id === formData.marca_id)?.marca || 'Marca'}
                        </p>
                      )}
                      <div className="prose prose-sm max-w-none">
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
                          {formData.descripcion || 'Sin descripción'}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <p>Campos marcados con * son obligatorios</p>
                  <p className="text-xs mt-1">Ctrl/Cmd + Enter para guardar rápido</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center space-x-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default EditEventModal; 