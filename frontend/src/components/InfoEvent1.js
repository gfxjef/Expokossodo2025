import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { eventService } from '../services/api';

const InfoEvent1 = ({ onScrollToNext, eventsData, loading }) => {
  // Estado para la tarjeta activa (mantiene el estado hasta cambiar a otra)
  const [activeCard, setActiveCard] = useState(null);
  
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
      title: "Conferencias",
      description: "Participa en conferencias especializadas con líderes en la industria sobre temas clave en tecnología de laboratorio.",
      type: "conferencias"
    },
    {
      id: 2,
      image: "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
      title: "Talleres Prácticos",
      description: "Desarrolla habilidades prácticas en nuestros talleres interactivos, diseñados para aplicarse en tu labor diaria.",
      type: "talleres"
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

  // Los datos ya vienen cargados desde el componente padre
  // No necesitamos cargar datos aquí

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

  // Componente para el slider automático de conferencias
  const ConferenceSlider = () => {
    const conferences = getEventsByType('conferencias');
    const [currentIndex, setCurrentIndex] = useState(0);
    
    console.log('🎪 ConferenceSlider - conferences:', conferences.length, 'loading:', loading);

    useEffect(() => {
      if (conferences.length === 0) return;
      
      const interval = setInterval(() => {
        setCurrentIndex(prev => (prev + 3) % conferences.length);
      }, 3000); // Cambiar cada 3 segundos

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
      for (let i = 0; i < 6; i++) {
        const index = (currentIndex + i) % conferences.length;
        visible.push(conferences[index]);
      }
      return visible;
    };

    return (
      <div className="flex-1 grid grid-cols-3 grid-rows-2 gap-3">
        <AnimatePresence mode="wait">
          {getVisibleConferences().slice(0, 6).map((conference, index) => (
            <motion.div
              key={`${conference.id}-${currentIndex}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-blue-100 rounded-lg p-3 border-2 border-blue-300 cursor-pointer hover:bg-blue-200 transition-colors"
              onClick={onScrollToNext}
            >
              <h4 className="text-sm font-medium text-blue-900 mb-1 line-clamp-2">
                {conference.titulo_charla}
              </h4>
              <p className="text-xs text-blue-700">
                {conference.expositor}
              </p>
              <div className="flex items-center space-x-2 mt-2 text-xs text-blue-600">
                <span>{conference.hora}</span>
                <span>•</span>
                <span>{conference.sala}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  };

  // Función para obtener el contenido de la sección inferior según la tarjeta activa
  const getInteractiveContent = () => {
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
            className="bg-transparent border border-blue-200/30 rounded-xl p-8"
          >
                          <div className="flex items-center space-x-8">
                {/* Contador grande a la izquierda */}
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.6, type: "spring" }}
                    className="text-6xl font-bold text-blue-600 mb-2"
                  >
                    +{totalConferences}
                  </motion.div>
                  <div className="text-xl font-semibold text-blue-700">CONFERENCIAS</div>
                </div>
              
              {/* Slider de conferencias a la derecha */}
              <ConferenceSlider />
            </div>
          </motion.div>
        );
        
      case 'talleres':
        const totalTalleres = getEventsByType('talleres').length;
        return (
          <motion.div
            key="talleres"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-gradient-to-r from-[#6cb79a] to-[#5ca085] rounded-xl p-6 text-white"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.6 }}
                className="text-6xl font-bold mb-2"
              >
                +{totalTalleres}
              </motion.div>
              <div className="text-xl font-semibold mb-4">TALLERES PRÁCTICOS</div>
              <p className="text-lg opacity-90">
                Sesiones interactivas para desarrollar habilidades técnicas aplicables en tu trabajo diario
              </p>
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
            className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl p-6 text-white"
          >
            <div className="text-center">
              <motion.div
                initial={{ rotate: -180, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="text-6xl mb-4"
              >
                🔬
              </motion.div>
              <div className="text-xl font-semibold mb-4">LABORATORIO MODELO</div>
              <p className="text-lg opacity-90">
                Conoce los equipos más avanzados del mercado en nuestro laboratorio de demostración
              </p>
            </div>
          </motion.div>
        );
        
      case 'expositores':
        return (
          <motion.div
            key="expositores"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-gradient-to-r from-orange-500 to-red-600 rounded-xl p-6 text-white"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.6 }}
                className="text-6xl mb-4"
              >
                🌍
              </motion.div>
              <div className="text-xl font-semibold mb-4">EXPOSITORES INTERNACIONALES</div>
              <p className="text-lg opacity-90">
                Conecta con empresas líderes y descubre las últimas innovaciones del sector
              </p>
            </div>
          </motion.div>
        );
        
      default:
        return null;
    }
  };

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
      {/* Imagen de fondo - Sección superior */}
      <div 
        className="relative h-[500px] w-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://i.ibb.co/zV3q1zcb/fondotop1-view.webp')"
        }}
      >
        {/* Overlay gradiente como en LandingPage */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/60 to-black/70"></div>
        
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
              <span className="block bg-gradient-to-r from-white to-[#6cb79a] bg-clip-text text-transparent">
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
          {/* Grid de tarjetas estilo AirPods */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 justify-items-center">
            {eventCards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }}
                viewport={{ once: true }}
                whileHover={{ y: -8, transition: { duration: 0.2, ease: "easeOut" } }}
                onHoverStart={() => setActiveCard(card.id)}
                className="w-full h-full group cursor-pointer"
              >
                {/* Card estilo AirPods con altura fija */}
                <div className="bg-white rounded-[24px] shadow-lg hover:shadow-xl transition-shadow duration-200 overflow-hidden h-[420px] flex flex-col">
                  {/* Card Header - Imagen con altura fija y bordes blancos */}
                  <div className="h-[200px] bg-white rounded-t-[24px]" style={{ padding: '0.4rem' }}>
                    <div className="h-full w-full bg-black rounded-[16px] overflow-hidden relative">
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
                  
                  {/* Card Body - Contenido sin separación */}
                  <div className="px-6 pb-6 flex-grow flex flex-col">
                    {/* Título */}
                    <div className="mb-4 pt-4">
                      <h3 className="font-medium text-gray-900 text-base">
                        {card.title}
                      </h3>
                    </div>
                    
                    {/* Descripción completa sin limitación */}
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
          {/* Título de la sección */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-[#01295c] mb-4">
              ¿Qué encontrarás en el evento?
            </h2>
            <p className="text-lg text-gray-600 max-w-[51rem] mx-auto">
              Descubre todas las experiencias y oportunidades que hemos preparado especialmente para ti
            </p>
          </motion.div>

          {/* Sección interactiva que cambia según el hover */}
          <div className="mb-16 min-h-[300px]">
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