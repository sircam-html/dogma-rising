const http = require('http');
let lastCall = 0;  

exports.handler = async () => {
  const now = Date.now();  

  if (now - lastCall < 1800000) {
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ status: 'ok', cached: true })
    };
  }
  
  lastCall = now;
  
  // Tu código original (solo ejecuta cada 30 min)
  return new Promise((resolve) => {
    http.get('http://45.84.199.149/status', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: data
      }));
    }).on('error', () => resolve({
      statusCode: 500, 
      body: JSON.stringify({ error: 'unreachable' })
    }));
  });
};
