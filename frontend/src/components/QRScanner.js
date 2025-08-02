import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const QRScanner = ({ onScanSuccess, onScanError, isActive = true }) => {
  const scannerRef = useRef(null);
  const [scanner, setScanner] = useState(null);
  const [scannerState, setScannerState] = useState('initializing');
  const [isScanning, setIsScanning] = useState(false);

  // Funci�n para limpiar el scanner correctamente
  const cleanupScanner = useCallback(async () => {
    if (scanner) {
      try {
        await scanner.clear();
        setScanner(null);
        setScannerState('initializing');
        setIsScanning(false);
      } catch (error) {
        console.error('Error limpiando scanner:', error);
      }
    }
  }, [scanner]);

  // Funci�n para inicializar el scanner
  const initializeScanner = useCallback(() => {
    if (!isActive || !scannerRef.current || scanner) return;

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      rememberLastUsedCamera: true,
      showTorchButtonIfSupported: true,
    };

    const html5QrcodeScanner = new Html5QrcodeScanner(
      scannerRef.current.id,
      config,
      false
    );

    const handleScanSuccess = (decodedText, decodedResult) => {
      console.log('QR Escaneado exitosamente:', decodedText);
      setScannerState('success');
      setIsScanning(false);
      
      if (onScanSuccess) {
        onScanSuccess(decodedText, decodedResult);
      }
      
      setTimeout(() => {
        cleanupScanner();
      }, 2000);
    };

    const handleScanError = (error) => {
      const errorMessage = error.toString();
      
      if (!errorMessage.includes('No MultiFormat Readers were able') && 
          !errorMessage.includes('IndexSizeError') &&
          !errorMessage.includes('source width is 0')) {
        console.error('Error de escaneo QR:', error);
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
    cleanupScanner().then(() => {
      setTimeout(() => {
        initializeScanner();
      }, 500);
    });
  };

  const getStatusMessage = () => {
    switch (scannerState) {
      case 'initializing': return ' Inicializando c�mara...';
      case 'active': return ' Enfoca el c�digo QR del asistente';
      case 'success': return ' �C�digo QR detectado exitosamente!';
      case 'error': return ' Error con la c�mara. Verifica permisos.';
      default: return ' Preparando esc�ner...';
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
        <div className="text-gray-500 text-lg"> Esc�ner QR Desactivado</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="mb-4 text-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Esc�ner de C�digo QR
        </h3>
        <div className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusMessage()}
        </div>
        
        {scannerState === 'error' && (
          <button
            onClick={restartScanner}
            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
          >
             Reiniciar Esc�ner
          </button>
        )}
      </div>

      <div className="relative">
        <div
          id={`qr-scanner-${Date.now()}`}
          ref={scannerRef}
          className="w-full"
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
                Error de c�mara.<br/>
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
