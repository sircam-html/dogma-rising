const http = require('http');
let lastPlayersData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 300000;  // ← 300 SECONDS (was 30s)

exports.handler = async () => {
  const now = Date.now();  
 
  if (lastPlayersData && (now - lastFetchTime < CACHE_DURATION)) {
    return {
      statusCode: 200,
      headers: { 
        'Access-Control-Allow-Origin': '*', 
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=300'  // ← 300 SECONDS (was 30s)
      },
      body: lastPlayersData
    };
  }  
 
  return new Promise((resolve) => {
    http.get('http://45.84.199.149/status', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        lastPlayersData = data;
        lastFetchTime = now;
        resolve({
          statusCode: 200,
          headers: { 
            'Access-Control-Allow-Origin': '*', 
            'Content-Type': 'application/json',
            'Cache-Control': 'max-age=300'  // ← 300 SECONDS (was 30s)
          },
          body: data
        });
      });
    }).on('error', () => resolve({ 
      statusCode: 500, 
      body: JSON.stringify({ error: 'unreachable' }) 
    }));
  });
};
