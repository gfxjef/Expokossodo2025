import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Mail, 
  QrCode,
  AlertCircle
} from 'lucide-react';
import { utils } from '../services/api';

/**
 * Modal para mostrar resultados detallados del registro
 * Maneja cinco tipos de respuesta:
 * - 'actualizacion': Registro actualizado exitosamente (correo existente)
 * - 'actualizacion_partial': Actualización parcialmente exitosa (algunas charlas excluidas)
 * - 'nuevo_registro': Nuevo registro completamente exitoso
 * - 'partial': Registro parcialmente exitoso (algunos eventos excluidos)
 * - 'error': Error total (todos los eventos excluidos)
 */
const RegistrationResultModal = ({ isOpen, result, selectedEvents, onClose }) => {
  if (!isOpen || !result) return null;

  // Encontrar información completa de eventos basado en IDs
  const getEventInfo = (eventId) => {
    return selectedEvents.find(event => event.id === eventId) || { 
      id: eventId, 
      titulo_charla: 'Evento no encontrado',
      expositor: 'N/A',
      hora: 'N/A',
      sala: 'N/A',
      fecha: 'N/A'
    };
  };

  const getEventInfoByTitle = (titulo) => {
    return selectedEvents.find(event => 
      event.titulo_charla?.toLowerCase().includes(titulo.toLowerCase())
    ) || null;
  };

  // Configuración visual según el tipo de resultado
  const getResultConfig = () => {
    switch (result.type) {
      case 'actualizacion':
        return {
          icon: CheckCircle,
          iconColor: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          title: 'Registro Actualizado',
          titleColor: 'text-blue-800'
        };
      case 'actualizacion_partial':
        return {
          icon: AlertTriangle,
          iconColor: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          title: 'Registro Actualizado Parcialmente',
          titleColor: 'text-blue-800'
        };
      case 'nuevo_registro':
        return {
          icon: CheckCircle,
          iconColor: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          title: 'Nuevo Registro Exitoso',
          titleColor: 'text-green-800'
        };
      case 'partial':
        return {
          icon: AlertTriangle,
          iconColor: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          title: 'Registro Parcialmente Exitoso',
          titleColor: 'text-amber-800'
        };
      case 'error':
        return {
          icon: AlertCircle,
          iconColor: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          title: 'Error en el Registro',
          titleColor: 'text-red-800'
        };
      default:
        return {
          icon: CheckCircle,
          iconColor: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          title: 'Registro Exitoso',
          titleColor: 'text-green-800'
        };
    }
  };

  const config = getResultConfig();
  const IconComponent = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`${config.bgColor} ${config.borderColor} border-b p-6`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <IconComponent className={`h-8 w-8 ${config.iconColor}`} />
                <div>
                  <h2 className={`text-2xl font-bold ${config.titleColor}`}>
                    {config.title}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {result.message || 'Información del resultado de tu registro'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Contenido */}
          <div className="p-6 space-y-6">
            {/* Información específica para actualizaciones */}
            {(result.type === 'actualizacion' || result.type === 'actualizacion_partial') && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">Resumen de Actualización</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-700">{result.charlasPrevias?.length || 0}</div>
                    <div className="text-blue-600">Charlas Anteriores</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-700">{result.charlasAgregadas?.length || 0}</div>
                    <div className="text-green-600">Charlas Agregadas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-700">{result.totalCharlas || 0}</div>
                    <div className="text-blue-600">Total Actual</div>
                  </div>
                </div>
              </div>
            )}

            {/* Charlas agregadas en actualización */}
            {(result.type === 'actualizacion' || result.type === 'actualizacion_partial') && result.charlasAgregadas && result.charlasAgregadas.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  Nuevas Charlas Agregadas ({result.charlasAgregadas.length})
                </h3>
                <div className="space-y-3">
                  {result.charlasAgregadas.map((eventId) => {
                    const event = getEventInfo(eventId);
                    return (
                      <div key={eventId} className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-medium text-green-900 mb-2">
                          {event.titulo_charla}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-green-700">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{utils.formatDateShort(event.fecha)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{event.hora}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-4 w-4" />
                            <span>{event.sala}</span>
                          </div>
                        </div>
                        <p className="text-sm text-green-600 mt-1">
                          {event.expositor}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Charlas previas en actualización */}
            {(result.type === 'actualizacion' || result.type === 'actualizacion_partial') && result.charlasPrevias && result.charlasPrevias.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
                  Charlas Que Ya Tenías ({result.charlasPrevias.length})
                </h3>
                <div className="space-y-3">
                  {result.charlasPrevias.map((eventId) => {
                    const event = getEventInfo(eventId);
                    return (
                      <div key={eventId} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">
                          {event.titulo_charla}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-blue-700">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{utils.formatDateShort(event.fecha)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{event.hora}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-4 w-4" />
                            <span>{event.sala}</span>
                          </div>
                        </div>
                        <p className="text-sm text-blue-600 mt-1">
                          {event.expositor}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Eventos registrados exitosamente (para nuevos registros y legacy) */}
            {(result.type === 'partial' || result.type === 'nuevo_registro') && result.eventosRegistrados && result.eventosRegistrados.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  Eventos Registrados Exitosamente ({result.eventosRegistrados.length})
                </h3>
                <div className="space-y-3">
                  {result.eventosRegistrados.map((eventId) => {
                    const event = getEventInfo(eventId);
                    return (
                      <div key={eventId} className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-medium text-green-900 mb-2">
                          {event.titulo_charla}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-green-700">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{utils.formatDateShort(event.fecha)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{event.hora}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-4 w-4" />
                            <span>{event.sala}</span>
                          </div>
                        </div>
                        <p className="text-sm text-green-600 mt-1">
                          {event.expositor}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Charlas excluidas en actualización */}
            {(result.type === 'actualizacion_partial') && result.charlasExcluidas && result.charlasExcluidas.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-amber-800 mb-4 flex items-center">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mr-2" />
                  Charlas No Agregadas ({result.charlasExcluidas.length})
                </h3>
                <div className="space-y-3">
                  {result.charlasExcluidas.map((eventExcluido, index) => {
                    // Intentar encontrar el evento completo por título
                    const fullEvent = getEventInfoByTitle(eventExcluido.titulo) || {};
                    
                    return (
                      <div key={index} className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <h4 className="font-medium text-amber-900 mb-2">
                          {eventExcluido.titulo || 'Evento no especificado'}
                        </h4>
                        <div className="bg-amber-100 border border-amber-300 rounded p-3 mb-3">
                          <p className="text-sm text-amber-800 font-medium">
                            <strong>Razón:</strong> {eventExcluido.razon || 'Conflicto de horario con charlas existentes'}
                          </p>
                        </div>
                        {fullEvent.expositor && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-amber-700">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{utils.formatDateShort(fullEvent.fecha)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{fullEvent.hora}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-4 w-4" />
                              <span>{fullEvent.sala}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Eventos excluidos (para nuevos registros y legacy) */}
            {result.eventosExcluidos && result.eventosExcluidos.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-amber-800 mb-4 flex items-center">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mr-2" />
                  Eventos No Registrados ({result.eventosExcluidos.length})
                </h3>
                <div className="space-y-3">
                  {result.eventosExcluidos.map((eventExcluido, index) => {
                    // Intentar encontrar el evento completo por título
                    const fullEvent = getEventInfoByTitle(eventExcluido.titulo) || {};
                    
                    return (
                      <div key={index} className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <h4 className="font-medium text-amber-900 mb-2">
                          {eventExcluido.titulo || 'Evento no especificado'}
                        </h4>
                        <div className="bg-amber-100 border border-amber-300 rounded p-3 mb-3">
                          <p className="text-sm text-amber-800 font-medium">
                            <strong>Razón:</strong> {eventExcluido.razon || 'No especificada'}
                          </p>
                        </div>
                        {fullEvent.expositor && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-amber-700">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{utils.formatDateShort(fullEvent.fecha)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>{fullEvent.hora}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-4 w-4" />
                              <span>{fullEvent.sala}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Información de confirmación (solo para registros exitosos/parciales) */}
            {(result.type === 'partial' || result.type === 'success' || result.type === 'actualizacion' || result.type === 'actualizacion_partial' || result.type === 'nuevo_registro') && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">
                  Confirmación de Registro
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Mail className={`h-4 w-4 ${result.emailSent ? 'text-green-600' : 'text-amber-600'}`} />
                    <span className="text-blue-700">
                      Email: {result.emailSent ? 'Enviado correctamente' : 'Pendiente de envío'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <QrCode className={`h-4 w-4 ${result.qrGenerated ? 'text-green-600' : 'text-amber-600'}`} />
                    <span className="text-blue-700">
                      QR Code: {result.qrGenerated ? 'Generado correctamente' : 'No generado'}
                    </span>
                  </div>
                </div>
                {result.registroId && (
                  <p className="text-xs text-blue-600 mt-2">
                    ID de Registro: #{result.registroId}
                  </p>
                )}
              </div>
            )}

            {/* Próximos pasos */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Próximos Pasos
              </h3>
              {result.type === 'actualizacion' ? (
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <span>Tu registro ha sido actualizado con las nuevas charlas seleccionadas</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-600 font-bold">📧</span>
                    <span>Recibirás un nuevo email con tu QR actualizado</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-600 font-bold">i</span>
                    <span>Para dudas, contacta: <span className="font-mono text-blue-700">jcamacho@kossodo.com</span></span>
                  </li>
                </ul>
              ) : result.type === 'actualizacion_partial' ? (
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <span>Se agregaron {result.charlasAgregadas?.length || 0} nuevas charlas a tu registro</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-amber-600 font-bold">!</span>
                    <span>{result.charlasExcluidas?.length || 0} charlas no se pudieron agregar por conflictos de horario</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-600 font-bold">📧</span>
                    <span>Recibirás un email actualizado con tu nuevo QR</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-600 font-bold">i</span>
                    <span>Para dudas, contacta: <span className="font-mono text-blue-700">jcamacho@kossodo.com</span></span>
                  </li>
                </ul>
              ) : result.type === 'nuevo_registro' ? (
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start space-x-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Registro completado exitosamente con {result.eventosRegistrados?.length || 0} charlas</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-600 font-bold">📧</span>
                    <span>Revisa tu email para la confirmación y tu código QR</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-600 font-bold">i</span>
                    <span>Para dudas, contacta: <span className="font-mono text-blue-700">jcamacho@kossodo.com</span></span>
                  </li>
                </ul>
              ) : result.type === 'partial' ? (
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start space-x-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Revisa tu email para la confirmación de los eventos registrados</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-amber-600 font-bold">!</span>
                    <span>Si deseas registrarte en los eventos excluidos, puedes intentar con otros horarios disponibles</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-600 font-bold">i</span>
                    <span>Para dudas, contacta: <span className="font-mono text-blue-700">jcamacho@kossodo.com</span></span>
                  </li>
                </ul>
              ) : result.type === 'error' ? (
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start space-x-2">
                    <span className="text-red-600 font-bold">✗</span>
                    <span>No se pudo completar el registro debido a conflictos de horario</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-600 font-bold">→</span>
                    <span>Intenta seleccionar eventos en otros horarios</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-600 font-bold">?</span>
                    <span>Para asistencia, contacta: <span className="font-mono text-blue-700">jcamacho@kossodo.com</span></span>
                  </li>
                </ul>
              ) : (
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start space-x-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Registro completado exitosamente</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-600 font-bold">📧</span>
                    <span>Revisa tu email para la confirmación</span>
                  </li>
                </ul>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
            <div className="text-xs text-gray-500">
              ExpoKossodo 2025 • Sistema de Registro
            </div>
            <div className="flex space-x-3">
              {result.type === 'error' && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Seleccionar Otros Eventos
                </button>
              )}
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  result.type === 'error' 
                    ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    : result.type === 'actualizacion' || result.type === 'actualizacion_partial'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {result.type === 'error' ? 'Cerrar' : 'Continuar'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default RegistrationResultModal;