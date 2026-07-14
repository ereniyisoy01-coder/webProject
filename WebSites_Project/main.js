// ================= SCENE =================
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.025);

const canvas = document.querySelector("#three-canvas");

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.z = 8;

const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// ================= MOUSE =================
const mouse = { x: 0, y: 0 };

window.addEventListener("mousemove", (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

// ================= SCROLL =================
let scrollY = 0;

window.addEventListener("scroll", () => {
    scrollY = window.scrollY;
});

// ================= STAR GENERATOR =================
function createStars(count, size, spread) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i++) {
        positions[i] = (Math.random() - 0.5) * spread;
    }

    geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
    );

    const material = new THREE.PointsMaterial({
        size: size
    });

    const stars = new THREE.Points(geometry, material);
    scene.add(stars);

    return stars;
}

// ================= STAR LAYERS =================
const starsNear = createStars(400, 0.05, 30);
const starsMid  = createStars(700, 0.03, 60);
const starsFar  = createStars(1200, 0.02, 100);

// ================= ANIMATION =================
function animate() {
    requestAnimationFrame(animate);

    // ✨ PARALLAX STAR MOVEMENT
    starsNear.rotation.y += 0.001;
    starsMid.rotation.y  += 0.0006;
    starsFar.rotation.y  += 0.0003;

    starsNear.rotation.x += 0.0003;
    starsMid.rotation.x  += 0.0002;
    starsFar.rotation.x  += 0.0001;

    // 🎥 CINEMATIC CAMERA
    const targetZ = 8 - scrollY * 0.005;

    camera.position.z += (targetZ - camera.position.z) * 0.05;
    camera.position.x += (mouse.x * 1.5 - camera.position.x) * 0.03;
    camera.position.y += (mouse.y * 1.5 - camera.position.y) * 0.03;

    camera.lookAt(scene.position);

    renderer.render(scene, camera);
}

animate();

// ================= CARD INTERACTION =================
const cards = document.querySelectorAll(".project-card");

cards.forEach(card => {

    card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const rotateX = -(y - rect.height / 2) / 10;
        const rotateY = (x - rect.width / 2) / 10;

        card.style.transform = `
            rotateX(${rotateX}deg)
            rotateY(${rotateY}deg)
            scale(1.03)
        `;

        card.style.setProperty("--x", `${x}px`);
        card.style.setProperty("--y", `${y}px`);
    });

    card.addEventListener("mouseleave", () => {
        card.style.transform = "rotateX(0) rotateY(0) scale(1)";
    });

});