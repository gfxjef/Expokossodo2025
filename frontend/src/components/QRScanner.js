import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import './QRScanner.css';

const QRScanner = ({ onScanSuccess, onScanError, isActive = true }) => {
  const scannerRef = useRef(null);
  const [scanner, setScanner] = useState(null);
  const [scannerState, setScannerState] = useState('initializing');
  const [isScanning, setIsScanning] = useState(false);
  const isProcessingRef = useRef(false);

  // Función para limpiar el scanner correctamente
  const cleanupScanner = useCallback(async () => {
    if (scanner) {
      try {
        await scanner.clear();
        setScanner(null);
        setScannerState('initializing');
        setIsScanning(false);
        isProcessingRef.current = false;
      } catch (error) {
        console.error('Error limpiando scanner:', error);
      }
    }
  }, [scanner]);

  // Función para inicializar el scanner
  const initializeScanner = useCallback(() => {
    if (!isActive || !scannerRef.current || scanner) return;

    isProcessingRef.current = false; // Resetear para permitir nuevos escaneos
    
    // Detectar si es móvil o desktop
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    const config = {
      fps: isMobile ? 10 : 5, // Menor FPS en desktop para mejor precisión
      qrbox: function(viewfinderWidth, viewfinderHeight) {
        // Área más pequeña en desktop para mejor enfoque
        const minEdgePercentage = isMobile ? 0.7 : 0.5;
        const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
        const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
        return {
          width: qrboxSize,
          height: qrboxSize,
        };
      },
      rememberLastUsedCamera: true,
      showTorchButtonIfSupported: true,
      // Configuraciones adicionales para mejorar detección en desktop
      aspectRatio: 1.0,
      disableFlip: false,
      // Múltiples formatos para mejor compatibilidad
      formatsToSupport: [
        Html5QrcodeScanType.SCAN_TYPE_CAMERA
      ],
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true
      }
    };

    const html5QrcodeScanner = new Html5QrcodeScanner(
      scannerRef.current.id,
      config,
      false
    );

    const handleScanSuccess = (decodedText, decodedResult) => {
      // Evitar múltiples llamadas mientras se procesa
      if (isProcessingRef.current) {
        console.log('QR Scanner: Ya procesando, ignorando lectura duplicada');
        return;
      }
      
      isProcessingRef.current = true;
      console.log('QR Escaneado exitosamente:', decodedText);
      setScannerState('success');
      setIsScanning(false);
      
      if (onScanSuccess) {
        onScanSuccess(decodedText, decodedResult);
      }
      
      // Pausar el scanner inmediatamente
      if (scanner && scanner.pause) {
        scanner.pause();
      }
      
      setTimeout(() => {
        setScannerState('initializing'); // Quitar overlay verde antes de limpiar
        setTimeout(() => {
          cleanupScanner();
          isProcessingRef.current = false;
        }, 100);
      }, 1500); // Reducir tiempo para que sea más rápido
    };

    const handleScanError = (error) => {
      const errorMessage = error.toString();
      
      // Filtrar errores normales que no necesitan reportarse
      const normalErrors = [
        'No MultiFormat Readers were able',
        'IndexSizeError',
        'source width is 0',
        'NotFoundError', // Típico cuando no encuentra QR
        'NotReadableError' // Cámara ocupada temporalmente
      ];
      
      const isNormalError = normalErrors.some(err => errorMessage.includes(err));
      
      if (!isNormalError) {
        console.error('Error de escaneo QR:', error);
        
        // Mensajes específicos para desktop
        if (errorMessage.includes('NotAllowedError')) {
          console.error('❌ Permisos de cámara denegados');
          setScannerState('error');
        } else if (errorMessage.includes('NotSupportedError')) {
          console.error('❌ Cámara no soportada en este navegador');
          setScannerState('error');
        } else if (errorMessage.includes('OverconstrainedError')) {
          console.error('❌ Configuración de cámara no compatible');
          setScannerState('error');
        }
        
        if (onScanError) {
          onScanError(error);
        }
      }
    };

    try {
      html5QrcodeScanner.render(handleScanSuccess, handleScanError);
      setScanner(html5QrcodeScanner);
      setScannerState('active');
      setIsScanning(true);
    } catch (error) {
      console.error('Error inicializando scanner:', error);
      setScannerState('error');
    }
  }, [isActive, scanner, onScanSuccess, onScanError, cleanupScanner]);

  useEffect(() => {
    if (isActive && !scanner) {
      const timer = setTimeout(() => {
        initializeScanner();
      }, 100);
      
      return () => clearTimeout(timer);
    }
    
    if (!isActive && scanner) {
      cleanupScanner();
    }
  }, [isActive, scanner, initializeScanner, cleanupScanner]);

  useEffect(() => {
    return () => {
      cleanupScanner();
    };
  }, [cleanupScanner]);

  const restartScanner = () => {
    setScannerState('initializing'); // Resetear estado para quitar overlay verde
    cleanupScanner().then(() => {
      setTimeout(() => {
        initializeScanner();
      }, 500);
    });
  };

  const getStatusMessage = () => {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    switch (scannerState) {
      case 'initializing': return '📷 Inicializando cámara...';
      case 'active': 
        return isMobile 
          ? '📱 Enfoca el código QR del asistente' 
          : '💻 Acerca el QR a la cámara (10-15cm)';
      case 'success': return '✅ ¡Código QR detectado exitosamente!';
      case 'error': return '❌ Error con la cámara. Verifica permisos.';
      default: return '⏳ Preparando escáner...';
    }
  };

  const getStatusColor = () => {
    switch (scannerState) {
      case 'initializing': return 'text-blue-600';
      case 'active': return 'text-gray-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (!isActive) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <div className="text-gray-500 text-lg"> Escaner QR Desactivado</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="mb-4 text-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Escanear codigo QR
        </h3>
        <div className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusMessage()}
        </div>
        
        {scannerState === 'error' && (
          <button
            onClick={restartScanner}
            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
          >
             Reiniciar Escaner
          </button>
        )}
      </div>

      <div className="relative">
        <div
          id={`qr-scanner-${Date.now()}`}
          ref={scannerRef}
          className="w-full qr-scanner-container"
          style={{
            maxHeight: window.innerWidth > 1024 ? '400px' : 'none',
            overflow: 'hidden'
          }}
        />
        
        {scannerState === 'success' && (
          <div className="absolute inset-0 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
            <div className="bg-white rounded-full p-3 shadow-lg">
              <div className="text-green-600 text-2xl"></div>
            </div>
          </div>
        )}
        
        {scannerState === 'error' && (
          <div className="absolute inset-0 bg-red-500 bg-opacity-20 rounded-lg flex items-center justify-center">
            <div className="bg-white rounded-lg p-4 shadow-lg text-center">
              <div className="text-red-600 text-2xl mb-2"></div>
              <p className="text-sm text-gray-600">
                Error de camara.<br/>
                Verifica permisos en tu navegador.
              </p>
            </div>
          </div>
        )}
      </div>


      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          Estado: {scannerState} | Activo: {isActive.toString()} | Escaneando: {isScanning.toString()}
        </div>
      )}
    </div>
  );
};

export default QRScanner;
