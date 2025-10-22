from flask import Flask, render_template, request, jsonify
from datetime import datetime
import time

app = Flask(__name__)

# Store active alarms (in production, use a database)
active_alarms = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/start_alarm', methods=['POST'])
def start_alarm():
    data = request.json
    sleep_hours = float(data.get('sleep_hours'))
    real_duration_minutes = float(data.get('real_duration_minutes'))
    
    # Calculate fast factor
    real_duration_hours = real_duration_minutes / 60.0
    fast_factor = sleep_hours / real_duration_hours
    
    alarm_id = f"alarm_{int(time.time() * 1000)}"
    
    # Store alarm data with start timestamp
    active_alarms[alarm_id] = {
        'status': 'running',
        'sleep_hours': sleep_hours,
        'real_duration_minutes': real_duration_minutes,
        'fast_factor': fast_factor,
        'start_time': time.time(),
        'total_sleep_seconds': sleep_hours * 3600,
        'real_end_time': time.time() + (real_duration_minutes * 60)
    }
    
    return jsonify({
        'alarm_id': alarm_id,
        'status': 'started',
        'start_time': active_alarms[alarm_id]['start_time'],
        'total_sleep_seconds': active_alarms[alarm_id]['total_sleep_seconds'],
        'fast_factor': fast_factor
    })

@app.route('/alarm_status/<alarm_id>')
def alarm_status(alarm_id):
    if alarm_id not in active_alarms:
        return jsonify({'error': 'Alarm not found'}), 404
    
    alarm = active_alarms[alarm_id]
    
    if alarm['status'] == 'stopped':
        return jsonify({
            'status': 'stopped',
            'remaining_time': '00:00:00.000'
        })
    
    # Calculate remaining time based on elapsed real time
    current_time = time.time()
    elapsed_real = current_time - alarm['start_time']
    virtual_elapsed = elapsed_real * alarm['fast_factor']
    
    total_sleep_seconds = alarm['total_sleep_seconds']
    
    # Check if completed
    if virtual_elapsed >= total_sleep_seconds or current_time >= alarm['real_end_time']:
        alarm['status'] = 'completed'
        remaining_seconds = 0
    else:
        remaining_seconds = max(0, total_sleep_seconds - virtual_elapsed)
    
    hours = int(remaining_seconds // 3600)
    minutes = int((remaining_seconds % 3600) // 60)
    seconds = int(remaining_seconds % 60)
    milliseconds = int((remaining_seconds % 1) * 1000)
    
    progress_percent = ((total_sleep_seconds - remaining_seconds) / total_sleep_seconds) * 100 if total_sleep_seconds > 0 else 0
    
    return jsonify({
        'status': alarm['status'],
        'remaining_time': f"{hours:02d}:{minutes:02d}:{seconds:02d}.{milliseconds:03d}",
        'sleep_hours': alarm['sleep_hours'],
        'real_duration_minutes': alarm['real_duration_minutes'],
        'fast_factor': f"{alarm['fast_factor']:.2f}",
        'progress_percent': progress_percent
    })

@app.route('/stop_alarm/<alarm_id>', methods=['POST'])
def stop_alarm(alarm_id):
    if alarm_id in active_alarms:
        active_alarms[alarm_id]['status'] = 'stopped'
        return jsonify({'status': 'stopped'})
    return jsonify({'error': 'Alarm not found'}), 404

if __name__ == "__main__":
    app.run(debug=True)
