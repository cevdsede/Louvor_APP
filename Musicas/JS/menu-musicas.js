function loadStats(force = false) {
    const cachedRep = localStorage.getItem('offline_repertorio');
    const cachedMus = localStorage.getItem('offline_musicas');

    if (!force && cachedRep && cachedMus) {
        document.getElementById('loader').style.display = 'none';
        processData(JSON.parse(cachedRep), JSON.parse(cachedMus));
        setTimeout(() => fetchStats(), 1000);
    } else {
        fetchStats();
    }
}

async function fetchStats() {
    const loader = document.getElementById('loader');
    // Only show loader if chart is not yet rendered
    if (loader && !chartMaisTocadas) loader.style.display = 'block';
    try {
        // Fetch Repertório
        const resRep = await fetch(APP_CONFIG.SCRIPT_URL + "?sheet=Repertório");
        const jsonRep = await resRep.json();
        localStorage.setItem('offline_repertorio', JSON.stringify(jsonRep.data));

        // Fetch Músicas
        const resMus = await fetch(APP_CONFIG.SCRIPT_URL + "?sheet=Musicas");
        const jsonMus = await resMus.json();
        localStorage.setItem('offline_musicas', JSON.stringify(jsonMus.data));

        processData(jsonRep.data, jsonMus.data);
        if (loader) loader.style.display = 'none';
    } catch (e) {
        if (loader) loader.innerText = "Erro ao carregar dados.";
    }
}

function processData(repertorio, musicas) {
    renderChartMaisTocadas(repertorio);
    renderAnalyticsMusicas(musicas);
}

let chartMaisTocadas = null;
function renderChartMaisTocadas(data) {
    const contagem = {};
    data.forEach(m => {
        if (m.Músicas) contagem[m.Músicas] = (contagem[m.Músicas] || 0) + 1;
    });

    const sorted = Object.entries(contagem)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    // Ajusta altura dinâmica do container (40px por item + padding)
    const container = document.getElementById('chartMusicasContainer');
    if (container) {
        const newHeight = Math.max(300, sorted.length * 40 + 50);
        container.style.height = newHeight + 'px';
    }

    const ctx = document.getElementById('chartMusicas').getContext('2d');

    if (chartMaisTocadas) {
        // SILENT UPDATE
        chartMaisTocadas.data.labels = sorted.map(x => x[0]);
        chartMaisTocadas.data.datasets[0].data = sorted.map(x => x[1]);
        chartMaisTocadas.update('none');
    } else {
        // NEW CHART
        chartMaisTocadas = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sorted.map(x => x[0]),
                datasets: [{
                    data: sorted.map(x => x[1]),
                    backgroundColor: 'rgba(52, 152, 219, 0.8)',
                    borderRadius: 5
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } } },
                    y: { ticks: { font: { size: 10, weight: 'bold' } } }
                }
            }
        });
    }
}

async function silentSync() {
    try {
        const res = await fetch(APP_CONFIG.SCRIPT_URL + "?sheet=Repertório");
        const json = await res.json();
        localStorage.setItem('offline_repertorio', JSON.stringify(json.data));
        renderChart(json.data);
    } catch (e) { console.log("Silent sync failed"); }
}

let chartEstilos = null;
let chartTemas = null;
function renderAnalyticsMusicas(data) {
    document.getElementById('totalHeader').innerText = data.length;

    // 1. Gráfico de Estilos
    const estilos = data.reduce((acc, m) => {
        const est = m.Estilo || "Outros";
        acc[est] = (acc[est] || 0) + 1;
        return acc;
    }, {});

    renderDoughnut('chartEstilos', chartEstilos, estilos, (c) => chartEstilos = c);

    // 2. Gráfico de Temas
    const temas = data.reduce((acc, m) => {
        const tema = m.Tema || "Geral";
        acc[tema] = (acc[tema] || 0) + 1;
        return acc;
    }, {});

    renderDoughnut('chartTemas', chartTemas, temas, (c) => chartTemas = c);
}

function renderDoughnut(canvasId, chartVar, dataObj, setVar) {
    const labels = Object.keys(dataObj);
    const values = Object.values(dataObj);
    const ctx = document.getElementById(canvasId).getContext('2d');

    if (chartVar) chartVar.destroy();

    const newChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    '#3498db', '#e67e22', '#2ecc71', '#9b59b6', '#f1c40f', '#e74c3c', '#1abc9c', '#34495e', '#7f8c8d'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { boxWidth: 8, font: { size: 9 } } }
            }
        }
    });
    setVar(newChart);
}

function applyPermissions() {
    const user = JSON.parse(localStorage.getItem('user_token') || '{}');
    if (user.Role) {
        if (!hasPermission(user.Role, "menuMontarRepertorio", "menu")) {
            document.getElementById('menuMontarRepertorio')?.classList.add('hidden-permission');
        }
    }
}

// No local theme scripts needed, uses temas-core.js

window.onload = () => {
    loadStats();
    applyPermissions();
}
