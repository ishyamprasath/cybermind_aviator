// static/js/surveillance.js

function initializeSurveillance() {
    // Check if we are on the surveillance page by looking for the video element
    const video = document.getElementById('live-video');
    if (!video) return; 

    // Get all necessary DOM elements
    const detectionCanvas = document.getElementById('detection-canvas');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    const detectionStatus = document.getElementById('detection-status');
    const totalObjectsCount = document.getElementById('total-objects-count');
    const highThreatsCount = document.getElementById('high-threats-count');
    const autoControlStatus = document.getElementById('auto-control-status');
    const survAltitude = document.getElementById('surv-altitude');
    const detectionLog = document.getElementById('detection-log');

    let model = null;
    const evasiveActions = ["EVASIVE RIGHT", "ALTITUDE UP", "EVASIVE LEFT", "HOLD POSITION"];
    let currentActionIndex = 0;
    let actionInterval;

    // --- 1. SETUP AND INITIALIZE ---
    async function setupCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 },
                audio: false,
            });
            video.srcObject = stream;
            return new Promise((resolve) => {
                video.onloadedmetadata = () => resolve(video);
            });
        } catch (err) {
            console.error("Camera Access Error:", err);
            loadingText.textContent = "Camera access denied. Please grant permission and refresh.";
            detectionStatus.textContent = "ERROR";
            throw err;
        }
    }

    // --- 2. CORE DETECTION LOOP ---
    async function detectFrame() {
        // Ensure everything is ready before trying to detect
        if (!model || !video || video.readyState !== 4) {
            requestAnimationFrame(detectFrame); // Check again on the next frame
            return;
        }

        const predictions = await model.detect(video);
        renderPredictions(predictions);

        const personPrediction = predictions.find(p => p.class === 'person' && p.score > 0.65);
        
        updateAutoControlUI(personPrediction);
        updateStatsUI(predictions, personPrediction);
        
        requestAnimationFrame(detectFrame); // Loop
    }
    
    // --- 3. UI UPDATE FUNCTIONS ---
    function renderPredictions(predictions) {
        const ctx = detectionCanvas.getContext('2d');
        detectionCanvas.width = video.videoWidth;
        detectionCanvas.height = video.videoHeight;
        
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.scale(-1, 1); // Mirror the canvas to match the video
        ctx.translate(-ctx.canvas.width, 0);
        
        ctx.font = '14px Inter';

        predictions.forEach(prediction => {
            const [x, y, width, height] = prediction.bbox;
            const text = `${prediction.class} (${Math.round(prediction.score * 100)}%)`;
            
            const isThreat = prediction.class === 'person';
            ctx.strokeStyle = isThreat ? '#f87171' : '#00bcd4';
            ctx.fillStyle = isThreat ? '#f87171' : '#00bcd4';

            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);

            const textWidth = ctx.measureText(text).width;
            ctx.fillRect(x, y, textWidth + 10, 20);
            
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(text, x + 5, y + 15);
        });
    }

    function updateAutoControlUI(personPrediction) {
        const isPersonDetected = !!personPrediction;
        const wasPersonDetected = autoControlStatus.classList.contains('status-human-detected');

        if (isPersonDetected && !wasPersonDetected) {
            // --- THREAT DETECTED ---
            autoControlStatus.classList.remove('status-all-clear');
            autoControlStatus.classList.add('status-human-detected');
            autoControlStatus.querySelector('h4').textContent = 'HUMAN DETECTED';
            logMessage('High threat detected: Human.', 'danger-text');
            
            // Start cycling through evasive actions
            actionInterval = setInterval(() => {
                const actionText = evasiveActions[currentActionIndex % evasiveActions.length];
                autoControlStatus.querySelector('p').textContent = `ACTION: ${actionText}`;
                currentActionIndex++;
            }, 1500);

        } else if (!isPersonDetected && wasPersonDetected) {
            // --- THREAT CLEARED ---
            clearInterval(actionInterval); // Stop cycling actions
            autoControlStatus.classList.remove('status-human-detected');
            autoControlStatus.classList.add('status-all-clear');
            autoControlStatus.querySelector('h4').textContent = 'ALL CLEAR';
            autoControlStatus.querySelector('p').textContent = 'Monitoring for threats...';
            logMessage('Threat cleared. Resuming normal operations.');
            currentActionIndex = 0;
        }
    }

    function updateStatsUI(predictions, personPrediction) {
        totalObjectsCount.textContent = predictions.length;
        highThreatsCount.textContent = personPrediction ? 1 : 0;
        
        // Simulate flight params changing slightly
        survAltitude.textContent = `${(345 + Math.random() * 10).toFixed(1)}ft`;
    }

    function logMessage(message, className = '') {
        const p = document.createElement('p');
        p.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        if (className) p.classList.add(className);
        // Add to top of log
        detectionLog.insertBefore(p, detectionLog.firstChild);
    }

    // --- 5. MAIN EXECUTION FUNCTION ---
    async function run() {
        try {
            logMessage('Requesting camera access...');
            await setupCamera();
            
            loadingText.textContent = 'Loading AI Model...';
            detectionStatus.textContent = 'LOADING MODEL';
            logMessage('Camera access granted. Loading AI model (COCO-SSD)...');

            model = await cocoSsd.load();
            
            loadingOverlay.classList.add('hidden');
            detectionStatus.textContent = 'LIVE DETECTION';
            logMessage('AI Model loaded successfully. Starting live detection.');

            detectFrame(); // Start the main loop
        } catch (error) {
            console.error("Initialization failed:", error);
            logMessage('Fatal error during initialization.', 'danger-text');
        }
    }

    run();
}

// Ensure this only runs on the Surveillance page.
if (window.location.pathname.includes('/surveillance')) {
    document.addEventListener('DOMContentLoaded', initializeSurveillance);
}