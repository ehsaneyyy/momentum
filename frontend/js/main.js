import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

function showToast(message, type = 'error') {
    const oldToast = document.querySelector('.toast');
    if (oldToast) oldToast.remove();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

const API_BASE = 'https://momentum-backend-u3tb.onrender.com';
const WS_BASE = 'wss://momentum-backend-u3tb.onrender.com';

function getApiUrl(endpoint) {
    if (typeof endpoint === 'string') return `${API_BASE}${endpoint}`;
    return endpoint;
}

function toRadians(deg) { return deg * Math.PI / 180; }

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

async function geocodeLocation(locationQuery) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationQuery)}&limit=1`);
        const data = await response.json();
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display_name: data[0].display_name };
        }
        return null;
    } catch (error) {
        console.error('Geocoding failed:', error);
        return null;
    }
}

function createRoundParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(16, 16, 14, 0, 2 * Math.PI);
    ctx.fillStyle = 'white';
    ctx.fill();
    return new THREE.CanvasTexture(canvas);
}

// ---------- 3D Earth Setup ----------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

const earthContainer = document.createElement('div');
earthContainer.id = 'earthContainer';
earthContainer.style.position = 'fixed';
earthContainer.style.top = '0';
earthContainer.style.left = '0';
earthContainer.style.width = '100%';
earthContainer.style.height = '100%';
earthContainer.style.zIndex = '0';
earthContainer.style.overflow = 'hidden';
document.body.appendChild(earthContainer);

const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
earthContainer.appendChild(renderer.domElement);
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '100%';
renderer.domElement.style.pointerEvents = 'auto';
renderer.domElement.style.touchAction = 'none';

// Starfield
const starGeometry = new THREE.BufferGeometry();
const starCount = 1200;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
    starPositions[i * 3] = (Math.random() - 0.5) * 800;
    starPositions[i * 3 + 1] = (Math.random() - 0.5) * 500;
    starPositions[i * 3 + 2] = (Math.random() - 0.5) * 200 - 100;
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starTexture = createRoundParticleTexture();
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.25, transparent: true, opacity: 0.8, map: starTexture, blending: THREE.AdditiveBlending });
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

const earthGroup = new THREE.Group();
scene.add(earthGroup);

// Earth textures
const textureLoader = new THREE.TextureLoader();
const earthMap = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg');
const earthSpecularMap = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg');
const earthNormalMap = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg');
const cloudMap = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_clouds_1024.png');

const earthGeometry = new THREE.SphereGeometry(2.5, 128, 128);
const earthMaterial = new THREE.MeshPhongMaterial({
    map: earthMap, specularMap: earthSpecularMap, specular: new THREE.Color('grey'), shininess: 5,
    normalMap: earthNormalMap, normalScale: new THREE.Vector2(0.8, 0.8)
});
const earth = new THREE.Mesh(earthGeometry, earthMaterial);
earthGroup.add(earth);

const cloudGeometry = new THREE.SphereGeometry(2.52, 128, 128);
const cloudMaterial = new THREE.MeshPhongMaterial({ map: cloudMap, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending });
const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
earthGroup.add(clouds);

const gloomParticleCount = 600;
const gloomGeometry = new THREE.BufferGeometry();
const gloomPositions = new Float32Array(gloomParticleCount * 3);
for (let i = 0; i < gloomParticleCount; i++) {
    const radius = 2.8 + Math.random() * 0.8;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    gloomPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    gloomPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    gloomPositions[i * 3 + 2] = radius * Math.cos(phi);
}
gloomGeometry.setAttribute('position', new THREE.BufferAttribute(gloomPositions, 3));
const gloomTexture = createRoundParticleTexture();
const gloomMaterial = new THREE.PointsMaterial({ color: 0x88aaff, size: 0.07, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, map: gloomTexture });
const gloomParticles = new THREE.Points(gloomGeometry, gloomMaterial);
earthGroup.add(gloomParticles);

// Lighting
const ambientLight = new THREE.AmbientLight(0x333344);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xccaa88, 0.8);
directionalLight.position.set(3, 2, 4);
scene.add(directionalLight);
const backLight = new THREE.PointLight(0x6688aa, 0.5);
backLight.position.set(-2, -1, -3);
scene.add(backLight);
const fillLight = new THREE.PointLight(0x4466aa, 0.3);
fillLight.position.set(0, -2, 0);
scene.add(fillLight);

camera.position.set(0, 0, 8);
camera.lookAt(0, 0, 0);

let controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.rotateSpeed = 0.8;
controls.zoomSpeed = 0.8;
controls.enableZoom = true;
controls.enablePan = false;
controls.target.set(0, 0, 0);
controls.autoRotate = true;
controls.autoRotateSpeed = 1.0;
controls.enableTouch = false;
controls.enabled = true;

let activePin = null;
let activeLocationCenter = null;

function latLonToPosition(lat, lon, radius = 2.5) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = lon * Math.PI / 180;
    return new THREE.Vector3(radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
}

function createPin(lat, lon) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);
    ctx.beginPath();
    ctx.arc(128, 128, 90, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 50, 50, 0.5)';
    ctx.fill();
    ctx.save();
    ctx.translate(128, 128);
    ctx.rotate(Math.PI);
    ctx.font = '180px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff3333';
    ctx.fillText('🩸', 0, 0);
    ctx.restore();
    ctx.beginPath();
    ctx.ellipse(100, 90, 14, 20, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,200,0.9)';
    ctx.fill();
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, blending: THREE.AdditiveBlending, depthTest: false, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.8, 0.8, 1);
    const pos = latLonToPosition(lat, lon, 2.65);
    sprite.position.copy(pos);
    sprite.userData = { time: 0 };
    return sprite;
}

function setPin(lat, lon) {
    if (activePin) earthGroup.remove(activePin);
    activePin = createPin(lat, lon);
    earthGroup.add(activePin);
}

let flyAnimation = null;
function flyToLocation(lat, lon) {
    if (flyAnimation) cancelAnimationFrame(flyAnimation);
    controls.autoRotate = false;
    const targetPos = latLonToPosition(lat, lon, 8);
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const targetTarget = new THREE.Vector3(0, 0, 0);
    const duration = 800;
    const startTime = performance.now();
    function animateFly(now) {
        const t = Math.min(1, (now - startTime) / duration);
        const ease = 1 - Math.pow(1 - t, 3);
        camera.position.lerpVectors(startPos, targetPos, ease);
        controls.target.lerpVectors(startTarget, targetTarget, ease);
        controls.update();
        if (t < 1) flyAnimation = requestAnimationFrame(animateFly);
        else flyAnimation = null;
    }
    flyAnimation = requestAnimationFrame(animateFly);
    setPin(lat, lon);
}

function resetEarthView() {
    if (flyAnimation) cancelAnimationFrame(flyAnimation);
    controls.autoRotate = true;
    if (activePin) earthGroup.remove(activePin);
    activePin = null;
    activeLocationCenter = null;
}

window.rotateEarthToLocation = flyToLocation;
window.resetEarthView = resetEarthView;

function updateEventMarkers(events) {
    if (window.eventMarkers) window.eventMarkers.forEach(m => earthGroup.remove(m));
    window.eventMarkers = [];
    events.forEach(event => {
        if (event.latitude && event.longitude) {
            const lat = parseFloat(event.latitude);
            const lon = parseFloat(event.longitude);
            const canvas = document.createElement('canvas');
            canvas.width = 48;
            canvas.height = 48;
            const ctx = canvas.getContext('2d');
            ctx.beginPath();
            ctx.arc(24, 24, 14, 0, 2 * Math.PI);
            ctx.fillStyle = '#ff0000';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(24, 24, 8, 0, 2 * Math.PI);
            ctx.fillStyle = '#ff6666';
            ctx.fill();
            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.SpriteMaterial({ map: texture, blending: THREE.AdditiveBlending });
            const sprite = new THREE.Sprite(material);
            sprite.scale.set(0.2, 0.2, 1);
            const pos = latLonToPosition(lat, lon, 2.53);
            sprite.position.copy(pos);
            sprite.userData = { eventId: event.id };
            earthGroup.add(sprite);
            window.eventMarkers.push(sprite);
        }
    });
}
window.updateEventMarkers = updateEventMarkers;

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    if (activePin) {
        activePin.userData.time += 0.015;
        const scale = 0.8 + Math.sin(activePin.userData.time * 2.5) * 0.08;
        activePin.scale.set(scale, scale, 1);
        if (activePin.material) activePin.material.opacity = 0.8 + Math.sin(activePin.userData.time * 3) * 0.2;
    }
    stars.rotation.y += 0.0005;
    stars.rotation.x += 0.0002;
    gloomParticles.rotation.y += 0.0008;
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Global State ----------
let token = localStorage.getItem('access_token');
let currentUser = null;
let allEvents = [];
let userJoinedEvents = new Set();
let currentDetailEvent = null;
let currentChatEventId = null;
let chatWs = null;
let map = null, mapMarker = null;

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

function updateAuthUI() {
    const authBtn = document.getElementById('authBtn');
    const profileBtn = document.getElementById('profileBtn');
    const userDisplay = document.getElementById('userDisplay');
    if (token && currentUser) {
        authBtn.textContent = 'Logout';
        userDisplay.innerHTML = `<span class="wave-emoji">👋</span> ${currentUser.username}`;
        profileBtn.style.display = 'inline-block';
    } else if (token && !currentUser) {
        authBtn.textContent = 'Logout';
        userDisplay.innerHTML = `<span class="wave-emoji">👋</span> User`;
        profileBtn.style.display = 'none';
    } else {
        authBtn.textContent = 'Login';
        userDisplay.innerHTML = '';
        profileBtn.style.display = 'none';
    }
}

function showLoginModal() { document.getElementById('loginModal').classList.remove('hidden'); }
function hideLoginModal() { document.getElementById('loginModal').classList.add('hidden'); }
function showSignupModal() { document.getElementById('signupModal').classList.remove('hidden'); }
function hideSignupModal() { document.getElementById('signupModal').classList.add('hidden'); }
function showCreateEventModal() { document.getElementById('createEventModal').classList.remove('hidden'); initMap(); }
function hideCreateEventModal() { document.getElementById('createEventModal').classList.add('hidden'); if (map) map.remove(); }

function initMap() {
    map = L.map('map').setView([12.9716, 77.5946], 12);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; CartoDB', subdomains: 'abcd', maxZoom: 19 }).addTo(map);
    let marker = null;
    map.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        if (marker) map.removeLayer(marker);
        marker = L.marker([lat, lng]).addTo(map);
        window.selectedLat = lat;
        window.selectedLng = lng;
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
            const data = await response.json();
            if (data && data.display_name) document.getElementById('eventLocation').value = data.display_name;
            else if (data && data.name) document.getElementById('eventLocation').value = data.name;
            else document.getElementById('eventLocation').value = "Unknown location";
        } catch (error) { console.error('Reverse geocoding failed:', error); }
    });
    const locationInput = document.getElementById('eventLocation');
    let debounceTimer;
    locationInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            const query = locationInput.value.trim();
            if (query.length < 3) return;
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
                const data = await response.json();
                if (data && data.length > 0) {
                    const { lat, lon } = data[0];
                    const latNum = parseFloat(lat);
                    const lonNum = parseFloat(lon);
                    map.setView([latNum, lonNum], 15);
                    if (marker) map.removeLayer(marker);
                    marker = L.marker([latNum, lonNum]).addTo(map);
                    window.selectedLat = latNum;
                    window.selectedLng = lonNum;
                }
            } catch (error) { console.error('Geocoding failed:', error); }
        }, 500);
    });
}

async function loadEventDetail(eventId) {
    const res = await apiFetch(getApiUrl(`/events/${eventId}`));
    if (!res.ok) return;
    const event = await res.json();
    currentDetailEvent = event;
    document.getElementById('detailTitle').innerText = event.title;
    document.getElementById('detailDesc').innerText = event.description;
    document.getElementById('detailLocation').innerText = `📍 ${event.location}`;
    document.getElementById('detailTime').innerText = `🕒 ${new Date(event.time).toLocaleString()}`;
    document.getElementById('detailParticipants').innerText = `👥 ${event.participants_count || 0}/${event.max_participants}`;

    const isHost = currentUser && (event.creator_id === currentUser.id);
    console.log("isHost:", isHost, "event.creator_id:", event.creator_id, "currentUser.id:", currentUser?.id);

    if (isHost) {
        document.getElementById('detailEditBtn').classList.remove('hidden');
        document.getElementById('detailDeleteBtn').classList.remove('hidden');
    } else {
        document.getElementById('detailEditBtn').classList.add('hidden');
        document.getElementById('detailDeleteBtn').classList.add('hidden');
    }

    const participantsRes = await apiFetch(getApiUrl(`/events/${eventId}/participants`));
    if (participantsRes.ok) {
        const participants = await participantsRes.json();
        const peopleList = document.getElementById('peopleList');
        peopleList.innerHTML = '';
        participants.forEach(person => {
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center p-2 bg-white/5 rounded';
            const fullName = person.first_name || person.last_name ? `${person.first_name || ''} ${person.last_name || ''}`.trim() : person.username;
            div.innerHTML = `
                <span>${fullName}</span>
                ${isHost ? `<button class="remove-person-btn bg-red-500/70 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition" data-username="${person.username}">Remove</button>` : ''}
            `;
            peopleList.appendChild(div);
        });
    }

    const userAlreadyJoined = userJoinedEvents.has(event.id);
    const joinBtn = document.getElementById('detailJoinBtn');
    const leaveBtn = document.getElementById('detailLeaveBtn');

    if (userAlreadyJoined || isHost) {
        joinBtn.style.display = 'none';
        leaveBtn.style.display = 'inline-block';
    } else {
        joinBtn.style.display = 'inline-block';
        leaveBtn.style.display = 'none';
    }

    joinBtn.dataset.isPrivate = event.is_private ? 'true' : 'false';
    joinBtn.dataset.isHost = isHost ? 'true' : 'false';
    joinBtn.dataset.alreadyJoined = userAlreadyJoined ? 'true' : 'false';
}

function hideEventDetail() {
    document.getElementById('eventDetailModal').classList.add('hidden');
    currentDetailEvent = null;
}

async function loadChatModal(eventId) {
    currentChatEventId = eventId;
    const res = await apiFetch(getApiUrl('/events'));
    if (!res.ok) return;
    const events = await res.json();
    const event = events.find(e => e.id == eventId);
    if (!event) return;
    document.getElementById('chatEventTitle').innerText = event.title;
    const chatContainer = document.getElementById('chatMessages');
    chatContainer.innerHTML = '';
    if (chatWs) chatWs.close();
    chatWs = new WebSocket(`${WS_BASE}/ws/chat/${eventId}`);
    chatWs.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            const msgDiv = document.createElement('div');
            msgDiv.className = 'p-2 bg-white/20 rounded shadow-sm mb-1 text-white text-sm bounce border border-white/10';
            msgDiv.innerHTML = `<strong>${data.user.username}:</strong> ${data.message}`;
            chatContainer.appendChild(msgDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        } catch (err) { console.error('Failed to parse chat message', err); }
    };
}

async function loadRecommendations() {
    if (!token || !currentUser) return;
    try {
        const res = await apiFetch(getApiUrl('/recommendations/events'));
        if (!res.ok) return;
        const recs = await res.json();
        const section = document.getElementById('recommendations-section');
        const container = document.getElementById('recommended-events-list');
        if (section) section.classList.remove('hidden');
        if (!recs.length) {
            container.innerHTML = '<div class="col-span-full text-center text-white/70">No upcoming events yet. Create or join one!</div>';
            return;
        }
        if (container) {
            container.innerHTML = recs.map(event => `
                <div class="bg-gradient-to-r from-purple-900/50 to-pink-900/50 backdrop-blur-md rounded-xl p-5 shadow-lg event-card cursor-pointer" data-id="${event.id}">
                    <h3 class="text-2xl font-bold">${event.title}</h3>
                    <p class="mt-2">${event.description.substring(0, 100)}...</p>
                    <p class="mt-2 text-sm">📍 ${event.location}</p>
                    <p class="mt-2 text-sm">👥 ${event.participants_count}/${event.max_participants}</p>
                </div>
            `).join('');
            document.querySelectorAll('#recommended-events-list .event-card').forEach(card => {
                card.onclick = () => {
                    const eventId = parseInt(card.dataset.id);
                    loadEventDetail(eventId);
                    document.getElementById('eventDetailModal').classList.remove('hidden');
                };
            });
        }
    } catch (err) {
        console.error('Failed to load recommendations:', err);
    }
}

async function loadEvents(center = null) {
    const res = await apiFetch(getApiUrl('/events'));
    if (!res.ok) return;
    let events = await res.json();
    if (token && currentUser) {
        try {
            const joinedRes = await apiFetch(getApiUrl('/users/me/joined-events'));
            if (joinedRes.ok) {
                const joined = await joinedRes.json();
                userJoinedEvents.clear();
                joined.forEach(e => userJoinedEvents.add(e.id));
            } else userJoinedEvents.clear();
        } catch (e) { userJoinedEvents.clear(); }
    } else userJoinedEvents.clear();
    let filteredEvents = events;
    let filterMessage = '';
    if (center && center.lat && center.lon) {
        const eventsWithDistance = events.filter(e => e.latitude && e.longitude).map(e => {
            const dist = getDistance(center.lat, center.lon, parseFloat(e.latitude), parseFloat(e.longitude));
            return { ...e, distance: dist };
        }).sort((a, b) => a.distance - b.distance);
        filteredEvents = eventsWithDistance;
        filterMessage = `Showing events near ${center.display_name || center.query}. Sorted by distance.`;
    }
    if (typeof window.updateEventMarkers === 'function') window.updateEventMarkers(filteredEvents);
    const container = document.getElementById('events-list');
    if (!container) return;
    if (filteredEvents.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-12"><p class="text-xl text-white/70">Currently, there are no events right now!</p><p class="text-sm text-white/50 mt-2">Be the first to create an event and bring people together.</p></div>`;
    } else {
        container.innerHTML = filteredEvents.map(event => {
            const titleText = event.is_private ? `${event.title} (private)` : event.title;
            const isJoined = userJoinedEvents.has(event.id);
            const joinedClass = isJoined ? 'event-card-joined' : '';
            const distanceHtml = event.distance !== undefined ? `<p class="text-xs text-teal-300 mt-1">📍 ${event.distance.toFixed(1)} km away</p>` : '';
            return `<div class="bg-white/10 backdrop-blur-md rounded-xl p-5 shadow-lg transform hover:scale-105 transition-all duration-300 event-card cursor-pointer ${joinedClass}" data-id="${event.id}">
                <h3 class="text-2xl font-bold">${titleText}</h3>
                <p class="mt-2">${event.description}</p>
                <p class="mt-2 text-sm">📍 ${event.location}</p>
                <p class="mt-2 text-sm">👥 ${event.participants_count || 0}/${event.max_participants}</p>
                <p class="mt-2 text-xs text-gray-300">🕒 ${new Date(event.time).toLocaleString()}</p>
                ${distanceHtml}
            </div>`;
        }).join('');
    }
    const statusDiv = document.getElementById('locationFilterStatus');
    if (statusDiv) {
        if (filterMessage) {
            statusDiv.innerHTML = filterMessage;
            statusDiv.classList.remove('hidden');
        } else statusDiv.classList.add('hidden');
    }
    document.querySelectorAll('.event-card').forEach(card => {
        card.onclick = () => {
            const eventId = parseInt(card.dataset.id);
            const event = filteredEvents.find(ev => ev.id === eventId);
            if (event && event.latitude && event.longitude) {
                const lat = parseFloat(event.latitude);
                const lon = parseFloat(event.longitude);
                if (typeof window.rotateEarthToLocation === 'function') window.rotateEarthToLocation(lat, lon);
            }
            loadEventDetail(eventId);
            document.getElementById('eventDetailModal').classList.remove('hidden');
        };
    });
    await loadRecommendations();
}

document.getElementById('loginBtn').onclick = async () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const response = await fetch(getApiUrl('/users/token'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username: email, password })
    });
    if (response.ok) {
        const data = await response.json();
        token = data.access_token;
        localStorage.setItem('access_token', token);
        const userRes = await apiFetch(getApiUrl('/users/me'));
        if (userRes.ok) {
            currentUser = await userRes.json();
            console.log("Logged in user:", currentUser);
            hideLoginModal();
            updateAuthUI();
            await loadEvents();
            await loadRecommendations();
        } else {
            localStorage.removeItem('access_token');
            token = null;
            showToast('Could not retrieve user profile. Please try again.', 'error');
        }
    } else {
        const error = await response.json();
        showToast(error.detail || 'Login failed', 'error');
    }
};

document.getElementById('signupBtn').onclick = async () => {
    const firstName = document.getElementById('signupFirstName').value;
    const lastName = document.getElementById('signupLastName').value;
    const email = document.getElementById('signupEmail').value;
    const username = document.getElementById('signupUsername').value;
    const password = document.getElementById('signupPassword').value;
    const age = document.getElementById('signupAge').value;
    const gender = document.getElementById('signupGender').value;
    const response = await fetch(getApiUrl('/users/signup'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, username, password, first_name: firstName, last_name: lastName, age: age ? parseInt(age) : null, gender }) });
    if (response.ok) {
        hideSignupModal();
        showToast('Account created! Please log in.', 'success');
        showLoginModal();
    } else {
        const error = await response.json();
        showToast(error.detail || 'Signup failed', 'error');
    }
};

document.getElementById('authBtn').onclick = () => {
    if (token) {
        localStorage.removeItem('access_token');
        token = null;
        currentUser = null;
        updateAuthUI();
        loadEvents();
        loadRecommendations();
    } else showLoginModal();
};

document.getElementById('profileBtn').onclick = () => {
    if (currentUser) {
        document.getElementById('profileUsername').textContent = currentUser.username || 'N/A';
        document.getElementById('profileEmail').textContent = currentUser.email || 'N/A';
        const fullName = [currentUser.first_name, currentUser.last_name].filter(Boolean).join(' ') || 'Not provided';
        document.getElementById('profileFullName').textContent = fullName;
        document.getElementById('profileAge').textContent = currentUser.age ? currentUser.age : 'Not provided';
        document.getElementById('profileGender').textContent = currentUser.gender ? currentUser.gender : 'Not provided';
        document.getElementById('profileCreated').textContent = currentUser.created_at ? new Date(currentUser.created_at).toLocaleDateString() : 'Unknown';
        document.getElementById('profileModal').classList.remove('hidden');
    }
};

document.getElementById('closeProfileBtn').onclick = () => document.getElementById('profileModal').classList.add('hidden');
document.getElementById('showSignup').onclick = (e) => { e.preventDefault(); hideLoginModal(); showSignupModal(); };
document.getElementById('showLogin').onclick = (e) => { e.preventDefault(); hideSignupModal(); showLoginModal(); };
document.getElementById('logo').onclick = () => { loadEvents(); loadRecommendations(); };
document.getElementById('closeDetailBtn').onclick = () => hideEventDetail();

// ---------- Event Creation ----------
document.getElementById('submitEventBtn').onclick = async () => {
    const title = document.getElementById('eventTitle').value.trim();
    const description = document.getElementById('eventDesc').value.trim();
    const location = document.getElementById('eventLocation').value.trim();
    const max_participants = parseInt(document.getElementById('eventMaxPart').value);
    const is_private = document.getElementById('eventPrivate').checked;
    const lat = window.selectedLat ? window.selectedLat.toString() : null;
    const lng = window.selectedLng ? window.selectedLng.toString() : null;
    let invite_code = null;
    if (is_private) {
        const codeInput = document.getElementById('eventInviteCode');
        if (codeInput) invite_code = codeInput.value.trim() || null;
    }
    if (!title || !description || !location) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    const body = { title, description, location, latitude: lat, longitude: lng, max_participants, is_private, invite_code };
    const res = await apiFetch(getApiUrl('/events'), { method: 'POST', body: JSON.stringify(body) });
    if (res.ok) {
        const createdEvent = await res.json();
        if (createdEvent.is_private && createdEvent.invite_code) showToast(`Private event created! Invitation code: ${createdEvent.invite_code}`, 'success');
        else showToast('Event created!', 'success');
        hideCreateEventModal();
        await loadEvents();
        await loadRecommendations();
    } else {
        const error = await res.json();
        showToast(error.detail || 'Failed to create event', 'error');
        console.error('Creation error:', error);
    }
};

document.getElementById('cancelEventBtn').onclick = () => hideCreateEventModal();

document.getElementById('detailJoinBtn').onclick = async () => {
    if (!currentDetailEvent) return;

    const isPrivate = currentDetailEvent.is_private;
    const isHost = currentUser && currentDetailEvent.creator_id === currentUser.id;
    const alreadyJoined = userJoinedEvents.has(currentDetailEvent.id) || isHost;

    if (alreadyJoined) {
        showToast(isHost ? 'You are the creator of this event' : 'You have already joined this event', 'error');
        return;
    }

    if (isPrivate && !isHost) {
        const code = prompt('Enter the invitation code for this private event:');
        if (!code) return;
        const res = await apiFetch(getApiUrl(`/events/${currentDetailEvent.id}/join-with-code`), {
            method: 'POST',
            body: JSON.stringify({ code })
        });
        if (res.ok) {
            hideEventDetail();
            await loadEvents();
            await loadRecommendations();
            showToast('Joined private event!', 'success');
        } else {
            const error = await res.json();
            showToast(error.detail || 'Invalid code or join failed', 'error');
        }
    } else {
        const res = await apiFetch(getApiUrl(`/events/${currentDetailEvent.id}/join`), { method: 'POST' });
        if (res.ok) {
            hideEventDetail();
            await loadEvents();
            await loadRecommendations();
            showToast('Joined event', 'success');
        } else {
            const error = await res.json();
            showToast(error.detail || 'Join failed', 'error');
        }
    }
};

document.getElementById('detailLeaveBtn').onclick = async () => {
    if (!currentDetailEvent) return;
    const res = await apiFetch(getApiUrl(`/events/${currentDetailEvent.id}/leave`), { method: 'POST' });
    if (res.ok) {
        hideEventDetail();
        await loadEvents();
        await loadRecommendations();
        showToast('Left event', 'success');
    } else {
        const error = await res.json();
        showToast(error.detail || 'Leave failed', 'error');
    }
};

document.getElementById('detailDeleteBtn').onclick = async () => {
    if (!currentDetailEvent) return;
    if (confirm('Delete this event?')) {
        const res = await apiFetch(getApiUrl(`/events/${currentDetailEvent.id}`), { method: 'DELETE' });
        if (res.ok) {
            hideEventDetail();
            await loadEvents();
            await loadRecommendations();
        } else {
            const error = await res.json();
            showToast(error.detail || 'Delete failed', 'error');
        }
    }
};

document.getElementById('detailEditBtn').onclick = () => {
    if (!currentDetailEvent) return;
    document.getElementById('editEventTitle2').value = currentDetailEvent.title;
    document.getElementById('editEventDesc').value = currentDetailEvent.description;
    document.getElementById('editEventLocation').value = currentDetailEvent.location;
    document.getElementById('editEventMaxPart').value = currentDetailEvent.max_participants;
    document.getElementById('editEventModal').classList.remove('hidden');
};

document.getElementById('saveEditEventBtn').onclick = async () => {
    if (!currentDetailEvent) return;
    const updates = {
        title: document.getElementById('editEventTitle2').value,
        description: document.getElementById('editEventDesc').value,
        location: document.getElementById('editEventLocation').value,
        max_participants: parseInt(document.getElementById('editEventMaxPart').value)
    };
    const res = await apiFetch(getApiUrl(`/events/${currentDetailEvent.id}`), { method: 'PUT', body: JSON.stringify(updates) });
    if (res.ok) {
        document.getElementById('editEventModal').classList.add('hidden');
        await loadEvents();
        await loadEventDetail(currentDetailEvent.id);
        document.getElementById('eventDetailModal').classList.remove('hidden');
        await loadRecommendations();
    } else {
        const error = await res.json();
        showToast(error.detail || 'Update failed', 'error');
    }
};

document.getElementById('cancelEditEventBtn').onclick = () => document.getElementById('editEventModal').classList.add('hidden');

document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('remove-person-btn')) {
        const username = e.target.dataset.username;
        if (!confirm(`Remove ${username} from event?`)) return;
        const res = await apiFetch(getApiUrl(`/events/${currentDetailEvent.id}/remove-participant/${username}`), { method: 'POST' });
        if (res.ok) {
            await loadEvents();
            await loadRecommendations();
            if (currentDetailEvent) await loadEventDetail(currentDetailEvent.id);
        } else showToast('Remove failed', 'error');
    }
});

document.getElementById('detailChatBtn').onclick = async () => {
    if (!currentDetailEvent) return;
    if (!token) { showLoginModal(); return; }
    document.getElementById('eventDetailModal').classList.add('hidden');
    await loadChatModal(currentDetailEvent.id);
    document.getElementById('chatModal').classList.remove('hidden');
};

document.getElementById('chatSendBtn').onclick = async () => {
    const input = document.getElementById('chatInput');
    if (!input.value.trim()) return;
    const message = input.value;
    const username = currentUser?.username || 'Anonymous';
    if (chatWs && chatWs.readyState === WebSocket.OPEN) chatWs.send(JSON.stringify({ message, username }));
    await apiFetch(getApiUrl(`/events/${currentChatEventId}/messages`), { method: 'POST', body: JSON.stringify({ message }) }).catch(e => console.error);
    input.value = '';
};

document.getElementById('chatInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') document.getElementById('chatSendBtn').click(); });
document.getElementById('closeChatBtn').onclick = () => { if (chatWs) chatWs.close(); document.getElementById('chatModal').classList.add('hidden'); };
document.getElementById('createEventBtn')?.addEventListener('click', () => { if (!token) { showLoginModal(); return; } showCreateEventModal(); });

// ---------- Initialization ----------
async function init() {
    if (token) {
        const res = await apiFetch(getApiUrl('/users/me')).catch(() => null);
        if (res && res.ok) currentUser = await res.json();
        else { currentUser = null; token = null; localStorage.removeItem('access_token'); }
    }
    updateAuthUI();
    const main = document.getElementById('mainContent');
    if (main.children.length === 0) {
        main.innerHTML = `
            <div class="text-center mt-8">
                <h2 class="text-5xl font-extrabold mb-4 animate-float">Zero Plans? Perfect.</h2>
                <p class="text-xl mb-8 animate-fade-slide">Join what’s happening nearby, or start your own.</p>
                <button id="createEventBtn" class="create-btn-pulse px-8 py-3 bg-teal-500 rounded-full text-lg text-teal-100 font-semibold hover:bg-teal-600 transform hover:scale-105 transition">Create an Event</button>
            </div>
            <div id="recommendations-section" class="hidden mt-8">
                <h2 class="text-3xl font-bold mb-4 text-teal-300">🎯 Recommended for You</h2>
                <div id="recommended-events-list" class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"></div>
            </div>
            <div class="floating-location-filter glass-effect mt-40 mb-6 rounded-3xl max-w-3xl mx-auto">
                <div class="flex flex-col gap-4">
                    <div class="relative w-full">
                        <input type="text" id="locationFilterInput" placeholder="Filter events by location (e.g., New York, London, cafe near me)" class="w-full p-3 pl-10 rounded-full bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-teal-400 backdrop-blur-md">
                        <svg class="absolute left-3 top-3.5 w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    </div>
                    <div class="flex gap-2 justify-center">
                        <button id="applyLocationFilter" class="px-5 py-2 bg-gray-600 hover:bg-gray-700 rounded-full text-white font-semibold transition transform hover:scale-105">Apply</button>
                        <button id="clearLocationFilter" class="px-5 py-2 bg-gray-600 hover:bg-gray-700 rounded-full text-white font-semibold transition transform hover:scale-105">Show All</button>
                    </div>
                </div>
                <div id="locationFilterStatus" class="text-sm text-white/70 mt-2 hidden"></div>
            </div>
            <div id="events-list" class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8"></div>
        `;
        document.getElementById('createEventBtn').onclick = () => { if (!token) { showLoginModal(); return; } showCreateEventModal(); };
        const applyFilterBtn = document.getElementById('applyLocationFilter');
        const clearFilterBtn = document.getElementById('clearLocationFilter');
        const locationInput = document.getElementById('locationFilterInput');
        locationInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); applyFilterBtn.click(); } });
        function resetFilterButtons() { applyFilterBtn.classList.remove('filter-btn-active'); clearFilterBtn.classList.remove('filter-btn-active'); }
        applyFilterBtn.addEventListener('click', async () => {
            const query = locationInput.value.trim();
            if (!query) { showToast('Please enter a location', 'error'); return; }
            showToast('Searching for location...', 'success');
            const coords = await geocodeLocation(query);
            if (coords) {
                coords.query = query;
                await loadEvents(coords);
                showToast(`Showing events near ${coords.display_name.substring(0, 50)}`, 'success');
                resetFilterButtons();
                applyFilterBtn.classList.add('filter-btn-active');
                if (typeof window.rotateEarthToLocation === 'function') window.rotateEarthToLocation(coords.lat, coords.lon);
            } else {
                showToast('Location not found. Try a different name.', 'error');
                await loadEvents();
                resetFilterButtons();
                clearFilterBtn.classList.add('filter-btn-active');
                if (typeof window.resetEarthView === 'function') window.resetEarthView();
            }
        });
        clearFilterBtn.addEventListener('click', async () => {
            locationInput.value = '';
            await loadEvents();
            showToast('Showing all events', 'success');
            resetFilterButtons();
            clearFilterBtn.classList.add('filter-btn-active');
            if (typeof window.resetEarthView === 'function') window.resetEarthView();
        });
        resetFilterButtons();
        clearFilterBtn.classList.add('filter-btn-active');
    }
    // Private event toggle for invitation code input
    const privateCheckbox = document.getElementById('eventPrivate');
    const inviteCodeGroup = document.getElementById('inviteCodeGroup');
    const inviteCodeInput = document.getElementById('eventInviteCode');
    if (privateCheckbox && inviteCodeGroup && inviteCodeInput) {
        privateCheckbox.addEventListener('change', () => {
            if (privateCheckbox.checked) inviteCodeGroup.classList.remove('hidden');
            else { inviteCodeGroup.classList.add('hidden'); inviteCodeInput.value = ''; }
        });
    }
    await loadEvents();
    await loadRecommendations();
}

init();