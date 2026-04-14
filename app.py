import random
import os
import google.generativeai as genai
from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
from flask_caching import Cache
from datetime import datetime

app = Flask(__name__)
CORS(app)
cache = Cache(app, config={'CACHE_TYPE': 'simple'})

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', 'AIzaSyDemo123')
try:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
except:
    model = None

GATES = ['Gate A (North)', 'Gate B (East)', 'Gate C (South)', 'Gate D (West)']
SECTIONS = ['Section 101L', 'Section 102L', 'Section 103M', 'Section 104M', 'VIP Box 1', 'VIP Box 2']
FOOD_STALLS = ['Burger Haven', 'Spicy Wok', 'Cricket Cafe', 'Drinks & Co', 'Pizza Express']
PARKING_ZONES = ['P1 Premium', 'P2 East', 'P3 West', 'P4 Overflow']

FACILITIES = [
    {'id': 'f1', 'name': 'First Aid Station 1 (North)', 'type': 'medical'},
    {'id': 'f2', 'name': 'Washrooms (East Wing)', 'type': 'restroom'},
    {'id': 'f3', 'name': 'Merchandise Store (Main)', 'type': 'retail'},
    {'id': 'f4', 'name': 'Information Desk (South)', 'type': 'info'},
]

UPDATES = [
    "Gates open at 4:00 PM for all ticket holders.",
    "Match starts at 5:30 PM. Please take your seats.",
    "Special discount on team jerseys at Merchandise Store before 5:00 PM.",
    "Rain expected later this evening; ponchos available at all retail stands.",
    "VIP parking P1 is almost full. Please redirect to P2 East.",
    "Please stay hydrated. Water stations are located near all Major Gates.",
    "The coin toss will happen at 5:00 PM.",
    "Food stalls in East Wing are experiencing longer wait times."
]

def get_random_level():
    return random.randint(10, 100)

def get_wait_time(base, variance):
    return max(0, base + random.randint(-variance, variance))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/crowd')
@cache.cached(timeout=30)
def crowd_levels():
    gates_data = [{'name': gate, 'occupancy_percent': get_random_level()} for gate in GATES]
    sections_data = [{'name': sec, 'occupancy_percent': get_random_level()} for sec in SECTIONS]
    return jsonify({
        'timestamp': datetime.now().isoformat(),
        'gates': gates_data,
        'sections': sections_data
    })

@app.route('/api/waittimes')
@cache.cached(timeout=30)
def wait_times():
    food_data = [{'name': stall, 'wait_time_mins': get_wait_time(15, 10)} for stall in FOOD_STALLS]
    parking_data = [{'name': zone, 'wait_time_mins': get_wait_time(8, 5)} for zone in PARKING_ZONES]
    gates_entry = [{'name': gate, 'wait_time_mins': get_wait_time(20, 15)} for gate in GATES]
    return jsonify({
        'timestamp': datetime.now().isoformat(),
        'food_stalls': food_data,
        'parking': parking_data,
        'gates': gates_entry
    })

@app.route('/api/facilities')
@cache.cached(timeout=60)
def facilities_status():
    status_options = ['Operational', 'Crowded', 'Temporarily Closed', 'Operational', 'Operational']
    fac_data = [{'id': f['id'], 'name': f['name'], 'type': f['type'], 'status': random.choice(status_options)} for f in FACILITIES]
    return jsonify({
        'timestamp': datetime.now().isoformat(),
        'facilities': fac_data
    })

@app.route('/api/updates')
def live_updates():
    active_updates = random.sample(UPDATES, random.randint(1, 4))
    return jsonify({
        'timestamp': datetime.now().isoformat(),
        'updates': active_updates
    })

@app.route('/api/navigation')
def navigation():
    routes = [
        {'id': 1, 'origin': 'Gate A (North)', 'destination': 'Section 101L', 'estimated_time_mins': get_wait_time(5, 2), 'steps': ['Enter Gate A', 'Take escalators to Level 1', 'Turn left towards North Wing', 'Proceed 50m to Section 101L']},
        {'id': 2, 'origin': 'Gate B (East)', 'destination': 'Spicy Wok', 'estimated_time_mins': get_wait_time(3, 1), 'steps': ['Enter Gate B', 'Walk straight to main concourse', 'Spicy Wok is on the right']},
        {'id': 3, 'origin': 'VIP Box 1', 'destination': 'Parking P1 Premium', 'estimated_time_mins': get_wait_time(7, 2), 'steps': ['Exit VIP Box 1', 'Take VIP elevator to Ground Floor', 'Exit via VIP Gate', 'P1 is directly ahead']},
    ]
    return jsonify({'routes': routes})

@app.route('/api/ai-assist', methods=['POST'])
def ai_assist():
    try:
        data = request.get_json()
        question = data.get('question', '')
        if model and question:
            prompt = f"You are a helpful stadium assistant for a 50000 capacity cricket stadium. Answer this visitor question briefly: {question}"
            response = model.generate_content(prompt)
            return jsonify({'answer': response.text, 'source': 'gemini'})
        else:
            return jsonify({'answer': 'Please ask about gates, parking, food stalls, or facilities!', 'source': 'fallback'})
    except Exception as e:
        return jsonify({'answer': 'I can help you with crowd levels, wait times, and navigation!', 'source': 'fallback'})

@app.route('/health')
def health():
    return jsonify({'status': 'healthy', 'google_services': 'gemini-integrated'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)