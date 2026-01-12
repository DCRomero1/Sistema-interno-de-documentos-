document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();

    document.getElementById('btn-export').addEventListener('click', exportToCSV);
});

let reportData = null;
let chartInstance = null;

async function loadDashboard() {
    try {
        const response = await fetch('/api/reports/summary');
        if (!response.ok) throw new Error('Error al cargar datos');

        const data = await response.json();
        reportData = data; // Store for export

        updateKPIs(data);
        updateTable(data.byType);
        renderChart(data.byType);

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
            <td>${item.tipo || 'Sin Tipo'}</td>
            <td>${item.count}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="flex-grow: 1; background: #ecf0f1; height: 8px; border-radius: 4px; overflow: hidden;">
                        <div style="width: ${item.percentage}%; background: var(--secondary-color); height: 100%;"></div>
                    </div>
                    <span>${item.percentage}%</span>
                </div>
            </td>
        `;
        tbody.appendChild(row);
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
    if (!reportData || !reportData.byType) {
        alert('No hay datos para exportar');
        return;
    }

    // Define CSV content: Summary + Details
    let csvContent = "data:text/csv;charset=utf-8,";

    // KPI Section
    csvContent += "REPORTE GENERAL\n";
    csvContent += `Documentos Hoy,${reportData.today}\n`;
    csvContent += `Documentos Mes,${reportData.month}\n`;
    csvContent += `Pendientes,${reportData.pending}\n\n`;

    // Table Section
    csvContent += "DETALLE POR TIPO\n";
    csvContent += "Tipo,Cantidad,Porcentaje\n";

    reportData.byType.forEach(item => {
        const tipo = item.tipo || 'Sin Tipo';
        csvContent += `${tipo},${item.count},${item.percentage}%\n`;
    });

    // Create Download Link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `reporte_mesa_partes_${dateStr}.csv`);
    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link);
}
