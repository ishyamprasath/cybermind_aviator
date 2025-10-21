// Add this new function to setup the view toggle
function setupControlToggle() {
    const joystickToggleBtn = document.getElementById('joystick-toggle');
    const directionalToggleBtn = document.getElementById('directional-toggle');
    const joystickPanel = document.getElementById('joystick-panel');
    const directionalPanel = document.getElementById('directional-panel');

    if (!joystickToggleBtn || !directionalToggleBtn || !joystickPanel || !directionalPanel) {
        console.warn("Toggle controls not found, skipping setup.");
        return;
    }

    joystickToggleBtn.addEventListener('click', () => {
        joystickToggleBtn.classList.add('active');
        directionalToggleBtn.classList.remove('active');
        joystickPanel.style.display = 'block';
        directionalPanel.style.display = 'none';
    });

    directionalToggleBtn.addEventListener('click', () => {
        directionalToggleBtn.classList.add('active');
        joystickToggleBtn.classList.remove('active');
        directionalPanel.style.display = 'block';
        joystickPanel.style.display = 'none';
    });
}


function initializeJoystick() {
    const container = document.getElementById('joystick-container');
    const stick = document.getElementById('joystick-stick');
    const throttleSlider = document.getElementById('throttle-slider');
    const throttleValue = document.querySelector('.throttle-value');

    if (!container || !stick) return;

    // Update throttle value display
    if (throttleSlider && throttleValue) {
        throttleSlider.addEventListener('input', () => {
            throttleValue.textContent = `${throttleSlider.value}%`;
        });
    }

    let isDragging = false;

    const startDrag = () => {
        isDragging = true;
        stick.style.cursor = 'grabbing';
    };

    const endDrag = () => {
        if (isDragging) {
            isDragging = false;
            stick.style.cursor = 'grab';
            // Reset stick to center
            stick.style.transition = 'all 0.2s ease';
            stick.style.left = '50%';
            stick.style.top = '50%';
            // Keep transform for centering
            setTimeout(() => stick.style.transition = '', 200);
        }
    };
    
    const drag = (e) => {
        if (!isDragging) return;
        
        // Use e.touches for touch events
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let dx = clientX - centerX;
        let dy = clientY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const maxDistance = (container.clientWidth / 2) - (stick.clientWidth / 2);

        if (distance > maxDistance) {
            dx = (dx / distance) * maxDistance;
            dy = (dy / distance) * maxDistance;
        }
        
        stick.style.left = `calc(50% + ${dx}px)`;
        stick.style.top = `calc(50% + ${dy}px)`;
    };


    // Mouse Events
    stick.addEventListener('mousedown', startDrag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('mousemove', drag);
    
    // Touch Events
    stick.addEventListener('touchstart', (e) => { e.preventDefault(); startDrag(); }, { passive: false });
    document.addEventListener('touchend', endDrag);
    document.addEventListener('touchmove', (e) => { e.preventDefault(); drag(e); }, { passive: false });
}

// Ensure the DOM is fully loaded before running the scripts
document.addEventListener('DOMContentLoaded', () => {
    initializeJoystick();
    setupControlToggle();
});