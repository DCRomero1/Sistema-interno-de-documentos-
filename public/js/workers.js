document.addEventListener('DOMContentLoaded', () => {
    loadWorkers();
    loadBirthdays();

    // Add event listener to form
    const workerForm = document.getElementById('workerForm');
    if (workerForm) {
        // Change button to type submit or handle click
        // The modal button is outside the form, let's fix that connection in JS or HTML
        // For now, let's assume the button calls submitWorker()
    }
});

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

const COLORS = ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];

async function loadWorkers() {
    try {
        const response = await fetch('/api/workers');
        const workers = await response.json();

        const grid = document.getElementById('workersGrid');
        grid.innerHTML = '';

        // Update Stats
        document.getElementById('statTotal').textContent = workers.length;
        const docentesCount = workers.filter(w => w.position === 'Docente').length;
        document.getElementById('statDocentes').textContent = docentesCount;

        if (workers.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:#94a3b8; background: white; border-radius: 8px;">No hay personal registrado aún.</div>';
            return;
        }

        workers.forEach((worker, index) => {
            const card = document.createElement('div');
            card.className = 'worker-card';
            // Custom card style
            card.style.cssText = `
                display: flex; 
                flex-direction: column; 
                align-items: center; 
                background: white; 
                padding: 25px; 
                border-radius: 12px; 
                border: 1px solid #f1f5f9;
                transition: all 0.2s ease;
                box-shadow: 0 2px 4px rgba(0,0,0,0.02);
                position: relative;
                overflow: hidden;
            `;

            // Randomish color for avatar background based on index
            const bgCol = COLORS[index % COLORS.length];
            const initials = worker.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

            // Position Badge Color
            let posBadge = '#94a3b8';
            if (worker.position === 'Docente') posBadge = '#3b82f6';
            if (worker.position === 'Administrativo') posBadge = '#10b981';

            card.innerHTML = `
                <div style="width: 100%; height: 5px; background: ${bgCol}; position: absolute; top:0; left:0;"></div>
                
                <div style="width: 60px; height: 60px; background: ${bgCol}; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; margin-bottom: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                    ${initials}
                </div>
                
                <h4 style="margin: 0 0 5px 0; font-size: 1.1rem; color: #1e293b; text-align: center;">${escapeHtml(worker.fullName)}</h4>
                
                <span style="background: ${posBadge}20; color: ${posBadge}; padding: 4px 12px; border-radius: 15px; font-size: 0.75rem; font-weight: 600; margin-bottom: 15px;">
                    ${escapeHtml(worker.position)}
                </span>
                
                <div style="width: 100%; border-top: 1px solid #f1f5f9; padding-top: 15px; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; color: #64748b;">
                    <span><i class="fa-solid fa-id-card"></i> ${escapeHtml(worker.dni)}</span>
                    <button class="btn-icon" style="color: #94a3b8; cursor: pointer;" title="Editar (Próximamente)"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                </div>
            `;

            // Micro-interaction
            card.onmouseenter = () => { card.style.transform = 'translateY(-5px)'; card.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)'; };
            card.onmouseleave = () => { card.style.transform = 'none'; card.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; };

            grid.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading workers:', error);
    }
}

async function loadBirthdays() {
    try {
        const response = await fetch('/api/workers/birthdays');
        const birthdays = await response.json();

        const listContainer = document.getElementById('birthdayList');
        listContainer.innerHTML = '';

        if (birthdays.length === 0) {
            listContainer.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.8); padding: 10px;">No hay cumpleaños cercanos.</div>';
            return;
        }

        birthdays.forEach(b => {
            const item = document.createElement('div');
            item.className = 'birthday-item';

            const isToday = b.daysUntil === 0;
            const bg = isToday ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)';
            const border = isToday ? '2px solid #fff' : '1px solid rgba(255,255,255,0.1)';

            item.style.cssText = `
                background: ${bg};
                padding: 12px;
                border-radius: 10px;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                border: ${border};
            `;

            item.innerHTML = `
                <div style="flex-grow: 1;">
                    <div style="font-weight: 600; font-size: 0.95rem;">${escapeHtml(b.fullName)}</div>
                    <div style="font-size: 0.8rem; opacity: 0.8;">${escapeHtml(b.position)}</div>
                </div>
                <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 5px;">
                    <div>
                        <span style="font-weight: 700; font-size: 1.1rem;">${b.birthDateStr.split(' ')[0]}</span>
                        <span style="font-size: 0.75rem; text-transform: uppercase;">${b.birthDateStr.split(' ')[1]}</span>
                    </div>
                    ${b.position === 'Docente' ?
                    `<button onclick="openGreetingModal('${escapeHtml(b.fullName)}')" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); color: white; border-radius: 4px; padding: 2px 8px; cursor: pointer; font-size: 0.7rem; transition: background 0.2s;" title="Crear Felicitación Formal">
                            <i class="fa-solid fa-envelope-open-text"></i> Saludo
                        </button>` : ''
                }
                </div>
            `;
            listContainer.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading birthdays:', error);
    }
}

// Greeting Modal Logic
function openGreetingModal(name) {
    const modal = document.getElementById('greetingModal');
    const nameElement = document.getElementById('greetingName');
    const dateElement = document.getElementById('greetingDate');

    // Set Name
    nameElement.textContent = name;

    // Set Date to Today in Spanish
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date().toLocaleDateString('es-ES', options);
    // Capitalize first letter
    const formattedDate = "Tacna, " + today.charAt(0).toUpperCase() + today.slice(1);

    dateElement.textContent = formattedDate;

    modal.style.display = 'block';
}

function closeGreetingModal() {
    document.getElementById('greetingModal').style.display = 'none';
}

// Close modal when clicking outside
window.addEventListener('click', function (event) {
    const modal = document.getElementById('greetingModal');
    if (event.target == modal) {
        closeGreetingModal();
    }
});

// Download Greeting as Image
function downloadGreeting() {
    const card = document.getElementById('captureCard');
    html2canvas(card).then(canvas => {
        const link = document.createElement('a');
        link.download = 'Saludo_' + document.getElementById('greetingName').textContent + '.png';
        link.href = canvas.toDataURL();
        link.click();
    });
}

// Share via WhatsApp
function shareWhatsApp() {
    const name = document.getElementById('greetingName').textContent;
    const text = `🎉 *Feliz Cumpleaños a ${name}* 🎉\n\nEl I.E.S.T.P. "Francisco de Paula Gonzales Vigil" le desea un excelente día lleno de éxitos y prosperidad. 🎂✨`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}

// Share via Email
function shareEmail() {
    const name = document.getElementById('greetingName').textContent;
    const subject = `Feliz Cumpleaños ${name}`;
    const body = `Estimado(a) ${name},\n\nEl equipo directivo y la comunidad educativa del I.E.S.T.P. "Francisco de Paula Gonzales Vigil" le desean un muy feliz cumpleaños.\n\nQue este nuevo año esté lleno de éxitos, salud y prosperidad.\n\nAtentamente,\nLa Administración`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

async function saveWorker() {
    const form = document.getElementById('workerForm');
    const inputs = form.querySelectorAll('input, select');
    const data = {};

    // Mapping inputs manually or by order
    data.fullName = inputs[0].value;
    data.dni = inputs[1].value;
    data.birthDate = inputs[2].value;
    data.position = inputs[3].value;

    if (!data.fullName || !data.dni) {
        alert('Por favor complete Nombre y DNI');
        return;
    }

    try {
        const response = await fetch('/api/workers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.success) {
            closeWorkerModal();
            form.reset();
            loadWorkers();
            loadBirthdays();
        } else {
            alert('Error al guardar: ' + result.error);
        }
    } catch (error) {
        console.error('Error saving worker:', error);
        alert('Error de conexión');
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

document.addEventListener('DOMContentLoaded', fetchUserInfo);
