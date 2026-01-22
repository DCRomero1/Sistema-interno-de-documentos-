async function test() {
    try {
        const response = await fetch('http://localhost:3000/api/workers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: "Test User Node",
                dni: "99999999",
                email: "testnode@vigil.edu.pe",
                position: "Docente",
                phone: "987654321",
                birthDate: "1995-05-15"
            })
        });
        const result = await response.json();
        console.log('Insert Result:', result);
    } catch (e) {
        console.error('Fetch Error:', e);
    }
}
test();
