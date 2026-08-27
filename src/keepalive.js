// keep-alive.js - Mantiene base de activa Supabase
const PROJECT_URL = 'https://tu-proyecto.supabase.co';
const SERVICE_ROLE_KEY = 'tu-service-role-key-aquí'; // O usa anon key

const pingDatabase = async () => {
  try {
    await fetch(`${PROJECT_URL}/rest/v1/?select=count`, {
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Accept': 'application/json'
      }
    });
    console.log('✅ Keep-alive ping enviado');
  } catch (error) {
    console.error('❌ Error en keep-alive:', error);
  }
};

// Ejecutar cada 5 minutos (300000ms)
const INTERVAL = 300000;

// Ejecutar inmediatamente y luego en intervalos
pingDatabase();
const intervalId = setInterval(pingDatabase, INTERVAL);

// Limpiar al cerrar la aplicación
process.on('SIGTERM', () => clearInterval(intervalId));
process.on('SIGINT', () => clearInterval(intervalId));