const http = require('http');

exports.handler = async () => {
  return new Promise((resolve) => {
    http.get('http://45.84.199.149/status', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: data
      }));
    }).on('error', () => resolve({ statusCode: 500, body: '{"error":"unreachable"}' }));
  });
};
