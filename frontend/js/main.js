import * as THREE from 'three';

// Setup scene, camera, renderer
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

// Particle system
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

// Fetch events from backend
async function loadEvents() {
    try {
        const res = await fetch('http://localhost:8000/events/');
        const events = await res.json();
        const container = document.getElementById('events-list');
        container.innerHTML = events.map(event => `
            <div class="bg-white/10 backdrop-blur-md rounded-xl p-5 shadow-lg transform hover:scale-105 transition-all duration-300">
                <h3 class="text-2xl font-bold">${event.title}</h3>
                <p class="mt-2">${event.description}</p>
                <p class="mt-2 text-sm">📍 ${event.location}</p>
                <p class="mt-2 text-xs text-gray-300">🕒 ${new Date(event.time).toLocaleString()}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error("Error loading events:", error);
        document.getElementById('events-list').innerHTML = '<p class="text-center text-red-400">Could not load events. Make sure the backend is running.</p>';
    }
}

loadEvents();