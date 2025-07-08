import React from 'react';
import API_CONFIG from '../../config/api.config';

const ConfigDebug = () => {
  const apiUrl = API_CONFIG.getApiUrl();
  const envApiUrl = process.env.REACT_APP_API_URL;
  const nodeEnv = process.env.NODE_ENV;
  const hostname = window.location.hostname;
  
  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-md">
      <h3 className="font-bold mb-2">🔧 Debug Config</h3>
      <div className="space-y-1">
        <p><strong>API URL usado:</strong> {apiUrl}</p>
        <p><strong>ENV API URL:</strong> {envApiUrl || 'No definido'}</p>
        <p><strong>NODE_ENV:</strong> {nodeEnv}</p>
        <p><strong>Hostname:</strong> {hostname}</p>
        <p><strong>Admin API:</strong> {apiUrl}/admin</p>
      </div>
      <button 
        onClick={() => {
          console.log('Config completa:', {
            apiUrl,
            envApiUrl,
            nodeEnv,
            hostname,
            adminEndpoint: `${apiUrl}/admin`
          });
        }}
        className="mt-2 bg-white/20 px-2 py-1 rounded text-xs hover:bg-white/30"
      >
        Log en consola
      </button>
    </div>
  );
};

export default ConfigDebug; 