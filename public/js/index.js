let editMode = false;

// Load documents on startup
document.addEventListener('DOMContentLoaded', () => {
    loadDocuments();
    fetchUserInfo();
});

// Helper to extract display ID (remove year suffix)
function getDisplayId(fullId) {
    if (!fullId) return '';
    // Handle legacy IDs (no year suffix)
    if (!fullId.includes('-')) return fullId;

    // Extract number part (and suffix if exists) from "XXX[-S]-YYYY" format
    const parts = fullId.split('-');
    if (parts.length > 1) {
        // Remove the last part (year) and join the rest
        parts.pop();
        return parts.join('-');
    }
    return fullId;
}

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
// Helper to escape HTML characters (XSS Prevention)
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Helper to clean empty data
function formatEmpty(value) {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
        return '<div style="text-align: center; color: #db0e0eff; font-size: 1.5rem; line-height: 1;">&mdash;</div>';
    }
    return escapeHtml(value);
}

let allDocuments = []; // instoria de los documentos para guardar
async function loadDocuments() {
    try {
        const response = await fetch('/api/documents');
        allDocuments = await response.json(); // guardamos las variables
        renderTable(allDocuments); // Renderisamos las actulizaciones.
        // Populate dynamic filters if function is ready
        if (window.populateFilters) {
            window.populateFilters(allDocuments);
        }
    } catch (error) {
        console.error('Error loading documents:', error);
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



function getBadge(status) {
    // Default to Recibido if undefined
    const s = status || 'Recibido';
    let className = 'badge-received';

    if (s === 'Derivado') className = 'badge-derived';
    if (s === 'Finalizado') className = 'badge-finalized';

    return `<span class="badge ${className}">${s}</span>`;
}

// Helper for Type Column (Bold Type + Light Number)
function formatStackedType(typeString) {
    if (!typeString) return formatEmpty(typeString);

    // Check if it contains ":" to split
    if (typeString.includes(':')) {
        const parts = typeString.split(':');
        const type = parts[0].trim();
        const number = parts.slice(1).join(':').trim(); // Join rest in case of multiple colons

        return `
            <div style="line-height: 1.2;">
                <span style="font-weight: 700; color: #374151; font-size: 0.8rem; text-transform: uppercase;">${escapeHtml(type)}:</span><br>
                <span style="color: #6b7280; font-size: 0.75rem;">${escapeHtml(number)}</span>
            </div>
        `;
    }

    return formatEmpty(typeString);
}


// Helper for Remitter Column (Avatar + Stacked Name)
function formatRemitter(name) {
    if (!name) return formatEmpty(name);

    // 1. Get Initials (First letter of first 2 words)
    const words = name.trim().split(/\s+/);
    let initials = '';
    if (words.length > 0) initials += words[0][0];
    if (words.length > 1) initials += words[1][0];
    initials = initials.toUpperCase();

    // 2. Split Name (First Name + Rest)
    // Heuristic: First word is "Name", rest is "Surname"
    // If only one word, just show it.
    let mainName = words[0];
    let subName = words.slice(1).join(' ');

    // Colors for avatar background (random-ish based on first letter char code)
    const colors = ['#e0f2fe', '#fce7f3', '#dcfce7', '#fef9c3', '#f3f4f6'];
    const textColors = ['#0369a1', '#be185d', '#15803d', '#a16207', '#4b5563'];

    const charCode = mainName.charCodeAt(0) || 0;
    const colorIndex = charCode % colors.length;
    const bgColor = colors[colorIndex];
    const textColor = textColors[colorIndex];

    return `
        <div class="remitter-wrapper" style="display: flex; align-items: center; gap: 10px;">
            <div class="table-avatar" style="
                width: 35px; 
                height: 35px; 
                border-radius: 50%; 
                background-color: ${bgColor}; 
                color: ${textColor}; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                font-weight: 600; 
                font-size: 0.8rem;
                flex-shrink: 0;
            ">${initials}</div>
            <div class="remitter-info" style="display: flex; flex-direction: column; line-height: 1.2;">
                <span class="remitter-name-main" style="font-weight: 600; color: var(--text-main); font-size: 0.9em;">${escapeHtml(mainName)}</span>
                <span class="remitter-name-sub" style="color: var(--text-secondary); font-size: 0.8em;">${escapeHtml(subName)}</span>
            </div>
        </div>
    `;
}

// Render table with specific set of documents
function renderTable(documents) {
    const tbody = document.getElementById('documentsTableBody');
    tbody.innerHTML = '';

    documents.forEach(doc => {
        const row = document.createElement('tr');
        // Pass all needed data to openModal including cargo and fechaDespacho
        const safeId = doc.id;
        const safeFecha = doc.fechaDespacho || '';
        const safeUbicacion = doc.ubicacion || '';
        const safeCargo = doc.cargo || '';
        const safeStatus = doc.status || 'Recibido';

        // Check if there are multiple derivations for this document on the same dispatch date
        // Determine Cargo Display based on the LATEST history entry
        let cargoDisplay = formatEmpty(safeCargo);

        let cargo1 = safeCargo;
        let loc1 = safeUbicacion;
        let cargo2 = '';
        let loc2 = '';

        if (doc.history && doc.history.length > 0) {
            // 1. Filter relevant history entries (Derivations/Finalizations that have a cargo)
            const derivations = doc.history.filter(h =>
                h.action && (h.action.includes('Derivación') || h.action.includes('Finalización') || h.action.includes('Recepción')) && h.cargo
            );

            if (derivations.length > 0) {
                // 2. Sort descending by date to find the absolute latest action
                derivations.sort((a, b) => new Date(b.date) - new Date(a.date));
                const latestDate = derivations[0].date;

                // 3. Filter all derivations that match this LATEST date exactly
                // This captures simultaneous derivations (which share the exact same timestamp)
                const latestDerivations = derivations.filter(h => h.date === latestDate);

                if (latestDerivations.length > 0) {
                    cargo1 = latestDerivations[0].cargo || cargo1;
                    loc1 = latestDerivations[0].to || loc1;
                    
                    if (latestDerivations.length > 1) {
                        cargo2 = latestDerivations[1].cargo || '';
                        loc2 = latestDerivations[1].to || '';
                    }

                    const cargos = latestDerivations.map(d => d.cargo).filter(c => c);
                    // Remove duplicates just in case
                    const uniqueCargos = [...new Set(cargos)];

                    if (uniqueCargos.length > 0) {
                        cargoDisplay = `<div style="display: flex; flex-direction: column; gap: 4px;">
                            ${uniqueCargos.map((c, index) => `<span class="cargo-badge cargo-badge-${index % 5}">${escapeHtml(c)}</span>`).join('')}
                        </div>`;
                    }
                }
            }
        }

        // Format dates for display
        const displayFecha = formatDate(doc.fecha);
        const displayFechaDespacho = formatDate(safeFecha);

        // Display only the number part of the ID (e.g., 001 instead of 001-2026)
        const displayId = getDisplayId(doc.id);

        row.innerHTML = `
            <td data-label="N° Corr." style="font-weight: bold; color: var(--primary-color);">${displayId}</td>
            <td data-label="Recepción">${formatEmpty(displayFecha)}</td>
            <td data-label="Tipo" data-field="tipo" class="editable-field">${formatStackedType(doc.tipo)}</td>
            <td data-label="Remitente" data-field="nombre" class="editable-field">${formatRemitter(doc.nombre)}</td>
            <td data-label="Área Origen">${formatEmpty(doc.origen)}</td>
            <td data-label="Concepto" data-field="concepto" class="editable-field">${formatEmpty(doc.concepto)}</td>
            <td data-label="Despacho">${formatEmpty(displayFechaDespacho)}</td>
            <td data-label="Área de derivacion">${formatEmpty(safeUbicacion)}</td>
            <td data-label="Folios" data-field="folios" class="editable-field">${formatEmpty(doc.folios)}</td>
            <td data-label="Cargo">${cargoDisplay}</td>
            <td data-label="Estado">${getBadge(safeStatus)}</td>
            <td>
                <div class="action-menu-container">
                    <button class="btn-kebab" onclick="toggleDropdown(event, '${safeId}')" title="Acciones">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                    <div id="dropdown-${safeId}" class="action-dropdown">
                        <button class="action-item" onclick="openModal('${safeId}', '${safeFecha}', '${escapeHtml(loc1)}', '${escapeHtml(cargo1)}', '${escapeHtml(loc2)}', '${escapeHtml(cargo2)}')">
                            <i class="fa-solid fa-pen-to-square"></i> Actualizar
                        </button>
                        ${doc.pdf_path ?
                `<a href="${doc.pdf_path}" target="_blank" class="action-item">
                                <i class="fa-solid fa-file-pdf"></i> Ver PDF
                             </a>
                             <button class="action-item delete" onclick="deletePdf('${safeId}')">
                                <i class="fa-solid fa-trash-can"></i> Eliminar PDF
                             </button>`
                :
                `<button class="action-item" onclick="openUploadModal('${safeId}')">
                                <i class="fa-solid fa-cloud-arrow-up"></i> Subir archivo
                             </button>`
            }
                        <button class="action-item" onclick="viewHistory('${safeId}')">
                             <i class="fa-solid fa-clock-rotate-left"></i> Historial
                        </button>
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Upload Modal Functions
function openUploadModal(docId) {
    document.getElementById('uploadModal').style.display = 'block';
    document.getElementById('uploadDocId').value = docId;
    document.getElementById('pdfFile').value = ''; // Reset file input
}

function closeUploadModal() {
    document.getElementById('uploadModal').style.display = 'none';
}

async function submitUpload() {
    const docId = document.getElementById('uploadDocId');
    const fileInput = document.getElementById('pdfFile');
    const file = fileInput.files[0];

    if (!file) {
        Swal.fire('Error', 'Por favor seleccione un archivo PDF', 'warning');
        return;
    }

    const formData = new FormData();
    formData.append('pdfFile', file);

    try {
        const response = await fetch(`/api/documents/${docId.value}/upload`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: '¡Subido!',
                text: 'Archivo subido correctamente',
                timer: 1500,
                showConfirmButton: false
            });
            closeUploadModal();
            loadDocuments(); // Reload table to show View icon
        } else {
            Swal.fire('Error', 'Error al subir: ' + (result.message || result.error), 'error');
        }
    } catch (error) {
        console.error('Error uploading:', error);
        Swal.fire('Error', 'Error de conexión', 'error');
    }
}

async function deletePdf(docId) {
    const result = await Swal.fire({
        title: '¿Eliminar PDF?',
        text: "Esta acción no se puede deshacer.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch(`/api/documents/${docId}/pdf`, {
                method: 'DELETE'
            });

            const data = await response.json();
            if (response.ok && data.success) {
                Swal.fire(
                    '¡Eliminado!',
                    'El archivo PDF ha sido eliminado.',
                    'success'
                );
                loadDocuments(); // Reload table
            } else {
                Swal.fire('Error', data.error || 'No se pudo eliminar', 'error');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Error de conexión', 'error');
        }
    }
}

// Close upload modal when clicking outside
window.addEventListener('click', function (event) {
    const um = document.getElementById('uploadModal');
    if (event.target == um) {
        closeUploadModal();
    }
});

// Generar los eventos 
document.addEventListener('DOMContentLoaded', () => {
    const filterStatus = document.getElementById('filterStatus');

    let editMode = false; // State variable for edit mode

    // Modal Logic...
    
    // Edit Mode Toggle
    const btnEditMode = document.getElementById('btnEditMode');
    if (btnEditMode) {
        btnEditMode.addEventListener('click', () => {
            editMode = !editMode;
            if (editMode) {
                document.body.classList.add('inline-edit-active');
                btnEditMode.innerHTML = '<i class="fa-solid fa-check"></i> <span class="font-bold">Finalizar Edición</span>';
                btnEditMode.style.backgroundColor = '#dc2626'; // red-600
                Swal.fire({
                    title: 'Modo Edición Activado',
                    text: 'Haz clic en Tipo, Remitente, Concepto o Folios para editar su valor.',
                    icon: 'info',
                    timer: 3000,
                    showConfirmButton: false
                });
            } else {
                document.body.classList.remove('inline-edit-active');
                btnEditMode.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> <span>Activar Edición</span>';
                btnEditMode.style.backgroundColor = '#2563eb'; // blue-600
                // Re-render table to ensure all inputs are removed and original content is restored
                renderTable(allDocuments);
            }
        });
    }

    // Inline Editing Logic
    document.getElementById('documentsTableBody').addEventListener('click', (e) => {
        if (!editMode) return;

        // Ensure we clicked inside an editable field td
        const td = e.target.closest('td.editable-field');
        if (!td) return;
        
        // Prevent editing if already editing this cell
        if (td.querySelector('input')) return;

        const tr = td.closest('tr');
        // Extract docId from the first action-item button's onclick attribute
        const docIdFull = tr.querySelector('.action-menu-container .action-dropdown .action-item').getAttribute('onclick').match(/'([^']+)'/)[1];
        const fieldName = td.dataset.field;

        // We need the raw original value, which we can find by finding the doc object
        const doc = allDocuments.find(d => d.id === docIdFull);
        if (!doc) return;

        let originalValue = doc[fieldName] || '';
        
        if (fieldName === 'fecha') {
            // For date, format to YYYY-MM-DD for input type date
            if (originalValue.includes('T')) originalValue = originalValue.split('T')[0];
        }

        // Save original HTML to restore if cancelled
        const originalHTML = td.innerHTML;

        // Create input element
        td.innerHTML = '';
        const input = document.createElement('input');
        input.type = fieldName === 'fecha' ? 'date' : (fieldName === 'folios' ? 'number' : 'text');
        input.value = originalValue;
        input.className = 'inline-edit-input form-input';
        input.style.width = '100%';
        input.style.minWidth = '100px';
        input.style.padding = '4px 8px';
        input.style.fontSize = '0.9rem';

        td.appendChild(input);
        input.focus();

        // Handle Save
        const saveEdit = async () => {
            const newValue = input.value.trim();
            if (newValue === originalValue) {
                renderTable(allDocuments); // Simply re-render to restore original format
                return;
            }

            try {
                const bodyData = {};
                bodyData[fieldName] = newValue;

                const response = await fetch(`/api/documents/${docIdFull}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bodyData)
                });

                if (response.ok) {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'Campo actualizado',
                        showConfirmButton: false,
                        timer: 1500
                    });
                    // Reload data silently
                    await loadDocuments(); 
                } else {
                    Swal.fire('Error', 'No se pudo actualizar', 'error');
                    renderTable(allDocuments);
                }
            } catch (error) {
                console.error('Error updating inline:', error);
                Swal.fire('Error', 'Error de conexión', 'error');
                renderTable(allDocuments);
            }
        };

        // Events
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur(); // Triggers saveEdit
            } else if (e.key === 'Escape') {
                renderTable(allDocuments); // Cancel
            }
        });
    });


    // Populate Dynamic Filters
    // Populate Dynamic Filters
    function populateFilters(documents) {
        // Defined official areas
        const officialAreas = [
            "Consejo Asesor",
            "Tesoreria-Caja",
            "Area de Administración",
            "Area de Calidad",
            "Secretaría Académica",
            "Unidad Académica",
            "Unidad de Formación Continua",
            "Unidad de Bienestar y Empleabilidad",
            "Unidad de investigación"
        ];

        // Populate Area Select with Official Areas
        filterArea.innerHTML = '<option value="">Áreas</option>';
        officialAreas.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a;
            opt.textContent = a;
            filterArea.appendChild(opt);
        });
    }

    // Expose popular filters to loadDocuments
    window.populateFilters = populateFilters;

    // Unified Filter Function
    function applyFilters() {
        const selectedArea = filterArea ? filterArea.value.toLowerCase() : '';
        const selectedStatus = filterStatus ? filterStatus.value : '';
        const searchValue = searchInput ? searchInput.value.toLowerCase() : '';

        const filtered = allDocuments.filter(doc => {
            // 2. Filter by Area
            const matchesArea = selectedArea === '' || (doc.origen && doc.origen.toLowerCase().includes(selectedArea));

            // 3. Filter by Status
            const docStatus = doc.status || 'Recibido'; // Default
            const matchesStatus = selectedStatus === '' || docStatus === selectedStatus;

            // 5. Global Search (ID, Remitente, Concepto, Cargo, Origen)
            const matchesSearch = searchValue === '' ||
                (doc.id && doc.id.toLowerCase().includes(searchValue)) ||
                (doc.nombre && doc.nombre.toLowerCase().includes(searchValue)) ||
                (doc.concepto && doc.concepto.toLowerCase().includes(searchValue)) ||
                (doc.origen && doc.origen.toLowerCase().includes(searchValue)) ||
                (doc.cargo && doc.cargo.toLowerCase().includes(searchValue)) ||
                (doc.tipo && doc.tipo.toLowerCase().includes(searchValue));

            return matchesArea && matchesStatus && matchesSearch;
        });

        renderTable(filtered);
    }

    // Auto-select area based on cargo
    const cargoToAreaMap = {
        // Consejo Asesor
        "Consejo Asesor": "Consejo Asesor",

        // Area de Administración
        "Especialista administrativo": "Area de Administración",
        "Contador": "Area de Administración",
        "Recursos Humanos": "Area de Administración",
        "Administrador": "Area de Administración",
        "Abastecimiento": "Area de Administración",
        "Almacén": "Area de Administración",
        "Patrimonio": "Area de Administración",
        "Producción": "Area de Administración",
        "Técnico de campo": "Area de Administración",
        "Especialista en comunicaciones y software": "Area de Administración",
        "Especialista en Hardware": "Area de Administración",
        "Técnico Administrativo": "Area de Administración",
        "Técnico de biblioteca": "Area de Administración",
        "Auxiliar de biblioteca": "Area de Administración",
        "Mesa de partes": "Area de Administración",
        "Asistente administrativo": "Area de Administración",
        "Seguridad y vigilancia": "Area de Administración",
        "Limpieza y mantenimiento": "Area de Administración",
        "Caja": "Tesoreria-Caja",
        "Tesoreria-Caja": "Tesoreria-Caja",
        "Tesoreria": "Tesoreria-Caja",
        "Personal De Turno": "Area de Administración",
        "Jefatura de Unidad Administrativa": "Area de Administración",
        "Secretaria": "Area de Administración",
        "Oficinista II": "Area de Administración",

        // Area de Calidad
        "Area de Calidad": "Area de Calidad",

        // Secretaría Académica
        "Programador de Sistemas PAD": "Secretaría Académica",

        // Unidad Académica
        "Coordinadores de Área Académica de los programas de estudio": "Unidad Académica",
        "Docente extraordiario": "Unidad Académica",
        "Docente Altamente especializado": "Unidad Académica",
        "Docente Regular de Competencias especificas": "Unidad Académica",
        "Docente Regular de Competencias para la Empleabilidad": "Unidad Académica",

        // Unidad de Formación Continua
        "Unidad de Formación Continua": "Unidad de Formación Continua",

        // Unidad de Bienestar y Empleabilidad
        "Servicio Médico(Tópico)": "Unidad de Bienestar y Empleabilidad",
        "Servicio de Bienestar(Consejeria)": "Unidad de Bienestar y Empleabilidad",
        "Servicio psicopedagógico": "Unidad de Bienestar y Empleabilidad",
        "Servicio de Empleabilidad": "Unidad de Bienestar y Empleabilidad",
        "Servicio de Asistente Social": "Unidad de Bienestar y Empleabilidad",

        // Unidad de investigación
        "Fabricacion Digital": "Unidad de investigación"
    };

    const modalCargo = document.getElementById('modalCargo');
    const modalNewLocation = document.getElementById('modalNewLocation');

    if (modalCargo && modalNewLocation) {
        modalCargo.addEventListener('change', function () {
            const selectedCargo = this.value;
            const targetArea = cargoToAreaMap[selectedCargo];

            if (targetArea) {
                // Check if the area exists in the dropdown to avoid errors
                const optionExists = Array.from(modalNewLocation.options).some(opt => opt.value === targetArea);
                if (optionExists) {
                    modalNewLocation.value = targetArea;
                    // Remove error class if present
                    modalNewLocation.classList.remove('input-error');
                }
            }
        });
    }

    // Event listener for second cargo (same logic)
    const modalCargo2 = document.getElementById('modalCargo2');
    const modalNewLocation2 = document.getElementById('modalNewLocation2');

    if (modalCargo2 && modalNewLocation2) {
        modalCargo2.addEventListener('change', function () {
            const selectedCargo = this.value;
            const targetArea = cargoToAreaMap[selectedCargo];

            if (targetArea) {
                const optionExists = Array.from(modalNewLocation2.options).some(opt => opt.value === targetArea);
                if (optionExists) {
                    modalNewLocation2.value = targetArea;
                    modalNewLocation2.classList.remove('input-error');
                }
            }
        });
    }

    // Toggle second derivation fields
    const enableSecondDerivation = document.getElementById('enableSecondDerivation');
    const secondDerivationFields = document.getElementById('secondDerivationFields');

    if (enableSecondDerivation && secondDerivationFields) {
        enableSecondDerivation.addEventListener('change', function () {
            secondDerivationFields.style.display = this.checked ? 'block' : 'none';

            // Clear second derivation fields when unchecked
            if (!this.checked) {
                if (modalCargo2) modalCargo2.value = '';
                if (modalNewLocation2) modalNewLocation2.value = '';
            }
        });
    }

    if (filterStatus) filterStatus.addEventListener('change', applyFilters);
    if (searchInput) searchInput.addEventListener('input', applyFilters);

    // Escape listener
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
});

function openModal(docId, fecha, ubicacion, cargo, loc2Param, cargo2Param) {
    document.getElementById('updateModal').style.display = 'block';
    document.getElementById('modalDocId').value = docId;
    const inputs = ['modalFechaDespacho', 'modalNewLocation', 'modalCargo', 'modalNewLocation2', 'modalCargo2'];

    // Clear previous errors
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('input-error');
            el.oninput = function () { this.classList.remove('input-error'); };
            el.onchange = function () { this.classList.remove('input-error'); };
        }
    });

    const fFecha = document.getElementById('modalFechaDespacho');
    const fUbicacion = document.getElementById('modalNewLocation');
    const fCargo = document.getElementById('modalCargo');

    fFecha.value = fecha;
    fUbicacion.value = ubicacion;
    fCargo.value = cargo;
    document.getElementById('modalObs').value = '';
    
    // Checkboxes and Second Derivation Elements
    document.getElementById('modalFinalize').checked = false;
    
    const enableSecond = document.getElementById('enableSecondDerivation');
    const secondFields = document.getElementById('secondDerivationFields');
    const fCargo2 = document.getElementById('modalCargo2');
    const fLoc2 = document.getElementById('modalNewLocation2');

    // Populate Second derivation if exists
    if (loc2Param && cargo2Param && loc2Param !== 'undefined' && cargo2Param !== 'undefined' && loc2Param !== '' && cargo2Param !== '') {
        if (enableSecond) enableSecond.checked = true;
        if (secondFields) secondFields.style.display = 'block';
        if (fLoc2) fLoc2.value = loc2Param;
        if (fCargo2) fCargo2.value = cargo2Param;
    } else {
        if (enableSecond) enableSecond.checked = false;
        if (secondFields) secondFields.style.display = 'none';
        if (fCargo2) fCargo2.value = '';
        if (fLoc2) fLoc2.value = '';
    }

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

    // Check if second derivation is enabled
    const enableSecond = document.getElementById('enableSecondDerivation').checked;
    const newCargo2 = enableSecond ? document.getElementById('modalCargo2').value : null;
    const newLocation2 = enableSecond ? document.getElementById('modalNewLocation2').value : null;

    const inputs = {
        'modalFechaDespacho': newFecha,
        'modalNewLocation': newLocation,
        'modalCargo': newCargo
    };

    // Add second derivation fields to validation if enabled
    if (enableSecond) {
        inputs['modalCargo2'] = newCargo2;
        inputs['modalNewLocation2'] = newLocation2;
    }

    let hasError = false;
    for (const [id, value] of Object.entries(inputs)) {
        if (!value || value.trim() === '') {
            document.getElementById(id).classList.add('input-error');
            hasError = true;
        }
    }

    if (hasError) {
        Swal.fire({
            icon: 'error',
            title: 'Campos incompletos',
            text: 'Por favor, complete todos los campos marcados en rojo para actualizar.',
            confirmButtonText: 'Aceptar'
        });
        return;
    }

    try {
        const requestBody = {
            id: docId,
            ubicacion: newLocation,
            fechaDespacho: newFecha,
            cargo: newCargo,
            observaciones: obs,
            finalize: isFinalize
        };

        // Add second derivation data if enabled
        if (enableSecond) {
            requestBody.cargo2 = newCargo2;
            requestBody.ubicacion2 = newLocation2;
        }

        const response = await fetch('/api/documents/update-location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: '¡Actualizado!',
                text: 'Ubicación actualizada correctamente',
                timer: 1500,
                showConfirmButton: false
            });
            closeModal();
            loadDocuments(); // cargar tabla de datos 
        } else {
            Swal.fire('Error', 'Error al actualizar', 'error');
        }
    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Error de conexión', 'error');
    }
}

// Cerrar modal


function viewHistory(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) return;

    // Use specific container classes
    const container = document.querySelector('#historyModal .history-container');
    container.innerHTML = '';

    // If no history exists, use synthetic
    const rawHistory = doc.history && doc.history.length > 0 ? doc.history : [{
        date: doc.fecha,
        action: 'Registro Inicial',
        from: 'Exterior',
        to: doc.origen,
        cargo: 'Mesa de partes',
        observation: 'Sin historial detallado'
    }];

    // Create Timeline UL
    const ul = document.createElement('ul');
    ul.className = 'timeline';

    rawHistory.forEach(item => {
        // PATCH: Ya no reemplazaremos el nombre original, queremos que diga Jefatura de Unidad Administrativa
        const replaceText = (text) => {
            if (!text) return text;
            // Quitamos el reemplazo anterior para que preserve el nombre original de la BD
            // return text.replace(/JEFATURA DE UNIDAD DE ADMINISTRACION/gi, 'OFICINA DE ADMINISTRACIÓN');
            return text;
        };

        item.from = replaceText(item.from);
        item.to = replaceText(item.to);
        item.cargo = replaceText(item.cargo);
        item.action = replaceText(item.action);

        // NUEVO PARCHE: Cualquier documento que recién ingresa (Recepción) y no tiene destino
        // asignado todavía, debe ir a Jefatura de Unidad Administrativa por defecto.
        if (item.action && item.action.toLowerCase().includes('recepción')) {
            // Si el destino o cargo aparecen vacíos (o son nulos), le forzamos la oficina correspondiente correcta
            if (!item.to || item.to.trim() === '') {
                item.to = 'Jefatura de Unidad Administrativa';
            }
            if (!item.cargo || item.cargo.trim() === '') {
                item.cargo = 'Jefatura de Unidad Administrativa';
            }
        }

        const li = document.createElement('li');
        li.className = 'timeline-item';

        // Parse Date & Time
        let dateStr = item.date;
        let timeStr = '';
        try {
            if (item.date && item.date.includes('T')) {
                const d = new Date(item.date);
                dateStr = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                timeStr = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            } else if (item.date) {
                // assume YYYY-MM-DD
                const parts = item.date.split('-');
                if (parts.length === 3) dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        } catch (e) {
            console.error(e);
        }

        // Determine Badge Class based on Action/Status
        let badgeClass = 'badge-received'; // Default blue
        let icon = 'fa-arrow-right-to-bracket';
        const actionLower = (item.action || '').toLowerCase();

        if (actionLower.includes('deriv')) {
            badgeClass = 'badge-derived'; // Orange
            icon = 'fa-share';
        } else if (actionLower.includes('final')) {
            badgeClass = 'badge-finalized'; // Green
            icon = 'fa-check';
        }

        // Build HTML
        li.innerHTML = `
                <div class="timeline-marker ${badgeClass}"></div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <div class="timeline-datetime">
                            <i class="fa-regular fa-calendar"></i> ${dateStr}
                            ${timeStr ? `<span class="tm-time"><i class="fa-regular fa-clock"></i> ${timeStr}</span>` : ''}
                        </div>
                        <span class="timeline-badge ${badgeClass}">${escapeHtml(item.action)}</span>
                    </div>
                    
                    <div class="timeline-body">
                        <div class="timeline-route">
                            <div class="route-node source">
                                <span class="label">Origen</span>
                                <span class="value" title="${escapeHtml(item.from)}">${escapeHtml(item.from) || '&mdash;'}</span>
                            </div>
                            <div class="route-arrow">
                                <i class="fa-solid fa-arrow-right-long"></i>
                            </div>
                            <div class="route-node dest">
                                <span class="label">Destino</span>
                                <span class="value" title="${escapeHtml(item.cargo)}">${escapeHtml(item.cargo) || escapeHtml(item.to) || '&mdash;'}</span>
                            </div>
                        </div>

                        ${item.to ? `
                        <div class="timeline-meta">
                            <strong><i class="fa-solid fa-building"></i> Área:</strong> 
                            <span>${escapeHtml(item.to)}</span>
                        </div>` : ''}

                        ${item.observation ? `
                        <div class="timeline-obs">
                            <strong><i class="fa-regular fa-comment-dots"></i> Observaciones:</strong>
                            <p>${escapeHtml(item.observation)}</p>
                        </div>` : ''}
                    </div>
                </div>
            `;
        ul.appendChild(li);
    });

    container.appendChild(ul);
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


// --- Action Menu Logic --- 

function toggleDropdown(event, docId) {
    event.stopPropagation();
    const dropdown = document.getElementById(`dropdown-${docId}`);

    // Close other open dropdowns
    const allDropdowns = document.querySelectorAll('.action-dropdown');
    allDropdowns.forEach(d => {
        if (d.id !== `dropdown-${docId}`) {
            d.classList.remove('show');
        }
    });

    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Close dropdowns when clicking outside
window.addEventListener('click', function (event) {
    if (!event.target.closest('.btn-kebab') && !event.target.closest('.action-dropdown')) {
        const dropdowns = document.querySelectorAll('.action-dropdown');
        dropdowns.forEach(d => d.classList.remove('show'));
    }
});
