// Additional utility functions

// Input validation
function validateForm() {
    const age = document.getElementById('age').value;
    const weight = document.getElementById('weight').value;
    const height = document.getElementById('height').value;
    
    let errors = [];
    
    if (age < 15 || age > 100) errors.push("Age must be between 15 and 100");
    if (weight < 40 || weight > 200) errors.push("Weight must be between 40kg and 200kg");
    if (height < 100 || height > 250) errors.push("Height must be between 100cm and 250cm");
    
    if (errors.length > 0) {
        alert("Please fix the following errors:\n\n" + errors.join("\n"));
        return false;
    }
    
    return true;
}

// Save preferences to localStorage
function savePreferences() {
    const preferences = {
        age: document.getElementById('age').value,
        gender: document.getElementById('gender').value,
        weight: document.getElementById('weight').value,
        height: document.getElementById('height').value,
        activity: document.getElementById('activity').value,
        goal: document.getElementById('goal').value,
        wake: document.getElementById('wake').value,
        sleep: document.getElementById('sleep').value
    };
    
    localStorage.setItem('savoryBalancePrefs', JSON.stringify(preferences));
    showNotification('Preferences saved!', 'success');
}

// Load saved preferences
function loadPreferences() {
    const saved = localStorage.getItem('savoryBalancePrefs');
    if (saved) {
        const prefs = JSON.parse(saved);
        
        document.getElementById('age').value = prefs.age || 28;
        document.getElementById('gender').value = prefs.gender || 'female';
        document.getElementById('weight').value = prefs.weight || 68;
        document.getElementById('height').value = prefs.height || 170;
        document.getElementById('activity').value = prefs.activity || 'moderately_active';
        document.getElementById('goal').value = prefs.goal || 'maintenance';
        document.getElementById('wake').value = prefs.wake || '07:00';
        document.getElementById('sleep').value = prefs.sleep || '23:00';
        
        showNotification('Preferences loaded!', 'info');
    }
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: inherit; cursor: pointer;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Animation for notification
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);

// Print functionality
function printReport() {
    window.print();
}

// Share functionality
async function shareReport() {
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'My SavoryBalance AI Nutrition Report',
                text: 'Check out my personalized nutrition plan that reduces food waste!',
                url: window.location.href,
            });
        } catch (err) {
            console.log('Error sharing:', err);
        }
    } else {
        // Fallback: copy to clipboard
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            showNotification('Link copied to clipboard!', 'success');
        });
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    // Load saved preferences
    loadPreferences();
    
    // Add event listeners for saving preferences
    document.querySelectorAll('input, select').forEach(element => {
        element.addEventListener('change', savePreferences);
    });
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            generatePlan();
        }
        if (e.key === 'Escape') {
            document.getElementById('resultsSection').style.display = 'none';
        }
    });
    
    // Add help tooltips
    addTooltips();
});

// Add tooltips to elements
function addTooltips() {
    const tooltips = {
        'age': 'Enter your age in years. Used in calorie calculation formulas.',
        'weight': 'Enter your current weight in kilograms.',
        'height': 'Enter your height in centimeters.',
        'activity': 'Select your daily activity level for accurate calorie needs.',
        'goal': 'Choose your primary nutrition goal.',
        'wake': 'When you typically wake up, for meal timing optimization.',
        'sleep': 'When you typically go to sleep, for meal timing optimization.'
    };
    
    Object.keys(tooltips).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            const label = element.previousElementSibling;
            if (label && label.tagName === 'LABEL') {
                label.innerHTML += ` <span class="tooltip" title="${tooltips[id]}"><i class="fas fa-question-circle" style="color: #6b7280; font-size: 0.8rem;"></i></span>`;
            }
        }
    });
}