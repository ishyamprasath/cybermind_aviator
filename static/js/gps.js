// static/js/gps.js

function initializeGpsConsole() {
    const mapElement = document.getElementById('gps-map');
    if (!mapElement) return; // Only run if the map element exists on the page

    // --- STATE ---
    let map = L.map('gps-map').setView([37.7749, -122.4194], 13); // Default to San Francisco
    let pointMarkers = [];
    let centralMarker = null;

    // --- INITIALIZE MAP (UPDATED TILE LAYER) ---
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // --- UI ELEMENTS ---
    const geocodeForm = document.getElementById('geocode-form');
    const addressInput = document.getElementById('address-input');
    const tableBody = document.getElementById('gps-table-body');
    const tableSubtitle = document.getElementById('gps-table-subtitle');
    const statsMostAccurate = document.getElementById('stats-most-accurate');
    const statsCoverage = document.getElementById('stats-coverage-area');
    const statsAvgAccuracy = document.getElementById('stats-avg-accuracy');
    const statsDataQuality = document.getElementById('stats-data-quality');

    // --- CORE LOGIC ---
    async function fetchAndRenderPoints(lat, lon) {
        tableSubtitle.textContent = 'Generating data...';
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">Loading...</td></tr>`;
        resetStats();
        clearMarkers();

        try {
            const response = await fetch('/api/generate_gps_points', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat, lon }),
            });

            if (!response.ok) throw new Error('Server failed to generate points.');
            
            const points = await response.json();
            
            // Clear placeholder
            tableBody.innerHTML = '';

            // Render new data
            points.forEach(point => {
                tableBody.innerHTML += `<tr>
                    <td>${point.id}</td>
                    <td>${point.lat.toFixed(6)}</td>
                    <td>${point.lon.toFixed(6)}</td>
                    <td>${point.alt}</td>
                    <td>${point.acc}</td>
                    <td class="good-text">${point.quality}</td>
                </tr>`;
                const marker = L.marker([point.lat, point.lon], { opacity: 0.75 }).addTo(map);
                pointMarkers.push(marker);
            });
            
            // Add a special marker for the target location
            centralMarker = L.marker([lat, lon], {
                icon: L.divIcon({
                    className: 'central-marker',
                    html: '<div style="background-color: var(--accent-cyan); width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
                    iconSize: [12, 12]
                })
            }).addTo(map);

            map.setView([lat, lon], 16);
            tableSubtitle.textContent = `${points.length} points generated`;
            calculateAndUpdateStats(points);

        } catch (error) {
            console.error(error);
            tableSubtitle.textContent = 'Error generating data';
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--accent-red);">${error.message}</td></tr>`;
        }
    }
    
    function calculateAndUpdateStats(points) {
        if (!points || points.length === 0) return;

        let minAcc = Infinity;
        let totalAcc = 0;
        
        points.forEach(p => {
            const accValue = parseFloat(p.acc.replace('±', '').replace('m', ''));
            totalAcc += accValue;
            if (accValue < minAcc) minAcc = accValue;
        });

        const avgAcc = totalAcc / points.length;
        
        statsMostAccurate.textContent = `±${minAcc.toFixed(2)}m`;
        statsAvgAccuracy.textContent = `±${avgAcc.toFixed(2)}m`;
        statsDataQuality.textContent = 'Good'; // Example value
        statsCoverage.textContent = '50m'; // Example value
    }

    function resetStats() {
        statsMostAccurate.textContent = '---';
        statsAvgAccuracy.textContent = '---';
        statsDataQuality.textContent = '---';
        statsCoverage.textContent = '---';
    }

    function clearMarkers() {
        pointMarkers.forEach(marker => map.removeLayer(marker));
        pointMarkers = [];
        if (centralMarker) {
            map.removeLayer(centralMarker);
            centralMarker = null;
        }
    }

    // --- EVENT LISTENERS ---
    map.on('click', e => fetchAndRenderPoints(e.latlng.lat, e.latlng.lng));

    geocodeForm.addEventListener('submit', async e => {
        e.preventDefault();
        const address = addressInput.value;
        if (!address) return;

        tableSubtitle.textContent = `Searching...`;
        
        try {
            const response = await fetch('/api/geocode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address }),
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            
            fetchAndRenderPoints(data.lat, data.lon);

        } catch (error) {
            console.error(error);
            tableSubtitle.textContent = `Error: ${error.message}`;
        }
    });
}

// Ensure this only runs on the GPS Console page.
if (window.location.pathname.includes('/gps-console')) {
    document.addEventListener('DOMContentLoaded', initializeGpsConsole);
}