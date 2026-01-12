// Seccion principal para modificar el registro diario
document.getElementById('fecha').valueAsDate = new Date();

// campos para cambiar la funcion
document.getElementById('origen').addEventListener('change', function () {
    const inputOtro = document.getElementById('origenOtro');
    if (this.value === 'Otros') {
        inputOtro.style.display = 'block';
        inputOtro.focus();
    } else {
        inputOtro.style.display = 'none';
        inputOtro.value = ''; // borrar
    }
});

document.getElementById('tipo').addEventListener('change', function () {
    const inputTipoOtro = document.getElementById('tipoOtro');
    if (this.value === 'Otro') {
        inputTipoOtro.style.display = 'block';
        inputTipoOtro.focus();
    } else {
        inputTipoOtro.style.display = 'none';
        inputTipoOtro.value = ''; // borrar
    }
});

async function submitForm() {
    let origenVal = document.getElementById('origen').value;
    if (origenVal === 'Otros') {
        origenVal = document.getElementById('origenOtro').value.trim();
        // append (Otro) tag or text if desired, or just use the text value
        if (!origenVal) {
            alert('Por favor especifique el área de origen');
            document.getElementById('origenOtro').focus();
            return;
        }
    }

    let tipoVal = document.getElementById('tipo').value;
    if (tipoVal === 'Otro') {
        tipoVal = document.getElementById('tipoOtro').value.trim();
        if (!tipoVal) {
            alert('Por favor especifique el tipo de documento');
            document.getElementById('tipoOtro').focus();
            return;
        }
    }

    // Collect data
    const data = {
        fecha: document.getElementById('fecha').value,
        tipo: tipoVal,
        origen: origenVal,
        concepto: document.getElementById('concepto').value,
        folios: document.getElementById('folios').value
    };

    // Basic validation
    if (!data.origen || !data.concepto) {
        alert('Por favor complete: Origen y Concepto');
        return;
    }

    try {
        const response = await fetch('/api/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert('Documento registrado correctamente');
            window.location.href = '/'; // tecla 
        } else {
            alert('Error al guardar el documento');
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión');
    }
}
