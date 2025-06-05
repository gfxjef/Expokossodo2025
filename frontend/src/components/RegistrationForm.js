import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Mail, Building, Briefcase, Phone, MessageSquare, Send, Calendar, Clock, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { validators, utils } from '../services/api';

const RegistrationForm = ({ selectedEvents, onSubmit, onBack, submitting = false }) => {
  const [formData, setFormData] = useState({
    nombres: '',
    correo: '',
    empresa: '',
    cargo: '',
    numero: '',
    expectativas: ''
  });
  
  const [errors, setErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [isValid, setIsValid] = useState(false);

  // Validar formulario cuando cambie formData
  useEffect(() => {
    const newErrors = {};
    let formIsValid = true;
    
    Object.keys(formData).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
        formIsValid = false;
      }
    });
    
    setErrors(newErrors);
    setIsValid(formIsValid && selectedEvents.length > 0);
  }, [formData, selectedEvents]);
  
  // Manejar cambios en los campos del formulario
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Marcar campo como tocado
    setTouchedFields(prev => ({
      ...prev,
      [field]: true
    }));
  };
  
  // Validar un campo específico
  const validateField = (field, value) => {
    switch (field) {
      case 'nombres':
        if (!validators.required(value)) return 'El nombre es obligatorio';
        if (!validators.minLength(value, 2)) return 'El nombre debe tener al menos 2 caracteres';
        if (value.length > 100) return 'El nombre no puede exceder 100 caracteres';
        break;
      case 'correo':
        if (!validators.required(value)) return 'El correo es obligatorio';
        if (!validators.email(value)) return 'Ingresa un correo válido';
        if (value.length > 100) return 'El correo no puede exceder 100 caracteres';
        break;
      case 'empresa':
        if (!validators.required(value)) return 'La empresa es obligatoria';
        if (!validators.minLength(value, 2)) return 'La empresa debe tener al menos 2 caracteres';
        if (value.length > 100) return 'La empresa no puede exceder 100 caracteres';
        break;
      case 'cargo':
        if (!validators.required(value)) return 'El cargo es obligatorio';
        if (!validators.minLength(value, 2)) return 'El cargo debe tener al menos 2 caracteres';
        if (value.length > 100) return 'El cargo no puede exceder 100 caracteres';
        break;
      case 'numero':
        if (!validators.required(value)) return 'El número es obligatorio';
        if (!validators.phone(value)) return 'Ingresa un número válido (ej: +507 6000-0000)';
        break;
      case 'expectativas':
        if (!validators.required(value)) return 'Este campo es obligatorio';
        if (!validators.minLength(value, 10)) return 'Describe al menos 10 caracteres';
        if (value.length > 500) return 'No puede exceder 500 caracteres';
        break;
      default:
        return '';
    }
    return '';
  };
  
  // Manejar validación cuando el usuario sale del campo
  const handleBlur = (field) => {
    setTouchedFields(prev => ({
      ...prev,
      [field]: true
    }));
  };
  
  // Enviar formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Marcar todos los campos como tocados
    const allFields = Object.keys(formData);
    setTouchedFields(allFields.reduce((acc, field) => ({ ...acc, [field]: true }), {}));
    
    if (!isValid) {
      toast.error('Por favor, corrige los errores en el formulario');
      return;
    }
    
    if (selectedEvents.length === 0) {
      toast.error('Debe seleccionar al menos un evento');
      return;
    }
    
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Error al enviar el registro: ' + error.message);
    }
  };

  // Componente para mostrar errores de campo
  const FieldError = ({ field }) => {
    const showError = touchedFields[field] && errors[field];
    
    if (!showError) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center space-x-1 text-red-600 text-sm mt-1"
      >
        <AlertCircle className="h-3 w-3" />
        <span>{errors[field]}</span>
      </motion.div>
    );
  };

  // Componente para mostrar validación exitosa
  const FieldSuccess = ({ field }) => {
    const showSuccess = touchedFields[field] && !errors[field] && formData[field];
    
    if (!showSuccess) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center space-x-1 text-green-600 text-sm mt-1"
      >
        <CheckCircle className="h-3 w-3" />
        <span>Válido</span>
      </motion.div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100"
      >
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Volver al Calendario</span>
          </button>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-gray-800">Formulario de Registro</h2>
            <p className="text-gray-600">Completa tus datos para finalizar</p>
          </div>
        </div>
        
        {/* Resumen de eventos seleccionados */}
        <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
          <h3 className="font-semibold text-gray-800 mb-3">
            Eventos Seleccionados ({selectedEvents.length})
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {selectedEvents.map((event, index) => (
              <div key={event.id} className="bg-white rounded-lg p-3 border border-primary-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800 text-sm mb-1">
                      {event.titulo_charla}
                    </h4>
                    <div className="flex items-center space-x-3 text-xs text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{utils.formatDateShort(event.fecha)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{event.hora}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3" />
                        <span>{event.sala}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {event.expositor} • {event.pais}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
      
      {/* Formulario */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
      >
        <div className="bg-gradient-primary text-white p-6">
          <h3 className="text-xl font-bold mb-2">Información Personal</h3>
          <p className="text-blue-100">Todos los campos son obligatorios</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Nombres */}
            <div>
              <label className="label-field">
                <User className="h-4 w-4 inline mr-2" />
                Nombres Completos
              </label>
              <input
                type="text"
                value={formData.nombres}
                onChange={(e) => handleInputChange('nombres', e.target.value)}
                onBlur={() => handleBlur('nombres')}
                className={`input-field ${errors.nombres ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Ej: Juan Carlos Pérez"
                disabled={submitting}
              />
              <FieldError field="nombres" />
              <FieldSuccess field="nombres" />
            </div>
            
            {/* Correo */}
            <div>
              <label className="label-field">
                <Mail className="h-4 w-4 inline mr-2" />
                Correo Electrónico
              </label>
              <input
                type="email"
                value={formData.correo}
                onChange={(e) => handleInputChange('correo', e.target.value)}
                onBlur={() => handleBlur('correo')}
                className={`input-field ${errors.correo ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Ej: juan.perez@empresa.com"
                disabled={submitting}
              />
              <FieldError field="correo" />
              <FieldSuccess field="correo" />
            </div>
            
            {/* Empresa */}
            <div>
              <label className="label-field">
                <Building className="h-4 w-4 inline mr-2" />
                Empresa
              </label>
              <input
                type="text"
                value={formData.empresa}
                onChange={(e) => handleInputChange('empresa', e.target.value)}
                onBlur={() => handleBlur('empresa')}
                className={`input-field ${errors.empresa ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Ej: Hospital Central"
                disabled={submitting}
              />
              <FieldError field="empresa" />
              <FieldSuccess field="empresa" />
            </div>
            
            {/* Cargo */}
            <div>
              <label className="label-field">
                <Briefcase className="h-4 w-4 inline mr-2" />
                Cargo
              </label>
              <input
                type="text"
                value={formData.cargo}
                onChange={(e) => handleInputChange('cargo', e.target.value)}
                onBlur={() => handleBlur('cargo')}
                className={`input-field ${errors.cargo ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Ej: Médico Especialista"
                disabled={submitting}
              />
              <FieldError field="cargo" />
              <FieldSuccess field="cargo" />
            </div>
            
            {/* Número */}
            <div className="md:col-span-2">
              <label className="label-field">
                <Phone className="h-4 w-4 inline mr-2" />
                Número de Teléfono
              </label>
              <input
                type="tel"
                value={formData.numero}
                onChange={(e) => handleInputChange('numero', e.target.value)}
                onBlur={() => handleBlur('numero')}
                className={`input-field ${errors.numero ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Ej: +593 99 123 4567"
                disabled={submitting}
              />
              <FieldError field="numero" />
              <FieldSuccess field="numero" />
            </div>
            
            {/* Expectativas */}
            <div className="md:col-span-2">
              <label className="label-field">
                <MessageSquare className="h-4 w-4 inline mr-2" />
                ¿Qué esperas encontrar en ExpoKossodo 2024?
              </label>
              <textarea
                value={formData.expectativas}
                onChange={(e) => handleInputChange('expectativas', e.target.value)}
                onBlur={() => handleBlur('expectativas')}
                rows={4}
                className={`input-field resize-none ${errors.expectativas ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Describe qué conocimientos, contactos o experiencias esperas obtener del evento..."
                disabled={submitting}
              />
              <FieldError field="expectativas" />
              <FieldSuccess field="expectativas" />
              <p className="text-sm text-gray-500 mt-1">
                Mínimo 10 caracteres • {formData.expectativas.length}/500
              </p>
            </div>
          </div>
          
          {/* Botones */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onBack}
              className="btn-secondary"
              disabled={submitting}
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Volver
            </button>
            
            <motion.button
              type="submit"
              disabled={!isValid || submitting}
              className="btn-primary bg-green-600 hover:bg-green-700 flex items-center space-x-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  <span>Completar Registro</span>
                </>
              )}
            </motion.button>
          </div>
          
          {/* Información adicional */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">ℹ️ Información Importante</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Recibirás un email de confirmación inmediatamente</li>
              <li>• Tu registro incluye acceso a {selectedEvents.length} evento(s) seleccionado(s)</li>
              <li>• El evento se realizará del 22 al 25 de Julio de 2024</li>
              <li>• En caso de dudas, contacta a: jcamacho@kossodo.com</li>
            </ul>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default RegistrationForm; 