import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { eventService } from '../services/api';

const InfoEvent1 = ({ onScrollToNext, eventsData, loading }) => {
  // Estado para la tarjeta activa (mantiene el estado hasta cambiar a otra)
  const [activeCard, setActiveCard] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const debounceTimerRef = useRef(null);
  
  // Estados para el modal de laboratorio
  const [showLabModal, setShowLabModal] = useState(false);
  const [currentLabImage, setCurrentLabImage] = useState(0);
  const [hoveredLab, setHoveredLab] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  
  // Debug: Log de props recibidas
  console.log('🎭 InfoEvent1 recibió props:', {
    eventsData,
    loading,
    eventsDataKeys: eventsData ? Object.keys(eventsData) : 'NO_DATA',
    eventsDataType: typeof eventsData
  });

  // Datos de las tarjetas para ExpoKossodo 2024
  const eventCards = [
    {
      id: 1,
      image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
      title: "Conferencias y Talleres",
      description: "Participa en conferencias especializadas y talleres prácticos con líderes en la industria sobre temas clave en tecnología de laboratorio.",
      type: "conferencias"
    },
    {
      id: 2,
      image: "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
      title: "Marcas Participantes",
      description: "Conoce las principales marcas del sector con sus últimas innovaciones y soluciones tecnológicas para laboratorios.",
      type: "marcas"
    },
    {
      id: 3,
      image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
      title: "Laboratorio Modelo",
      description: "Visita nuestro laboratorio de demostración y observa en acción los equipos más avanzados del mercado.",
      type: "laboratorio"
    },
    {
      id: 4,
      image: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
      title: "Expositores Internacionales",
      description: "Esta es tu oportunidad para descubrir productos innovadores y establecer conexiones globales en un solo lugar.",
      type: "expositores"
    }
  ];

  // Imágenes del laboratorio modelo (8 imágenes)
  const labImages = [
    {
      id: 1,
      url: "https://images.unsplash.com/photo-1582719471384-894fbb16e074?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
      title: "Microscopio de Alta Resolución",
      description: "Tecnología de última generación para análisis microscópicos"
    },
    {
      id: 2,
      url: "https://images.unsplash.com/photo-1579154204601-01588f351e67?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
      title: "Espectrofotómetro UV-Vis",
      description: "Análisis espectroscópico de alta precisión"
    },
    {
      id: 3,
      url: "https://images.unsplash.com/photo-1583911860205-72f8ac8ddcbe?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
      title: "Centrífuga de Alta Velocidad",
      description: "Separación de muestras con máxima eficiencia"
    },
    {
      id: 4,
      url: "https://images.unsplash.com/photo-1579154204845-5d0b4c3a0047?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
      title: "Cromatógrafo HPLC",
      description: "Sistema de cromatografía líquida de alto rendimiento"
    },
    {
      id: 5,
      url: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
      title: "Incubadora CO2",
      description: "Control preciso de temperatura y atmósfera"
    },
    {
      id: 6,
      url: "https://images.unsplash.com/photo-1581093450021-4a7360e9a6b5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
      title: "Cabina de Flujo Laminar",
      description: "Ambiente estéril para trabajo con cultivos"
    },
    {
      id: 7,
      url: "https://images.unsplash.com/photo-1579165466949-3180a3d056d5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
      title: "Termociclador PCR",
      description: "Amplificación de ADN con precisión"
    },
    {
      id: 8,
      url: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
      title: "Analizador Automático",
      description: "Procesamiento de muestras automatizado"
    }
  ];

  // Los datos ya vienen cargados desde el componente padre
  // No necesitamos cargar datos aquí

  // Verificar que el DOM esté listo para el portal
  useEffect(() => {
    setPortalReady(true);
    return () => setPortalReady(false);
  }, []);

  // Obtener todos los eventos de todas las fechas
  const getAllEvents = () => {
    if (!eventsData || Object.keys(eventsData).length === 0) {
      console.log('⚠️ getAllEvents: eventsData vacío o no definido');
      return [];
    }
    
    const allEvents = [];
    Object.values(eventsData).forEach(dateEvents => {
      if (Array.isArray(dateEvents)) {
        allEvents.push(...dateEvents);
      } else if (typeof dateEvents === 'object' && dateEvents !== null) {
        // Los datos pueden estar organizados por horario dentro de cada fecha
        Object.values(dateEvents).forEach(timeSlotEvents => {
          if (Array.isArray(timeSlotEvents)) {
            allEvents.push(...timeSlotEvents);
          }
        });
      }
    });
    console.log('📊 getAllEvents resultado:', allEvents.length, 'eventos');
    return allEvents;
  };

  // Filtrar eventos por tipo
  const getEventsByType = (type) => {
    const allEvents = getAllEvents();
    
    // Debug: Ver qué datos tenemos
    console.log('🔍 Debug getAllEvents:', allEvents.length, 'eventos');
    if (allEvents.length > 0) {
      console.log('📋 Primer evento ejemplo:', allEvents[0]);
      console.log('📋 Títulos de ejemplo:', allEvents.slice(0, 3).map(e => e.titulo_charla));
    }
    
    switch (type) {
      case 'conferencias':
        // Mostrar TODOS los eventos como conferencias (todos son presentaciones/charlas)
        console.log('🎯 Filtrando conferencias, total eventos:', allEvents.length);
        const filteredEvents = allEvents.filter(event => event.titulo_charla && event.titulo_charla.trim() !== '');
        console.log('✅ Eventos filtrados:', filteredEvents.length);
        return filteredEvents;
      case 'talleres':
        // Para talleres, buscar por palabras relacionadas
        return allEvents.filter(event => 
          event.titulo_charla && 
          (event.titulo_charla.toLowerCase().includes('taller') ||
           event.titulo_charla.toLowerCase().includes('workshop') ||
           event.titulo_charla.toLowerCase().includes('práctico') ||
           event.categoria === 'taller')
        );
      case 'laboratorio':
        // Para laboratorio, buscar por palabras relacionadas  
        return allEvents.filter(event => 
          event.titulo_charla && 
          (event.titulo_charla.toLowerCase().includes('laboratorio') ||
           event.titulo_charla.toLowerCase().includes('demostración') ||
           event.sala && event.sala.toLowerCase().includes('lab') ||
           event.categoria === 'laboratorio')
        );
      default:
        return allEvents;
    }
  };

  // Componente para un video individual con chroma key - OPTIMIZADO
  const ChromaKeyVideo = ({ expositorId, empresa, isHovered, onHover, onLeave }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);

    // Función optimizada para procesar chroma key
    const processChromaKey = React.useCallback((forceGrayscale = false) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Dibujar el frame del video
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Solo procesar chroma key si está en hover para mejorar rendimiento
      if (isHovered && !forceGrayscale) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Color chroma key mejorado: #09b230 (9, 178, 48)
        const chromaR = 9;
        const chromaG = 178;
        const chromaB = 48;
        const threshold = 120;
        const edgeThreshold = 90;

        // Procesar cada pixel
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const euclideanDistance = Math.sqrt(
            Math.pow(r - chromaR, 2) + 
            Math.pow(g - chromaG, 2) + 
            Math.pow(b - chromaB, 2)
          );

          const greenDominance = g - Math.max(r, b);
          const isGreenish = g > 120 && greenDominance > 30;
          
          const isChromaColor = euclideanDistance < threshold || 
                               (isGreenish && euclideanDistance < threshold + 40);

          if (isChromaColor) {
            data[i + 3] = 0;
          } else if (euclideanDistance < threshold + 30) {
            const alpha = Math.max(0, (euclideanDistance - edgeThreshold) / 30) * 255;
            data[i + 3] = Math.min(255, alpha);
          }
        }

        ctx.putImageData(imageData, 0, 0);
      } else {
        // Aplicar filtro de escala de grises si no está en hover
        ctx.filter = 'grayscale(100%) brightness(0.7)';
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      // Continuar la animación solo si está en hover y reproduciendo
      if (isHovered && video && !video.paused && !video.ended) {
        animationRef.current = requestAnimationFrame(() => processChromaKey());
      }
    }, [isHovered]);

    // Función para pausar y resetear al primer frame
    const pauseAndReset = React.useCallback(() => {
      const video = videoRef.current;
      if (video && isVideoLoaded) {
        video.pause();
        video.currentTime = 0;
        setIsPlaying(false);
        
        // Procesar el primer frame en escala de grises
        setTimeout(() => {
          processChromaKey(true);
        }, 50);
      }
    }, [processChromaKey, isVideoLoaded]);

    // Lazy loading del video
    useEffect(() => {
      if (!isVideoLoaded && isHovered) {
        const video = videoRef.current;
        if (video) {
          video.load();
          setIsVideoLoaded(true);
        }
      }
    }, [isHovered, isVideoLoaded]);

    // Manejar hover con debounce
    useEffect(() => {
      const video = videoRef.current;
      if (!video || !isVideoLoaded) return;

      let timeoutId;

      if (isHovered) {
        // Pequeño delay antes de iniciar para evitar hover accidentales
        timeoutId = setTimeout(() => {
          video.currentTime = 0;
          video.play().then(() => {
            setIsPlaying(true);
            processChromaKey();
          }).catch(console.error);
        }, 100);
      } else {
        pauseAndReset();
        
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      }

      return () => {
        clearTimeout(timeoutId);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }, [isHovered, isVideoLoaded, processChromaKey, pauseAndReset]);

    // Limpiar recursos al desmontar
    useEffect(() => {
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        const video = videoRef.current;
        if (video) {
          video.pause();
          video.src = '';
        }
      };
    }, []);

    return (
      <div
        className="relative group cursor-pointer"
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
      >
        <div className="w-60 h-60 rounded-lg overflow-hidden bg-gray-100/20 backdrop-blur-sm border border-gray-300/30 relative">
          <video
            ref={videoRef}
            className="hidden"
            muted
            playsInline
            preload="none"
            crossOrigin="anonymous"
          >
            <source src="/video/locuto_1.mp4" type="video/mp4" />
          </video>
          
          {/* Placeholder mientras carga */}
          {!isVideoLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200/50">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-gray-300 mb-2 mx-auto"></div>
                <div className="text-sm text-gray-600">{empresa}</div>
              </div>
            </div>
          )}
          
          <canvas
            ref={canvasRef}
            className={`w-full h-full object-cover transition-all duration-300 ${
              isVideoLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              transform: isHovered ? 'scale(1.05)' : 'scale(1)'
            }}
          />
        </div>
        
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <span className={`text-sm font-medium px-3 py-2 rounded-lg backdrop-blur-sm transition-all duration-300 ${
            isHovered 
              ? 'text-gray-800 bg-white/95 shadow-lg scale-105' 
              : 'text-gray-600 bg-gray-100/80'
          }`}>
            {empresa}
          </span>
        </div>
      </div>
    );
  };

  // Componente para los videos de expositores con chroma key
  const ExpositorVideos = React.memo(() => {
    const [hoveredVideo, setHoveredVideo] = useState(null);
    
    // Array de 5 expositores
    const expositores = [
      { id: 1, empresa: "TechLab Corp" },
      { id: 2, empresa: "BioInnovation" },
      { id: 3, empresa: "LabSolutions" },
      { id: 4, empresa: "MedEquip Pro" },
      { id: 5, empresa: "ScienceHub" }
    ];

    return (
      <div className="flex justify-center items-center space-x-6 pb-4">
        {expositores.map((expositor) => (
          <ChromaKeyVideo
            key={expositor.id}
            expositorId={expositor.id}
            empresa={expositor.empresa}
            isHovered={hoveredVideo === expositor.id}
            onHover={() => setHoveredVideo(expositor.id)}
            onLeave={() => setHoveredVideo(null)}
          />
        ))}
      </div>
    );
  });

  // Componente para el slider automático de conferencias
  const ConferenceSlider = () => {
    const conferences = getEventsByType('conferencias');
    const [currentIndex, setCurrentIndex] = useState(0);
    
    console.log('🎪 ConferenceSlider - conferences:', conferences.length, 'loading:', loading);

    useEffect(() => {
      if (conferences.length === 0) return;
      
      const interval = setInterval(() => {
        setCurrentIndex(prev => (prev + 3) % conferences.length);
      }, 5000); // Cambiar cada 5 segundos

      return () => clearInterval(interval);
    }, [conferences.length]);

    if (conferences.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-blue-600 mb-2">
              {loading ? 'Cargando conferencias...' : 'No se encontraron conferencias'}
            </p>
            {!loading && (
              <p className="text-blue-500 text-xs">
                Total eventos: {getAllEvents().length}
              </p>
            )}
          </div>
        </div>
      );
    }

    const getVisibleConferences = () => {
      const visible = [];
      for (let i = 0; i < 9; i++) {
        const index = (currentIndex + i) % conferences.length;
        visible.push(conferences[index]);
      }
      return visible;
    };

    return (
      <div className="flex-1 grid grid-cols-3 grid-rows-3 gap-3">
        <AnimatePresence mode="wait">
          {getVisibleConferences().slice(0, 9).map((conference, index) => (
            <motion.div
              key={`${conference.id}-${currentIndex}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8, delay: index * 0.15 }}
              className="h-24 p-3 rounded-lg border-2 cursor-pointer transition-all duration-300 relative overflow-hidden border-gray-200 bg-white hover:border-[#6cb79a] hover:shadow-lg hover:scale-[1.02]"
              onClick={onScrollToNext}
            >
              <div className="flex flex-col h-full">
                <h4 className="font-semibold text-sm text-gray-800 mb-1.5 line-clamp-2 leading-tight">
                  {conference.titulo_charla}
                </h4>
                <p className="text-xs text-gray-600 mb-2 font-medium">
                  {conference.expositor}
                </p>
                <div className="mt-auto text-xs text-gray-500">
                  <span className="font-medium">{conference.hora}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  };

  // Modal de galería del laboratorio
  const LabGalleryModal = () => {
    const goToNext = () => {
      setCurrentLabImage((prev) => (prev + 1) % labImages.length);
    };

    const goToPrev = () => {
      setCurrentLabImage((prev) => (prev - 1 + labImages.length) % labImages.length);
    };

    return (
      <AnimatePresence>
        {showLabModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowLabModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative max-w-5xl w-full bg-white/15 backdrop-blur-md rounded-[24px] border-2 border-white shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Botón cerrar */}
              <button
                onClick={() => setShowLabModal(false)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>

              {/* Contenido del modal */}
              <div className="flex flex-col md:flex-row h-[80vh]">
                {/* Imagen principal */}
                <div className="flex-1 relative">
                  <img
                    src={labImages[currentLabImage].url}
                    alt={labImages[currentLabImage].title}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Controles de navegación */}
                  <button
                    onClick={goToPrev}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6 text-white" />
                  </button>
                  <button
                    onClick={goToNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    <ChevronRight className="w-6 h-6 text-white" />
                  </button>
                </div>

                {/* Información de la imagen */}
                <div className="w-full md:w-1/3 bg-white/10 backdrop-blur-sm p-6">
                  <h3 className="text-2xl font-bold text-white mb-4">
                    {labImages[currentLabImage].title}
                  </h3>
                  <p className="text-white/90 mb-6">
                    {labImages[currentLabImage].description}
                  </p>
                  
                  {/* Thumbnails */}
                  <div className="grid grid-cols-4 gap-2">
                    {labImages.map((img, index) => (
                      <button
                        key={img.id}
                        onClick={() => setCurrentLabImage(index)}
                        className={`relative overflow-hidden rounded-lg transition-all ${
                          index === currentLabImage
                            ? 'ring-2 ring-[#6cb79a] scale-95'
                            : 'hover:scale-95'
                        }`}
                      >
                        <img
                          src={img.url}
                          alt={img.title}
                          className="w-full h-16 object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  // Función optimizada para obtener el contenido de la sección inferior según la tarjeta activa
  const getInteractiveContent = React.useCallback(() => {
    if (!activeCard) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <p className="text-lg text-gray-600">
            Pasa el mouse sobre una tarjeta para ver más información
          </p>
        </motion.div>
      );
    }

    const card = eventCards.find(c => c.id === activeCard);
    
    switch (card?.type) {
      case 'conferencias':
        const totalConferences = getEventsByType('conferencias').length;
        return (
          <motion.div
            key="conferencias"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="bg-transparent rounded-xl p-8"
          >
            <div className="flex items-center space-x-8">
              {/* Contador grande a la izquierda */}
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.6, type: "spring" }}
                  className="font-bold text-[#1f2f56] mb-2"
                  style={{ fontSize: '4.75rem' }}
                >
                  +{totalConferences}
                </motion.div>
                <div className="text-xl font-semibold text-blue-700">CONFERENCIAS Y TALLERES</div>
              </div>
              
              {/* Slider de conferencias a la derecha */}
              <ConferenceSlider />
            </div>
          </motion.div>
        );
        
      case 'marcas':
        // Partners con logos coloridos
        const partners = [
          { name: 'CAMAG', logo: 'https://i.ibb.co/YFYknC9N/camag-color.webp' },
          { name: 'CHEM', logo: 'https://i.ibb.co/LXZ02Zb3/chem-color.webp' },
          { name: 'AMS', logo: 'https://i.ibb.co/Z16k8Xcy/ams-color.webp' },
          { name: 'EVIDENT', logo: 'https://i.ibb.co/RpHJ7W0C/evident-color.webp' },
          { name: 'ESCO', logo: 'https://i.ibb.co/wFCJ2RK3/esco-color.webp' },
          { name: 'VACUUBRAND', logo: 'https://i.ibb.co/8nCL3Ksb/vacubrand-color.webp' },
          { name: 'BINDER', logo: 'https://i.ibb.co/JR51wysn/binder-color.webp' },
          { name: 'LAUDA', logo: 'https://i.ibb.co/GfrzYHYS/lauda-color.webp' },
          { name: 'SARTORIUS', logo: 'https://i.ibb.co/pYPPZ6m/sartorius-color.webp' },
          { name: 'VELP', logo: 'https://i.ibb.co/tVn3sdB/velp-color.webp' }
        ];

        return (
          <motion.div
            key="marcas"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-gradient-to-r from-[#6cb79a] to-[#5ca085] rounded-xl p-6 text-white"
          >
            <div className="text-center mb-6">
              <div className="text-xl font-semibold mb-4">MARCAS PARTICIPANTES</div>
              <p className="text-lg opacity-90 mb-6">
                Las mejores marcas del sector con sus últimas innovaciones
              </p>
            </div>
            <div className="grid grid-cols-5 gap-4">
              {partners.map((partner, index) => (
                <motion.div
                  key={partner.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-white/20 backdrop-blur-sm rounded-lg p-3 hover:bg-white/30 transition-all hover:scale-105"
                >
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    className="w-full h-12 object-contain"
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        );
        
      case 'laboratorio':
        return (
          <motion.div
            key="laboratorio"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-transparent rounded-xl p-6"
            onMouseEnter={() => setHoveredLab(true)}
            onMouseLeave={() => setHoveredLab(false)}
          >
            {/* Lista de imágenes horizontal estilo minimalista */}
            <div className="flex justify-center items-center space-x-3 overflow-x-auto">
              {labImages.map((img, index) => (
                <motion.div
                  key={img.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                  className="cursor-pointer flex-shrink-0"
                  onClick={() => {
                    console.log('🔬 Click en imagen de laboratorio:', index);
                    setCurrentLabImage(index);
                    setShowLabModal(true);
                    console.log('🔬 Modal should be visible now:', true);
                  }}
                >
                  <div className="w-48 h-48 rounded-lg overflow-hidden bg-gray-100/20 backdrop-blur-sm border-2 border-gray-200/50 hover:border-[#6cb79a] transition-all duration-300 shadow-sm hover:shadow-lg">
                    <img
                      src={img.url}
                      alt={img.title}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
            
            {/* Texto inferior */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: hoveredLab ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              className="text-center text-gray-700 mt-6 font-medium text-lg"
            >
              Tendremos en exposición distintos equipos que podrán ayudarlo en su laboratorio
            </motion.p>
          </motion.div>
        );
        
      case 'expositores':
        return (
          <motion.div
            key="expositores"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-transparent rounded-xl p-6"
          >
            {/* Grid de videos con chroma key */}
            <ExpositorVideos />
          </motion.div>
        );
        
      default:
        return null;
    }
  }, [activeCard, eventsData, loading, hoveredLab, setHoveredLab, showLabModal, setShowLabModal, currentLabImage, setCurrentLabImage]);

  // Si está cargando, mostrar estado de carga
  if (loading) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#01295c] mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información del evento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Modal de galería del laboratorio usando Portal */}
      {showLabModal && portalReady && ReactDOM.createPortal(
        <AnimatePresence>
          {showLabModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              style={{ zIndex: 9999 }}
              onClick={() => setShowLabModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="relative max-w-5xl w-full bg-white/15 backdrop-blur-md rounded-[24px] border-2 border-white shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Botón cerrar */}
                <button
                  onClick={() => setShowLabModal(false)}
                  className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>

                {/* Contenido del modal - Diseño vertical */}
                <div className="flex flex-col h-[85vh] p-6">
                  {/* Sección de imagen principal con navegación */}
                  <div className="flex-1 flex items-center justify-center relative mb-6">
                    {/* Botón anterior */}
                    <button
                      onClick={() => setCurrentLabImage((prev) => (prev - 1 + labImages.length) % labImages.length)}
                      className="absolute left-0 p-3 rounded-full bg-white/20 hover:bg-white/30 transition-all hover:scale-110 z-10"
                    >
                      <ChevronLeft className="w-8 h-8 text-white" />
                    </button>

                    {/* Contenedor de imágenes con transición */}
                    <div className="relative w-full max-w-4xl h-full overflow-hidden rounded-xl">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={currentLabImage}
                          initial={{ x: 300, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          exit={{ x: -300, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          className="absolute inset-0"
                        >
                          <img
                            src={labImages[currentLabImage].url}
                            alt={labImages[currentLabImage].title}
                            className="w-full h-full object-contain"
                          />
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* Botón siguiente */}
                    <button
                      onClick={() => setCurrentLabImage((prev) => (prev + 1) % labImages.length)}
                      className="absolute right-0 p-3 rounded-full bg-white/20 hover:bg-white/30 transition-all hover:scale-110 z-10"
                    >
                      <ChevronRight className="w-8 h-8 text-white" />
                    </button>
                  </div>

                  {/* Información de la imagen */}
                  <div className="text-center mb-4">
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {labImages[currentLabImage].title}
                    </h3>
                    <p className="text-white/80 text-sm max-w-2xl mx-auto mb-3">
                      {labImages[currentLabImage].description}
                    </p>
                    {/* Indicador de posición */}
                    <div className="flex justify-center items-center gap-2 mt-2">
                      {labImages.map((_, index) => (
                        <motion.div
                          key={index}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            index === currentLabImage 
                              ? 'w-8 bg-[#6cb79a]' 
                              : 'w-1.5 bg-white/40 hover:bg-white/60'
                          }`}
                          whileHover={{ scale: 1.2 }}
                          onClick={() => setCurrentLabImage(index)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Thumbnails horizontales */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent">
                      {labImages.map((img, index) => (
                        <motion.button
                          key={img.id}
                          onClick={() => setCurrentLabImage(index)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`relative flex-shrink-0 w-36 h-24 overflow-hidden rounded-lg transition-all cursor-pointer ${
                            index === currentLabImage
                              ? 'ring-2 ring-[#6cb79a] shadow-lg'
                              : 'opacity-70 hover:opacity-100 hover:ring-1 hover:ring-white/50'
                          }`}
                        >
                          <img
                            src={img.url}
                            alt={img.title}
                            className="w-full h-full object-cover"
                          />
                          {index === currentLabImage && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="absolute inset-0 bg-gradient-to-t from-[#6cb79a]/40 to-transparent"
                            />
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
      
      {/* Imagen de fondo - Sección superior */}
      <div 
        className="relative h-[500px] w-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://i.ibb.co/zV3q1zcb/fondotop1-view.webp')"
        }}
      >
        {/* Overlay gradiente con los nuevos colores */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#1f2f56]/50 to-[#121f3a]/50"></div>
        
        {/* Contenido sobre la imagen */}
        <div className="relative z-10 h-full flex flex-col justify-center items-center text-center px-6">
          {/* Título principal */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-light text-white mb-4 leading-tight">
              <span className="block text-white">
                Descubre todo lo que
              </span>
              <span className="block font-normal text-white">
                tenemos preparado para ti.
              </span>
            </h1>
            <p className="text-base md:text-lg text-white/90 max-w-[58rem] mx-auto leading-relaxed">
              Desde charlas informativas y talleres prácticos, hasta un laboratorio modelo, la ExpoKossodo 2024 te brinda la oportunidad de conectarte con expertos y adquirir herramientas esenciales para destacar en tu industria.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Tarjetas flotantes - Posicionadas sobre la imagen de fondo */}
      <div className="relative -mt-[150px] z-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Grid de tarjetas estilo glassmorphism */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 justify-items-center">
            {eventCards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }}
                viewport={{ once: true }}
                whileHover={{ y: -8, transition: { duration: 0.2, ease: "easeOut" } }}
                onHoverStart={() => {
                  setHoveredCard(card.id);
                  // Cancelar el debounce anterior si existe
                  if (debounceTimerRef.current) {
                    clearTimeout(debounceTimerRef.current);
                  }
                  // Establecer nuevo debounce
                  debounceTimerRef.current = setTimeout(() => {
                    setActiveCard(card.id);
                  }, 150); // 150ms de debounce
                }}
                onHoverEnd={() => {
                  setHoveredCard(null);
                  // Si el mouse sale antes del debounce, cancelarlo
                  if (debounceTimerRef.current) {
                    clearTimeout(debounceTimerRef.current);
                  }
                }}
                className="w-full h-full group cursor-pointer"
              >
                {/* Card estilo glassmorphism con borde blanco y hover verde */}
                <div className="bg-white/15 backdrop-blur-md rounded-[24px] border-2 border-white shadow-2xl hover:border-[#6cb79a] transition-all duration-300 overflow-hidden h-[420px] flex flex-col">
                  {/* Card Header - Imagen */}
                  <div className="h-[200px] p-4">
                    <div className="h-full w-full rounded-[16px] overflow-hidden relative">
                      <img
                        src={card.image}
                        alt={card.title}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80";
                        }}
                      />
                      {/* Overlay sutil para mejorar contraste */}
                      <div className="absolute inset-0 bg-black/20"></div>
                    </div>
                  </div>
                  
                  {/* Card Body - Contenido */}
                  <div className="px-6 pb-6 flex-grow flex flex-col">
                    {/* Título */}
                    <div className="mb-4 pt-2">
                      <h3 className="font-medium text-gray-800 text-base">
                        {card.title}
                      </h3>
                    </div>
                    
                    {/* Descripción */}
                    <p className="text-gray-600 text-sm leading-relaxed flex-grow">
                      {card.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Sección inferior con fondo blanco */}
      <div className="bg-white pt-8 pb-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Sección interactiva que cambia según el hover - SIN TÍTULO */}
          <div className="mb-16">
            <AnimatePresence mode="wait">
              {getInteractiveContent()}
            </AnimatePresence>
          </div>

          {/* Botón de scroll estilo LandingPage */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex justify-center"
          >
            <motion.div 
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="cursor-pointer flex flex-col items-center space-y-2"
              onClick={onScrollToNext}
            >
              <div className="text-gray-600 text-sm tracking-wider">CONTINUAR</div>
              <div className="w-10 h-10 rounded-full bg-[#01295c]/10 backdrop-blur-sm border border-[#01295c]/20 flex items-center justify-center hover:bg-[#01295c]/20 transition-all duration-300">
                <ChevronDown className="h-5 w-5 text-[#01295c]" />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default InfoEvent1; 