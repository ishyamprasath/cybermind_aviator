// static/js/main.js

// --- STATE MANAGEMENT ---
let controllerState = [];
let isDashboardInitialized = false;

document.addEventListener('DOMContentLoaded', function() {
    initializeEmergencyModal(); 
    const pagePath = window.location.pathname;

    if (pagePath === '/') {
        initializeDashboard();
    } else if (pagePath === '/gps-console') {
        initializeGpsConsole();
    } else if (pagePath === '/surveillance') {
        initializeSurveillance();
        setInterval(updateSurveillanceFlightStatus, 2000);
    } else if (pagePath === '/manual-control') {
        initializeJoystick();
        updateManualControlFlightParams();
        setInterval(updateManualControlFlightParams, 2000);
    }
    
    updateHeaderStatus();
    setInterval(updateHeaderStatus, 5000);
});

// --- Main Dashboard Logic ---
function renderControllers() {
    const controllersGrid = document.getElementById('controllers-grid');
    if (!controllersGrid) return;
    controllersGrid.innerHTML = '';
    let activeCount = 0;
    controllerState.forEach(ctrl => {
        if (ctrl.status === 'ACTIVE') activeCount++;
        const cardHtml = `<div class="card controller-card" data-name="${ctrl.name}"><div class="card-header"><h3>${ctrl.name}</h3><span class="status status-${ctrl.status}">${ctrl.status}</span></div><div class="card-body"><p class="sub-header" style="margin: 0 0 16px 0;">${ctrl.type}</p><div class="metric"><span>Accuracy</span><strong>${ctrl.accuracy}</strong></div><div class="metric"><span>Response Time</span><strong>${ctrl.response_time}</strong></div><div class="metric"><span>Last Update</span><strong>${ctrl.last_update}</strong></div></div><div class="card-footer"><button class="btn ${ctrl.status === 'ACTIVE' ? 'btn-danger' : 'btn-primary'}">${ctrl.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button></div></div>`;
        controllersGrid.innerHTML += cardHtml;
    });
    const subHeader = document.getElementById('dashboard-sub-header');
    if (subHeader) subHeader.textContent = `${activeCount} of 5 controllers active • System optimal`;
}

async function initializeDashboard() {
    const response = await fetch('/api/dashboard_data');
    const data = await response.json();
    controllerState = data.controllers;
    renderControllers();
    updateOtherDashboardPanels(data);
    if (!isDashboardInitialized) {
        document.getElementById('controllers-grid').addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' && e.target.closest('.controller-card')) {
                const controllerName = e.target.closest('.controller-card').dataset.name;
                const clickedController = controllerState.find(c => c.name === controllerName);
                if (clickedController) {
                    clickedController.status = clickedController.status === 'ACTIVE' ? 'STANDBY' : 'ACTIVE';
                    renderControllers();
                }
            }
        });
        isDashboardInitialized = true;
    }
    setInterval(updateDashboardMetrics, 3000);
}

async function updateDashboardMetrics() {
    try {
        const response = await fetch('/api/dashboard_data');
        const newData = await response.json();
        controllerState.forEach(stateCtrl => {
            const freshCtrl = newData.controllers.find(c => c.name === stateCtrl.name);
            if (freshCtrl) {
                stateCtrl.accuracy = freshCtrl.accuracy;
                stateCtrl.response_time = freshCtrl.response_time;
                stateCtrl.last_update = freshCtrl.last_update;
            }
        });
        renderControllers();
        updateOtherDashboardPanels(newData);
    } catch (error) { console.error("Failed to fetch dashboard metrics:", error); }
}

function updateOtherDashboardPanels(data) {
    const coDriveLogs = document.getElementById('co-drive-logs');
    coDriveLogs.innerHTML = '';
    data.co_drive_logs.forEach(log => {
        coDriveLogs.innerHTML += `<div class="log-item"><div class="log-item-header"><strong>${log.type}</strong><span class="log-time">${log.time}</span></div><p>${log.source}: ${log.message}</p><span class="status">${log.status}</span></div>`;
    });
    const cyberThreats = document.getElementById('cyber-threats');
    cyberThreats.innerHTML = '';
    document.getElementById('threat-indicator').textContent = `${data.cyber_threats.length} ACTIVE`;
    data.cyber_threats.forEach(threat => {
        cyberThreats.innerHTML += `<div class="threat-item"><div class="threat-item-header"><strong>${threat.type}</strong><span class="status status-${threat.status}">${threat.status}</span></div><p>${threat.details}</p><div class="confidence-bar"><div class="confidence-fill" style="width: ${threat.confidence}%;"></div></div></div>`;
    });
}

// --- Other Page Initializers ---
async function updateHeaderStatus() {
    const response = await fetch('/api/dashboard_data');
    const data = await response.json();
    const status = data.system_status;
    document.getElementById('status-conn').textContent = `${status.connection}%`;
    document.getElementById('status-time').textContent = status.system_time;
    document.getElementById('status-gps').textContent = status.gps_status;
    document.getElementById('status-alerts').textContent = status.emergency_alerts;
}

async function initializeGpsConsole() {
    const map = L.map('map').setView([37.768, -122.427], 15);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap © CARTO', subdomains: 'abcd', maxZoom: 20 }).addTo(map);
    const response = await fetch('/api/gps_data');
    const points = await response.json();
    const tableBody = document.getElementById('gps-table-body');
    tableBody.innerHTML = '';
    points.forEach(point => {
        L.marker([point.lat, point.lon]).addTo(map).bindPopup(`<b>ID:</b> ${point.id}<br><b>Accuracy:</b> ${point.acc}`);
        tableBody.innerHTML += `<tr><td>${point.id}</td><td>${point.lat.toFixed(6)}</td><td>${point.lon.toFixed(6)}</td><td>${point.alt}</td><td>${point.acc}</td><td class="good-text">${point.quality}</td></tr>`;
    });
}

async function updateSurveillanceFlightStatus() { /* ... unchanged ... */ }
async function updateManualControlFlightParams() { /* ... unchanged ... */ }

// --- Emergency Modal Logic (UPDATED) ---
function initializeEmergencyModal() {
    // Select all the elements that can trigger the modal
    const headerEmergencyBtn = document.querySelector('.btn-emergency');
    const threatMonitorEmergencyBtn = document.getElementById('threat-monitor-emergency-btn'); // New button
    
    // Select the modal elements
    const modalOverlay = document.getElementById('emergency-modal-overlay');
    const cancelBtn = document.getElementById('cancel-shutdown-btn');
    const confirmBtn = document.getElementById('confirm-shutdown-btn');
    
    if (!modalOverlay) return; // If no modal, do nothing

    const openModal = () => modalOverlay.classList.add('visible');
    const closeModal = () => modalOverlay.classList.remove('visible');

    // Attach listener to the main header button
    if (headerEmergencyBtn) {
        headerEmergencyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal();
        });
    }

    // Attach listener to the threat monitor button
    if (threatMonitorEmergencyBtn) {
        threatMonitorEmergencyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal();
        });
    }

    // Attach listeners for closing the modal
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            alert("Emergency Shutdown Initiated. All systems terminating.");
            closeModal();
        });
    }
    
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
}
