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
    const inputNumeroInforme = document.getElementById('numeroInforme');

    // Reset visibility
    inputTipoOtro.style.display = 'none';
    inputNumeroInforme.style.display = 'none';

    if (this.value === 'Otro') {
        inputTipoOtro.style.display = 'block';
        inputTipoOtro.focus();
    } else {
        // For all other options (FUT, INFORME, CARTA, etc.) show the number input
        inputNumeroInforme.style.display = 'block';
        inputNumeroInforme.focus();
    }

    if (this.value !== 'Otro') {
        // clear other input if satisfied
        inputTipoOtro.value = '';
    } else {
        inputNumeroInforme.value = '';
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
    } else {
        // For standard types, append the number/code
        const numInforme = document.getElementById('numeroInforme').value.trim();
        if (!numInforme) {
            alert('Por favor ingrese el N° o Código del documento');
            document.getElementById('numeroInforme').focus();
            return;
        }
        // Remove trailing colon if present (e.g. "INFORME:") and trim whitespace
        let baseType = tipoVal.replace(/:$/, '').trim();
        tipoVal = `${baseType}: N° ${numInforme}`;
    }

    // Collect data
    const data = {
        fecha: document.getElementById('fecha').value,
        tipo: tipoVal,
        nombre: document.getElementById('nombre').value,
        origen: origenVal,
        concepto: document.getElementById('concepto').value,
        folios: document.getElementById('folios').value
    };

    // Basic validation
    if (!data.origen || !data.concepto || !data.nombre) {
        alert('Por favor complete: Origen, Nombre y Concepto');
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
