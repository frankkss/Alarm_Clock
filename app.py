from flask import Flask, render_template, request, jsonify
import time

app = Flask(__name__)

# Store active alarms (minimal storage)
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
    
    # Store minimal alarm data
    active_alarms[alarm_id] = {
        'status': 'running',
        'created_at': time.time()
    }
    
    return jsonify({
        'alarm_id': alarm_id,
        'status': 'started',
        'fast_factor': fast_factor
    })

@app.route('/stop_alarm/<alarm_id>', methods=['POST'])
def stop_alarm(alarm_id):
    if alarm_id in active_alarms:
        active_alarms[alarm_id]['status'] = 'stopped'
        return jsonify({'status': 'stopped'})
    return jsonify({'error': 'Alarm not found'}), 404

if __name__ == "__main__":
    app.run(debug=True)
