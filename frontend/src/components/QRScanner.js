import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const QRScanner = ({ onScanSuccess, onScanError, isActive = true }) => {
  const scannerRef = useRef(null);
  const [scanner, setScanner] = useState(null);
  const [scannerState, setScannerState] = useState('initializing'); // initializing, active, paused, error

  useEffect(() => {
    if (!isActive || !scannerRef.current) return;

    const config = {
      fps: 10,
      qrbox: {
        width: 250,
        height: 250,
      },
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
      
      // Llamar callback del componente padre
      if (onScanSuccess) {
        onScanSuccess(decodedText, decodedResult);
      }
      
      // Breve pausa visual antes de reactivar
      setTimeout(() => {
        setScannerState('active');
      }, 1000);
    };

    const handleScanError = (error) => {
      // Solo mostrar errores significativos, no los de "no QR found"
      if (!error.toString().includes('No MultiFormat Readers were able')) {
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
    } catch (error) {
      console.error('Error inicializando scanner:', error);
      setScannerState('error');
    }

    // Cleanup al desmontar
    return () => {
      if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(console.error);
      }
    };
  }, [isActive, onScanSuccess, onScanError]);

  const getStatusMessage = () => {
    switch (scannerState) {
      case 'initializing':
        return '🎬 Inicializando cámara...';
      case 'active':
        return '📱 Enfoca el código QR del asistente';
      case 'success':
        return '✅ ¡Código QR detectado exitosamente!';
      case 'error':
        return '❌ Error con la cámara. Verifica permisos.';
      default:
        return '📷 Preparando escáner...';
    }
  };

  const getStatusColor = () => {
    switch (scannerState) {
      case 'initializing':
        return 'text-blue-600';
      case 'active':
        return 'text-gray-600';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (!isActive) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <div className="text-gray-500 text-lg">
          📷 Escáner QR Desactivado
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      {/* Header del Scanner */}
      <div className="mb-4 text-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Escáner de Código QR
        </h3>
        <div className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusMessage()}
        </div>
      </div>

      {/* Contenedor del Scanner */}
      <div className="relative">
        <div
          id={`qr-scanner-${Date.now()}`}
          ref={scannerRef}
          className="w-full"
        />
        
        {/* Overlay de estado */}
        {scannerState === 'success' && (
          <div className="absolute inset-0 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
            <div className="bg-white rounded-full p-3 shadow-lg">
              <div className="text-green-600 text-2xl">✅</div>
            </div>
          </div>
        )}
        
        {scannerState === 'error' && (
          <div className="absolute inset-0 bg-red-500 bg-opacity-20 rounded-lg flex items-center justify-center">
            <div className="bg-white rounded-lg p-4 shadow-lg text-center">
              <div className="text-red-600 text-2xl mb-2">❌</div>
              <p className="text-sm text-gray-600">
                Error de cámara.<br/>
                Verifica permisos en tu navegador.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Instrucciones */}
      <div className="mt-4 bg-blue-50 rounded-lg p-3">
        <h4 className="font-medium text-blue-800 mb-2">📋 Instrucciones:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Mantén el código QR centrado en el recuadro</li>
          <li>• Asegúrate de tener buena iluminación</li>
          <li>• El código se detectará automáticamente</li>
        </ul>
      </div>

      {/* Información técnica (solo en desarrollo) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          Estado: {scannerState} | Activo: {isActive.toString()}
        </div>
      )}
    </div>
  );
};

export default QRScanner; 