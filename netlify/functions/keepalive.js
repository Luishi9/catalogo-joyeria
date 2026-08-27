export default async function handler(event, context) {
  const supabaseUrl = event.context.supabaseUrl || 'https://tu-proyecto.supabase.co';
  const supabaseKey = event.headers?.Authorization || 'anon';

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/?select=count`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Accept': 'application/json',
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        status: 'ok', 
        message: 'Keep-alive ping exitoso',
        timestamp: new Date().toISOString() 
      }),
    };
  } catch (error) {
    console.error('Keep-alive error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        status: 'error', 
        message: error.message 
      }),
    };
  }
}