
const http = require('http');

function makeRequest(path, method, body) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve(JSON.parse(data));
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTest() {
    try {
        console.log('--- Starting Verification ---');

        // 1. Create a document
        console.log('1. Creating test document...');
        const newDoc = await makeRequest('/api/documents', 'POST', {
            fecha: '2026-01-01',
            tipo: 'Test',
            origen: 'Test Origin',
            concepto: 'Test Concept',
            fechaDespacho: '2026-01-02',
            ubicacion: 'Test Loc',
            folios: '1',
            cargo: 'Test Cargo'
        });
        console.log('   Document created:', newDoc.id);

        // 2. Update to empty strings (simulating the bug fix)
        console.log('2. Updating fields to empty strings...');
        const updateResponse = await makeRequest('/api/documents/update-location', 'POST', {
            id: newDoc.id,
            ubicacion: '',
            fechaDespacho: '',
            cargo: '',
            observaciones: 'Updated to empty'
        });
        console.log('   Update response success:', updateResponse.success);
        console.log('   Updated doc:', updateResponse.doc);

        // 3. Verify
        if (updateResponse.doc.fechaDespacho === '' && updateResponse.doc.cargo === '') {
            console.log('✅ SUCCESS: Fields updated to empty strings correctly.');
        } else {
            console.error('❌ FAILURE: Fields were NOT updated to empty strings.');
            console.error('Expected empty strings, got:', {
                fechaDespacho: updateResponse.doc.fechaDespacho,
                cargo: updateResponse.doc.cargo
            });
        }

    } catch (error) {
        console.error('Error during test:', error.message);
    }
}

runTest();
