document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();

    document.getElementById('btn-export').addEventListener('click', exportToCSV);
});

let reportData = null;
let chartInstance = null;

async function loadDashboard() {
    try {
        // Fetch Summary
        const summaryResponse = await fetch('/api/reports/summary');
        if (!summaryResponse.ok) throw new Error('Error al cargar resumen');
        const summaryData = await summaryResponse.json();

        // Fetch Full Documents (reusing existing API)
        const docsResponse = await fetch('/api/documents');
        if (!docsResponse.ok) throw new Error('Error al cargar documentos');
        const docsData = await docsResponse.json();

        // Store combo data for export
        reportData = {
            ...summaryData,
            documents: docsData
        };

        updateKPIs(summaryData);
        updateTable(summaryData.byType);
        renderChart(summaryData.byType);

        // Render Full Table
        renderFullTable(docsData);

    } catch (error) {
        console.error(error);
        alert('Error cargando el dashboard');
    }
}

function updateKPIs(data) {
    document.getElementById('kpi-today').textContent = data.today || 0;
    document.getElementById('kpi-month').textContent = data.month || 0;
    document.getElementById('kpi-pending').textContent = data.pending || 0;
}

function updateTable(typeData) {
    const tbody = document.getElementById('reports-table-body');
    tbody.innerHTML = '';

    if (!typeData || typeData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center">Sin datos registrados</td></tr>';
        return;
    }

    typeData.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="font-weight: 600; color: #334155; padding-top: 15px; padding-bottom: 15px;">
                ${item.tipo || 'Sin Tipo'}
            </td>
            <td style="text-align: center; font-weight: 700; color: #0f172a; padding-top: 15px; padding-bottom: 15px;">
                ${item.count}
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderFullTable(documents) {
    const tbody = document.getElementById('full-registry-body');
    tbody.innerHTML = '';

    if (!documents || documents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding: 20px;">No hay documentos registrados en el sistema.</td></tr>';
        return;
    }

    documents.forEach(doc => {
        const tr = document.createElement('tr');

        // Status Badge Logic
        let statusClass = 'status-received';
        if (doc.status === 'Derivado') statusClass = 'status-derived';
        if (doc.status === 'Finalizado') statusClass = 'status-finalized';

        tr.innerHTML = `
            <td>${doc.id}</td>
            <td>${doc.fecha}</td>
            <td>${doc.tipo}</td>
            <td>${doc.nombre}</td>
            <td>${doc.origen}</td>
            <td>${doc.concepto}</td>
            <td>${doc.fechaDespacho || '-'}</td>
            <td>${doc.ubicacion || '-'}</td>
            <td>${doc.folios}</td>
            <td>${doc.cargo}</td>
            <td><span class="status-badge ${statusClass}">${doc.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderChart(typeData) {
    const ctx = document.getElementById('docsChart').getContext('2d');

    // Prepare data
    const labels = typeData.map(d => d.tipo || 'Sin Tipo');
    const counts = typeData.map(d => d.count);

    // Colors
    const backgroundColors = [
        '#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6', '#34495e'
    ];

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                backgroundColor: backgroundColors.slice(0, labels.length),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function exportToCSV() {
    if (!reportData || !reportData.documents) {
        alert('No hay datos para exportar');
        return;
    }

    const startDate = document.getElementById('export-start-date').value;
    const endDate = document.getElementById('export-end-date').value;

    // Filter documents based on date range
    const filteredDocs = reportData.documents.filter(doc => {
        if (!doc.fecha) return false;
        // String comparison works for YYYY-MM-DD
        const docDate = doc.fecha;
        if (startDate && docDate < startDate) return false;
        if (endDate && docDate > endDate) return false;
        return true;
    });

    if (filteredDocs.length === 0) {
        alert('No hay documentos en el rango de fechas seleccionado.');
        return;
    }

    // Define CSV content: ONLY Document Details
    let csvContent = "data:text/csv;charset=utf-8,";

    // Header Row
    csvContent += "ID,Fecha Recepcion,Tipo,Remitente,Area Origen,Concepto,Fecha Despacho,Destino,Folios,Cargo,Estado,Observaciones\n";

    filteredDocs.forEach(doc => {
        // Escape commas in fields to prevent CSV breakage
        const clean = (text) => text ? `"${text.toString().replace(/"/g, '""')}"` : '';

        const row = [
            doc.id,
            doc.fecha,
            doc.tipo,
            doc.nombre,
            doc.origen,
            clean(doc.concepto),
            doc.fechaDespacho || '',
            doc.destino || '',
            doc.folios,
            doc.cargo,
            doc.status,
            clean(doc.observaciones)
        ];
        csvContent += row.join(",") + "\n";
    });

    // Create Download Link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toISOString().split('T')[0];
    const rangeSuffix = (startDate || endDate) ? `_${startDate || 'inio'}_al_${endDate || 'final'}` : '';
    link.setAttribute("download", `registro_documentos_${dateStr}${rangeSuffix}.csv`);
    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link);
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
