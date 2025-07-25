import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Globe, 
  FileText, 
  Tag, 
  Building2, 
  Download, 
  MessageSquare, 
  Link as LinkIcon,
  Users,
  Check,
  Copy
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const CharlaDetailModal = ({ evento, isOpen, onClose }) => {
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  if (!evento) return null;

  // Formatear fecha
  const formatFecha = (fecha) => {
    const fechaObj = new Date(fecha);
    return fechaObj.toLocaleDateString('es-ES', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Formatear hora
  const formatHora = (hora) => {
    return hora.replace('-', ' - ');
  };

  // Calcular ocupación
  const ocupacionPorcentaje = evento.slots_disponibles > 0 
    ? Math.round((evento.slots_ocupados / evento.slots_disponibles) * 100) 
    : 0;

  // Función para descargar imagen del post
  const handleDownloadImage = async () => {
    if (!evento.post) {
      toast.error('No hay imagen disponible para descargar');
      return;
    }

    setDownloadingImage(true);
    try {
      // Crear un enlace temporal para descargar
      const link = document.createElement('a');
      link.href = evento.post;
      link.download = `charla-${evento.slug || evento.id}.jpg`;
      link.target = '_blank';
      
      // Simular clic para descargar
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Descarga iniciada');
    } catch (error) {
      console.error('Error descargando imagen:', error);
      toast.error('Error al descargar la imagen');
    } finally {
      setDownloadingImage(false);
    }
  };

  // Función para copiar link directo
  const handleCopyLink = async () => {
    if (!evento.slug) {
      toast.error('No hay link directo disponible');
      return;
    }

    // Construir el link dinámicamente usando el slug
    let baseUrl = window.location.origin;
    // Si la ruta base debe ser diferente, puedes ajustarla aquí:
    // baseUrl = 'https://expokossodo.grupokossodo.com';
    const directLink = `${baseUrl}/charla/${evento.slug}`;
    
    try {
      await navigator.clipboard.writeText(directLink);
      setLinkCopied(true);
      toast.success('Link copiado al portapapeles');
      
      // Resetear estado después de 2 segundos
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Error copiando link:', error);
      toast.error('Error al copiar el link');
    }
  };

  // Función para obtener speech (placeholder)
  const handleGetSpeech = () => {
    toast.info('Función de speech próximamente disponible');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Compacto */}
            <div className="relative bg-gradient-to-r from-[#6cb79a]/10 to-[#1f2f56]/10 p-4 sm:p-6 border-b border-gray-200">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 leading-tight line-clamp-2">
                    {evento.titulo_charla}
                  </h2>
                  
                  {/* Información básica en fila compacta */}
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4 text-[#6cb79a]" />
                      <span>{formatFecha(evento.fecha)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4 text-[#6cb79a]" />
                      <span>{formatHora(evento.hora)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4 text-[#6cb79a]" />
                      <span className="font-medium">{evento.sala}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4 text-[#6cb79a]" />
                      <span>{evento.slots_ocupados}/{evento.slots_disponibles}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      evento.disponible 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {evento.disponible ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
                
                {/* Botón cerrar */}
                <button
                  onClick={onClose}
                  className="p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors shadow-lg flex-shrink-0"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Contenido Principal - Layout Compacto */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
                
                {/* Columna Principal - 3 columnas */}
                <div className="lg:col-span-3 space-y-4">
                  
                  {/* Expositor y Descripción en una fila */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Información del Expositor */}
                    <div className="bg-gradient-to-br from-[#6cb79a]/5 to-[#1f2f56]/5 rounded-lg p-4 border border-[#6cb79a]/10">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                        <User className="w-4 h-4 text-[#6cb79a] mr-2" />
                        Expositor
                      </h3>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#6cb79a] to-[#1f2f56] rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-sm">
                            {evento.expositor.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 text-sm truncate">{evento.expositor}</p>
                          <div className="flex items-center space-x-1 text-xs text-gray-600">
                            <Globe className="w-3 h-3" />
                            <span>{evento.pais}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Marca Patrocinadora */}
                    {evento.marca_nombre && (
                      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 shadow-sm">
                        <h3 className="text-sm font-semibold text-white mb-3 flex items-center">
                          <Building2 className="w-4 h-4 text-[#6cb79a] mr-2" />
                          Marca
                        </h3>
                        <div className="flex items-center justify-center">
                          {evento.marca_logo ? (
                            <img 
                              src={evento.marca_logo} 
                              alt={evento.marca_nombre}
                              className="h-12 w-auto object-contain"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-[#6cb79a] to-[#1f2f56] rounded flex items-center justify-center">
                              <Building2 className="w-6 h-6 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Descripción */}
                  {evento.descripcion && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                        <FileText className="w-4 h-4 text-[#6cb79a] mr-2" />
                        Descripción
                      </h3>
                      <div className="text-sm text-gray-700 leading-relaxed max-h-32 overflow-y-auto">
                        <div 
                          dangerouslySetInnerHTML={{ 
                            __html: evento.descripcion
                              .replace(/\n/g, '<br>')
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\*(.*?)\*/g, '<em>$1</em>')
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Vista previa de imagen del post */}
                  {evento.post && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                        <Download className="w-4 h-4 text-[#6cb79a] mr-2" />
                        Imagen del Post
                      </h3>
                      <div className="relative">
                        <img 
                          src={evento.post} 
                          alt="Imagen del post"
                          className="w-full h-32 object-cover rounded-lg border border-gray-200"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                        <div className="hidden w-full h-32 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                          <p className="text-gray-500 text-sm">Imagen no disponible</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Columna Lateral - 1 columna */}
                <div className="space-y-4">
                  
                  {/* Rubros */}
                  {Array.isArray(evento.rubro) && evento.rubro.length > 0 && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                        <Tag className="w-4 h-4 text-[#6cb79a] mr-2" />
                        Rubros
                      </h3>
                      <div className="flex flex-wrap gap-1">
                        {evento.rubro.map((rubro, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded font-medium"
                          >
                            {rubro}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Información de la Sala */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <MapPin className="w-4 h-4 text-[#6cb79a] mr-2" />
                      Ubicación
                    </h3>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-[#6cb79a]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-[#6cb79a]" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{evento.sala}</p>
                        <p className="text-xs text-gray-600">Sala de conferencias</p>
                      </div>
                    </div>
                  </div>

                  {/* Estado de Ocupación */}
                  <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <Users className="w-4 h-4 text-[#6cb79a] mr-2" />
                      Ocupación
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Participantes</span>
                        <span className="font-medium">{evento.slots_ocupados}/{evento.slots_disponibles}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            ocupacionPorcentaje < 50 ? 'bg-green-500' :
                            ocupacionPorcentaje < 70 ? 'bg-yellow-500' :
                            ocupacionPorcentaje < 90 ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${ocupacionPorcentaje}%` }}
                        />
                      </div>
                      <div className="text-center">
                        <span className="text-xs font-medium text-gray-600">
                          {ocupacionPorcentaje}% ocupado
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Link directo */}
                  {evento.slug && (
                    <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                        <LinkIcon className="w-4 h-4 text-[#6cb79a] mr-2" />
                        Link Directo
                      </h3>
                      <div className="space-y-2">
                        <p className="text-xs text-gray-600 break-all">
                          {`https://expokossodo.grupokossodo.com/charla/${evento.slug}`}
                        </p>
                        <button
                          onClick={handleCopyLink}
                          className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-[#6cb79a] text-white rounded-lg hover:bg-[#5ca085] transition-colors text-sm"
                        >
                          {linkCopied ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span>¡Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span>Copiar Link</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Compacto con Botones */}
            <div className="border-t border-gray-200 bg-gray-50 px-4 sm:px-6 py-4">
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button 
                  onClick={handleDownloadImage}
                  disabled={!evento.post || downloadingImage}
                  className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors shadow-sm text-sm ${
                    evento.post && !downloadingImage
                      ? 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700'
                      : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span className="font-medium">
                    {downloadingImage ? 'Descargando...' : 'Descargar Imagen'}
                  </span>
                </button>
                
                <button 
                  onClick={handleGetSpeech}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm"
                >
                  <MessageSquare className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-700">Obtener Speech</span>
                </button>
                
                <button 
                  onClick={handleCopyLink}
                  disabled={!evento.slug}
                  className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors shadow-sm text-sm ${
                    evento.slug
                      ? 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700'
                      : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-700">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4" />
                      <span className="font-medium">Obtener Link</span>
                    </>
                  )}
                </button>
              </div>
              
              <p className="text-center text-xs text-gray-500 mt-3">
                {evento.post ? '✅ Imagen disponible' : '❌ Sin imagen'} • {evento.slug ? '✅ Link directo disponible' : '❌ Sin link directo'}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CharlaDetailModal; 