document.addEventListener('DOMContentLoaded', async () => {
    let editMode = false;
    let simpleMode = false;
    let workers = [];
    let assignments = {};
    let allPavilions = [];

    // Variables para el flujo del panel
    let currentlyEditingSlotId = null;
    let currentlyEditingSlotLabel = null;
    let currentlyEditingCellEl = null;

    const btnEditMode = document.getElementById('btnEditMode');
    const btnSimpleView = document.getElementById('btnSimpleView');
    const tableTitle = document.querySelector('h1');

    // DOM Elements for FullScreen Panel
    const fullScreenAssignModal = document.getElementById('fullScreenAssignModal');
    const selectedSlotHeader = document.getElementById('selectedSlotHeader');
    const panelWorkerSelect = document.getElementById('panelWorkerSelect');
    const panelPavilionsContainer = document.getElementById('panelPavilionsContainer');
    const btnCloseAssignPanel = document.getElementById('btnCloseAssignPanel');
    const btnCancelAssignPanel = document.getElementById('btnCancelAssignPanel');
    const btnSaveAssignPanel = document.getElementById('btnSaveAssignPanel');

    // 1. Cargar Trabajadores y Pabellones iniciales (Lectura)
    async function loadInitialData() {
        try {
            const [workersRes, pavilionsRes] = await Promise.all([
                fetch('/api/workers'),
                fetch('/api/pavilions')
            ]);

            const workersData = await workersRes.json();
            workers = workersData.workers || [];
            allPavilions = await pavilionsRes.json();

            // Preparar el select del panel grande
            panelWorkerSelect.innerHTML = '<option value="">-- Seleccione un trabajador --</option>';
            workers.sort((a, b) => a.fullName.localeCompare(b.fullName)).forEach(w => {
                const option = document.createElement('option');
                option.value = w.id;
                option.textContent = w.fullName;
                panelWorkerSelect.appendChild(option);
            });

            // Preparar los checkboxes del panel grande estructurados por pabellón y área
            panelPavilionsContainer.innerHTML = '';
            panelPavilionsContainer.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';

            allPavilions.forEach(p => {
                const pBox = document.createElement('div');
                pBox.className = 'border border-gray-200 rounded-lg overflow-hidden flex flex-col bg-white';

                // Header (Pavilion Name)
                const pHeader = document.createElement('div');
                pHeader.className = 'bg-gray-50 px-3 py-2 border-b border-gray-200 font-bold text-gray-800 text-sm';
                pHeader.textContent = p.name;
                pBox.appendChild(pHeader);

                // Body (Areas Checkboxes)
                const pBody = document.createElement('div');
                pBody.className = 'p-3 grid grid-cols-1 gap-2 text-sm text-gray-700';

                if (p.areas && p.areas.length > 0) {
                    p.areas.forEach(a => {
                        const lbl = document.createElement('label');
                        lbl.className = 'flex flex-row items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition';
                        lbl.innerHTML = `
                            <input type="checkbox" id="panel-area-${a.id}" value="${a.id}" class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 area-checkbox">
                            <span class="leading-tight select-none">${a.name.replace(/</g, '&lt;')}</span>
                        `;
                        pBody.appendChild(lbl);
                    });
                } else {
                    pBody.innerHTML = '<span class="text-gray-400 italic text-xs">Sin áreas configuradas</span>';
                }

                pBox.appendChild(pBody);
                panelPavilionsContainer.appendChild(pBox);
            });

        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    // 2. Cargar Asignaciones de la Tabla desde la BD
    async function loadAssignments() {
        try {
            const response = await fetch('/api/schedule');
            const data = await response.json();

            // Limpiar datos estáticos
            document.querySelectorAll('.slot-worker').forEach(slotEl => {
                const parentTd = slotEl.closest('td');
                parentTd.classList.add('editable-cell');
                let ul = parentTd.querySelector('ul');
                if (ul) ul.innerHTML = '';
                slotEl.textContent = 'Sin Asignar';
            });
            assignments = {}; // Reiniciar

            data.forEach(asig => {
                assignments[asig.slotId] = asig;
                const slotEl = document.querySelector(`.slot-worker[data-slot-id="${asig.slotId}"]`);
                if (slotEl && asig.fullName) {
                    slotEl.textContent = asig.fullName;

                    const parentTd = slotEl.closest('td');
                    let ul = parentTd.querySelector('ul');
                    if (!ul) {
                        ul = document.createElement('ul');
                        ul.className = 'list-none area-list mt-2 space-y-1';
                        parentTd.appendChild(ul);
                    }

                    ul.innerHTML = '';
                    if (asig.areas && asig.areas.length > 0) {
                        asig.areas.forEach(area => {
                            const li = document.createElement('li');
                            li.className = 'text-xs text-gray-700 bg-yellow-50 p-1 rounded border border-yellow-100';
                            li.innerHTML = `<b class="text-gray-900">${area.name}:</b> ${area.description}`;
                            ul.appendChild(li);
                        });
                    } else {
                        ul.innerHTML = '<li class="text-xs text-red-500 italic mt-1">Sin áreas marcadas</li>';
                    }
                }
            });
        } catch (error) {
            console.error('Error loading assignments:', error);
        }
    }

    // 3. Sistema de Edición y Vistas
    btnEditMode.addEventListener('click', () => {
        if (simpleMode) {
            Swal.fire('No permitido', 'Desactiva la Vista Turnos para editar.', 'warning');
            return;
        }
        editMode = !editMode;
        if (editMode) {
            document.body.classList.add('edit-mode');
            btnEditMode.innerHTML = '<i class="fa-solid fa-check"></i> <span class="font-bold">Finalizar Edición</span>';
            btnEditMode.classList.replace('bg-blue-600', 'bg-red-600');
            Swal.fire({
                title: 'Modo Edición Activado',
                text: 'Haz clic en cualquier celda de la tabla para abrir el panel de asignación',
                icon: 'info',
                timer: 3000,
                showConfirmButton: false
            });
        } else {
            document.body.classList.remove('edit-mode');
            btnEditMode.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> <span>Activar Edición</span>';
            btnEditMode.classList.replace('bg-red-600', 'bg-blue-600');
        }
    });

    btnSimpleView.addEventListener('click', () => {
        if (editMode) {
            Swal.fire('No permitido', 'Finaliza la edición primero.', 'warning');
            return;
        }
        simpleMode = !simpleMode;
        if (simpleMode) {
            document.querySelector('.schedule-table').classList.add('simple-view');
            btnSimpleView.innerHTML = '<i class="fa-solid fa-list-check"></i> <span>Vista Detallada</span>';
            btnSimpleView.classList.replace('bg-purple-600', 'bg-gray-600');
            tableTitle.textContent = tableTitle.textContent.replace('ROL DE LIMPIEZA', 'ROL DE TURNOS');
        } else {
            document.querySelector('.schedule-table').classList.remove('simple-view');
            btnSimpleView.innerHTML = '<i class="fa-solid fa-table-cells"></i> <span>Vista Turnos</span>';
            btnSimpleView.classList.replace('bg-gray-600', 'bg-purple-600');
            tableTitle.textContent = tableTitle.textContent.replace('ROL DE TURNOS', 'ROL DE LIMPIEZA');
        }
    });

    // 4. Delegación de eventos para clicks en la tabla (Abrir Gran Panel)
    document.addEventListener('click', async (e) => {
        if (!editMode) return;
        const editableCell = e.target.closest('td.editable-cell');
        if (editableCell) {
            const slotWorkerEl = editableCell.querySelector('.slot-worker');
            if (slotWorkerEl) {
                openAssignPanel(slotWorkerEl);
            }
        }
    });

    function openAssignPanel(element) {
        currentlyEditingSlotId = element.dataset.slotId;
        currentlyEditingCellEl = element;

        // Extraer info amigable del turno leyendo la tabla
        const row = element.closest('tr');
        const headerCell = row.querySelector('.time-header');
        const thElement = element.closest('table').querySelector(`th:nth-child(${element.closest('td').cellIndex + 1})`);

        let timeLabel = headerCell ? headerCell.textContent.trim() : 'Horario no detectado';
        let dayLabel = thElement ? thElement.textContent.trim() : 'Día';
        currentlyEditingSlotLabel = `${dayLabel} (${timeLabel})`;

        selectedSlotHeader.textContent = `Turno: ${currentlyEditingSlotLabel} | ID: ${currentlyEditingSlotId}`;

        // Limpiar
        document.querySelectorAll('.area-checkbox').forEach(cb => cb.checked = false);

        // Cargar selección actual de la base de datos (assignments poblado en loadAssignments)
        const currentAsig = assignments[currentlyEditingSlotId];
        if (currentAsig && currentAsig.workerId) {
            panelWorkerSelect.value = currentAsig.workerId.toString();
            // Disparar evento para que lea de BD sus pabellones
            panelWorkerSelect.dispatchEvent(new Event('change'));
        } else {
            panelWorkerSelect.value = "";
        }

        fullScreenAssignModal.classList.remove('hidden');
    }

    function closeAssignPanel() {
        fullScreenAssignModal.classList.add('hidden');
        currentlyEditingSlotId = null;
        currentlyEditingCellEl = null;
    }

    btnCloseAssignPanel.addEventListener('click', closeAssignPanel);
    btnCancelAssignPanel.addEventListener('click', closeAssignPanel);

    // Evento al cambiar el trabajador: Lee de BD
    panelWorkerSelect.addEventListener('change', async (e) => {
        const workerId = e.target.value;
        const checkboxes = document.querySelectorAll('.area-checkbox');
        checkboxes.forEach(cb => cb.checked = false);

        if (!workerId) return;

        try {
            const res = await fetch(`/api/workers/${workerId}/pavilions`);
            const assignedAreas = await res.json();

            assignedAreas.forEach(a => {
                const cb = document.getElementById(`panel-area-${a.id}`);
                if (cb) cb.checked = true;
            });
        } catch (error) {
            console.error('Error fetching worker areas:', error);
        }
    });

    // Guardar en la Base de Datos nativa
    btnSaveAssignPanel.addEventListener('click', async () => {
        const workerId = panelWorkerSelect.value;

        try {
            // Caso 1: Deseleccionó limpiando el turno.
            if (!workerId) {
                // Sobreescribir el assignment actual por null
                await fetch('/api/schedule/assign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ slotId: currentlyEditingSlotId, workerId: null })
                });

                showToast('Turno liberado');
                closeAssignPanel();
                await loadAssignments();
                return;
            }

            // Caso 2: Asignación normal
            const checkedBoxes = document.querySelectorAll('.area-checkbox:checked');
            const pavilionIds = Array.from(checkedBoxes).map(cb => parseInt(cb.value)); // Conservamos el nombre payload pavilionIds por legacy API

            // Promise All para guardar turnos y áreas de manera asincronía en Node Backend
            await Promise.all([
                // Guardar las áreas al trabajador
                fetch('/api/workers/pavilions/assign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ workerId, pavilionIds })
                }),
                // Ubicar al trabajador en la celda
                fetch('/api/schedule/assign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ slotId: currentlyEditingSlotId, workerId })
                })
            ]);

            showToast('Turno y Áreas guardadas');
            closeAssignPanel();
            await loadAssignments(); // Repinta visualmente trayéndolo de SQL

        } catch (error) {
            console.error('Error saving assignments:', error);
            Swal.fire('Error', 'Hubo un error al guardar en la Base de Datos.', 'error');
        }
    });

    function showToast(msg) {
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: msg,
            showConfirmButton: false,
            timer: 2000
        });
    }

    // Inicialización
    await loadInitialData();
    await loadAssignments();
});
