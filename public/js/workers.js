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

    if (act.type === 'register') {
        const div = document.createElement('div');
        div.style.cssText = "display: flex; gap: 15px; margin-bottom: 20px;";
        iconHtml = `<div style="width: 32px; height: 32px; background: #ecfdf5; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #10b981;"><i class="fa-solid fa-user-plus"></i></div>`;
        const timeAgo = getTimeAgo(new Date(act.date));
        div.innerHTML = `
                ${iconHtml}
                <div>
                    <div style="font-size: 0.9rem; color: #334155;">${act.text}<b>${escapeHtml(act.name.split(' ')[0])}</b></div>
                    <div style="font-size: 0.75rem; color: #94a3b8;">${timeAgo}</div>
                </div>
            `;
        container.appendChild(div);
    }
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
        } else if (worker.position === 'Personal de Limpieza') {
            badgeClass = 'badge-limpieza'; // Amber / Orange
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
                
                <button class="action-btn" title="Opción Deshabilitada" style="opacity: 0.6; cursor: not-allowed;">
                    <i class="fa-regular fa-envelope"></i>
                </button>

                <button class="action-btn" onclick="openEditModal(${worker.id})" title="Editar Información">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>

                <button class="action-btn" onclick="deleteWorker(${worker.id})" title="Eliminar" style="color: #ef4444; border-color: #fee2e2; background: #fef2f2;">
                    <i class="fa-solid fa-trash-can"></i>
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

let currentTemplate = 'clasica';
let currentWorkerName = '';

function openGreetingModal(name) {
    currentWorkerName = name;
    document.getElementById('greetingModal').style.display = 'block';

    // Reset to default
    selectTemplate('clasica');

    // Update Recipient Badge
    const badge = document.getElementById('preview-recipient');
    if (badge) badge.textContent = `DESTINATARIO: ${name.toUpperCase()}`;
}

function closeGreetingModal() {
    document.getElementById('greetingModal').style.display = 'none';
}

function selectTemplate(templateId) {
    currentTemplate = templateId;

    // Update Visual Selection
    document.querySelectorAll('.template-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    // Add active class to the clicked button
    const activeBtn = document.getElementById(`btn-${templateId}`);
    if (activeBtn) activeBtn.classList.add('active');

    // Update Preview (Mockup Logic)
    updatePreview(templateId);
}

function updatePreview(templateId) {
    const previewContainer = document.getElementById('main-preview');
    let content = '';

    // Date Helper
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = new Date().toLocaleDateString('es-ES', dateOptions).toUpperCase();

    switch (templateId) {
        case 'clasica':
            content = `
            <div class="card-classic">
                <div class="card-classic-border">
                    <span class="card-corner c-tl">✦</span>
                    <span class="card-corner c-br">✦</span>

                    <img src="/img/Logo2.jpg" class="card-logo-img" alt="Vigil">
                    
                    <h1 class="card-title-script">Feliz Cumpleaños</h1>

                    <p class="card-header-text">El equipo directivo y la comunidad educativa del</p>
                    <h2 class="card-institution">I.E.S.T.P. "FRANCISCO DE PAULA GONZALES VIGIL"</h2>
                    
                    <p class="card-header-text" style="font-style: normal; margin-top: 10px;">Expresan su más cálido saludo y reconocimiento a:</p>
                    
                    <h2 class="card-recipient-name">${currentWorkerName}</h2>
                    
                    <p class="card-message">
                        En esta fecha significativa, expresamos nuestro reconocimiento a su valiosa gestión, 
                        liderazgo y entrega constante en favor del fortalecimiento de nuestra institución. 
                        Que este nuevo año de vida le traiga bienestar, prosperidad y muchos logros junto 
                        a toda la comunidad educativa vigiliana.
                    </p>
                    
                     <!-- Custom Footer Image -->
                    <div style="margin-top: auto; margin-bottom: 5px; text-align: center;">
                        <img src="/img/books_footer.png" style="max-width: 180px; opacity: 0.9;" alt="Decoración">
                    </div>

                    <p class="card-footer-date">TACNA, ${dateStr}</p>
                </div>
            </div>`;
            break;
        case 'minimalista':
            content = `
            <div class="card-minimalista">
                <div class="card-min-left">
                    <img src="/img/lapiz.png" alt="Decoración Lápiz">
                </div>
                <div class="card-min-right">
                    <!-- Corner Decorations -->
                    <span class="min-corner mc-tl">✦</span>
                    <span class="min-corner mc-tr">✦</span>
                    <span class="min-corner mc-bl">✦</span>
                    <span class="min-corner mc-br">✦</span>

                    <h1 class="min-title">¡Feliz Cumpleaños!</h1>
                    <p class="min-subtitle">LE DESEAMOS UN DÍA EXCEPCIONAL</p>
                    
                    <h2 class="min-name">${currentWorkerName}</h2>
                    
                    <p class="min-message">
                        "Su dedicación y profesionalismo son piezas clave en nuestro equipo. 
                        Esperamos que este nuevo año de vida esté lleno de éxitos y alegrías."
                    </p>
                    
                    <div class="min-footer">
                        <p style="margin: 0; font-size: 0.6rem; color: #6b7280; text-transform: none;">El equipo directivo y la comunidad educativa del</p>
                        <p style="margin: 3px 0 0 0; font-weight: 700; font-size: 0.7rem; color: #4b5563;">I.E.S.P. "FRANCISCO DE PAULA GONZALES VIGIL"</p>
                    </div>
                </div>
            </div>`;
            break;
        case 'moderna':
            content = `
            <div class="card-excellence" style="
                width: 100%; 
                max-width: 800px;
                aspect-ratio: 16/14;
                display: flex;
                background-color: #060b1a; /* Very Dark Navy */
                border-radius: 4px;
                overflow: hidden;
                box-shadow: 0 30px 60px rgba(0,0,0,0.5);
                margin: 0 auto;
                position: relative;
                font-family: 'Montserrat', sans-serif;
            ">
                <!-- Left Side: Visual/Image -->
                <div style="
                    width: 45%;
                    background: linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.1)), url('/img/fondo_verde.png');
                    background-size: cover;
                    background-position: center;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-end;
                    padding: 30px;
                    border-right: 1px solid rgba(212, 175, 55, 0.2);
                ">
                    <div style="width: 40px; height: 3px; background: #d4af37; margin-bottom: 10px; position: relative; z-index: 1;"></div>
                    <p style="
                        color: white; 
                        font-family: 'Playfair Display', serif; 
                        font-style: italic; 
                        font-size: 1.1rem; 
                        margin: 0;
                        opacity: 0.9;
                    ">Excelencia & Compromiso</p>
                </div>

                <!-- Right Side: Content -->
                <div style="
                    width: 55%;
                    padding: 40px 45px 30px;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                ">
                    <!-- VIP Triangle Ribbon -->
                    <div style="
                        position: absolute;
                        top: 0;
                        right: 0;
                        width: 0;
                        height: 0;
                        border-style: solid;
                        border-width: 0 60px 60px 0;
                        border-color: transparent #f97316 transparent transparent;
                    "></div>
                    <i class="fa-solid fa-star" style="
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        color: white;
                        font-size: 0.8rem;
                    "></i>

                    <h1 style="
                        font-family: 'Playfair Display', serif;
                        font-size: 3.1rem;
                        color: #d4af37;
                        margin: 0 0 15px 0;
                        line-height: 1.1;
                        font-weight: 700;
                        font-style: italic;
                    ">
                        <span style="display: block; text-align: center;">¡Feliz</span>
                        <span style="display: block; text-align: center;">Cumpleaños!</span>
                    </h1>

                    <!-- Spacer to lower the rest of the content -->
                    <div style="margin-top: 15px;">
                        <p style="color: white; font-size: 1.1rem; margin-bottom: 15px;">
                            Estimado/a <span style="color: #d4af37; font-weight: 700;">${currentWorkerName}</span>,
                        </p>

                        <div style="color: rgba(255,255,255,0.85); font-size: 0.9rem; line-height: 1.5;">
                            <p style="margin-bottom: 10px;">
                                Hoy celebramos no solo un año más de tu vida, sino también la valiosa huella que dejas día tras día en nuestra institución. Gracias por ser parte fundamental de nuestra historia.
                            </p>
                            <p>
                                Que tu camino siga iluminado por nuevos retos y grandes satisfacciones. ¡Felicidades en tu día!
                            </p>
                        </div>
                    </div>

                    <!-- Framed Cake Image (borde3) - Centered in Right Panel -->
                    <div style="
                        width: 100%;
                        display: flex;
                        justify-content: center;
                        margin: 40px 0 20px 0;
                    ">
                        <div style="
                            padding: 8px;
                            background: rgba(255,255,255,0.05);
                            border: 1px solid rgba(212, 175, 55, 0.3);
                            border-radius: 12px;
                            box-shadow: 0 10px 20px rgba(0,0,0,0.3);
                        ">
                            <img src="/img/borde3.png" alt="Torta" style="
                                max-width: 130px;
                                height: auto;
                                display: block;
                                filter: drop-shadow(0 5px 15px rgba(212, 175, 55, 0.2));
                            ">
                        </div>
                    </div>

                    <div style="margin-top: auto; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; text-align: center; position: relative;">
                        <div style="display: inline-block; vertical-align: middle;">
                            <p style="
                                color: rgba(255,255,255,0.8); 
                                font-size: 0.7rem; 
                                margin: 0;
                                font-family: 'Montserrat', sans-serif;
                            ">El equipo directivo y la comunidad educativa del</p>
                            <p style="
                                font-family: 'Montserrat', sans-serif; 
                                font-weight: 700;
                                color: #d4af37; 
                                font-size: 0.85rem; 
                                margin: 5px 0 0 0;
                                letter-spacing: 1px;
                                font-style: italic;
                                line-height: 1.3;
                            ">
                                I.E.S.P. "FRANCISCO DE PAULA<br>
                                GONZALES VIGIL"
                            </p>
                        </div>
                        <div style="
                            display: inline-block;
                            vertical-align: middle;
                            margin-left: 15px;
                            width: 35px;
                            height: 35px;
                            border: 2px solid #d4af37;
                            border-radius: 50%;
                            color: #d4af37;
                            line-height: 31px;
                            text-align: center;
                            filter: drop-shadow(0 0 5px rgba(212, 175, 55, 0.5));
                        ">
                            <i class="fa-solid fa-certificate" style="font-size: 0.9rem;"></i>
                        </div>
                    </div>

                    <!-- Decorative Sparkle Background (Vibrant) -->
                    <i class="fa-solid fa-sparkles" style="position: absolute; top: 80px; right: 40px; color: #f5d173; opacity: 0.25; font-size: 4rem; filter: drop-shadow(0 0 10px rgba(245, 209, 115, 0.4));"></i>
                    <i class="fa-solid fa-sparkle" style="position: absolute; top: 180px; right: 20px; color: #d4af37; opacity: 0.3; font-size: 2rem; filter: drop-shadow(0 0 5px rgba(212, 175, 55, 0.4));"></i>
                </div>
            </div>`;
            break;
        case 'ilustracion':
            content = `
            <div class="card-floral" style="
                width: 100%; 
                max-width: 800px;
                aspect-ratio: 16/14;
                display: flex;
                background-color: #fdf2f2; /* Soft Floral Pink */
                border-radius: 4px;
                overflow: hidden;
                box-shadow: 0 30px 60px rgba(0,0,0,0.2);
                margin: 0 auto;
                position: relative;
                font-family: 'Montserrat', sans-serif;
            ">
                <!-- Left Side: Floral Visual -->
                <div style="
                    width: 45%;
                    background: url('/img/izquierdo.png');
                    background-size: cover;
                    background-position: center;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-end;
                    padding: 30px;
                ">
                    <div style="width: 40px; height: 3px; background: #b4853e; margin-bottom: 10px;"></div>
                    <p style="
                        color: #57534e; 
                        font-family: 'Playfair Display', serif; 
                        font-style: italic; 
                        font-size: 1.1rem; 
                        margin: 0;
                        opacity: 0.9;
                    ">Excelencia & Compromiso</p>
                </div>

                <!-- Right Side: Content with Floral Decor -->
                <div style="
                    width: 55%;
                    padding: 85px 45px 30px;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    background: url('/img/derecha.png');
                    background-size: cover;
                    background-position: center;
                ">
                    <!-- Ribbon Decoration -->
                    <div style="
                        position: absolute;
                        top: 0;
                        right: 0;
                        width: 0;
                        height: 0;
                        border-style: solid;
                        border-width: 0 60px 60px 0;
                        border-color: transparent #b4853e transparent transparent;
                    "></div>
                    <i class="fa-solid fa-star" style="
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        color: white;
                        font-size: 0.8rem;
                    "></i>

                    <h1 style="
                        font-family: 'Playfair Display', serif;
                        font-size: 3.2rem;
                        color: #b4853e;
                        margin: 0 0 20px 0;
                        line-height: 1.1;
                        font-weight: 700;
                        font-style: italic;
                    ">
                        <span style="display: block; text-align: center;">¡Feliz</span>
                        <span style="display: block; text-align: center;">Cumpleaños!</span>
                    </h1>

                    <p style="color: #4b5563; font-size: 1.1rem; margin-bottom: 20px;">
                        Estimado/a <span style="color: #b4853e; font-weight: 700;">${currentWorkerName}</span>,
                    </p>

                    <div style="color: #6b7280; font-size: 0.95rem; line-height: 1.6; flex-grow: 0.5;">
                        <p style="margin-bottom: 20px;">
                            Hoy celebramos no solo otro año de tu vida, sino además la importante marca que imprimes día tras día en nuestra organización. Gracias por ser pilar esencial de nuestra trayectoria compartida.
                        </p>
                        <p>
                            Que tu senda continúe iluminada por desafíos nuevos y enormes alegrías. ¡Feliz jornada para ti!
                        </p>
                    </div>

                    <div style="margin-top: -80px; border-top: 1px solid rgba(180, 133, 62, 0.2); padding-top: 0px; display: flex; justify-content: space-between; align-items: flex-end; margin-left: 40px;">
                        <div>
                            <p style="
                                color: #6b7280; 
                                font-size: 0.7rem; 
                                margin: 0;
                                font-family: 'Montserrat', sans-serif;
                            ">El equipo directivo y la comunidad educativa del</p>
                            <p style="
                                font-family: 'Montserrat', sans-serif; 
                                font-weight: 700;
                                color: #b4853e; 
                                font-size: 0.85rem; 
                                margin: 2px 0 0 0;
                                letter-spacing: 1px;
                                font-style: italic;
                                line-height: 1.3;
                            ">
                                I.E.S.P. "FRANCISCO DE PAULA<br>
                                GONZALES VIGIL"
                            </p>
                        </div>
                        <div style="
                            width: 35px;
                            height: 35px;
                            border: 2px solid #b4853e;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: #b4853e;
                            filter: drop-shadow(0 0 5px rgba(180, 133, 62, 0.3));
                        ">
                            <i class="fa-solid fa-certificate"></i>
                        </div>
                    </div>
                </div>
            </div>`;
            break;
    }

    previewContainer.innerHTML = content;
}

function downloadGreeting() {
    const elementToCapture = document.querySelector('.card-classic') || document.getElementById('main-preview').firstElementChild;

    if (!elementToCapture || elementToCapture.classList.contains('preview-placeholder')) {
        Swal.fire('Error', 'No hay diseño seleccionado para descargar.', 'error');
        return;
    }

    // Show loading state
    Swal.fire({
        title: 'Generando imagen...',
        text: 'Por favor espere',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    html2canvas(elementToCapture, {
        scale: 2, // High resolution
        useCORS: true,
        backgroundColor: null // Transparent background if supported
    }).then(canvas => {
        // Create link and download
        const link = document.createElement('a');
        const filename = `Saludo-${currentWorkerName.replace(/\s+/g, '-')}.png`;
        link.download = filename;
        link.href = canvas.toDataURL("image/png");
        link.click();

        Swal.close();

        // Optional: Close modal after download or show success toast
        // closeGreetingModal(); 
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
        Toast.fire({
            icon: 'success',
            title: 'Imagen descargada correctamente'
        });

    }).catch(err => {
        console.error(err);
        Swal.fire('Error', 'Hubo un problema al generar la imagen.', 'error');
    });
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
                    data.error || 'No se pudo eliminar el registro.',
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

    // 2. Greetings - Removed
    fullHistory = [...registrations].sort((a, b) => new Date(b.date) - new Date(a.date));
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
