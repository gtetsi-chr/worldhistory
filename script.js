let map;
let marker;

// 1. Αρχικοποίηση Χάρτη
function initMap() {
    map = L.map('map').setView([37.98, 23.72], 4); // Κέντρο Ελλάδα
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadData();
    generateTimeline();
});

// 2. Φόρτωση CSV (Πρόσεξε το delimiter ;)
function loadData() {
    Papa.parse("data.csv", {
        download: true,
        header: true,
        delimiter: ";",
        complete: function(results) {
            window.historyData = results.data;
            console.log("Data loaded");
        }
    });
}

// 3. Δημιουργία Timeline
function generateTimeline() {
    const axis = document.getElementById('timeline-axis');
    for (let year = 2024; year >= -5000; year -= 100) {
        const div = document.createElement('div');
        div.className = 'year-marker';
        div.innerText = year > 0 ? year : Math.abs(year) + " π.Χ.";
        div.onclick = () => filterByYear(year, div);
        axis.appendChild(div);
    }
}

// 4. Φιλτράρισμα & Εμφάνιση
function filterByYear(year, element) {
    // Active class στο timeline
    document.querySelectorAll('.year-marker').forEach(el => el.classList.remove('active'));
    element.classList.add('active');

    const match = window.historyData.find(item => {
        const s = parseInt(item.Start_Year);
        const e = parseInt(item.End_Year) || s;
        return year >= s && year <= e;
    });

    if (match) displayEntity(match);
}

function displayEntity(item) {
    // 1. Ενημέρωση Κειμένων
    document.getElementById('card-content').innerHTML = `
        <h2 style="color:${getColor(item.EntityType)}">${item.Name}</h2>
        <p><strong>Περίοδος:</strong> ${item.EraName}</p>
        <p>${item.BiographyShort}</p>
    `;

    // 2. Εικόνα
    const img = document.getElementById('entity-img');
    if (item.Image_Path) {
        img.src = item.Image_Path;
        img.style.display = "block";
    }

    // 3. Χάρτης (Coordinate_Point: "lat, long")
    if (item.Coordinate_Point) {
        const coords = item.Coordinate_Point.split(',');
        const lat = parseFloat(coords[0]);
        const lng = parseFloat(coords[1]);
        if (marker) map.removeLayer(marker);
        marker = L.marker([lat, lng]).addTo(map);
        map.flyTo([lat, lng], 5);
    }
}

// Βοηθητική συνάρτηση για χρώματα
function getColor(type) {
    if (type === 'Person') return '#3b82f6';
    if (type === 'Empire/State') return '#ef4444';
    return '#10b981';
}
