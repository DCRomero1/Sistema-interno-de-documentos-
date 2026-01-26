document.addEventListener('DOMContentLoaded', () => {
    loadWorkers();
    loadBirthdays();

    // Set Hero Date info
    setHeroDate();

    // Search and Filter Listeners
    document.getElementById('searchInput').addEventListener('input', filterWorkers);
    document.getElementById('deptFilter').addEventListener('change', filterWorkers);

    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
});

let allWorkers = []; // Store for filtering
let currentFiltered = [];
let currentPage = 1;
const itemsPerPage = 7;

// Helper XSS Protection
function escapeHtml(text) {
    if (!text) return text;
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

function setHeroDate() {
    const dateEl = document.getElementById('heroDateDisplay');
    const options = { day: 'numeric', month: 'long' };
    const today = new Date().toLocaleDateString('es-ES', options);
    // Capitalize Month
    const parts = today.split(' de ');
    if (parts.length > 1) {
        parts[1] = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
    }
    dateEl.textContent = parts.join(' de ');
}

async function loadWorkers() {
    try {
        const response = await fetch('/api/workers');
        allWorkers = await response.json();

        // Sort by Upcoming Birthday
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today

        allWorkers.sort((a, b) => {
            if (!a.birthDate) return 1;
            if (!b.birthDate) return -1;

            const getNextBirthday = (dateStr) => {
                const parts = dateStr.split('-');
                const bMonth = parseInt(parts[1]) - 1;
                const bDay = parseInt(parts[2]);

                let next = new Date(today.getFullYear(), bMonth, bDay);
                if (next < today) {
                    next.setFullYear(today.getFullYear() + 1);
                }
                return next;
            };

            const nextA = getNextBirthday(a.birthDate);
            const nextB = getNextBirthday(b.birthDate);

            return nextA - nextB;
        });

        // Initialize pagination
        currentFiltered = allWorkers;
        updateDisplay();
        // renderWorkers(allWorkers); // Removed to enforce pagination on load
        updateStats(allWorkers);

    } catch (error) {
        console.error('Error loading workers:', error);
    }
}

function updateStats(workers) {
    document.getElementById('statTotal').textContent = workers.length;
    // Calculate birthdays this month
    const currentMonth = new Date().getMonth();
    const bdaysThisMonth = workers.filter(w => {
        if (!w.birthDate) return false;
        const d = new Date(w.birthDate);
        return d.getMonth() === currentMonth;
    }).length;
    document.getElementById('statBirthdaysMonth').textContent = bdaysThisMonth;
    // document.getElementById('chartCount').textContent = bdaysThisMonth; // Removed specific element, handled in renderCharts

    renderCharts(workers);
    renderActivity(workers);
}

function renderCharts(workers) {
    const barsContainer = document.getElementById('chartBars');
    const labelsContainer = document.getElementById('chartLabels');
    if (!barsContainer || !labelsContainer) return;

    barsContainer.innerHTML = '';
    labelsContainer.innerHTML = '';

    const monthNames = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
    const currentMonth = new Date().getMonth();

    // Prepare data for next 6 months
    let maxCount = 0;
    const data = [];

    for (let i = 0; i < 6; i++) {
        const mIndex = (currentMonth + i) % 12;
        const count = workers.filter(w => {
            if (!w.birthDate) return false;
            return new Date(w.birthDate).getMonth() === mIndex;
        }).length;

        if (count > maxCount) maxCount = count;
        data.push({ month: monthNames[mIndex], count: count, active: i === 0 });
    }

    // Render
    data.forEach(d => {
        // Bar
        const bar = document.createElement('div');
        const height = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
        // Min height for visibility
        const visualHeight = Math.max(height, 15);

        bar.className = d.active ? 'bar active' : 'bar';
        bar.style.height = `${visualHeight}%`;
        bar.style.position = 'relative';

        if (d.active || d.count > 0) {
            const label = document.createElement('span');
            label.style.cssText = "position: absolute; top: -20px; left: 50%; transform: translateX(-50%); font-size: 0.7rem; color: #8b5cf6; font-weight: bold;";
            label.textContent = d.count;
            bar.appendChild(label);
        }
        barsContainer.appendChild(bar);

        // Label
        const labelText = document.createElement('span');
        labelText.textContent = d.month;
        labelsContainer.appendChild(labelText);
    });
}

function renderActivity(workers) {
    const container = document.getElementById('recentActivityList');
    if (!container) return;
    container.innerHTML = '';

    // 1. Get New Registrations (from DB created_at is ideal, but assuming workers list is sortable)
    // We'll trust 'created_at' if available, otherwise just use ID reverse order
    const newRegistrations = [...workers].sort((a, b) => {
        // Try created_at, else id
        if (a.created_at && b.created_at) return new Date(b.created_at) - new Date(a.created_at);
        return b.id - a.id;
    }).slice(0, 3).map(w => ({
        type: 'register',
        name: w.fullName,
        date: w.created_at || new Date().toISOString(), // Fallback
        text: 'Nuevo registro: '
    }));

    // 2. Get Recent Greetings (from LocalStorage)
    let greetings = [];
    try {
        greetings = JSON.parse(localStorage.getItem('recentGreetings') || '[]');
    } catch (e) { }

    const mappedGreetings = greetings.map(g => ({
        type: 'greeting',
        name: g.name,
        date: g.date,
        text: 'Enviaste un saludo a '
    }));

    // Combine and Sort
    const allActivity = [...newRegistrations, ...mappedGreetings]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 4); // Show top 4

    if (allActivity.length === 0) {
        container.innerHTML = '<div style="color:#94a3b8; text-align:center;">Sin actividad reciente</div>';
        return;
    }

    allActivity.forEach(act => {
        const div = document.createElement('div');
        div.style.cssText = "display: flex; gap: 15px; margin-bottom: 20px;";

        let iconHtml = '';
        if (act.type === 'register') {
            iconHtml = `<div style="width: 32px; height: 32px; background: #ecfdf5; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #10b981;"><i class="fa-solid fa-user-plus"></i></div>`;
        } else {
            iconHtml = `<div style="width: 32px; height: 32px; background: #f5f3ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #8b5cf6;"><i class="fa-solid fa-cake-candles"></i></div>`;
        }

        // Time ago
        const timeAgo = getTimeAgo(new Date(act.date));

        div.innerHTML = `
            ${iconHtml}
            <div>
                <div style="font-size: 0.9rem; color: #334155;">${act.text}<b>${escapeHtml(act.name.split(' ')[0])}</b></div>
                <div style="font-size: 0.75rem; color: #94a3b8;">${timeAgo}</div>
            </div>
        `;
        container.appendChild(div);
    });
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " años";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " meses";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " días";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " horas";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " min";
    return "Hace un momento";
}

function renderWorkers(workers) {
    const list = document.getElementById('workersList');
    list.innerHTML = '';

    if (workers.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding: 40px; color:#94a3b8;">No se encontraron resultados.</div>';
        return;
    }

    workers.forEach((worker, index) => {
        const item = document.createElement('div');
        // List Item Style
        item.style.cssText = `
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr;
            align-items: center;
            background: white;
            padding: 15px 20px;
            border-radius: 12px;
            border: 1px solid #f1f5f9;
            transition: all 0.2s;
            margin-bottom: 0px;
        `;
        item.className = 'worker-row';
        item.onmouseenter = () => { item.style.transform = 'translateY(-2px)'; item.style.boxShadow = '0 5px 15px rgba(0,0,0,0.05)'; item.style.borderColor = '#e2e8f0'; };
        item.onmouseleave = () => { item.style.transform = 'none'; item.style.boxShadow = 'none'; item.style.borderColor = '#f1f5f9'; };

        const bgCol = COLORS[index % COLORS.length];
        const initials = worker.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        // Badge Logic
        let badgeClass = 'badge-admin'; // Default green
        let badgeText = worker.position;
        if (worker.position === 'Docente') {
            badgeClass = 'badge-docente'; // Blue
        } else if (worker.position === 'Dirección') {
            badgeClass = 'badge-docente'; // Reuse blue for now or add purple
        }

        // Date Logic (Birthdate)
        let dateDisplay = '---';
        let isToday = false;
        if (worker.birthDate) {
            const date = new Date(worker.birthDate);
            // Format: 21 ENE
            const monthNamesShort = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
            dateDisplay = `${date.getDate() + 1} ${monthNamesShort[date.getMonth()]}`; // +1 for timezone offset fix if needed, usually string split is safer
            // Let's use string manipulation if format is YYYY-MM-DD
            const parts = worker.birthDate.split('-');
            if (parts.length === 3) {
                const m = parseInt(parts[1]) - 1;
                const d = parseInt(parts[2]);
                dateDisplay = `<span style="font-weight:700;">${d}</span> <span style="font-size:0.8rem;">${monthNamesShort[m]}</span>`;

                // Check if today
                const today = new Date();
                if (today.getMonth() === m && today.getDate() === d) {
                    dateDisplay += ` <span style="font-size:0.6rem; background:#8b5cf6; color:white; padding:1px 4px; border-radius:4px;">¡HOY!</span>`;
                    isToday = true;
                } else {
                    // Check days until
                    // Simple approx check
                }
            }
        }

        item.innerHTML = `
            <div class="worker-row-info">
                <div class="table-avatar-circle" style="background-color: ${bgCol}20; color: ${bgCol};">
                    ${initials}
                </div>
                <div>
                    <div style="font-weight: 700; color: #1e293b; font-size: 0.95rem;">
                        ${escapeHtml(worker.fullName)}
                        ${isToday ? '🎂' : ''}
                    </div>
                    <div style="font-size: 0.8rem; color: #94a3b8;">ID: ${escapeHtml(worker.dni)}</div>
                </div>
            </div>
            
            <div>
                <span class="${badgeClass}">${escapeHtml(badgeText)}</span>
            </div>
            
            <div style="font-weight: 600; color: #475569;">
                ${dateDisplay}
            </div>
            
            <div style="text-align: right; display: flex; justify-content: flex-end; gap: 8px;">
                <button class="action-btn primary" onclick="openGreetingModal('${escapeHtml(worker.fullName)}')" title="Enviar Saludo">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> Saludar
                </button>
                
                <button class="action-btn" onclick="sendBirthdayEmail(${worker.id})" title="Enviar Correo con Tarjeta">
                    <i class="fa-regular fa-envelope"></i>
                </button>

                <button class="action-btn" onclick="openEditModal(${worker.id})" title="Editar Información">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
            </div>
        `;
        list.appendChild(item);
    });
}

function updateDisplay() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const slice = currentFiltered.slice(start, end);

    renderWorkers(slice);
    renderPagination();
}

function renderPagination() {
    const container = document.getElementById('paginationControls');
    if (!container) return;
    container.innerHTML = '';

    const totalPages = Math.ceil(currentFiltered.length / itemsPerPage);
    if (totalPages <= 1) return;

    // Prev Button
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
    prevBtn.style.cssText = "border: none; background: transparent; color: #64748b; cursor: pointer;";
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => changePage(currentPage - 1);
    container.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            const btn = document.createElement('button');
            btn.textContent = i;
            if (i === currentPage) {
                btn.style.cssText = "background: #2563eb; color: white; width: 32px; height: 32px; border-radius: 8px; border: none; font-weight: bold;";
            } else {
                btn.style.cssText = "border: none; background: transparent; color: #64748b; cursor: pointer; width: 32px; height: 32px;";
            }
            btn.onclick = () => changePage(i);
            container.appendChild(btn);
        } else if (
            (i === currentPage - 2 && i > 1) ||
            (i === currentPage + 2 && i < totalPages)
        ) {
            const span = document.createElement('span');
            span.textContent = '...';
            span.style.color = '#94a3b8';
            container.appendChild(span);
        }
    }

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    nextBtn.style.cssText = "border: none; background: transparent; color: #64748b; cursor: pointer;";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => changePage(currentPage + 1);
    container.appendChild(nextBtn);
}

function changePage(page) {
    const totalPages = Math.ceil(currentFiltered.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    updateDisplay();
}

function normalizeText(text) {
    return text.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function filterWorkers() {
    const searchTerm = normalizeText(document.getElementById('searchInput').value);
    const deptFilter = document.getElementById('deptFilter').value;

    currentFiltered = allWorkers.filter(w => {
        const normalizedName = normalizeText(w.fullName);
        const normalizedDni = normalizeText(w.dni);

        const matchesSearch = normalizedName.includes(searchTerm) || normalizedDni.includes(searchTerm);
        const matchesDept = deptFilter === 'all' || w.position === deptFilter;
        return matchesSearch && matchesDept;
    });

    currentPage = 1;
    updateDisplay();
}

// Keep existing loadBirthdays for logic but maybe disable rendering?
// Actually we might want to highlight TOP birthdays in the Hero.
// For now, let's leave the Hero static or minimal dynamic since `workers.js` originally fetched a separate endpoint.
async function loadBirthdays() {
    // Just fetches to maybe populate the list if we wanted to show a "Upcoming" list inside the view, 
    // but the design shows them inline in the list or just "Hoy es..." 
    // We will leave the logic if needed for future but for now stats cover it.
}

// --- Greeting Modal & Share Functions (Preserved) ---
function openGreetingModal(name) {
    const modal = document.getElementById('greetingModal');
    const nameElement = document.getElementById('greetingName');
    const dateElement = document.getElementById('greetingDate');

    nameElement.textContent = name;

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date().toLocaleDateString('es-ES', options);
    const formattedDate = "Tacna, " + today.charAt(0).toUpperCase() + today.slice(1);

    dateElement.textContent = formattedDate;
    modal.style.display = 'block';

    // Save Activity
    try {
        const greetings = JSON.parse(localStorage.getItem('recentGreetings') || '[]');
        greetings.unshift({ name: name, date: new Date().toISOString() });
        // Keep last 10
        if (greetings.length > 10) greetings.pop();
        localStorage.setItem('recentGreetings', JSON.stringify(greetings));

        // Refresh Activity if possible (safe check)
        if (typeof renderActivity === 'function' && typeof allWorkers !== 'undefined') {
            renderActivity(allWorkers);
        }
    } catch (e) { console.error(e); }
}

function closeGreetingModal() {
    document.getElementById('greetingModal').style.display = 'none';
}

function downloadGreeting() {
    const card = document.getElementById('captureCard');
    html2canvas(card).then(canvas => {
        const link = document.createElement('a');
        link.download = 'Saludo_' + document.getElementById('greetingName').textContent + '.png';
        link.href = canvas.toDataURL();
        link.click();
    });
}





async function sendBirthdayEmail(workerId) {
    const worker = allWorkers.find(w => w.id === workerId);
    if (!worker) return;

    // 1. Setup the Card
    openGreetingModal(worker.fullName);

    // Slight delay to ensure rendering
    await new Promise(r => setTimeout(r, 500));

    const card = document.getElementById('captureCard');

    try {
        const canvas = await html2canvas(card, { scale: 2, backgroundColor: null });

        // Convert to blob
        canvas.toBlob(async (blob) => {
            if (!blob) {
                console.error('Canvas is empty');
                return;
            }

            try {
                // Copy to clipboard
                await navigator.clipboard.write([
                    new ClipboardItem({
                        [blob.type]: blob
                    })
                ]);

                // Notify User
                Swal.fire({
                    title: '¡Tarjeta Copiada!',
                    html: 'La tarjeta de cumpleaños ha sido copiada al portapapeles.<br><br><b>Presiona Ctrl + V</b> en el cuerpo del correo para pegarla.',
                    icon: 'success',
                    timer: 4000,
                    showConfirmButton: false
                });

                // Open Gmail
                setTimeout(() => {
                    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${escapeHtml(worker.email)}&su=Saludos%20institucionales%20por%20su%20cumplea%C3%B1os`, '_blank');
                    closeGreetingModal();
                }, 1500);

            } catch (err) {
                console.error('Failed to copy: ', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Error al copiar',
                    text: 'No se pudo copiar la imagen automáticamente (Permiso denegado o no soportado).',
                    showConfirmButton: true
                });
            }
        });

    } catch (error) {
        console.error('Html2Canvas Error:', error);
    }
}

async function deleteWorker(id) {
    const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: "No podrás revertir esto",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch(`/api/workers/${id}`, {
                method: 'DELETE'
            });
            const data = await response.json();

            if (data.success) {
                Swal.fire(
                    'Eliminado!',
                    'El registro ha sido eliminado.',
                    'success'
                );
                loadWorkers();
            } else {
                Swal.fire(
                    'Error!',
                    'No se pudo eliminar el registro.',
                    'error'
                );
            }
        } catch (error) {
            console.error('Error deleting:', error);
            Swal.fire('Error', 'Hubo un problema de conexión', 'error');
        }
    }
}

function openWorkerModal() {
    editingWorkerId = null;
    const form = document.getElementById('workerForm');
    form.reset();

    // Force Uppercase on Name Input
    const nameInput = form.querySelectorAll('input')[0];
    nameInput.oninput = function () {
        this.value = this.value.toUpperCase();
    };

    document.querySelector('.themed-header-title').innerHTML = '<i class="fa-solid fa-user-plus" style="margin-right: 8px;"></i> REGISTRAR TRABAJADOR';
    document.getElementById('workerModal').style.display = 'block';
}

function openEditModal(id) {
    const worker = allWorkers.find(w => w.id == id);
    if (!worker) {
        console.error('Worker not found for id:', id);
        return;
    }

    editingWorkerId = id;

    const form = document.getElementById('workerForm');
    const inputs = form.querySelectorAll('input, select');
    // Inputs: Name, DNI, Email, Phone, BirthDate, Position

    inputs[0].value = worker.fullName || '';
    inputs[1].value = worker.dni || '';
    inputs[2].value = worker.email || '';
    inputs[3].value = worker.phone || '';
    // Handle Date format if needed (YYYY-MM-DD from sqlite usually matches input date)
    inputs[4].value = worker.birthDate || '';
    inputs[5].value = worker.position || 'Docente';

    document.querySelector('.themed-header-title').innerHTML = '<i class="fa-solid fa-pen-to-square" style="margin-right: 8px;"></i> EDITAR TRABAJADOR';
    document.getElementById('workerModal').style.display = 'block';
}

async function saveWorker() {
    const form = document.getElementById('workerForm');
    const inputs = form.querySelectorAll('input, select');
    // Inputs MUST be in this order: Name, DNI, Email, Phone, BirthDate, Position

    const data = {
        fullName: inputs[0].value.toUpperCase(), // Force Uppercase
        dni: inputs[1].value,
        email: inputs[2].value,
        phone: inputs[3].value,
        birthDate: inputs[4].value,
        position: inputs[5].value
    };

    if (!data.fullName || !data.dni) {
        alert('Complete Nombre y DNI');
        return;
    }

    // Optional: Validation for Institutional Email
    if (data.email && !data.email.includes('@')) {
        alert('Ingrese un correo válido');
        return;
    }

    // Warning if not institutional (Example logic, can be customized)
    // if (data.email && !data.email.endsWith('edu.pe')) {
    //    if(!confirm('El correo no parece ser institucional (.edu.pe). ¿Guardar de todos modos?')) return;
    // }

    try {
        let url = '/api/workers';
        let method = 'POST';

        if (editingWorkerId) {
            url = `/api/workers/${editingWorkerId}`;
            method = 'PUT';
        }

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
            closeWorkerModal();
            form.reset();
            loadWorkers();
            Swal.fire({ icon: 'success', title: 'Guardado', timer: 1500, showConfirmButton: false });
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error(error);
    }
}

// User Info
async function fetchUserInfo() {
    try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        if (data.authenticated && data.user) {
            const el = document.getElementById('sidebar-username');
            if (el) el.textContent = data.user.name || data.user.username;
        }
    } catch (e) { }
}
// --- History Modal Functions ---
let fullHistory = [];
let currentHistoryFilter = 'all';

function openHistoryModal() {
    document.getElementById('historyModal').style.display = 'block';
    loadFullHistory();
    filterHistory('all'); // Reset filter
}

function closeHistoryModal() {
    document.getElementById('historyModal').style.display = 'none';
}

function loadFullHistory() {
    // 1. Registrations
    const registrations = allWorkers.map(w => ({
        type: 'register',
        name: w.fullName,
        date: w.created_at || '2023-01-01', // Fallback if no date
        details: `Nuevo registro en el sistema (${w.position})`
    }));

    // 2. Greetings
    let greetings = [];
    try {
        greetings = JSON.parse(localStorage.getItem('recentGreetings') || '[]');
    } catch (e) { }

    const mappedGreetings = greetings.map(g => ({
        type: 'greeting',
        name: g.name,
        date: g.date,
        details: 'Se envió una tarjeta de saludo'
    }));

    // Merge and Sort
    fullHistory = [...registrations, ...mappedGreetings].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function filterHistory(type) {
    currentHistoryFilter = type;

    // Update Tabs UI
    document.querySelectorAll('.history-tab').forEach(t => {
        t.style.borderBottom = '2px solid transparent';
        t.style.color = '#94a3b8';
    });
    document.getElementById(`tab-${type}`).style.borderBottom = '2px solid #2563eb';
    document.getElementById(`tab-${type}`).style.color = '#475569';

    // Filter Data
    const items = type === 'all' ? fullHistory : fullHistory.filter(i => i.type === type);
    renderHistoryList(items);
}

function renderHistoryList(items) {
    const list = document.getElementById('historyList');
    list.innerHTML = '';

    if (items.length === 0) {
        list.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 40px;">No se encontró actividad.</div>`;
        return;
    }

    items.forEach(item => {
        const row = document.createElement('div');
        row.style.cssText = "display: flex; align-items: center; padding: 15px 0; border-bottom: 1px solid #f1f5f9;";

        let iconHtml = '';
        if (item.type === 'register') {
            iconHtml = `<div style="width: 40px; height: 40px; background: #ecfdf5; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #10b981; font-size: 1.1rem; margin-right: 15px;"><i class="fa-solid fa-user-plus"></i></div>`;
        } else {
            iconHtml = `<div style="width: 40px; height: 40px; background: #f5f3ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #8b5cf6; font-size: 1.1rem; margin-right: 15px;"><i class="fa-solid fa-cake-candles"></i></div>`;
        }

        const dateObj = new Date(item.date);
        const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        row.innerHTML = `
            ${iconHtml}
            <div style="flex-grow: 1;">
                <div style="font-weight: 600; color: #334155;">${escapeHtml(item.name)}</div>
                <div style="font-size: 0.85rem; color: #64748b;">${item.details}</div>
            </div>
            <div style="font-size: 0.75rem; color: #94a3b8; white-space: nowrap;">
                ${dateStr}
            </div>
        `;
        list.appendChild(row);
    });
}
