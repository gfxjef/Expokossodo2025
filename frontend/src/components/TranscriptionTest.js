import React, { useState, useEffect, useRef } from 'react';

const TranscriptionTest = () => {
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [browserInfo, setBrowserInfo] = useState('');
  const [logs, setLogs] = useState([]);
  const isRecordingRef = useRef(false);
  const finalBoundaryRef = useRef(0);
  const recognitionRef = useRef(null);
  const stableTextRef = useRef('');
  const lastFinalRef = useRef('');

  useEffect(() => {
    // Detectar navegador
    const userAgent = navigator.userAgent;
    const isChrome = /Chrome/.test(userAgent) && !/Edg/.test(userAgent);
    const isEdge = /Edg/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isFirefox = /Firefox/.test(userAgent);
    
    let browser = 'Desconocido';
    if (isChrome) browser = 'Chrome';
    else if (isEdge) browser = 'Edge';
    else if (isSafari) browser = 'Safari';
    else if (isFirefox) browser = 'Firefox';
    
    setBrowserInfo(`${browser} - ${userAgent.substring(0, 50)}...`);
    
    initializeSpeechRecognition();
  }, []);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const longestCommonPrefix = (a, b) => {
    const len = Math.min(a.length, b.length);
    let i = 0;
    while (i < len && a[i] === b[i]) i++;
    return a.slice(0, i);
  };

  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      const isEdge = /Edg/.test(navigator.userAgent);
      
      // Configuración
      recognition.continuous = !isEdge;
      recognition.interimResults = true;
      recognition.lang = 'es-ES';
      recognition.maxAlternatives = 1;
      
      addLog(`Configuración: continuous=${!isEdge}, lang=es-ES`);
      
      recognition.onresult = (event) => {
        // Buscar el último índice que sea final
        let lastFinalIndex = -1;
        for (let i = event.results.length - 1; i >= 0; i--) {
          if (event.results[i].isFinal) { 
            lastFinalIndex = i; 
            break; 
          }
        }
        
        if (lastFinalIndex < 0) {
          // Solo interim results, podemos mostrarlos en gris sin guardarlo
          for (let i = 0; i < event.results.length; i++) {
            if (!event.results[i].isFinal) {
              const interimText = event.results[i][0].transcript;
              addLog(`INTERIM [${i}]: "${interimText}"`);
            }
          }
          return;
        }

        const currentFinal = (event.results[lastFinalIndex][0]?.transcript || '').trim();
        if (!currentFinal) return;
        
        if (currentFinal === lastFinalRef.current) {
          // Final repetido exactamente igual; no agregamos nada
          addLog(`FINAL (igual, ignorado): "${currentFinal}"`);
          return;
        }

        // Calcula solo el sufijo nuevo respecto a lo ya consolidado
        const prevStable = stableTextRef.current;
        let toAppend = '';

        if (currentFinal.startsWith(prevStable)) {
          toAppend = currentFinal.slice(prevStable.length);
        } else {
          // Si el motor reescribió parte del texto, usa el prefijo común
          const lcp = longestCommonPrefix(prevStable, currentFinal);
          toAppend = currentFinal.slice(lcp.length);
          if (lcp !== prevStable) {
            addLog(`LCP detectado: "${lcp}" (prev: "${prevStable}")`);
          }
        }

        toAppend = toAppend.replace(/\s+/g, ' ').trim();
        if (toAppend) {
          setTranscript((t) => (t ? `${t} ${toAppend}`.replace(/\s+/g, ' ') : toAppend));
          stableTextRef.current = (prevStable + ' ' + toAppend).replace(/\s+/g, ' ').trim();
          addLog(`FINAL [${lastFinalIndex}] nuevo → añade: "${toAppend}"`);
        } else {
          // No hay sufijo nuevo; solo actualiza el estable por si cambió mínimamente
          stableTextRef.current = currentFinal;
          addLog(`FINAL [${lastFinalIndex}] sin sufijo nuevo (solo sincroniza estable)`);
        }

        lastFinalRef.current = currentFinal;
        finalBoundaryRef.current = event.results.length;
      };
      
      recognition.onstart = () => {
        addLog('🎤 Reconocimiento iniciado');
      };
      
      recognition.onerror = (event) => {
        addLog(`❌ Error: ${event.error}`);
        if (event.error !== 'no-speech') {
          setIsRecording(false);
          isRecordingRef.current = false;
        }
      };
      
      recognition.onend = () => {
        addLog('🔚 Reconocimiento terminado');
        
        if (isRecordingRef.current) {
          finalBoundaryRef.current = 0;
          addLog('🔄 Reiniciando con boundary=0 (estable se conserva)');
          
          const restart = () => {
            try {
              recognitionRef.current.start();
              addLog('✅ Reiniciado exitosamente');
            } catch (error) {
              addLog(`❌ Error al reiniciar: ${error.message}`);
              setIsRecording(false);
              isRecordingRef.current = false;
            }
          };

          if (isEdge) {
            setTimeout(restart, 500);
          } else {
            setTimeout(restart, 100);
          }
        }
      };
      
      recognitionRef.current = recognition;
      setRecognition(recognition);
      addLog('✅ Speech Recognition inicializado');
    } else {
      addLog('❌ Speech Recognition no disponible');
    }
  };

  const toggleRecording = () => {
    if (!recognition) {
      addLog('❌ Recognition no disponible');
      return;
    }
    
    if (isRecording) {
      isRecordingRef.current = false;
      recognition.stop();
      setIsRecording(false);
      addLog('⏹️ Grabación detenida');
    } else {
      // No borres el estable aquí: puede ser una reanudación
      finalBoundaryRef.current = 0;
      addLog('🔄 Boundary reseteado a 0 (estable se conserva)');
      
      try {
        recognition.start();
        setIsRecording(true);
        isRecordingRef.current = true;
        addLog('🎤 Grabación iniciada');
      } catch (error) {
        addLog(`❌ Error iniciando: ${error.message}`);
        setIsRecording(false);
        isRecordingRef.current = false;
      }
    }
  };

  const clearTranscript = () => {
    setTranscript('');
    finalBoundaryRef.current = 0;
    stableTextRef.current = '';
    lastFinalRef.current = '';
    addLog('🗑️ Texto limpiado, boundary=0, estable=vacío');
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const copyTranscript = () => {
    navigator.clipboard.writeText(transcript);
    addLog('📋 Texto copiado al portapapeles');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#01295c] to-[#1d2236] p-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">
          🎤 Test de Transcripción
        </h1>
        <p className="text-[#6cb79a] text-sm">
          Navegador: {browserInfo}
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel de Transcripción */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Transcripción</h2>
            <div className="flex items-center space-x-2">
              {isRecording && (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-red-300 text-sm">Grabando...</span>
                </div>
              )}
            </div>
          </div>

          {/* Área de texto */}
          <div className="mb-4">
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="El texto transcrito aparecerá aquí..."
              className="w-full h-64 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#6cb79a] focus:border-transparent resize-none"
            />
            <div className="mt-2 text-right">
              <span className="text-white/60 text-sm">
                {transcript.split(' ').filter(w => w).length} palabras | {transcript.length} caracteres
              </span>
            </div>
          </div>

          {/* Botones de control */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={toggleRecording}
              className={`flex-1 min-w-[120px] py-3 px-6 rounded-lg font-bold transition-all duration-300 ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isRecording ? '⏹️ Detener' : '🎤 Grabar'}
            </button>
            
            <button
              onClick={clearTranscript}
              disabled={!transcript}
              className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 ${
                transcript
                  ? 'bg-gray-500 hover:bg-gray-600 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              🗑️ Limpiar
            </button>
            
            <button
              onClick={copyTranscript}
              disabled={!transcript}
              className={`px-6 py-3 rounded-lg font-bold transition-all duration-300 ${
                transcript
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              📋 Copiar
            </button>
          </div>
        </div>

        {/* Panel de Logs */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Logs de Depuración</h2>
            <button
              onClick={clearLogs}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
            >
              Limpiar
            </button>
          </div>

          <div className="bg-black/30 rounded-lg p-4 h-96 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-white/50">Los logs aparecerán aquí...</p>
            ) : (
              logs.map((log, index) => (
                <div 
                  key={index} 
                  className={`mb-1 ${
                    log.includes('❌') ? 'text-red-400' :
                    log.includes('✅') ? 'text-green-400' :
                    log.includes('🎤') ? 'text-blue-400' :
                    log.includes('FINAL') ? 'text-yellow-400' :
                    log.includes('INTERIM') ? 'text-gray-400' :
                    'text-white/80'
                  }`}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Panel de Información */}
      <div className="max-w-6xl mx-auto mt-6 bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
        <h2 className="text-xl font-bold text-white mb-4">ℹ️ Información</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-bold text-[#6cb79a] mb-2">Estado Actual:</h3>
            <ul className="space-y-1 text-white/80">
              <li>• Grabando: {isRecording ? 'Sí' : 'No'}</li>
              <li>• Boundary actual: {finalBoundaryRef.current}</li>
              <li>• Texto estable: "{stableTextRef.current}"</li>
              <li>• Último final: "{lastFinalRef.current}"</li>
              <li>• Recognition disponible: {recognition ? 'Sí' : 'No'}</li>
              <li>• Modo continuo: {!/Edg/.test(navigator.userAgent) ? 'Sí' : 'No (Edge)'}</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-[#6cb79a] mb-2">Instrucciones:</h3>
            <ul className="space-y-1 text-white/80">
              <li>1. Presiona "Grabar" para iniciar</li>
              <li>2. Habla claramente cerca del micrófono</li>
              <li>3. Los logs muestran el proceso interno</li>
              <li>4. Verifica que no haya duplicación de texto</li>
              <li>5. Prueba pausar y reanudar la grabación</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranscriptionTest;