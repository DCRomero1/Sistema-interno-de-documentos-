document.addEventListener('DOMContentLoaded', async () => {
    let editMode = false;
    let simpleMode = false;
    let workers = [];
    let assignments = {};
    let allPavilions = [];
    let workerColorMap = {}; // Mapa dinámico workerId -> color

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
                fetch('/api/cleaners'),
                fetch('/api/pavilions')
            ]);

            const workersData = await workersRes.json();
            // La API de cleaners devuelve el array directamente (no envuelto en {cleaners: [...]})
            workers = Array.isArray(workersData) ? workersData : (workersData.cleaners || []);
            allPavilions = await pavilionsRes.json();

            // Construir mapa de colores único por trabajador
            const colorPalette = [
                '#fef3c7', // Amarillo claro
                '#fef08a', // Amarillo fuerte
                '#93c5fd', // Azul claro
                '#f5d0fe', // Rosa/Lila
                '#bae6fd', // Celeste
                '#bef264', // Verde lima
                '#67e8f9', // Cyan/Turquesa
                '#fca5a5', // Rojo/Salmón
                '#fdba74', // Naranja
                '#c4b5fd', // Violeta/Púrpura
                '#86efac', // Verde menta
                '#fda4af', // Rosa fuerte
                '#a5b4fc', // Índigo claro
                '#d9f99d', // Lima pálido
                '#fbcfe8', // Pink pastel
                '#99f6e4', // Teal claro
                '#fed7aa', // Melocotón
                '#e9d5ff', // Lavanda
                '#a7f3d0', // Esmeralda claro
                '#fde68a', // Ámbar
            ];
            workerColorMap = {};
            workers.forEach((w, idx) => {
                workerColorMap[w.id] = colorPalette[idx % colorPalette.length];
            });

            // Preparar la lista visual de selección de trabajadores
            const workerPickerList = document.getElementById('workerPickerList');
            const panelWorkerInput = document.getElementById('panelWorkerSelect');

            if (panelWorkerInput) {
                panelWorkerInput.innerHTML = '<option value="">-- Seleccione un trabajador --</option>';
            }

            const cleaningStaff = workers;
            cleaningStaff.sort((a, b) => a.fullName.localeCompare(b.fullName));

            if (workerPickerList) {
                workerPickerList.innerHTML = '';

                const avatarColors = [
                    'bg-blue-100 text-blue-700',
                    'bg-purple-100 text-purple-700',
                    'bg-yellow-100 text-yellow-700',
                    'bg-green-100 text-green-700',
                    'bg-red-100 text-red-700',
                    'bg-indigo-100 text-indigo-700',
                    'bg-pink-100 text-pink-700',
                    'bg-orange-100 text-orange-700',
                ];

                cleaningStaff.forEach((w, idx) => {
                    const names = w.fullName.trim().split(' ');
                    const initials = names.slice(0, 2).map(n => n[0]).join('').toUpperCase();
                    const colorClass = avatarColors[idx % avatarColors.length];

                    const card = document.createElement('div');
                    card.className = 'worker-picker-card flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-blue-50 transition select-none';
                    card.dataset.workerId = w.id;
                    card.innerHTML = `
                        <div class="h-10 w-10 rounded-full ${colorClass} flex items-center justify-center font-bold text-sm shrink-0">${initials}</div>
                        <div class="flex-1 min-w-0">
                            <div class="font-semibold text-gray-800 text-sm truncate">${w.fullName}</div>
                            <div class="text-[0.65rem] text-gray-500 uppercase tracking-wide">Personal de Limpieza</div>
                        </div>
                        <div class="worker-check-icon text-blue-600 opacity-0 transition-opacity">
                            <i class="fa-solid fa-circle-check text-lg"></i>
                        </div>
                    `;

                    card.addEventListener('click', () => {
                        // Deselect all
                        document.querySelectorAll('.worker-picker-card').forEach(c => {
                            c.classList.remove('bg-blue-50', 'border-l-4', 'border-blue-500');
                            c.querySelector('.worker-check-icon').style.opacity = '0';
                        });
                        // Select this one
                        card.classList.add('bg-blue-50', 'border-l-4', 'border-blue-500');
                        card.querySelector('.worker-check-icon').style.opacity = '1';
                        panelWorkerInput.value = w.id;
                        // Disparar cambio para cargar sus pabellones
                        panelWorkerInput.dispatchEvent(new Event('change'));
                    });

                    workerPickerList.appendChild(card);
                });
            }

            // Populating Select Menu directly
            if (panelWorkerInput) {
                cleaningStaff.forEach(w => {
                    const option = document.createElement('option');
                    option.value = w.id;
                    option.textContent = w.fullName;
                    panelWorkerInput.appendChild(option);
                });
            }

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
            const colorClasses = ['bg-alodia', 'bg-rosario', 'bg-julian', 'bg-luisa', 'bg-nilda', 'bg-david', 'bg-demetrio', 'bg-alfredo', 'bg-gilmer', 'bg-caner'];
            document.querySelectorAll('.slot-worker').forEach(slotEl => {
                const parentTd = slotEl.closest('td');
                parentTd.classList.add('editable-cell');
                // Limpiar color anterior
                colorClasses.forEach(c => parentTd.classList.remove(c));
                parentTd.style.backgroundColor = '';
                parentTd.classList.add('bg-gray-50');
                let ul = parentTd.querySelector('ul.area-list') || parentTd.querySelector('ul');
                if (ul) ul.innerHTML = '';
                slotEl.innerHTML = '<span class="text-gray-400 italic font-normal text-xs">Sin Asignar</span>'; // Empty format
                slotEl.dataset.workerId = '';
                slotEl.dataset.workers = ''; // Para listas
            });
            assignments = {}; // Reiniciar fallback


            // Group data by slotId
            const slotData = {};
            data.forEach(asg => {
                if (!slotData[asg.slotId]) slotData[asg.slotId] = [];
                slotData[asg.slotId].push(asg);
            });

            Object.keys(slotData).forEach(slotId => {
                const workersInSlot = slotData[slotId];
                const slotEl = document.querySelector(`.slot-worker[data-slot-id="${slotId}"]`);
                if (slotEl) {
                    slotEl.innerHTML = ''; // Limpiar fallback
                    const parentTd = slotEl.closest('td');
                    parentTd.classList.remove('bg-gray-50');

                    // Asignar color de fondo según primer trabajador del slot
                    const firstWorkerId = workersInSlot[0].workerId;
                    const bgColor = workerColorMap[firstWorkerId] || '#f3f4f6';
                    parentTd.style.backgroundColor = bgColor;

                    let ul = parentTd.querySelector('ul.area-list') || parentTd.querySelector('ul');
                    if (!ul) {
                        ul = document.createElement('ul');
                        ul.className = 'list-none area-list mt-2 space-y-1';
                        parentTd.appendChild(ul);
                    }
                    ul.innerHTML = '';

                    workersInSlot.forEach((w, idx) => {
                        // Renderizar Nombre en el Div Slot-Worker
                        const nameDiv = document.createElement('div');
                        nameDiv.textContent = w.fullName;
                        if (idx < workersInSlot.length - 1) {
                            nameDiv.className = 'border-b border-gray-400 pb-1 mb-1';
                        }
                        slotEl.appendChild(nameDiv);

                        // Renderizar las áreas agrupadas por pabellón
                        if (w.areas && w.areas.length > 0) {
                            const areasPorPabellon = {};
                            w.areas.forEach(area => {
                                if (!areasPorPabellon[area.name]) {
                                    areasPorPabellon[area.name] = [];
                                }
                                areasPorPabellon[area.name].push(area.description);
                            });

                            for (const [pabellon, listaAreas] of Object.entries(areasPorPabellon)) {
                                const liPavilion = document.createElement('li');
                                liPavilion.className = 'text-[0.65rem] text-gray-900 font-bold mt-1 uppercase';
                                liPavilion.textContent = pabellon;
                                ul.appendChild(liPavilion);

                                listaAreas.forEach(areaDesc => {
                                    const liArea = document.createElement('li');
                                    liArea.className = 'text-[0.65rem] text-gray-700 pl-2 leading-tight flex gap-1';
                                    liArea.innerHTML = `<span class="text-gray-400">-</span> <span>${areaDesc}</span>`;
                                    ul.appendChild(liArea);
                                });
                            }
                        } else {
                            const li = document.createElement('li');
                            li.className = 'text-[0.65rem] text-red-500 italic mt-1 leading-tight';
                            li.innerHTML = `<b>${w.fullName.split(' ')[0]}:</b> Sin áreas`;
                            ul.appendChild(li);
                        }
                    });

                    // Almacenar string para las cards del modal
                    slotEl.dataset.workers = JSON.stringify(workersInSlot.map(w => ({ id: w.workerId, fullName: w.fullName })));
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

    async function openAssignPanel(element) {
        currentlyEditingSlotId = element.dataset.slotId;
        currentlyEditingCellEl = element;

        // Extraer info amigable del turno leyendo la tabla o el ID
        const row = element.closest('tr');
        const headerCell = row.querySelector('.time-header') || row.querySelector('td:nth-child(2)');

        let timeLabel = headerCell ? headerCell.textContent.trim() : '';

        // Mapa para reconocer los días por el ID del slot (ej: m1-mar, m-sab-1)
        const dayMap = {
            'lun': 'LUNES', 'mar': 'MARTES', 'mie': 'MIÉRCOLES',
            'jue': 'JUEVES', 'vie': 'VIERNES', 'sab': 'SÁBADO', 'dom': 'DOMINGO'
        };

        const slotParts = currentlyEditingSlotId.split('-');
        let dayCode = slotParts.find(p => dayMap[p]);
        let dayLabel = dayMap[dayCode] || 'Día';

        // Fixes manuales para el horario de sábados y domingos (la tabla es irregular ahí)
        if (!timeLabel || timeLabel === 'TURNO' || timeLabel === 'MAÑANA' || timeLabel === 'TARDE' || timeLabel === 'NOCHE') {
            if (currentlyEditingSlotId.includes('m-sab')) timeLabel = '06:00 - 14:00';
            else if (currentlyEditingSlotId.includes('m-dom')) timeLabel = '06:00 - 14:00';
            else if (currentlyEditingSlotId.includes('t-sab')) timeLabel = '14:00 - 22:00';
            else if (currentlyEditingSlotId.includes('t-dom')) timeLabel = '14:00 - 21:45';
            else if (currentlyEditingSlotId.includes('n-sab')) timeLabel = 'Sáb 22:00 - 05:45';
            else if (currentlyEditingSlotId.includes('n-dom')) timeLabel = 'Dom 21:45 - 05:30';
            else timeLabel = 'Horario General';
        }

        currentlyEditingSlotLabel = `${dayLabel} (${timeLabel})`;

        selectedSlotHeader.textContent = `Turno: ${currentlyEditingSlotLabel} | ID: ${currentlyEditingSlotId}`;

        // Limpiar checkboxes y reset de selección de lista
        document.querySelectorAll('.area-checkbox').forEach(cb => cb.checked = false);
        panelWorkerSelect.value = "";
        // Deseleccionar todas las tarjetas visualmente
        document.querySelectorAll('.worker-picker-card').forEach(c => {
            c.classList.remove('bg-blue-50', 'border-l-4', 'border-blue-500');
            const icon = c.querySelector('.worker-check-icon');
            if (icon) icon.style.opacity = '0';
        });

        // Renderizado de las tarjetas internas "Asignados actualmente"
        const workersDataStr = element.dataset.workers;
        let workersInSlot = [];
        if (workersDataStr) {
            try { workersInSlot = JSON.parse(workersDataStr); } catch (e) { }
        }
        renderAssignedWorkerCards(workersInSlot);

        fullScreenAssignModal.classList.remove('hidden');

        // Cargar áreas específicas de este turno (slot)
        try {
            const slotAreasRes = await fetch(`/api/schedule/slot/${currentlyEditingSlotId}/areas`);
            const slotAreas = await slotAreasRes.json();
            slotAreas.forEach(a => {
                const cb = document.getElementById(`panel-area-${a.id}`);
                if (cb) cb.checked = true;
            });
        } catch (error) {
            console.error('Error cargando áreas del turno:', error);
        }
    }

    function renderAssignedWorkerCards(workersInSlot) {
        const container = document.getElementById('panelAssignedWorkers');
        if (!container) return;
        container.innerHTML = '';
        if (workersInSlot.length === 0) {
            container.innerHTML = '<span class="text-xs text-gray-500 italic">Nadie asignado aún</span>';
            return;
        }

        workersInSlot.forEach(w => {
            const card = document.createElement('div');
            card.className = 'flex items-center gap-3 bg-white border border-gray-200 p-2 rounded-lg shadow-sm';

            // Generar iniciales
            const names = w.fullName.split(' ');
            const initials = names.slice(0, 2).map(n => n[0]).join('').toUpperCase();

            card.innerHTML = `
                <div class="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">${initials}</div>
                <div class="flex-1">
                    <div class="text-sm font-bold text-gray-800 leading-tight">${w.fullName}</div>
                    <div class="text-[0.65rem] text-gray-500">Personal de Limpieza</div>
                </div>
                <button class="btn-remove-worker text-red-500 hover:text-red-700 px-2 py-1 bg-red-50 hover:bg-red-100 rounded transition" data-worker-id="${w.id}" title="Quitar este trabajador del turno">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;

            // Listener borrar individual
            const btnRemove = card.querySelector('.btn-remove-worker');
            btnRemove.addEventListener('click', async (e) => {
                e.preventDefault();
                await removeSpecificWorker(w.id);
            });

            container.appendChild(card);
        });
    }

    async function removeSpecificWorker(workerId) {
        try {
            await fetch('/api/schedule/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slotId: currentlyEditingSlotId, workerId: workerId, action: 'remove' })
            });
            showToast('Trabajador retirado del turno');
            await loadAssignments();

            // Re-leer datos y repintar la vista
            const updatedSlot = document.querySelector(`.slot-worker[data-slot-id="${currentlyEditingSlotId}"]`);
            if (updatedSlot) {
                const workersDataStr = updatedSlot.dataset.workers;
                let workersInSlot = [];
                if (workersDataStr) {
                    try { workersInSlot = JSON.parse(workersDataStr); } catch (e) { }
                }
                renderAssignedWorkerCards(workersInSlot);
            }
        } catch (error) {
            console.error('Error', error);
            Swal.fire('Error', 'Hubo un error al retirar al trabajador.', 'error');
        }
    }

    function closeAssignPanel() {
        fullScreenAssignModal.classList.add('hidden');
        currentlyEditingSlotId = null;
        currentlyEditingCellEl = null;
    }

    // Guardar: asigna el trabajador seleccionado al slot Y guarda sus areas marcadas
    async function saveAreasForSlot() {
        if (!currentlyEditingSlotId) {
            Swal.fire('Error', 'No hay ningún turno seleccionado.', 'error');
            return;
        }

        const workerId = panelWorkerSelect.value;

        // Obtener las areas chequeadas
        const checkedAreas = [];
        document.querySelectorAll('.area-checkbox:checked').forEach(cb => {
            checkedAreas.push(parseInt(cb.value));
        });

        const slotEl = document.querySelector(`.slot-worker[data-slot-id="${currentlyEditingSlotId}"]`);
        let workerIds = [];
        if (slotEl && slotEl.dataset.workers) {
            try {
                const arr = JSON.parse(slotEl.dataset.workers);
                workerIds = arr.map(w => w.id);
            } catch (e) { }
        }

        if (!workerId) {
            // Si no hay trabajador seleccionado visualmente, guardamos para los ya asignados
            if (workerIds.length === 0) {
                Swal.fire('Sin trabajador', 'Primero escoge un trabajador de la lista.', 'warning');
                return;
            }

            try {
                // Guardar areas para este slot específico
                await fetch('/api/schedule/slot/assign-areas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ slotId: currentlyEditingSlotId, areaIds: checkedAreas })
                });
                showToast('\u00c1reas guardadas correctamente en el horario');
                closeAssignPanel();
                await loadAssignments();
            } catch (err) {
                console.error('Error guardando áreas:', err);
                Swal.fire('Error', 'No se pudo guardar las áreas.', 'error');
            }
        } else {
            // Si hay un trabajador seleccionado, primero lo asignamos y luego guardamos sus áreas
            try {
                if (!workerIds.includes(parseInt(workerId))) {
                    // 1. Asignar el trabajador al slot (solo si no estaba asignado ya)
                    const assignRes = await fetch('/api/schedule/assign', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ slotId: currentlyEditingSlotId, workerId: parseInt(workerId), action: 'add' })
                    });

                    if (!assignRes.ok) throw new Error('Error al asignar trabajador');
                }

                // 2. Guardar areas marcadas para este slot específico
                const areasRes = await fetch('/api/schedule/slot/assign-areas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ slotId: currentlyEditingSlotId, areaIds: checkedAreas })
                });

                if (!areasRes.ok) throw new Error('Error al guardar áreas');

                showToast('Trabajador y áreas guardados en el horario');
                closeAssignPanel();
                await loadAssignments();
            } catch (error) {
                console.error('Error guardando:', error);
                Swal.fire('Error', 'Hubo un problema al guardar la información.', 'error');
            }
        }
    }

    btnCloseAssignPanel.addEventListener('click', closeAssignPanel);
    btnCancelAssignPanel.addEventListener('click', closeAssignPanel);

    // Boton Guardar del footer (guarda areas y turno)
    if (btnSaveAssignPanel) {
        btnSaveAssignPanel.addEventListener('click', saveAreasForSlot);
    }

    // Evento al cambiar el trabajador: Ya no pisa los checkboxes de áreas
    // Las áreas ahora son por turno (slot), no por trabajador
    panelWorkerSelect.addEventListener('change', async (e) => {
        // No hacer nada con los checkboxes de áreas al cambiar de trabajador
        // Las áreas ya se cargaron al abrir el panel para este slot
    });

    // Evento de "Liberar Turno" nativo
    const btnClearAssignPanel = document.getElementById('btnClearAssignPanel');
    if (btnClearAssignPanel) {
        btnClearAssignPanel.addEventListener('click', async () => {
            try {
                // Sobreescribir el assignment actual por clear global
                await fetch('/api/schedule/assign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ slotId: currentlyEditingSlotId, action: 'clear' })
                });

                showToast('Turno liberado completamente');
                closeAssignPanel();
                await loadAssignments();
            } catch (error) {
                console.error('Error al liberar turno:', error);
                Swal.fire('Error', 'Hubo un error al liberar el turno.', 'error');
            }
        });
    }

    // Funciones comunes de Guardado para Adds y Replaces
    async function processAssignment(actionType) {
        const workerId = panelWorkerSelect.value;
        if (!workerId) {
            Swal.fire('Advertencia', 'Debe seleccionar un trabajador.', 'warning');
            return;
        }

        try {
            const checkedBoxes = document.querySelectorAll('.area-checkbox:checked');
            const pavilionIds = Array.from(checkedBoxes).map(cb => parseInt(cb.value));

            await Promise.all([
                // Guardar las áreas al trabajador
                fetch('/api/cleaners/pavilions/assign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ workerId, pavilionIds })
                }),
                // Ubicar al trabajador en la celda con la acción pedida ('add' o 'replace')
                fetch('/api/schedule/assign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ slotId: currentlyEditingSlotId, workerId, action: actionType })
                })
            ]);

            showToast(actionType === 'add' ? 'Trabajador agregado' : 'Turno reemplazado');
            closeAssignPanel();
            await loadAssignments();
        } catch (error) {
            console.error('Error saving assignments:', error);
            Swal.fire('Error', 'Hubo un error al guardar en la Base de Datos.', 'error');
        }
    }

    const btnAddAssignPanel = document.getElementById('btnAddAssignPanel');
    if (btnAddAssignPanel) {
        btnAddAssignPanel.addEventListener('click', () => processAssignment('add'));
    }

    const btnReplaceAssignPanel = document.getElementById('btnReplaceAssignPanel');
    if (btnReplaceAssignPanel) {
        btnReplaceAssignPanel.addEventListener('click', () => processAssignment('replace'));
    }

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

    // --- Funciones para Modal de Personal de Servicio ---
    window.openCleanersModal = async function () {
        document.getElementById('cleanersManageModal').classList.remove('hidden');
        await loadCleanersIntoModal();
    };

    window.closeCleanersModal = function () {
        document.getElementById('cleanersManageModal').classList.add('hidden');
    };

    window.openCleanerAddModal = function () {
        document.getElementById('cleanerAddForm').reset();
        document.getElementById('cleanerAddModal').classList.remove('hidden');
    };

    window.closeCleanerAddModal = function () {
        document.getElementById('cleanerAddModal').classList.add('hidden');
    };

    window.openCleanerEditModal = function (id, dni, name, phone) {
        document.getElementById('cleanerEditForm').reset();
        document.getElementById('editCleanerId').value = id;
        document.getElementById('editCleanerDni').value = dni;
        document.getElementById('editCleanerName').value = name;
        document.getElementById('editCleanerPhone').value = phone;
        document.getElementById('cleanerEditModal').classList.remove('hidden');
    };

    window.closeCleanerEditModal = function () {
        document.getElementById('cleanerEditModal').classList.add('hidden');
    };

    async function loadCleanersIntoModal() {
        try {
            const res = await fetch('/api/cleaners');
            const data = await res.json();
            const cleaners = Array.isArray(data) ? data : (data.cleaners || []);

            const tbody = document.getElementById('cleanersListBody');
            tbody.innerHTML = '';

            if (cleaners.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-500 italic">No hay personal registrado</td></tr>';
                return;
            }

            cleaners.forEach(c => {
                const tr = document.createElement('tr');
                tr.className = 'border-b hover:bg-gray-50';
                tr.innerHTML = `
                    <td class="p-3">${c.dni || '---'}</td>
                    <td class="p-3 font-bold text-gray-800">${c.fullName}</td>
                    <td class="p-3">${c.phone || '---'}</td>
                    <td class="p-3 text-center">
                        <button onclick="openCleanerEditModal(${c.id}, '${c.dni}', '${c.fullName.replace(/'/g, "\\'")}', '${c.phone || ''}')" class="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-2 rounded transition mr-2" title="Editar trabajador">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button onclick="substituteCleanerModal(${c.id}, '${c.fullName.replace(/'/g, "\\'")}')" class="text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 p-2 rounded transition mr-2" title="Sustituir trabajador (Transferir turnos)">
                            <i class="fa-solid fa-arrows-rotate"></i>
                        </button>
                        <button onclick="deleteCleaner(${c.id})" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded transition" title="Eliminar trabajador">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error('Error loading cleaners for modal:', error);
            tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-red-500">Error al cargar datos</td></tr>';
        }
    }

    window.substituteCleanerModal = async function (id, name) {
        try {
            const res = await fetch('/api/cleaners');
            const data = await res.json();
            const cleaners = Array.isArray(data) ? data : (data.cleaners || []);

            let optionsHtml = '<option value="">-- Seleccione el reemplazo --</option>';
            cleaners.forEach(c => {
                if (c.id !== id) {
                    optionsHtml += `<option value="${c.id}">${c.fullName}</option>`;
                }
            });

            const { value: newCleanerId, isConfirmed } = await Swal.fire({
                title: 'Sustituir Trabajador',
                html: `
                    <p class="text-sm text-gray-600 mb-4 text-center">Vas a transferir todos los turnos y áreas de <b>${name}</b> a otro trabajador.</p>
                    <select id="swalSubstituteSelect" class="swal2-select" style="display: flex; width: 100%;">
                        ${optionsHtml}
                    </select>
                `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: '<i class="fa-solid fa-arrows-rotate"></i> Sí, Sustituir',
                cancelButtonText: 'Cancelar',
                preConfirm: () => {
                    const select = document.getElementById('swalSubstituteSelect');
                    if (!select.value) {
                        Swal.showValidationMessage('Debes seleccionar un trabajador.');
                    }
                    return select.value;
                }
            });

            if (isConfirmed && newCleanerId) {
                const response = await fetch(`/api/cleaners/${id}/substitute`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newCleanerId })
                });

                const result = await response.json();

                if (response.ok) {
                    showToast('Sustitución completada');
                    closeCleanersModal();
                    await loadInitialData();
                    await loadAssignments();
                } else {
                    Swal.fire('Error', result.error || 'No se pudo hacer la sustitución.', 'error');
                }
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire('Error', 'Error de conexión', 'error');
        }
    };

    window.deleteCleaner = async function (id) {
        const confirm = await Swal.fire({
            title: '¿Estás seguro?',
            text: "No podrás revertir esto. Se eliminará al trabajador.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (confirm.isConfirmed) {
            try {
                const response = await fetch(`/api/cleaners/${id}`, { method: 'DELETE' });
                if (response.ok) {
                    showToast('Trabajador eliminado');
                    await loadCleanersIntoModal();
                    await loadInitialData(); // Refrescar lista principal
                } else {
                    Swal.fire('Error', 'No se pudo eliminar al trabajador.', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                Swal.fire('Error', 'Hubo un error en la solicitud.', 'error');
            }
        }
    };

    document.getElementById('cleanerAddForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const dni = document.getElementById('addCleanerDni').value;
        const fullName = document.getElementById('addCleanerName').value;
        const phone = document.getElementById('addCleanerPhone').value;

        try {
            const response = await fetch('/api/cleaners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dni, fullName, position: 'Personal de Limpieza', phone })
            });

            const result = await response.json();

            if (response.ok) {
                showToast('Trabajador registrado exitosamente');
                closeCleanerAddModal();
                await loadCleanersIntoModal(); // Refrescar la tabla del modal
                await loadInitialData(); // Refrescar lista de Horarios principal si está referenciado
            } else {
                Swal.fire('Error', result.error || 'No se pudo registrar', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire('Error', 'Error de conexión', 'error');
        }
    });

    document.getElementById('cleanerEditForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editCleanerId').value;
        const dni = document.getElementById('editCleanerDni').value;
        const fullName = document.getElementById('editCleanerName').value;
        const phone = document.getElementById('editCleanerPhone').value;

        try {
            const response = await fetch(`/api/cleaners/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dni, fullName, position: 'Personal de Limpieza', phone })
            });

            const result = await response.json();

            if (response.ok) {
                showToast('Trabajador actualizado exitosamente');
                closeCleanerEditModal();
                await loadCleanersIntoModal(); // Refrescar la tabla del modal
                await loadInitialData(); // Refrescar lista de Horarios principal si está referenciado
            } else {
                Swal.fire('Error', result.error || 'No se pudo actualizar', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire('Error', 'Error de conexión', 'error');
        }
    });

    // --- Modal Reporte de Cobertura ---
    window.openCoverageModal = async function () {
        document.getElementById('coverageModal').classList.remove('hidden');
        const container = document.getElementById('coverageReportContent');
        container.innerHTML = '<div class="col-span-full text-center text-gray-500 py-10"><i class="fa-solid fa-spinner fa-spin text-3xl mb-3"></i><p>Cargando información de cobertura...</p></div>';

        try {
            const res = await fetch('/api/schedule/coverage-report');
            const data = await res.json();

            // Agrupar por Pabellón
            const pavilionsMap = {};
            data.forEach(row => {
                if (!pavilionsMap[row.pavilion_name]) {
                    pavilionsMap[row.pavilion_name] = {};
                }
                if (!pavilionsMap[row.pavilion_name][row.area_name]) {
                    pavilionsMap[row.pavilion_name][row.area_name] = [];
                }

                if (row.cleaner_name && row.slotId) {
                    pavilionsMap[row.pavilion_name][row.area_name].push({
                        cleaner: row.cleaner_name,
                        slot: row.slotId
                    });
                }
            });

            container.innerHTML = '';

            if (Object.keys(pavilionsMap).length === 0) {
                container.innerHTML = '<div class="col-span-full text-center text-gray-500 py-10">No hay áreas configuradas en el sistema.</div>';
                return;
            }

            // Renderizar
            for (const [pavName, areas] of Object.entries(pavilionsMap)) {
                let html = `
                    <div class="border border-gray-200 rounded-lg shadow-sm bg-white overflow-hidden flex flex-col h-full">
                        <div class="bg-gray-100 px-4 py-3 border-b font-bold text-gray-800 flex justify-between items-center">
                            <span><i class="fa-solid fa-building text-gray-500 mr-2"></i> ${pavName}</span>
                        </div>
                        <ul class="divide-y divide-gray-100 flex-1 overflow-y-auto max-h-80">
                `;

                for (const [areaName, assignments] of Object.entries(areas)) {
                    if (assignments.length > 0) {
                        html += `
                            <li class="p-3 hover:bg-gray-50 flex flex-col gap-1">
                                <span class="text-sm font-semibold text-gray-700">${areaName}</span>
                                <div class="flex flex-wrap gap-1 mt-1">
                        `;
                        assignments.forEach(a => {
                            html += `<span class="inline-block bg-green-100 text-green-800 text-[0.65rem] px-2 py-0.5 rounded border border-green-200" title="Turno: ${a.slot}"><i class="fa-solid fa-check-circle mr-1"></i>${a.cleaner.split(' ')[0]} (${a.slot})</span>`;
                        });
                        html += `</div></li>`;
                    } else {
                        html += `
                            <li class="p-3 bg-red-50 hover:bg-red-100 flex flex-col gap-1 border-l-4 border-red-500">
                                <span class="text-sm font-semibold text-red-700">${areaName}</span>
                                <span class="inline-block text-red-600 text-xs font-bold mt-1"><i class="fa-solid fa-triangle-exclamation mr-1"></i> Sin Asignar / Pendiente</span>
                            </li>
                        `;
                    }
                }

                html += `</ul></div>`;
                container.innerHTML += html;
            }

        } catch (error) {
            console.error('Error fetching coverage', error);
            container.innerHTML = '<div class="col-span-full text-center text-red-500 py-10"><i class="fa-solid fa-triangle-exclamation text-3xl mb-3"></i><p>Error al cargar el reporte de cobertura.</p></div>';
        }
    };

    window.closeCoverageModal = function () {
        document.getElementById('coverageModal').classList.add('hidden');
    };

    // Inicialización
    await loadInitialData();
    await loadAssignments();

    // los datos tienen que cambiar para que las funciones sean mejores
});
