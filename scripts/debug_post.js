const http = require('http');

const data = JSON.stringify({
    fecha: '2026-01-09',
    tipo: 'Solicitud',
    origen: 'Area Prueba',
    concepto: 'Test Debug',
    folios: '1'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/documents',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);

    let body = '';
    res.on('data', (chunk) => {
        body += chunk;
    });

    res.on('end', () => {
        console.log('Response Body:', body);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
