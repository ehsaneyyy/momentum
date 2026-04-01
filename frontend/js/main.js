import * as THREE from 'three';
import { API_CONFIG, getApiUrl } from './config.js';

// ======================================
// MOMENTUM - Layer 2 
// ======================================

// 3D Background
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

// State
let token = localStorage.getItem('access_token');
let currentUser = null;
let allEvents = [];
let userJoinedEvents = new Set();
let currentDetailEvent = null;
let currentChatEventId = null;
let chatWs = null;
let map = null, mapMarker = null;

// Fetch helper
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

// UI Helpers
function updateAuthUI() {
    const authBtn = document.getElementById('authBtn');
    const profileBtn = document.getElementById('profileBtn');
    const userDisplay = document.getElementById('userDisplay');
    console.log('updateAuthUI called - token:', !!token, 'currentUser:', currentUser?.username);
    if (token) {
        // If we have a token, show Logout regardless of currentUser loading
        authBtn.textContent = 'Logout';
        authBtn.style.display = 'inline-block';
        if (currentUser) {
            userDisplay.textContent = `👋 ${currentUser.username}`;
            profileBtn.style.display = 'inline-block';
        } else {
            userDisplay.textContent = '👋 User';
            profileBtn.style.display = 'none';
        }
    } else {
        authBtn.textContent = 'Login';
        authBtn.style.display = 'inline-block';
        userDisplay.textContent = '';
        profileBtn.style.display = 'none';
    }
}

function showLoginModal() { document.getElementById('loginModal').classList.remove('hidden'); }
function hideLoginModal() { document.getElementById('loginModal').classList.add('hidden'); }
function showSignupModal() { document.getElementById('signupModal').classList.remove('hidden'); }
function hideSignupModal() { document.getElementById('signupModal').classList.add('hidden'); }
function showCreateEventModal() { document.getElementById('createEventModal').classList.remove('hidden'); initMap(); }
function hideCreateEventModal() { document.getElementById('createEventModal').classList.add('hidden'); if(map) map.remove(); }

// Map
function initMap() {
    if (typeof mapboxgl === 'undefined' || !window.MAPBOX_TOKEN || window.MAPBOX_TOKEN === 'YOUR_MAPBOX_TOKEN_HERE') return;
    mapboxgl.accessToken = window.MAPBOX_TOKEN;
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

// Event Detail Modal
async function loadEventDetail(eventId) {
    const res = await apiFetch(getApiUrl(API_CONFIG.endpoints.events));
    if (!res.ok) return;
    const events = await res.json();
    const event = events.find(e => e.id == eventId);
    if (!event) {
        console.warn(`Event ${eventId} not found - closing modal`);
        hideEventDetail();
        return;
    }
    
    currentDetailEvent = event;
    document.getElementById('detailTitle').innerText = event.title;
    document.getElementById('detailDesc').innerText = event.description;
    document.getElementById('detailLocation').innerText = `📍 ${event.location}`;
    document.getElementById('detailTime').innerText = `🕒 ${new Date(event.time).toLocaleString()}`;
    document.getElementById('detailParticipants').innerText = `👥 ${event.participants_count || 0}/${event.max_participants}`;
    
    const isHost = currentUser && (
        (event.created_by && event.created_by === currentUser.username) ||
        (event.creator_name && event.creator_name === currentUser.username) ||
        (event.creator_id && event.creator_id === currentUser.id)
    );
    console.log('Event creator check:', { 
        created_by: event.created_by,
        creator_name: event.creator_name, 
        creator_id: event.creator_id,
        current_username: currentUser?.username,
        current_id: currentUser?.id,
        isHost 
    });
    if (isHost) {
        console.log('User IS host - showing buttons');
        document.getElementById('detailEditBtn').classList.remove('hidden');
        document.getElementById('detailDeleteBtn').classList.remove('hidden');
    } else {
        console.log('User is NOT host - hiding buttons');
        document.getElementById('detailEditBtn').classList.add('hidden');
        document.getElementById('detailDeleteBtn').classList.add('hidden');
    }
    
    // Load participants
    const participantsRes = await apiFetch(getApiUrl(`/events/${eventId}/participants`));
    if (participantsRes.ok) {
        const participants = await participantsRes.json();
        const peopleList = document.getElementById('peopleList');
        peopleList.innerHTML = '';
        participants.forEach(person => {
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center p-2 bg-white/5 rounded';
            let content = `<span>${person.username}</span>`;
            if (isHost) {
                content += `<button class="remove-person-btn bg-red-500/70 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition"
                    data-username="${person.username}">Remove</button>`;
            }
            div.innerHTML = content;
            peopleList.appendChild(div);
        });
    }
}

function hideEventDetail() {
    document.getElementById('eventDetailModal').classList.add('hidden');
    currentDetailEvent = null;
}

// Chat Modal
async function loadChatModal(eventId) {
    currentChatEventId = eventId;
    const res = await apiFetch(getApiUrl(API_CONFIG.endpoints.events));
    if (!res.ok) return;
    const events = await res.json();
    const event = events.find(e => e.id == eventId);
    if (!event) return;
    
    document.getElementById('chatEventTitle').innerText = event.title;
    const chatContainer = document.getElementById('chatMessages');
    chatContainer.innerHTML = '';
    
    if (chatWs) chatWs.close();
    const wsUrl = `ws://localhost:8000/ws/chat/${eventId}`;
    console.log('Connecting to chat:', wsUrl);
    chatWs = new WebSocket(wsUrl);
    chatWs.onerror = (e) => {
        console.error('WebSocket error:', e);
        const errDiv = document.createElement('div');
        errDiv.className = 'p-3 border border-red-500 bg-red-500/20 text-red-200 rounded text-sm';
        errDiv.textContent = '❌ Chat connection failed. Check your server is running on port 8000.';
        chatContainer.appendChild(errDiv);
    };
    chatWs.onopen = () => {
        console.log('Chat connected successfully');
    };
    chatWs.onclose = () => {
        console.log('Chat disconnected');
    };
    chatWs.onmessage = (e) => {
        try {
            const messageData = JSON.parse(e.data);
            const msgDiv = document.createElement('div');
            msgDiv.className = 'p-2 bg-white/20 rounded shadow-sm mb-1 text-white text-sm bounce border border-white/10';
            let username = messageData.user?.username || messageData.username || '';
            let text = messageData.message || messageData.content || messageData.text || '';
            
            // Remove timestamp from text
            text = text.replace(/^\[\d{2}:\d{2}\]\s*/, '');
            
            // Extract username from text if not in JSON (format: "username: message")
            if (!username && text.includes(':')) {
                const parts = text.split(':', 2);
                username = parts[0].trim();
                text = parts[1].trim();
            }
            
            username = username || 'Anonymous';
            msgDiv.innerHTML = `<strong>${username}:</strong> ${text}`;
            chatContainer.appendChild(msgDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        } catch (err) {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'p-2 bg-white/20 rounded shadow-sm mb-1 text-white text-sm border border-white/10';
            let rawText = e.data;
            rawText = rawText.replace(/^\[\d{2}:\d{2}\]\s*/, '');
            msgDiv.textContent = rawText;
            chatContainer.appendChild(msgDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    };
}

// Events
async function loadEvents() {
    const res = await apiFetch(getApiUrl(API_CONFIG.endpoints.events));
    if (!res.ok) return;
    allEvents = await res.json();

    if (token && currentUser) {
        try {
            const joinedRes = await apiFetch(getApiUrl('/users/me/joined-events'));
            if (joinedRes.ok) {
                const joined = await joinedRes.json();
                userJoinedEvents.clear();
                if (Array.isArray(joined)) {
                    joined.forEach(e => userJoinedEvents.add(e.id));
                }
                console.log('Joined events:', userJoinedEvents);
            } else {
                console.log('No joined events endpoint');
                userJoinedEvents.clear();
            }
        } catch (e) {
            console.log('Joined events error:', e);
            userJoinedEvents.clear();
        }
    } else {
        userJoinedEvents.clear();
    }

    const container = document.getElementById('events-list');
    if (!container) return;
    
    container.innerHTML = allEvents.map(event => {
        const isJoined = userJoinedEvents.has(event.id);
        const joinedClass = isJoined ? 'event-card-joined' : '';
        return `
            <div class="bg-white/10 backdrop-blur-md rounded-xl p-5 shadow-lg transform hover:scale-105 transition-all duration-300 event-card cursor-pointer ${joinedClass}" data-id="${event.id}">
                <h3 class="text-2xl font-bold">${event.title}</h3>
                <p class="mt-2">${event.description}</p>
                <p class="mt-2 text-sm">📍 ${event.location}</p>
                <p class="mt-2 text-sm">👥 ${event.participants_count || 0}/${event.max_participants}</p>
                <p class="mt-2 text-xs text-gray-300">🕒 ${new Date(event.time).toLocaleString()}</p>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.event-card').forEach(card => {
        card.onclick = () => {
            loadEventDetail(parseInt(card.dataset.id));
            document.getElementById('eventDetailModal').classList.remove('hidden');
        };
    });
}

// Auth Handlers
document.getElementById('loginBtn').onclick = async () => {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const response = await fetch(getApiUrl(API_CONFIG.endpoints.token), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username, password })
    });
    if (response.ok) {
        const data = await response.json();
        token = data.access_token;
        localStorage.setItem('access_token', token);
        // Always set currentUser to at least have the username from login
        currentUser = { username: username };
        // Try to fetch full user data, but don't fail if endpoint doesn't exist
        const userRes = await apiFetch(getApiUrl(API_CONFIG.endpoints.me));
        if (userRes.ok) {
            currentUser = await userRes.json();
        }
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
    const response = await fetch(getApiUrl(API_CONFIG.endpoints.signup), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password })
    });
    if (response.ok) {
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

document.getElementById('profileBtn').onclick = () => {
    if (currentUser) {
        document.getElementById('profileUsername').textContent = currentUser.username || 'N/A';
        document.getElementById('profileEmail').textContent = currentUser.email || 'N/A';
        document.getElementById('profileModal').classList.remove('hidden');
    }
};

document.getElementById('closeProfileBtn').onclick = () => {
    document.getElementById('profileModal').classList.add('hidden');
};

document.getElementById('showSignup').onclick = (e) => { e.preventDefault(); hideLoginModal(); showSignupModal(); };
document.getElementById('showLogin').onclick = (e) => { e.preventDefault(); hideSignupModal(); showLoginModal(); };
document.getElementById('logo').onclick = () => loadEvents();
document.getElementById('closeDetailBtn').onclick = () => hideEventDetail();

// Modal close handlers
document.getElementById('closeProfileBtn').onclick = () => document.getElementById('profileModal').classList.add('hidden');

// Event Creation
document.getElementById('submitEventBtn').onclick = async () => {
    const title = document.getElementById('eventTitle').value;
    const description = document.getElementById('eventDesc').value;
    const location = document.getElementById('eventLocation').value;
    const max_participants = parseInt(document.getElementById('eventMaxPart').value);
    const is_private = document.getElementById('eventPrivate').checked;
    const lat = window.selectedLat || null;
    const lng = window.selectedLng || null;
    const body = { title, description, location, latitude: lat, longitude: lng, max_participants, is_private };
    const res = await apiFetch(getApiUrl(API_CONFIG.endpoints.events), { method: 'POST', body: JSON.stringify(body) });
    if (res.ok) {
        hideCreateEventModal();
        loadEvents();
    } else alert('Failed to create event');
};

document.getElementById('cancelEventBtn').onclick = () => hideCreateEventModal();

// Event Actions
document.getElementById('detailJoinBtn').onclick = async () => {
    if (!currentDetailEvent) return;
    const res = await apiFetch(getApiUrl(API_CONFIG.endpoints.eventJoin(currentDetailEvent.id)), { method: 'POST' });
    if (res.ok) {
        hideEventDetail();
        await new Promise(r => setTimeout(r, 300));
        await loadEvents();
    } else alert('Join failed');
};

document.getElementById('detailLeaveBtn').onclick = async () => {
    if (!currentDetailEvent) return;
    const res = await apiFetch(getApiUrl(API_CONFIG.endpoints.eventLeave(currentDetailEvent.id)), { method: 'POST' });
    if (res.ok) {
        hideEventDetail();
        await new Promise(r => setTimeout(r, 300));
        await loadEvents();
    } else alert('Leave failed');
};

document.getElementById('detailDeleteBtn').onclick = async () => {
    if (!currentDetailEvent) return;
    if (confirm('Delete this event?')) {
        const res = await apiFetch(getApiUrl(API_CONFIG.endpoints.eventDelete(currentDetailEvent.id)), { method: 'DELETE' });
        if (res.ok) {
            hideEventDetail();
            await new Promise(r => setTimeout(r, 300));
            await loadEvents();
        } else {
            console.error('Delete failed:', res.status, res.statusText);
            alert('Delete failed: ' + res.statusText);
        }
    }
};

document.getElementById('detailEditBtn').onclick = async () => {
    if (!currentDetailEvent) return;
    // Fill the edit form with current event data
    document.getElementById('editEventTitle2').value = currentDetailEvent.title;
    document.getElementById('editEventDesc').value = currentDetailEvent.description;
    document.getElementById('editEventLocation').value = currentDetailEvent.location;
    document.getElementById('editEventMaxPart').value = currentDetailEvent.max_participants;
    // Show edit modal
    document.getElementById('editEventModal').classList.remove('hidden');
};

// Save edited event
document.getElementById('saveEditEventBtn').onclick = async () => {
    if (!currentDetailEvent) return;
    const updates = {
        title: document.getElementById('editEventTitle2').value,
        description: document.getElementById('editEventDesc').value,
        location: document.getElementById('editEventLocation').value,
        max_participants: parseInt(document.getElementById('editEventMaxPart').value)
    };
    
    const res = await apiFetch(getApiUrl(`/events/${currentDetailEvent.id}`), {
        method: 'PUT',
        body: JSON.stringify(updates)
    });
    
    if (res.ok) {
        document.getElementById('editEventModal').classList.add('hidden');
        await new Promise(r => setTimeout(r, 300));
        await loadEvents();
        if (currentDetailEvent) {
            await loadEventDetail(currentDetailEvent.id);
            document.getElementById('eventDetailModal').classList.remove('hidden');
        }
    } else {
        alert('Failed to update event: ' + res.statusText);
    }
};

// Cancel edit
document.getElementById('cancelEditEventBtn').onclick = () => {
    document.getElementById('editEventModal').classList.add('hidden');
};

// Event delegation for remove person buttons
document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('remove-person-btn')) {
        const username = e.target.dataset.username;
        if (!confirm(`Remove ${username} from event?`)) return;
        
        const removeEndpoint = `/events/${currentDetailEvent.id}/remove-participant/${username}`;
        const res = await apiFetch(getApiUrl(removeEndpoint), { method: 'POST' });
        if (res.ok) {
            await new Promise(r => setTimeout(r, 300));
            await loadEvents();
            if (currentDetailEvent) {
                await loadEventDetail(currentDetailEvent.id);
            }
        } else {
            console.error('Remove failed:', res.status, res.statusText);
            alert('Remove failed: ' + res.statusText);
        }
    }
});

// Chat from detail modal
document.getElementById('detailChatBtn').onclick = async () => {
    if (!currentDetailEvent) return;
    if (!token) { showLoginModal(); return; }
    document.getElementById('eventDetailModal').classList.add('hidden');
    await new Promise(r => setTimeout(r, 50));
    loadChatModal(currentDetailEvent.id);
    document.getElementById('chatModal').classList.remove('hidden');
};

// Chat
document.getElementById('chatSendBtn').onclick = async () => {
    const input = document.getElementById('chatInput');
    if (!input.value.trim()) return;
    
    const username = currentUser?.username || 'Anonymous';
    const messageText = input.value;
    console.log('Sending chat message:', { username, messageText });
    
    if (chatWs && chatWs.readyState === WebSocket.OPEN) {
        chatWs.send(JSON.stringify({ message: messageText, username: username }));
    }
    
    await apiFetch(getApiUrl(API_CONFIG.endpoints.eventMessages(currentChatEventId)), {
        method: 'POST',
        body: JSON.stringify({ message: messageText })
    }).catch((e) => {
        console.error('Failed to post message:', e);
    });
    
    input.value = '';
};

document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('chatSendBtn').click();
});

document.getElementById('closeChatBtn').onclick = () => {
    if (chatWs) chatWs.close();
    document.getElementById('chatModal').classList.add('hidden');
};

document.getElementById('createEventBtn')?.addEventListener('click', () => {
    if (!token) { showLoginModal(); return; }
    showCreateEventModal();
});

// Initialize
async function init() {
    if (token) {
        try {
            const res = await apiFetch(getApiUrl(API_CONFIG.endpoints.me));
            if (res.ok) {
                currentUser = await res.json();
                console.log('User loaded:', currentUser.username);
            } else {
                console.log('User endpoint returned:', res.status);
                currentUser = null;
            }
        } catch (e) {
            console.log('Failed to load user:', e);
            currentUser = null;
        }
    }
    updateAuthUI();
    const main = document.getElementById('mainContent');
    if (main.children.length === 0) {
        main.innerHTML = `
            <div class="text-center mt-10">
                <h2 class="text-5xl font-extrabold mb-4 animate-pulse">Seize the Moment</h2>
                <p class="text-xl mb-8">Create or join spontaneous events, right now.</p>
                <button id="createEventBtn" class="px-8 py-3 bg-pink-500 rounded-full text-lg font-semibold hover:bg-pink-600 transform hover:scale-105 transition">+ Create an Event</button>
            </div>
            <div id="events-list" class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12"></div>
        `;
        document.getElementById('createEventBtn').onclick = () => {
            if (!token) { showLoginModal(); return; }
            showCreateEventModal();
        };
    }
    await loadEvents();
}

init();

init();
