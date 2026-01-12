// Load documents on startup
document.addEventListener('DOMContentLoaded', loadDocuments);

// Helper to format date YYYY-MM-DD -> DD-MM-YYYY
function formatDate(dateString) {
    if (!dateString) return '';
    // If it is a full ISO string (contains T), just take the date part
    if (dateString.includes('T')) {
        dateString = dateString.split('T')[0];
    }

    const parts = dateString.split('-');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateString;
}

// Helper to format Date and Time (DD-MM-YYYY HH:mm)
function formatDateTime(isoString) {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        // Check if date is valid
        if (isNaN(date.getTime())) return isoString;

        // If it looks like just a date (old records YYYY-MM-DD), return just date
        if (isoString.length === 10) return formatDate(isoString);

        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const y = date.getFullYear();
        const hh = date.getHours().toString().padStart(2, '0');
        const mm = date.getMinutes().toString().padStart(2, '0');

        return `${d}-${m}-${y} ${hh}:${mm}`;
    } catch (e) {
        return isoString;
    }
}

// Helper to format Date and Time on two lines (Date <br> Time)
function formatDateTimeStacked(isoString) {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return isoString;
        if (isoString.length === 10) return formatDate(isoString);

        const d = date.getDate().toString().padStart(2, '0');
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const y = date.getFullYear();
        const hh = date.getHours().toString().padStart(2, '0');
        const mm = date.getMinutes().toString().padStart(2, '0');

        return `${d}-${m}-${y}<br><span style="color: #888; font-size: 0.85em;">${hh}:${mm}</span>`;
    } catch (e) {
        return isoString;
    }
}

// cambio de '-------' a '--------' para que se vea mejor, tambien a un color rojo.
function formatEmpty(value) {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
        return '<center><span style="color: red;">--------</span></center>';
    }
    return value;
}

let allDocuments = []; // instoria de los documentos para guardar 

async function loadDocuments() {
    try {
        const response = await fetch('/api/documents');
        allDocuments = await response.json(); // guardamos las variables
        renderTable(allDocuments); // Renderisamos las actulizaciones.
    } catch (error) {
        console.error('Error loading documents:', error);
    }
}


function getBadge(status) {
    // Default to Recibido if undefined
    const s = status || 'Recibido';
    let className = 'badge-received';

    if (s === 'Derivado') className = 'badge-derived';
    if (s === 'Finalizado') className = 'badge-finalized';

    return `<span class="badge ${className}">${s}</span>`;
}

// Render table with specific set of documents
function renderTable(documents) {
    const tbody = document.getElementById('documentsTableBody');
    tbody.innerHTML = '';

    documents.forEach(doc => {
        const row = document.createElement('tr');
        // Pass all needed data to openModal including cargo and fechaDespacho
        // Safe quoting for strings
        const safeId = doc.id;
        const safeFecha = doc.fechaDespacho || '';
        const safeUbicacion = doc.ubicacion || '';
        const safeCargo = doc.cargo || '';
        const safeStatus = doc.status || 'Recibido';

        // Format dates for display
        const displayFecha = formatDate(doc.fecha);
        const displayFechaDespacho = formatDate(safeFecha);

        row.innerHTML = `
            <td data-label="N° Corr." style="font-weight: bold; color: var(--primary-color);">${doc.id}</td>
            <td data-label="Recepción">${formatEmpty(displayFecha)}</td>
            <td data-label="Tipo">${formatEmpty(doc.tipo)}</td>
            <td data-label="Área Origen">${formatEmpty(doc.origen)}</td>
            <td data-label="Concepto">${formatEmpty(doc.concepto)}</td>
            <td data-label="Despacho">${formatEmpty(displayFechaDespacho)}</td>
            <td data-label="Área de derivacion">${formatEmpty(safeUbicacion)}</td>
            <td data-label="Folios">${formatEmpty(doc.folios)}</td>
            <td data-label="Cargo">${formatEmpty(safeCargo)}</td>
            <td data-label="Estado">${getBadge(safeStatus)}</td>
            <td>
                <div style="display: flex; gap: 5px; justify-content: center;">
                    <button class="btn-icon edit" onclick="openModal('${safeId}', '${safeFecha}', '${safeUbicacion}', '${safeCargo}')" title="Editar">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button class="btn-icon view" onclick="viewHistory('${safeId}')" title="Ver Ruta / Seguimiento" style="color: var(--accent-color);">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Generar los eventos 
document.addEventListener('DOMContentLoaded', () => {
    const filterType = document.getElementById('filterType');
    const filterArea = document.getElementById('filterArea');
    const searchInput = document.getElementById('searchInput');

    // Unified Filter Function
    function applyFilters() {
        const selectedType = filterType ? filterType.value.toLowerCase() : '';
        const selectedArea = filterArea ? filterArea.value.toLowerCase() : '';
        const searchValue = searchInput ? searchInput.value.toLowerCase() : '';

        const filtered = allDocuments.filter(doc => {
            // Filter by Type
            const matchesType = selectedType === '' || (doc.tipo && doc.tipo.toLowerCase() === selectedType);

            // Filter by Area (Partial match on Origen)
            const matchesArea = selectedArea === '' || (doc.origen && doc.origen.toLowerCase().includes(selectedArea));

            // Filter by Search Text (Concepto, Origen, Cargo)
            const matchesSearch = searchValue === '' ||
                (doc.concepto && doc.concepto.toLowerCase().includes(searchValue)) ||
                (doc.origen && doc.origen.toLowerCase().includes(searchValue)) ||
                (doc.cargo && doc.cargo.toLowerCase().includes(searchValue));

            return matchesType && matchesArea && matchesSearch;
        });

        renderTable(filtered);
    }

    // Attach listeners
    if (filterType) filterType.addEventListener('change', applyFilters);
    if (filterArea) filterArea.addEventListener('change', applyFilters);
    if (searchInput) searchInput.addEventListener('input', applyFilters);
});

function openModal(docId, fecha, ubicacion, cargo) {
    document.getElementById('updateModal').style.display = 'block';
    document.getElementById('modalDocId').value = docId;
    const inputs = ['modalFechaDespacho', 'modalNewLocation', 'modalCargo'];

    // Clear previous errors
    inputs.forEach(id => {
        const el = document.getElementById(id);
        el.classList.remove('input-error');
        // Remove old listeners to avoid duplicates (cloneNode is a simple way, or just add logic inside)
        // ideally we define listeners outside, but for now specific clearing on focus
        el.oninput = function () { this.classList.remove('input-error'); };
        el.onchange = function () { this.classList.remove('input-error'); };
    });

    const fFecha = document.getElementById('modalFechaDespacho');
    const fUbicacion = document.getElementById('modalNewLocation');
    const fCargo = document.getElementById('modalCargo');

    fFecha.value = fecha;
    fUbicacion.value = ubicacion;
    fCargo.value = cargo;
    document.getElementById('modalObs').value = '';
    // Reset Checkbox
    document.getElementById('modalFinalize').checked = false;

    // Highlight empty fields immediately
    if (!fecha) fFecha.classList.add('input-error');
    if (!ubicacion) fUbicacion.classList.add('input-error');
    if (!cargo) fCargo.classList.add('input-error');
    /// falta agegar un filtro para ver el tipo de configuracon dek
}

function closeModal() {
    document.getElementById('updateModal').style.display = 'none';
}

// cambios que necesitamos para hacer que las configuraciones sena mayores.
async function saveLocationUpdate() {
    const docId = document.getElementById('modalDocId').value;
    const newLocation = document.getElementById('modalNewLocation').value;
    const newFecha = document.getElementById('modalFechaDespacho').value;
    const newCargo = document.getElementById('modalCargo').value;
    const obs = document.getElementById('modalObs').value;
    const isFinalize = document.getElementById('modalFinalize').checked;

    const inputs = {
        'modalFechaDespacho': newFecha,
        'modalNewLocation': newLocation,
        'modalCargo': newCargo
    };

    let hasError = false;
    for (const [id, value] of Object.entries(inputs)) {
        if (!value || value.trim() === '') {
            document.getElementById(id).classList.add('input-error');
            hasError = true;
        }
    }

    if (hasError) {
        alert('Por favor, complete todos los campos marcados en rojo para actualizar.');
        return;
    }

    try {
        const response = await fetch('/api/documents/update-location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: docId,
                ubicacion: newLocation,
                fechaDespacho: newFecha,
                cargo: newCargo,
                observaciones: obs,
                finalize: isFinalize
            })
        });

        if (response.ok) {
            alert('Ubicación actualizada correctamente');
            closeModal();
            loadDocuments(); // cargar tabla de datos 
        } else {
            alert('Error al actualizar');
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión');
    }
}

// Cerrar modal


function viewHistory(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) return;

    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = '';

    // If no history exists, create a synthetic one from current data or show empty
    const history = doc.history || [{
        date: doc.fecha,
        action: 'Registro Inicial',
        from: 'Exterior',
        to: doc.origen,
        cargo: 'Mesa de partes',
        observation: 'Sin historial detallado'
    }];

    // Sort by date descending (newest first) or ascending? Identifying flow usually ascending.
    // Let's keep it as is (insertion order).

    history.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDateTimeStacked(item.date)}</td>
            <td>${formatEmpty(item.action)}</td>
            <td>${formatEmpty(item.from)}</td>
            <td>${formatEmpty(item.to)}</td>
            <td>${formatEmpty(item.cargo)}</td>
            <td>${formatEmpty(item.observation)}</td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById('historyModal').style.display = 'block';
}

function closeHistoryModal() {
    document.getElementById('historyModal').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function (event) {
    var updateModal = document.getElementById('updateModal');
    var historyModal = document.getElementById('historyModal');
    if (event.target == updateModal) {
        updateModal.style.display = "none";
    }
    if (event.target == historyModal) {
        historyModal.style.display = "none";
    }
}
