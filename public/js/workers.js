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

async function loadWorkers() {
    try {
        const response = await fetch('/api/workers');
        const workers = await response.json();

        const container = document.getElementById('workersList');
        container.innerHTML = ''; // Clear mock data

        if (workers.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#7f8c8d;">No hay trabajadores registrados.</p>';
            return;
        }

        workers.forEach(worker => {
            const card = document.createElement('div');
            card.className = 'worker-card';

            // Initials
            const initials = worker.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

            card.innerHTML = `
                <div class="worker-avatar">${initials}</div>
                <div class="worker-info">
                    <h4>${worker.fullName}</h4>
                    <p>${worker.position || 'Sin cargo'} - ${worker.dni}</p>
                </div>
                <!-- <div style="margin-left: auto;">
                    <button class="btn btn-secondary btn-icon-only"><i class="fa-solid fa-pen"></i></button>
                </div> -->
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading workers:', error);
    }
}

async function loadBirthdays() {
    try {
        const response = await fetch('/api/workers/birthdays');
        const birthdays = await response.json();

        const listContainer = document.querySelector('.birthday-list');
        listContainer.innerHTML = '';

        if (birthdays.length === 0) {
            listContainer.innerHTML = '<div style="opacity:0.7;">No hay cumpleaños próximos.</div>';
            return;
        }

        birthdays.forEach(b => {
            const item = document.createElement('div');
            item.className = 'birthday-item';

            // Check if it is today
            const isToday = b.daysUntil === 0;
            const dateText = isToday ? '¡Hoy!' : b.birthDateStr;
            const style = isToday ? 'font-weight:bold; color:#ffeaa7;' : '';

            item.innerHTML = `
                <span>${b.fullName}</span>
                <span class="birthday-date" style="${style}">${dateText}</span>
            `;
            listContainer.appendChild(item);
        });

        // Update counts
        // (Optional: fetch proper stats if needed)
    } catch (error) {
        console.error('Error loading birthdays:', error);
    }
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
