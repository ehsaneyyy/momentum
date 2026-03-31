import * as THREE from 'three';

// ------------------------------
// 3D Background
// ------------------------------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
document.body.appendChild(renderer.domElement);
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.zIndex = '-1';

const geometry = new THREE.BufferGeometry();
const count = 1000;
const positions = new Float32Array(count * 3);
for (let i = 0; i < count; i++) {
    positions[i*3] = (Math.random() - 0.5) * 200;
    positions[i*3+1] = (Math.random() - 0.5) * 100;
    positions[i*3+2] = (Math.random() - 0.5) * 50 - 50;
}
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const material = new THREE.PointsMaterial({ color: 0xff66cc, size: 0.2 });
const particles = new THREE.Points(geometry, material);
scene.add(particles);
camera.position.z = 50;

function animate() {
    requestAnimationFrame(animate);
    particles.rotation.y += 0.002;
    particles.rotation.x += 0.001;
    renderer.render(scene, camera);
}
animate();
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ------------------------------
// App State
// ------------------------------
let token = localStorage.getItem('access_token');
let currentUser = null;
let currentEventId = null;
let ws = null;
let map = null;
let mapMarker = null;

// Helper for authenticated fetch
async function apiFetch(url, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
        localStorage.removeItem('access_token');
        token = null;
        currentUser = null;
        updateAuthUI();
        showLoginModal();
        throw new Error('Unauthorized');
    }
    return response;
}

// ------------------------------
// UI Helpers
// ------------------------------
function updateAuthUI() {
    const authBtn = document.getElementById('authBtn');
    const userDisplay = document.getElementById('userDisplay');
    if (token && currentUser) {
        authBtn.textContent = 'Logout';
        userDisplay.textContent = `👋 ${currentUser.username}`;
    } else {
        authBtn.textContent = 'Login';
        userDisplay.textContent = '';
    }
}

function showLoginModal() { document.getElementById('loginModal').classList.remove('hidden'); }
function hideLoginModal() { document.getElementById('loginModal').classList.add('hidden'); }
function showSignupModal() { document.getElementById('signupModal').classList.remove('hidden'); }
function hideSignupModal() { document.getElementById('signupModal').classList.add('hidden'); }
function showCreateEventModal() { document.getElementById('createEventModal').classList.remove('hidden'); initMap(); }
function hideCreateEventModal() { document.getElementById('createEventModal').classList.add('hidden'); if(map) map.remove(); }
function showChatModal(eventId, eventTitle) {
    currentEventId = eventId;
    document.getElementById('chatEventTitle').innerText = `Chat: ${eventTitle}`;
    document.getElementById('chatModal').classList.remove('hidden');
    document.getElementById('chatMessages').innerHTML = '';
    connectWebSocket(eventId);
}
function hideChatModal() {
    if (ws) ws.close();
    currentEventId = null;
    document.getElementById('chatModal').classList.add('hidden');
}

// ------------------------------
// Mapbox Setup (Replace 'YOUR_TOKEN' if you want the map, but Join/Leave work without it)
// ------------------------------
function initMap() {
    // If you don't have a Mapbox token, the map will not show – that's fine.
    // Join/Leave are not affected.
    if (typeof mapboxgl === 'undefined') return;
    mapboxgl.accessToken = 'YOUR_MAPBOX_ACCESS_TOKEN'; // <-- Replace if you want map
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [77.5946, 12.9716],
        zoom: 12
    });
    map.on('click', (e) => {
        const { lng, lat } = e.lngLat;
        if (mapMarker) mapMarker.remove();
        mapMarker = new mapboxgl.Marker().setLngLat([lng, lat]).addTo(map);
        window.selectedLat = lat;
        window.selectedLng = lng;
    });
}

// ------------------------------
// Authentication
// ------------------------------
document.getElementById('loginBtn').onclick = async () => {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const response = await fetch('http://localhost:8000/users/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username, password })
    });
    if (response.ok) {
        const data = await response.json();
        token = data.access_token;
        localStorage.setItem('access_token', token);
        const userRes = await apiFetch('http://localhost:8000/users/me');
        if (userRes.ok) currentUser = await userRes.json();
        hideLoginModal();
        updateAuthUI();
        loadEvents();
    } else {
        alert('Login failed');
    }
};

document.getElementById('signupBtn').onclick = async () => {
    const email = document.getElementById('signupEmail').value;
    const username = document.getElementById('signupUsername').value;
    const password = document.getElementById('signupPassword').value;
    const response = await fetch('http://localhost:8000/users/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password })
    });
    if (response.ok) {
        alert('Signup successful! Please login.');
        hideSignupModal();
        showLoginModal();
    } else {
        alert('Signup failed');
    }
};

document.getElementById('authBtn').onclick = () => {
    if (token) {
        localStorage.removeItem('access_token');
        token = null;
        currentUser = null;
        updateAuthUI();
        loadEvents();
    } else {
        showLoginModal();
    }
};

document.getElementById('showSignup').onclick = (e) => { e.preventDefault(); hideLoginModal(); showSignupModal(); };
document.getElementById('showLogin').onclick = (e) => { e.preventDefault(); hideSignupModal(); showLoginModal(); };

// ------------------------------
// Event Creation
// ------------------------------
document.getElementById('createEventBtn').onclick = () => {
    if (!token) { showLoginModal(); return; }
    showCreateEventModal();
};

document.getElementById('submitEventBtn').onclick = async () => {
    const title = document.getElementById('eventTitle').value;
    const description = document.getElementById('eventDesc').value;
    const location = document.getElementById('eventLocation').value;
    const max_participants = parseInt(document.getElementById('eventMaxPart').value);
    const is_private = document.getElementById('eventPrivate').checked;
    const lat = window.selectedLat || null;
    const lng = window.selectedLng || null;

    const body = { title, description, location, latitude: lat, longitude: lng, max_participants, is_private };
    const res = await apiFetch('http://localhost:8000/events/', {
        method: 'POST',
        body: JSON.stringify(body)
    });
    if (res.ok) {
        hideCreateEventModal();
        loadEvents();
    } else {
        alert('Failed to create event');
    }
};

document.getElementById('cancelEventBtn').onclick = () => hideCreateEventModal();

// ------------------------------
// Load and Display Events (FIXED: Join/Leave handlers work)
// ------------------------------
async function loadEvents() {
    const res = await apiFetch('http://localhost:8000/events/');
    if (!res.ok) return;
    const events = await res.json();
    const container = document.getElementById('events-list');
    container.innerHTML = events.map(event => `
        <div class="bg-white/10 backdrop-blur-md rounded-xl p-5 shadow-lg transform hover:scale-105 transition-all duration-300">
            <h3 class="text-2xl font-bold">${event.title}</h3>
            <p class="mt-2">${event.description}</p>
            <p class="mt-2 text-sm">📍 ${event.location}</p>
            <p class="mt-2 text-sm">👥 ${event.participants_count || 0}/${event.max_participants}</p>
            <p class="mt-2 text-xs text-gray-300">🕒 ${new Date(event.time).toLocaleString()}</p>
            ${token ? `
                <div class="mt-4 flex gap-2">
                    <button class="join-event-btn bg-green-500 px-3 py-1 rounded text-sm" data-id="${event.id}">Join</button>
                    <button class="leave-event-btn bg-red-500 px-3 py-1 rounded text-sm" data-id="${event.id}">Leave</button>
                    <button class="chat-event-btn bg-blue-500 px-3 py-1 rounded text-sm" data-id="${event.id}" data-title="${event.title}">Chat</button>
                </div>
            ` : ''}
        </div>
    `).join('');

    // Attach event listeners after DOM update
    document.querySelectorAll('.join-event-btn').forEach(btn => {
        btn.onclick = async () => {
            const id = btn.dataset.id;
            const response = await apiFetch(`http://localhost:8000/events/${id}/join`, { method: 'POST' });
            if (response.ok) {
                loadEvents(); // refresh list to update participant count
            } else {
                const error = await response.text();
                alert(`Join failed: ${error}`);
            }
        };
    });
    document.querySelectorAll('.leave-event-btn').forEach(btn => {
        btn.onclick = async () => {
            const id = btn.dataset.id;
            const response = await apiFetch(`http://localhost:8000/events/${id}/leave`, { method: 'POST' });
            if (response.ok) {
                loadEvents();
            } else {
                const error = await response.text();
                alert(`Leave failed: ${error}`);
            }
        };
    });
    document.querySelectorAll('.chat-event-btn').forEach(btn => {
        btn.onclick = () => showChatModal(btn.dataset.id, btn.dataset.title);
    });
}

// ------------------------------
// WebSocket Chat
// ------------------------------
function connectWebSocket(eventId) {
    if (ws) ws.close();
    ws = new WebSocket(`ws://localhost:8000/ws/chat/${eventId}`);
    ws.onmessage = (event) => {
        const messagesDiv = document.getElementById('chatMessages');
        const msgDiv = document.createElement('div');
        msgDiv.className = 'p-2 bg-gray-100 rounded';
        msgDiv.textContent = event.data;
        messagesDiv.appendChild(msgDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    };
    ws.onclose = () => console.log('WebSocket closed');
}

document.getElementById('sendChatBtn').onclick = () => {
    const input = document.getElementById('chatInput');
    if (input.value.trim() && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(input.value);
        input.value = '';
    }
};
document.getElementById('closeChatBtn').onclick = () => hideChatModal();

// ------------------------------
// Initial Load
// ------------------------------
async function initUser() {
    if (token) {
        const res = await apiFetch('http://localhost:8000/users/me');
        if (res.ok) {
            currentUser = await res.json();
            updateAuthUI();
        } else {
            token = null;
            localStorage.removeItem('access_token');
        }
    }
    loadEvents();
}

initUser();