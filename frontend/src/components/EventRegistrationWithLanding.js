import React, { useRef } from 'react';
import ReactFullpage from '@fullpage/react-fullpage';
import LandingPage from './LandingPage';
import EventRegistration from './EventRegistration';

const EventRegistrationWithLanding = () => {
  const fullpageRef = useRef(null);

  // Función para navegar a la siguiente sección
  const scrollToNext = () => {
    if (fullpageRef.current) {
      fullpageRef.current.fullpageApi.moveSectionDown();
    }
  };

  return (
    <ReactFullpage
      // Opciones de configuración
      licenseKey="gplv3-license" // Licencia GPL v3 para uso gratuito
      credits={{ enabled: false, label: '', position: 'right' }}
      scrollingSpeed={1000}
      easing="easeInOutCubic"
      navigation={false}
      showActiveTooltip={false}
      // Configuración para scroll interno
      scrollOverflow={true}
      scrollOverflowReset={false}
      scrollOverflowOptions={
        {
          click: false,
          preventDefaultException: { 
            tagName: /^(INPUT|TEXTAREA|BUTTON|SELECT|A)$/ 
          }
        }
      }
      // Eliminamos sectionsColor para evitar cambios de tonalidad
      
      render={({ state, fullpageApi }) => {
        // Asignar la API al ref para control externo
        if (fullpageApi && fullpageRef.current !== fullpageApi) {
          fullpageRef.current = { fullpageApi };
        }

        return (
          <ReactFullpage.Wrapper>
            {/* Sección 1: Landing Page */}
            <div className="section">
              <LandingPage onScrollToNext={scrollToNext} />
            </div>
            
            {/* Sección 2: Event Registration (contenido original) */}
            <div className="section fp-auto-height-responsive">
              <div className="h-screen bg-gray-50 relative">
                <EventRegistration />
              </div>
            </div>
          </ReactFullpage.Wrapper>
        );
      }}
    />
  );
};

export default EventRegistrationWithLanding; 