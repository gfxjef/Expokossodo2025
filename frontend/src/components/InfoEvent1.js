import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X, ChevronLeft, ChevronRight, ChevronUp, MapPin } from 'lucide-react';
import { eventService } from '../services/api';
import SimpleMenu from './SimpleMenu';
import ChatWidget from './ChatWidget';

// --- Componente ConferenceSlider Extraído ---
const ConferenceSlider = React.memo(({ conferences, loading, onScrollToNext, totalEvents }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (conferences.length === 0) return;
    
    const interval = setInterval(() => {
      // Avanzar de 3 en 3
      setCurrentIndex(prev => (prev + 3) % conferences.length);
    }, 5000); // Cambiar cada 5 segundos

    return () => clearInterval(interval);
  }, [conferences.length]);

  if (conferences.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-blue-600 mb-2">
            {loading ? 'Cargando conferencias...' : 'No se encontraron conferencias'}
          </p>
          {!loading && (
            <p className="text-blue-500 text-xs">
              Total eventos generales: {totalEvents}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Función para obtener las 9 conferencias visibles, asegurando un ciclo correcto
  const getVisibleConferences = () => {
    const visible = [];
    if (conferences.length > 0) {
      for (let i = 0; i < 9; i++) {
        const index = (currentIndex + i) % conferences.length;
        visible.push(conferences[index]);
      }
    }
    return visible;
  };

  return (
    <div className="flex-1 grid grid-cols-3 grid-rows-3 gap-3">
      <AnimatePresence mode="wait">
        {getVisibleConferences().slice(0, 9).map((conference, index) => (
          <motion.div
            key={`${conference.id}-${currentIndex}-${index}`} // Key única para forzar re-animación
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
});

const InfoEvent1 = ({ onScrollToNext, eventsData, loading, onSectionChange }) => {
  // Estado para la tarjeta activa (mantiene el estado hasta cambiar a otra)
  const [activeCard, setActiveCard] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const debounceTimerRef = useRef(null);

  // Función para manejar el cambio de sección
  const handleSectionChange = (sectionId) => {
    if (onSectionChange) {
      onSectionChange(sectionId);
    }
  };
  
  // Estados para auto-hover automático
  const [isAutoHoverActive, setIsAutoHoverActive] = useState(true);
  const [autoHoverIndex, setAutoHoverIndex] = useState(0);
  const [userHasInteracted, setUserHasInteracted] = useState(false); // Nuevo estado para rastrear interacción
  const autoHoverTimerRef = useRef(null);
  const userInteractionTimeoutRef = useRef(null);
  
  // Estado para tarjeta expandida en móvil
  const [expandedCardMobile, setExpandedCardMobile] = useState(null);
  
  // Estado para visualizador móvil de imágenes de laboratorio
  const [mobileLabImageIndex, setMobileLabImageIndex] = useState(null);
  
  // Estados para el modal de laboratorio
  const [showLabModal, setShowLabModal] = useState(false);
  const [currentLabImage, setCurrentLabImage] = useState(0);
  const [hoveredLab, setHoveredLab] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  
  // Estado para el carrusel del laboratorio
  const [currentLabSlide, setCurrentLabSlide] = useState(0);
  
  // Estado para el scroll infinito de expositores
  const [isPaused, setIsPaused] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [hoveredExpositor, setHoveredExpositor] = useState(null);
  
  // Estado para la rotación de logos
  const [logoIndex, setLogoIndex] = useState(0);

  // Estado para el hover del cuadro de ubicación
  const [isLocationHovered, setIsLocationHovered] = useState(false);

  // Estado para la animación de color de fondo
  const [colorIndex, setColorIndex] = useState(0);

  // Colores para la animación
  const colors = ['#1d2237', '#6db69d'];

  // Función para abrir Google Maps
  const handleOpenLocation = () => {
    window.open('https://maps.app.goo.gl/23RUxnvSqbNm4wrb8', '_blank');
  };

  // Animación de color de fondo
  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex(prev => (prev + 1) % 2);
    }, 2000); // Cambiar cada 2 segundos

    return () => clearInterval(interval);
  }, []);

  // Datos de las tarjetas para ExpoKossodo 2025
  const eventCards = [
    {
      id: 1,
      image: "https://i.ibb.co/TxS2X8xK/confe-1.webp",
      title: "Conferencias y Talleres",
      description: "Participa en conferencias especializadas y talleres prácticos con líderes en la industria sobre temas clave en tecnología de laboratorio.",
      type: "conferencias"
    },
    {
      id: 2,
      image: "https://i.ibb.co/wr45xjsy/mcas.webp",
      title: "Grandes Beneficios",
      description: "Podrá ganar equipos de laboratorio innovadores y asegure un certificado por cada conferencia o taller en la que participe.",
      type: "marcas"
    },
    {
      id: 3,
      image: "https://i.ibb.co/ZzgwLhRB/vaccubrand-lab1.webp",
      title: "Laboratorio Modelo",
      description: "Visita nuestro laboratorio de demostración y observa en acción los equipos más avanzados del mercado.",
      type: "laboratorio"
    },
    {
      id: 4,
      image: "https://i.ibb.co/nsvNbg59/exp-inty.webp",
      title: "Expositores Internacionales",
      description: "Esta es tu oportunidad para descubrir productos innovadores y establecer conexiones globales en un solo lugar.",
      type: "expositores"
    }
  ];

  // Imágenes del laboratorio modelo (8 imágenes)
  const labImages = [
    {
      id: 1,
      url: "https://i.ibb.co/qMmL4cDj/velp-lab8.webp",
      title: "Equipos en nuestro laboratorio de Calidad",
      description: "Tecnología de última generación para análisis"
    },
    {
      id: 2,
      url: "https://i.ibb.co/35sX1jWb/velp-lab7.webp",
      title: "Equipos en nuestro laboratorio de Microbiología",
      description: "Análisis de alta precisión"
    },
    {
      id: 3,
      url: "https://i.ibb.co/9HxKS0vT/velp-lab6.webp",
      title: "Equipos en nuestro laboratorio de Calidad",
      description: "Tecnología de última generación para análisis"
    },
    {
      id: 4,
      url: "https://i.ibb.co/kV0ZXWYP/velp-lab5.webp",
      title: "Equipos en nuestro laboratorio",
      description: "Análisis de alta precisión"
    },
    {
      id: 5,
      url: "https://i.ibb.co/PG7hz5Gt/velp-lab2.webp",
      title: "Equipos en nuestro laboratorio de Calidad",
      description: "Tecnología de última generación para análisis"
    },
    {
      id: 6,
      url: "https://i.ibb.co/HD1HMrqY/velp-lab1.webp",
      title: "Equipos en nuestro laboratorio de Calidad",
      description: "Tecnología de última generación para análisis"
    },
    {
      id: 7,
      url: "https://i.ibb.co/DfzrTqXD/vaccubrand-lab1.webp",
      title: "Equipos en nuestro laboratorio de Calidad",
      description: "Tecnología de última generación para análisis"
    },
    {
      id: 8,
      url: "https://www.kossomet.com/AppUp/expokossodo/olympus_1.webp",
      title: "Equipos en nuestro laboratorio de Microbiología",
      description: "Tecnología de última generación para análisis"
    },
    {
      id: 9,
      url: "https://www.kossomet.com/AppUp/expokossodo/olympus_2.webp",
      title: "Equipos en nuestro laboratorio de Microbiología",
      description: "Tecnología de última generación para análisis"
    },
    {
      id: 10,
      url: "https://www.kossomet.com/AppUp/expokossodo/olympus_3.webp",
      title: "Equipos en nuestro laboratorio de Microbiología",
      description: "Tecnología de última generación para análisis"
    }
  ];

  // Array de logos partners
  const partnerLogos = [
    { name: 'CAMAG', url: 'https://i.ibb.co/67rBmW1c/camag-blanco.webp' },
    { name: 'CHEM', url: 'https://i.ibb.co/My7PfY0f/chem-blanco.webp' },
    { name: 'AMS', url: 'https://i.ibb.co/LD44PGkG/ams-blanco.webp' },
    { name: 'EVIDENT', url: 'https://i.ibb.co/9MgkP7L/evident-blanco.webp' },
    { name: 'ESCO', url: 'https://i.ibb.co/0RpVnmPF/esco-blanco.webp' },
    { name: 'VACUUBRAND', url: 'https://i.ibb.co/Y4tvtKyb/vacubrand-blanco.webp' },
    { name: 'BINDER', url: 'https://i.ibb.co/sv2g4YPT/binder-blanco.webp' },
    { name: 'LAUDA', url: 'https://i.ibb.co/M5f6dwxS/lauda-blanco.webp' },
    { name: 'SARTORIUS', url: 'https://i.ibb.co/GvJhvb3w/sartorius-blanco.webp' },
    { name: 'VELP', url: 'https://i.ibb.co/QvT055f5/velp-blanco.webp' }
  ];

  // Efecto para la rotación automática de logos
  useEffect(() => {
    const interval = setInterval(() => {
      setLogoIndex((prevIndex) => (prevIndex + 6) % partnerLogos.length);
    }, 3500); // Cambiar cada 3.5 segundos

    return () => clearInterval(interval);
  }, [partnerLogos.length]);

  // Función para obtener los 6 logos actuales
  const getCurrentLogos = () => {
    const logos = [];
    for (let i = 0; i < 6; i++) {
      const index = (logoIndex + i) % partnerLogos.length;
      logos.push(partnerLogos[index]);
    }
    return logos;
  };

  // Los datos ya vienen cargados desde el componente padre
  // No necesitamos cargar datos aquí

  // Verificar que el DOM esté listo para el portal
  useEffect(() => {
    setPortalReady(true);
    return () => setPortalReady(false);
  }, []);

  // Auto-hover automático cada 3 segundos
  useEffect(() => {
    // Si el usuario ya ha interactuado, no activar auto-hover
    if (!isAutoHoverActive || userHasInteracted) return;

    const startAutoHover = () => {
      autoHoverTimerRef.current = setInterval(() => {
        setAutoHoverIndex(prevIndex => {
          const nextIndex = (prevIndex + 1) % eventCards.length;
          // Establecer la tarjeta activa para mostrar contenido
          setActiveCard(eventCards[nextIndex].id);
          return nextIndex;
        });
      }, 3000); // Cambiar cada 3 segundos
    };

    // Iniciar el auto-hover inmediatamente con la primera tarjeta
    if (activeCard === null) {
      setActiveCard(eventCards[0].id);
    }
    
    startAutoHover();

    return () => {
      if (autoHoverTimerRef.current) {
        clearInterval(autoHoverTimerRef.current);
      }
    };
  }, [isAutoHoverActive, userHasInteracted]); // Agregado userHasInteracted como dependencia

  // Cleanup de timers al desmontar
  useEffect(() => {
    return () => {
      if (autoHoverTimerRef.current) {
        clearInterval(autoHoverTimerRef.current);
      }
      if (userInteractionTimeoutRef.current) {
        clearTimeout(userInteractionTimeoutRef.current);
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Obtener todos los eventos de todas las fechas
  const getAllEvents = React.useCallback(() => {
    if (!eventsData || Object.keys(eventsData).length === 0) {
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
    return allEvents;
  }, [eventsData]);

  // Filtrar eventos por tipo
  const getEventsByType = React.useCallback((type) => {
    const allEvents = getAllEvents();
    
    switch (type) {
      case 'conferencias':
        // Mostrar TODOS los eventos como conferencias (todos son presentaciones/charlas)
        const filteredEvents = allEvents.filter(event => event.titulo_charla && event.titulo_charla.trim() !== '');
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
  }, [getAllEvents]);

  // Componente para el slider automático de conferencias - memoizado
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

  // Función para obtener contenido móvil optimizado
  const getMobileContent = (cardType) => {
    switch (cardType) {
      case 'conferencias':
        const conferences = getEventsByType('conferencias').slice(0, 6); // Mostrar solo 6 en móvil
        return (
          <div className="px-4 py-4 bg-white/90 backdrop-blur-sm rounded-b-xl">
            <h4 className="font-semibold text-gray-800 mb-3 text-center">
              +{getEventsByType('conferencias').length} Conferencias Disponibles
            </h4>
            <div className="space-y-2">
              {conferences.map((conf, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                  <h5 className="font-medium text-sm text-gray-800 mb-1">{conf.titulo_charla}</h5>
                  <p className="text-xs text-gray-600">{conf.expositor} • {conf.hora}</p>
                </div>
              ))}
            </div>
            <button 
              onClick={onScrollToNext}
              className="mt-4 w-full py-2 bg-[#6cb79a] text-white rounded-lg text-sm font-medium"
            >
              Ver Todas las Conferencias
            </button>
          </div>
        );
        
      case 'marcas':
        return (
          <div className="px-4 py-4 bg-white/90 backdrop-blur-sm rounded-b-xl">
            <h4 className="font-semibold text-gray-800 mb-3 text-center">Grandes Beneficios</h4>
            <div className="space-y-4">
              {/* Sorteo de equipos */}
              <div className="bg-white rounded-lg p-4 border-2 border-gray-200 shadow-md">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src="https://i.ibb.co/LzjSxFJ6/sorteoo.webp"
                        alt="Sorteo de Equipos"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-[#0B3157] text-sm mb-1">Sorteo de Equipos</h5>
                    <p className="text-xs text-gray-700">Participe en el sorteo de equipos de laboratorio.</p>
                  </div>
                </div>
              </div>
              
              {/* Certificados */}
              <div className="bg-white rounded-lg p-4 border-2 border-gray-200 shadow-md">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src="https://i.ibb.co/BH2kZXVb/certiciado.webp"
                        alt="Certificados Oficiales"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-[#0B3157] text-sm mb-1">Brindamos Certificados</h5>
                    <p className="text-xs text-gray-700">Reciba un certificado tras cada charla especializada.</p>
                  </div>
                </div>
              </div>
            </div>
            <button 
              onClick={onScrollToNext}
              className="mt-4 w-full py-2 bg-[#6cb79a] text-white rounded-lg text-sm font-medium"
            >
              Conocer Más Beneficios
            </button>
          </div>
        );
        
      case 'laboratorio':
        return (
          <div className="px-4 py-4 bg-white/90 backdrop-blur-sm rounded-b-xl">
            <h4 className="font-semibold text-gray-800 mb-3 text-center">Equipos en Exhibición</h4>
            <div className="grid grid-cols-2 gap-2">
              {labImages.slice(0, 4).map((img, idx) => (
                <div 
                  key={idx} 
                  className="relative cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation(); // Evitar que el clic cierre el acordeón
                    setMobileLabImageIndex(idx);
                  }}
                >
                  <img 
                    src={img.url} 
                    alt={img.title}
                    className="w-full h-20 object-cover rounded-lg hover:opacity-90 transition-opacity"
                  />
                  <p className="text-xs text-center mt-1 text-gray-700">{img.title}</p>
                </div>
              ))}
            </div>
            <button 
              onClick={onScrollToNext}
              className="mt-4 w-full py-2 bg-[#6cb79a] text-white rounded-lg text-sm font-medium"
            >
              Explorar Laboratorio Completo
            </button>
          </div>
        );
        
      case 'expositores':
        return (
          <div className="px-4 py-4 bg-white/90 backdrop-blur-sm rounded-b-xl">
            <h4 className="font-semibold text-gray-800 mb-3 text-center">Expositores Internacionales</h4>
            <p className="text-sm text-gray-600 text-center mb-4">
              Conecta con empresas líderes de diferentes países y descubre las últimas innovaciones del sector.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {['🇵🇦 Panamá', '🇺🇸 USA', '🇩🇪 Alemania', '🇯🇵 Japón'].map((country) => (
                <span key={country} className="px-3 py-1 bg-gray-50 rounded-full text-xs">
                  {country}
                </span>
              ))}
            </div>
            <button 
              onClick={onScrollToNext}
              className="mt-4 w-full py-2 bg-[#6cb79a] text-white rounded-lg text-sm font-medium"
            >
              Ver Todos los Expositores
            </button>
          </div>
        );
        
      default:
        return null;
    }
  };

  // Funciones para el carrusel del laboratorio - memoizadas
  const imagesPerSlide = 5;
  const totalSlides = Math.ceil(labImages.length / imagesPerSlide);
  
  const nextSlide = React.useCallback(() => {
    setCurrentLabSlide((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);
  
  const prevSlide = React.useCallback(() => {
    setCurrentLabSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);
  
  const getCurrentImages = React.useCallback(() => {
    const start = currentLabSlide * imagesPerSlide;
    return labImages.slice(start, start + imagesPerSlide);
  }, [currentLabSlide, imagesPerSlide, labImages]);

  // useEffect para el scroll continuo de expositores - MEJORADO PARA LOOP INFINITO SIN SALTOS
  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => {
        setScrollPosition(prev => {
          const newPosition = prev - 1;
          
          // Calculamos el ancho total de un set de expositores (16 expositores * 280px = 4480px)
          const expositorWidth = 280; // w-56 (224px) + gap-8 (32px) + margen = ~280px
          const totalExpositores = 16; // Cantidad de expositores originales
          const totalWidth = totalExpositores * expositorWidth;
          
          // Cuando llegamos al final del primer set duplicado, reseteamos suavemente
          // al inicio del segundo set (que es idéntico al primero)
          if (newPosition <= -totalWidth) {
            return 0; // Reset suave al inicio
          }
          
          return newPosition;
        });
      }, 16); // 60fps para mayor suavidad (1000ms/60fps ≈ 16ms)

      return () => clearInterval(interval);
    }
  }, [isPaused]);

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
            className="bg-transparent rounded-xl p-6 w-full h-full"
          >
            <div className="flex items-center justify-center space-x-8 h-full">
              {/* Contador grande a la izquierda */}
              <div className="text-center flex-shrink-0">
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
              
              {/* Slider de conferencias a la derecha - AHORA COMO COMPONENTE EXTERNO */}
              <ConferenceSlider 
                conferences={getEventsByType('conferencias')}
                loading={loading}
                onScrollToNext={onScrollToNext}
                totalEvents={getAllEvents().length}
              />
            </div>
          </motion.div>
        );
        
      case 'marcas':
        return (
          <motion.div
            key="marcas"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-xl p-6 w-full h-full flex items-center justify-center"
          >
            {/* Container centrado con ancho máximo 1200px */}
            <div className="container mx-auto max-w-[1200px]">
              {/* Header con título */}
              <div className="header text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-bold text-[#0B3157] mb-4">
                  Grandes Beneficios
                </h2>
              </div>
              
              {/* Content - Dos columnas principales */}
              <div className="content flex flex-col lg:flex-row gap-8 lg:gap-12">
                {/* Columna izquierda - Sorteo de equipos */}
                <div className="column-left flex-1">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="bg-white rounded-2xl p-6 h-full border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {/* Layout: Imagen a la izquierda, texto a la derecha */}
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      {/* Imagen */}
                      <div className="flex-shrink-0">
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-xl overflow-hidden border-2 border-gray-200 shadow-md">
                          <img
                            src="https://i.ibb.co/LzjSxFJ6/sorteoo.webp"
                            alt="Sorteo de Equipos"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = "https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80";
                            }}
                          />
                        </div>
                      </div>
                      
                      {/* Texto */}
                      <div className="flex-1 text-center md:text-left">
                        <h3 className="text-xl font-bold text-[#0B3157] mb-3">
                          Sorteo de Equipos
                        </h3>
                        <p className="text-gray-700 leading-relaxed text-base">
                          Participe en el sorteo de equipos de laboratorio y obtenga recursos que impulsen sus proyectos científicos.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>
                
                {/* Columna derecha - Certificados */}
                <div className="column-right flex-1">
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="bg-white rounded-2xl p-6 h-full border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {/* Layout: Imagen a la izquierda, texto a la derecha */}
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      {/* Imagen */}
                      <div className="flex-shrink-0">
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-xl overflow-hidden border-2 border-gray-200 shadow-md">
                          <img
                            src="https://i.ibb.co/fYwM2GqY/certiciado.webp"
                            alt="Certificados Oficiales"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = "https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80";
                            }}
                          />
                        </div>
                      </div>
                      
                      {/* Texto */}
                      <div className="flex-1 text-center md:text-left">
                        <h3 className="text-xl font-bold text-[#0B3157] mb-3">
                          Certificacion Kossodo
                        </h3>
                        <p className="text-gray-700 leading-relaxed text-base">
                          Reciba un certificado tras cada charla especializada, validando su formación y su compromiso con la excelencia.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
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
            className="bg-transparent rounded-xl p-6 w-full h-full flex flex-col justify-center"
            onMouseEnter={() => setHoveredLab(true)}
            onMouseLeave={() => setHoveredLab(false)}
          >
            {/* Contenedor con altura fija para evitar scroll vertical */}
            <div className="h-56 relative">
              {/* Grid de imágenes sin scroll horizontal */}
              <div className="flex justify-center items-center gap-3 h-full">
                {getCurrentImages().map((img, index) => (
                  <motion.div
                    key={img.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className="cursor-pointer flex-1 max-w-[200px] h-44"
                    onClick={() => {
                      const originalIndex = labImages.findIndex(labImg => labImg.id === img.id);
                      setCurrentLabImage(originalIndex);
                      setShowLabModal(true);
                    }}
                  >
                    <div className="w-full h-full rounded-lg overflow-hidden bg-gray-100/20 backdrop-blur-sm border-2 border-gray-200/50 hover:border-[#6cb79a] transition-all duration-300 shadow-sm hover:shadow-lg hover:scale-105">
                      <img
                        src={img.url}
                        alt={img.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {/* Flechas de navegación */}
              {totalSlides > 1 && (
                <>
                  <button
                    onClick={prevSlide}
                    className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-10"
                  >
                    <ChevronLeft className="w-6 h-6 text-gray-700" />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-10"
                  >
                    <ChevronRight className="w-6 h-6 text-gray-700" />
                  </button>
                </>
              )}
            </div>
            
            {/* Puntos de navegación */}
            {totalSlides > 1 && (
              <div className="flex justify-center items-center gap-2 mt-4">
                {Array.from({ length: totalSlides }).map((_, index) => (
                  <motion.button
                    key={index}
                    onClick={() => setCurrentLabSlide(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentLabSlide 
                        ? 'w-8 bg-[#6cb79a]' 
                        : 'w-2 bg-gray-300 hover:bg-gray-400'
                    }`}
                    whileHover={{ scale: 1.2 }}
                  />
                ))}
              </div>
            )}
            
            {/* Texto inferior */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: hoveredLab ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              className="text-center text-gray-700 mt-4 font-medium text-lg"
            >
              Tendremos en exposición distintos equipos que podrán ayudarlo en su laboratorio
            </motion.p>
          </motion.div>
        );
        
      case 'expositores':
        // Configuración de colores de banderas por país
        const flagColors = {
          DE: { colors: ['#000000', '#DD0000', '#FFCC00'], direction: 'horizontal' }, // Alemania: Negro, Rojo, Amarillo (horizontal)
          AR: { colors: ['#74ACDF', '#FFFFFF', '#74ACDF'], direction: 'horizontal' }, // Argentina: Celeste, Blanco, Celeste (horizontal)
          CO: { colors: ['#FFCC00', '#0033A0', '#CE1126'], direction: 'horizontal' }, // Colombia: Amarillo, Azul, Rojo (horizontal)
          PE: { colors: ['#D91023', '#FFFFFF', '#D91023'], direction: 'vertical' }, // Perú: Rojo, Blanco, Rojo (vertical)
          VE: { colors: ['#FFCC00', '#0033A0', '#CF142B'], direction: 'horizontal' },  // Venezuela: Amarillo, Azul, Rojo (horizontal)
          BR: { colors: ['#009C3B', '#FFCC00', '#3E4095'], direction: 'horizontal' }, // Brasil: Verde, Amarillo, Azul (sin franjas)
          CH: { colors: ['#FF0000', '#FFFFFF'], direction: 'horizontal' }, // Suiza: Rojo, Blanco (fondo con cruz)


        };

        // Componente para mostrar bandera con colores que ocupe todo el círculo
        const FlagDisplay = ({ countryCode }) => {
          const flagData = flagColors[countryCode] || { colors: ['#CCCCCC', '#FFFFFF', '#CCCCCC'], direction: 'horizontal' };
          const { colors, direction } = flagData;
          
          return (
            <div className="w-12 h-12 rounded-full shadow-lg border-2 border-gray-200 overflow-hidden">
              <div className={`w-full h-full ${direction === 'horizontal' ? 'flex flex-col' : 'flex flex-row'}`}>
                {colors.map((color, idx) => (
                  <div 
                    key={idx} 
                    className="flex-1" 
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          );
        };

        // Array de expositores con códigos de país
        const expositores = [
          
          { id: 7, nombre: "Jhonny Quispe", empresa: "KOSSOMET", imagen: "https://i.ibb.co/fzNhy6Sc/hgoasd.webp", pais: "PE" },
          { id: 1, nombre: "PhD. Fernando Vargas", empresa: "BINDER", imagen: "https://i.ibb.co/q32hWpYT/Fernando-Vargas.webp", pais: "PE" },
          { id: 1, nombre: "Pablo Scarpin", empresa: "VELP", imagen: "https://i.ibb.co/TMCXBVs2/pablo.webp", pais: "AR" },
          { id: 1, nombre: "Andre Sautchuk", empresa: "LAUDA", imagen: "https://i.ibb.co/rfLn38YJ/Andre-Sautchuk.webp", pais: "BR" },
          { id: 1, nombre: "Guillermo Casanova ", empresa: "BINDER", imagen: "https://i.ibb.co/x8jdYrqn/Guillermo-Casanova.webp", pais: "AR" },
          { id: 1, nombre: "Ing. Eliezer Ceniviva", empresa: "CAMAG", imagen: "https://i.ibb.co/ZRnxQmFV/Eliezer-Ceniviva.webp", pais: "CH" },
          { id: 3, nombre: "Mario Esteban Muñoz", empresa: "EVIDENT", imagen: "https://i.ibb.co/XxLPqT5M/Mario-Esteban-Mu-oz.webp", pais: "CO" },
          { id: 2, nombre: "Lic. Mónica Klarreich", empresa: "SARTORIUS", imagen: "https://i.ibb.co/gLhmS8Ph/minia-sart.webp", pais: "AR" },
          { id: 1, nombre: "Dr. Roberto Friztler", empresa: "VACUUBRAND", imagen: "https://i.ibb.co/67Gk0X9s/Friztler.webp", pais: "DE" },
          { id: 1, nombre: "Qco. James Rojas Sanchez", empresa: "KOSSODO", imagen: "https://i.ibb.co/tPF9CjJR/James.webp", pais: "PE" },
          { id: 4, nombre: "Ing. Milagros Passaro", empresa: "KOSSODO", imagen: "https://i.ibb.co/0p7pk8nK/milagros.webp", pais: "PE" },



          { id: 4, nombre: "Fis. Wilmer Matta", empresa: "KOSSODO", imagen: "https://i.ibb.co/Ld0hHVr4/Wilmer-Matta.webp", pais: "PE" },
          { id: 5, nombre: "Edwin Aparicio", empresa: "KOSSOMET", imagen: "https://i.ibb.co/Jjhx1wJj/Edwin-Aparicio.webp", pais: "PE" },
          { id: 6, nombre: "Lic. Luis E. Urbano", empresa: "KOSSOMET", imagen: "https://i.ibb.co/9SsCCZ5/Urbano.webp", pais: "PE" },
          { id: 8, nombre: "Diether Aguire", empresa: "KOSSOMET", imagen: "https://i.ibb.co/Vp0s8Wxy/deither.webp", pais: "PE" },
          { id: 9, nombre: "Daniel Torres", empresa: "KOSSOMET", imagen: "https://i.ibb.co/fVBHfWQ8/daniel-torres.webp", pais: "VE" },
        ];
        
        return (
          <motion.div
            key="expositores"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-transparent rounded-xl overflow-hidden w-full h-full flex items-center justify-center"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Contenedor con scroll infinito y fades en los bordes */}
            <div className="relative overflow-hidden py-4 w-full">
              {/* Fade overlay izquierdo */}
              <div className="absolute top-0 bottom-0 left-0 w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
              
              <motion.div
                className="flex gap-8"
                style={{
                  x: scrollPosition
                }}
              >
                {/* Triplicamos el array para el efecto infinito suave */}
                {[...expositores, ...expositores, ...expositores].map((expositor, index) => {
                  // Calculamos el índice dentro del conjunto original para colores alternados consistentes
                  const originalIndex = index % expositores.length;
                  const setNumber = Math.floor(index / expositores.length); // 0, 1, o 2
                  const uniqueKey = `${expositor.nombre}-${expositor.empresa}-${setNumber}-${originalIndex}`;
                  const isHovered = hoveredExpositor === uniqueKey;
                  const shouldFade = hoveredExpositor !== null && !isHovered;
                  
                  return (
                    <div
                      key={uniqueKey}
                      className="flex flex-col items-center flex-shrink-0 transition-all duration-500"
                      style={{
                        filter: shouldFade ? 'grayscale(100%) brightness(0.4)' : 'none',
                        transform: shouldFade ? 'scale(0.95)' : 'scale(1)',
                        width: '224px' // w-56 equivalente para cálculos precisos
                      }}
                      onMouseEnter={() => setHoveredExpositor(uniqueKey)}
                      onMouseLeave={() => setHoveredExpositor(null)}
                    >
                      {/* Contenedor con SVG de fondo */}
                      <div className="relative w-48 h-48 mb-4">
                        {/* SVG de fondo con colores alternados */}
                        <svg
                          className="absolute inset-0 w-full h-full"
                          viewBox="0 0 181.62 181.22"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M181.62,0v82.44c0,58.05-44.75,98.77-93.53,98.77H0v-78.21C0,29.63,53.62,0,98.37,0h83.25Z"
                            fill={originalIndex % 2 === 0 ? '#6cb799' : '#1f2f55'}
                          />
                        </svg>
                        
                        {/* Imagen del expositor sin padding y completa */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <img
                            src={expositor.imagen}
                            alt={expositor.nombre}
                            className="w-full h-auto max-w-full max-h-full object-contain"
                          />
                        </div>
                        
                        {/* Círculo con bandera en la parte central inferior */}
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.3, delay: originalIndex * 0.05 }}
                          >
                            <FlagDisplay countryCode={expositor.pais} />
                          </motion.div>
                        </div>
                      </div>
                      
                      {/* Información del expositor */}
                      <div className="text-center">
                        <h4 className="text-lg font-semibold text-gray-800 mb-1">
                          {expositor.nombre}
                        </h4>
                        <p className="text-base text-[#6cb799] font-medium">
                          {expositor.empresa}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
              
              {/* Fade overlay derecho */}
              <div className="absolute top-0 bottom-0 right-0 w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
            </div>
          </motion.div>
        );
        
      default:
        return null;
    }
  }, [activeCard, eventsData, loading, hoveredLab, currentLabSlide, isPaused, scrollPosition, hoveredExpositor, eventCards, getCurrentImages, getEventsByType, labImages, nextSlide, prevSlide, totalSlides]);

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

  // Visualizador móvil simple de imágenes del laboratorio
  const MobileLabImageViewer = () => {
    if (mobileLabImageIndex === null) return null;
    
    const currentImage = labImages[mobileLabImageIndex];
    
    const goToNext = () => {
      setMobileLabImageIndex((prev) => (prev + 1) % labImages.length);
    };
    
    const goToPrev = () => {
      setMobileLabImageIndex((prev) => (prev - 1 + labImages.length) % labImages.length);
    };
    
    const closeViewer = () => {
      setMobileLabImageIndex(null);
    };
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center md:hidden pointer-events-none">
        {/* Botón cerrar */}
        <button
          onClick={closeViewer}
          className="absolute top-4 right-4 p-2 bg-white/20 rounded-full pointer-events-auto z-10"
        >
          <X className="h-6 w-6 text-white" />
        </button>
        
        {/* Contenedor de imagen con AnimatePresence para transiciones suaves */}
        <div className="relative w-full px-8 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          <AnimatePresence mode="wait">
            <motion.div
              key={mobileLabImageIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center"
            >
              <img
                src={currentImage.url}
                alt={currentImage.title}
                className="w-full max-h-[60vh] object-contain rounded-lg"
              />
              
              {/* Título de la imagen */}
              <p className="text-white text-center mt-4 text-sm font-medium">
                {currentImage.title}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Botón anterior */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToPrev();
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/20 rounded-full pointer-events-auto"
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>
        
        {/* Botón siguiente */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/20 rounded-full pointer-events-auto"
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </button>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Header con menú simple */}
      <div className="absolute top-0 left-0 right-0 z-50 p-6 md:p-8">
        <div className="flex justify-between items-center">
          {/* Logo y botón "Evento Presencial" */}
          <div className="flex items-center space-x-4 md:space-x-6">
            {/* Logo */}
            <div className="flex-shrink-0">
              <img 
                src="https://i.ibb.co/rfRZVzQH/logo-expokssd-pequeno.webp"
                alt="EXPO KOSSODO 2025"
                className="w-32 h-10 md:w-48 md:h-16 object-contain"
                onError={(e) => {
                  console.log('Error loading header logo image');
                  e.target.style.display = 'none';
                }}
              />
            </div>
            
            {/* Botón "Evento Presencial" */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="hidden md:block"
            >
              <motion.button
                onMouseEnter={() => setIsLocationHovered(true)}
                onMouseLeave={() => setIsLocationHovered(false)}
                onClick={handleOpenLocation}
                className="group relative transition-all duration-300 rounded-lg px-4 md:px-6 shadow-lg hover:shadow-xl cursor-pointer flex items-center justify-center"
                style={{
                  backgroundColor: colors[colorIndex],
                  height: '48px', // Altura fija más grande
                  minWidth: '160px' // Ancho mínimo más grande
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <AnimatePresence mode="wait">
                  {!isLocationHovered ? (
                    <motion.div
                      key="evento-presencial"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center space-x-2"
                    >
                      <span className="text-white font-semibold text-base md:text-lg whitespace-nowrap">
                        Evento Presencial
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="abrir-ubicacion"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center space-x-2"
                    >
                      <MapPin className="w-5 h-5 md:w-6 md:h-6 text-white" />
                      <span className="text-white font-semibold text-base md:text-lg whitespace-nowrap">
                        Abrir Ubicación
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          </div>
          
          {/* Menú simple */}
          <SimpleMenu 
            activeSection="informacion"
            onSectionChange={handleSectionChange}
            textColor="text-white"
            hoverColor="hover:text-[#6cb79a]"
            mobileMenuBg="bg-white/95"
            logoUrl="https://i.ibb.co/rfRZVzQH/logo-expokssd-pequeno.webp"
          />
        </div>
      </div>
      {/* Modal de galería del laboratorio simplificado */}
      {showLabModal && portalReady && ReactDOM.createPortal(
        <AnimatePresence>
          {showLabModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex flex-col items-center justify-center backdrop-blur-sm"
              style={{ 
                zIndex: 9999,
                backgroundColor: 'rgb(0 0 0 / 0.97)'
              }}
              onClick={() => setShowLabModal(false)}
            >
              {/* Botón cerrar */}
              <button
                onClick={() => setShowLabModal(false)}
                className="absolute top-6 right-6 p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-20"
              >
                <X className="w-6 h-6 text-white" />
              </button>

              {/* Contenedor principal centrado */}
              <div className="flex flex-col items-center justify-center max-w-5xl w-full px-8 relative" onClick={(e) => e.stopPropagation()}>
                
                {/* Contenedor de imagen con flechas posicionadas dentro del ancho del contenido */}
                <div className="relative w-full max-w-4xl mb-8">
                  {/* Flechas verdes dentro del ancho del contenido */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentLabImage((prev) => (prev - 1 + labImages.length) % labImages.length);
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-[#6cb79a] hover:bg-[#5ca085] transition-all hover:scale-110 z-20"
                    style={{ padding: '0.6rem' }}
                  >
                    <ChevronLeft className="w-8 h-8 text-white" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentLabImage((prev) => (prev + 1) % labImages.length);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-[#6cb79a] hover:bg-[#5ca085] transition-all hover:scale-110 z-20"
                    style={{ padding: '0.6rem' }}
                  >
                    <ChevronRight className="w-8 h-8 text-white" />
                  </button>

                  {/* Imagen principal */}
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={currentLabImage}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3 }}
                      src={labImages[currentLabImage].url}
                      alt={labImages[currentLabImage].title}
                      className="w-full h-auto max-h-[60vh] object-contain rounded-lg"
                    />
                  </AnimatePresence>
                </div>

                {/* Texto - título y subtítulo */}
                <div className="text-center mb-6 max-w-2xl">
                  <h3 className="text-2xl font-bold text-white mb-3">
                    {labImages[currentLabImage].title}
                  </h3>
                  <p className="text-white/80 text-base leading-relaxed">
                    {labImages[currentLabImage].description}
                  </p>
                </div>

                {/* Puntos de navegación */}
                <div className="flex justify-center items-center gap-3">
                  {labImages.map((_, index) => (
                    <motion.button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentLabImage(index);
                      }}
                      className={`h-3 rounded-full transition-all duration-300 ${
                        index === currentLabImage 
                          ? 'w-10 bg-[#6cb79a]' 
                          : 'w-3 bg-white/40 hover:bg-white/60'
                      }`}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
      
      {/* Imagen de fondo - Sección superior */}
      <div 
        className="relative h-[320px] md:h-[550px] w-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://i.ibb.co/My8SfgP2/Sin-t-tulo-18.webp')"
        }}
      >
        {/* Overlay gradiente con los nuevos colores */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#1f2f56]/80 to-[#1f2f56]/80"></div>
        
        {/* Contenido sobre la imagen */}
        <div className="relative z-10 h-full flex flex-col justify-center items-center text-center px-6 pt-8 md:pt-0 pb-20 md:pb-16">
          {/* Título principal */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-4 md:mb-8"
          >
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-light text-white mb-3 md:mb-4 leading-tight">
              <span className="block text-white">
                Descubre todo lo que
              </span>
              <span className="block font-normal text-white">
                tenemos preparado para ti.
              </span>
            </h1>
            <p className="text-sm md:text-lg text-white/90 max-w-[58rem] mx-auto leading-relaxed px-4 md:px-0 mb-8 md:mb-10">
              Desde charlas informativas y talleres prácticos, hasta un laboratorio modelo, la ExpoKossodo 2025 te brinda la oportunidad de conectarte con expertos y adquirir herramientas esenciales para destacar en tu industria.
            </p>
            
            {/* Logos de partners - Solo visible en desktop */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="hidden md:block w-full max-w-5xl mx-auto"
            >
              <div className="flex justify-center items-center gap-4 md:gap-8">
                <AnimatePresence mode="wait">
                  {getCurrentLogos().map((logo, index) => (
                    <motion.img
                      key={`${logo.name}-${logoIndex}`}
                      src={logo.url}
                      alt={logo.name}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 0.7, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                      style={{ height: '1.7rem' }}
                      className="w-auto object-contain transition-opacity"
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Tarjetas flotantes - Posicionadas sobre la imagen de fondo */}
      <div className="relative -mt-[80px] md:-mt-[120px] z-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Grid de tarjetas estilo glassmorphism */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 justify-items-center">
            {eventCards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }}
                viewport={{ once: true }}
                whileHover={{ y: -8, transition: { duration: 0.2, ease: "easeOut" } }}
                onHoverStart={() => {
                  // Marcar que el usuario ha interactuado (desactiva auto-hover permanentemente)
                  setUserHasInteracted(true);
                  
                  // Pausar auto-hover cuando el usuario interactúa
                  setIsAutoHoverActive(false);
                  if (autoHoverTimerRef.current) {
                    clearInterval(autoHoverTimerRef.current);
                  }
                  if (userInteractionTimeoutRef.current) {
                    clearTimeout(userInteractionTimeoutRef.current);
                  }

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

                  // Ya no se reactiva el auto-hover - el usuario ha interactuado
                  // Una vez que el usuario interactúa, el auto-hover queda desactivado permanentemente
                }}
                onClick={() => {
                  // En móvil, toggle del acordeón
                  if (window.innerWidth < 768) {
                    setExpandedCardMobile(expandedCardMobile === card.id ? null : card.id);
                  }
                }}
                className="w-full h-full group cursor-pointer"
              >
                {/* Card estilo glassmorphism con borde blanco y hover verde */}
                <div className={`bg-white/15 backdrop-blur-md rounded-[24px] border-2 shadow-2xl transition-all duration-500 overflow-hidden h-auto md:h-[420px] flex flex-col ${
                  expandedCardMobile === card.id ? 'border-[#6cb79a]' : ''
                } ${
                  // Auto-hover activo: efecto de resplandor pulsante PERSONALIZADO con borde grueso
                  // Solo se activa si no ha habido interacción del usuario
                  isAutoHoverActive && !userHasInteracted && eventCards[autoHoverIndex]?.id === card.id
                    ? 'border-2 animate-glow-pulse scale-[1.01]'
                    : 'border-white'
                } ${
                  // Hover manual del usuario: efecto de elevación DIFERENTE (más scale, sin pulse)
                  hoveredCard === card.id 
                    ? 'border-[#6cb79a] border-2 shadow-[0_0_20px_rgba(108,183,154,0.5)] shadow-2xl scale-[1.05] hover:shadow-[0_0_30px_rgba(108,183,154,0.8)]' 
                    : ''
                } ${
                  // Hover CSS adicional para cuando no hay auto-hover ni manual hover
                  (!isAutoHoverActive || userHasInteracted || (eventCards[autoHoverIndex]?.id !== card.id && hoveredCard !== card.id))
                    ? 'hover:border-[#6cb79a] hover:border-2 hover:shadow-[0_0_20px_rgba(108,183,154,0.5)] hover:scale-[1.05]'
                    : ''
                }`}>
                  {/* Card Header - Imagen */}
                  <div className="h-[160px] md:h-[200px] p-3 md:p-4">
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
                  <div className="px-4 md:px-6 pb-4 md:pb-6 flex flex-col">
                    {/* Título */}
                    <div className="mb-2 md:mb-4">
                      <h3 className="font-medium text-gray-800 text-sm md:text-base">
                        {card.title}
                      </h3>
                    </div>
                    
                    {/* Descripción */}
                    <p className="text-gray-600 text-xs md:text-sm leading-relaxed">
                      {card.description}
                    </p>
                    
                    {/* Indicador de expandible solo en móvil */}
                    <div className="md:hidden mt-4 flex items-center justify-center text-gray-500">
                      <motion.div
                        animate={{ rotate: expandedCardMobile === card.id ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ChevronDown className="h-5 w-5" />
                      </motion.div>
                    </div>
                  </div>
                </div>
                
                {/* Contenido expandible en móvil */}
                <AnimatePresence>
                  {expandedCardMobile === card.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="md:hidden overflow-hidden"
                    >
                      {getMobileContent(card.type)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Sección inferior con fondo blanco */}
      <div className="bg-white pt-4 md:pt-8 pb-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Sección interactiva que cambia según el hover - SIN TÍTULO */}
          <div className="hidden md:block mb-16">
            {/* Contenedor con altura fija para evitar layout shift */}
            <div className="h-[370px] flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                {getInteractiveContent()}
              </AnimatePresence>
            </div>
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

      {/* Visualizador móvil simple de imágenes del laboratorio */}
      {mobileLabImageIndex !== null && portalReady && ReactDOM.createPortal(
        <>
          {/* Fondo oscuro - Solo se anima al abrir/cerrar */}
          <AnimatePresence>
            {mobileLabImageIndex !== null && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 z-50 bg-black/90 md:hidden"
                onClick={() => setMobileLabImageIndex(null)}
              />
            )}
          </AnimatePresence>
          
          {/* Contenido del visualizador - Se re-renderiza pero sin afectar el fondo */}
          {mobileLabImageIndex !== null && <MobileLabImageViewer />}
        </>,
        document.body
      )}
      
      {/* Chat Widget */}
      <ChatWidget />
    </div>
  );
};

export default InfoEvent1; 