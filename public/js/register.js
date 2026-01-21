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

// Remove error class on input
document.querySelectorAll('.form-input, .form-select').forEach(input => {
    input.addEventListener('input', function () {
        this.classList.remove('input-error');
    });
    input.addEventListener('change', function () {
        this.classList.remove('input-error');
    });
});

// PDF File Input Logic
const pdfInput = document.getElementById('pdfFile');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const clearFileBtn = document.getElementById('clearFileBtn');

pdfInput.addEventListener('change', function () {
    if (this.files && this.files.length > 0) {
        fileNameDisplay.textContent = this.files[0].name;
        clearFileBtn.style.display = 'inline-block';
    } else {
        fileNameDisplay.textContent = 'Ningún archivo seleccionado';
        clearFileBtn.style.display = 'none';
    }
});

clearFileBtn.addEventListener('click', function () {
    pdfInput.value = ''; // Clear the input
    fileNameDisplay.textContent = 'Ningún archivo seleccionado';
    clearFileBtn.style.display = 'none';
});

async function submitForm() {
    let hasError = false;

    // Helper to highlight error
    const showError = (id, message) => {
        const el = document.getElementById(id);
        el.classList.add('input-error');
        // Optional: Focus first error
        if (!hasError) el.focus();
        hasError = true;
    };

    let origenVal = document.getElementById('origen').value;
    if (origenVal === 'Otros') {
        origenVal = document.getElementById('origenOtro').value.trim();
        if (!origenVal) {
            showError('origenOtro');
        }
    } else if (!origenVal) { // Check if select is empty/default
        showError('origen');
    }

    let tipoVal = document.getElementById('tipo').value;
    if (tipoVal === 'Otro') {
        tipoVal = document.getElementById('tipoOtro').value.trim();
        if (!tipoVal) {
            showError('tipoOtro');
        }
    } else {
        const numInforme = document.getElementById('numeroInforme').value.trim();
        if (!numInforme) {
            showError('numeroInforme');
        }
        let baseType = tipoVal.replace(/:$/, '').trim();
        tipoVal = `${baseType}: N° ${numInforme}`;
    }

    const nombre = document.getElementById('nombre');
    if (!nombre.value.trim()) showError('nombre');

    const concepto = document.getElementById('concepto');
    if (!concepto.value.trim()) showError('concepto');

    const folios = document.getElementById('folios');
    // Folios might be optional but let's assume required based on previous code
    // If not strictly required previously, we can skip or keep it strict. 
    // Previous code didn't explicitly check folios in the "Basic validation" block, 
    // but the screenshot alert said "Origen, Nombre y Concepto". I'll stick to those 3 strict ones + logic for type/origin.

    if (hasError) {
        Swal.fire({
            icon: 'warning',
            title: 'Campos Incompletos',
            text: 'Por favor, complete los campos marcados en rojo.',
            confirmButtonColor: '#2563eb'
        });
        return;
    }

    // Collect data using FormData for multipart/form-data
    const formData = new FormData();
    formData.append('fecha', document.getElementById('fecha').value);
    formData.append('tipo', tipoVal);
    formData.append('nombre', nombre.value);
    formData.append('origen', origenVal);
    formData.append('concepto', concepto.value);
    formData.append('folios', folios.value);

    // Append file if selected
    const pdfFile = document.getElementById('pdfFile').files[0];
    if (pdfFile) {
        formData.append('pdfFile', pdfFile);
    }

    try {
        const response = await fetch('/api/documents', {
            method: 'POST',
            // headers: { 'Content-Type': 'application/json' }, // Remove Content-Type for FormData
            body: formData
        });

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: '¡Registrado!',
                text: 'El documento se ha guardado correctamente.',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                window.location.href = '/';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Hubo un problema al guardar el documento.'
            });
        }
    } catch (error) {
        console.error(error);
        Swal.fire({
            icon: 'error',
            title: 'Error en la conexion',
            text: 'No se puedo conectar con el servidor'
        });
    }
}
// Fetch User Info for Sidebar
async function fetchUserInfo() {
    try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        if (data.authenticated && data.user) {
            const userNameElement = document.getElementById('sidebar-username');
            if (userNameElement) {
                userNameElement.textContent = data.user.name || data.user.username;
            }
        }
    } catch (error) {
        console.error('Error fetching user info:', error);
    }
}

// Call on startup
document.addEventListener('DOMContentLoaded', fetchUserInfo);
