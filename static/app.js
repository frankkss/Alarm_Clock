let currentAlarmId = null;
let statusInterval = null;

// Update speed info when inputs change
document.addEventListener('DOMContentLoaded', function() {
    const sleepHours = document.getElementById('sleepHours');
    const realDuration = document.getElementById('realDuration');
    const speedInfo = document.getElementById('speedInfo');
    
    function updateSpeedInfo() {
        const hours = parseFloat(sleepHours.value) || 8;
        const minutes = parseFloat(realDuration.value) || 3;
        const speedFactor = (hours * 60) / minutes;
        speedInfo.textContent = `⚡ Speed: ${speedFactor.toFixed(1)}x faster (${hours} hours in ${minutes} minutes)`;
    }
    
    sleepHours.addEventListener('input', updateSpeedInfo);
    realDuration.addEventListener('input', updateSpeedInfo);
    updateSpeedInfo();
});

function startAlarm() {
    const sleepHours = document.getElementById('sleepHours').value;
    const realDuration = document.getElementById('realDuration').value;
    
    if (!sleepHours || !realDuration) {
        alert('Please fill in all fields!');
        return;
    }
    
    fetch('/start_alarm', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            sleep_hours: sleepHours,
            real_duration_minutes: realDuration
        })
    })
    .then(response => response.json())
    .then(data => {
        currentAlarmId = data.alarm_id;
        document.getElementById('setupPanel').style.display = 'none';
        document.getElementById('statusPanel').style.display = 'block';
        document.getElementById('totalSleep').textContent = sleepHours;
        
        startStatusUpdates();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to start alarm');
    });
}

function startStatusUpdates() {
    statusInterval = setInterval(() => {
        if (!currentAlarmId) return;
        
        fetch(`/alarm_status/${currentAlarmId}`)
            .then(response => response.json())
            .then(data => {
                document.getElementById('virtualTime').textContent = data.remaining_time;
                document.getElementById('speedFactor').textContent = data.fast_factor;
                
                // Update analog clock
                updateAnalogClock(data.remaining_time);
                
                if (data.status === 'completed') {
                    clearInterval(statusInterval);
                    document.getElementById('statusPanel').style.display = 'none';
                    document.getElementById('completePanel').style.display = 'block';
                    playAlarmSound();
                }
            })
            .catch(error => console.error('Error fetching status:', error));
    }, 50); // Update every 50ms for smooth display
}

function stopAlarm() {
    if (!currentAlarmId) return;
    
    fetch(`/stop_alarm/${currentAlarmId}`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        clearInterval(statusInterval);
        resetApp();
    })
    .catch(error => console.error('Error:', error));
}

function resetApp() {
    clearInterval(statusInterval);
    currentAlarmId = null;
    document.getElementById('setupPanel').style.display = 'block';
    document.getElementById('statusPanel').style.display = 'none';
    document.getElementById('completePanel').style.display = 'none';
}

function playAlarmSound() {
    // Create a simple beep using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 1000;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 1);
}

function updateAnalogClock(remainingTime) {
    // Parse time including milliseconds
    const timeParts = remainingTime.split(/[:.]/);
    const hours = parseInt(timeParts[0]) || 0;
    const minutes = parseInt(timeParts[1]) || 0;
    const seconds = parseInt(timeParts[2]) || 0;
    const milliseconds = parseInt(timeParts[3]) || 0;
    
    // Calculate angles with millisecond precision
    const totalSeconds = seconds + (milliseconds / 1000);
    const totalMinutes = minutes + (totalSeconds / 60);
    const totalHours = hours + (totalMinutes / 60);
    
    const secondAngle = (totalSeconds / 60) * 360;
    const minuteAngle = (totalMinutes / 60) * 360;
    const hourAngle = ((totalHours % 12) / 12) * 360;
    
    // Update clock hands
    const hourHand = document.getElementById('hourHand');
    const minuteHand = document.getElementById('minuteHand');
    const secondHand = document.getElementById('secondHand');
    
    if (hourHand) hourHand.style.transform = `rotate(${hourAngle}deg)`;
    if (minuteHand) minuteHand.style.transform = `rotate(${minuteAngle}deg)`;
    if (secondHand) secondHand.style.transform = `rotate(${secondAngle}deg)`;
}
