let map;
let marker;

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadData();
    generateTimeline();
});

function initMap() {
    // Έλεγχος αν υπάρχει το div του χάρτη
    if (document.getElementById('map')) {
        map = L.map('map').setView([37.98, 23.72], 4);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map);
        
        // Διόρθωση για το γκρίζο χάρτη
        setTimeout(() => { map.invalidateSize(); }, 500);
    }
}

function loadData() {
    Papa.parse("data.csv", {
        download: true,
        header: true,
        delimiter: ";",
        skipEmptyLines: true,
        complete: function(results) {
            window.historyData = results.data;
            console.log("Data Loaded Successfully");
        }
    });
}

function generateTimeline() {
    const axis = document.getElementById('timeline-axis');
    if (!axis) return;
    for (let year = 2024; year >= -5000; year -= 100) {
        const div = document.createElement('div');
        div.className = 'year-marker';
        div.innerText = year > 0 ? year : Math.abs(year) + " π.Χ.";
        div.onclick = () => filterByYear(year, div);
        axis.appendChild(div);
    }
}

function filterByYear(year, element) {
    document.querySelectorAll('.year-marker').forEach(el => el.classList.remove('active'));
    element.classList.add('active');

    // Εύρεση εγγραφής
    const match = window.historyData.find(item => {
        const s = parseInt(item.Start_Year);
        const e = parseInt(item.End_Year) || s;
        return year >= s && year <= e;
    });

    if (match) {
        displayEntity(match);
    }
}

async function displayEntity(item) {
    const cardContent = document.getElementById('card-content');
    const imgElement = document.getElementById('entity-img');

    // 1. Ενημέρωση Κειμένων
    cardContent.innerHTML = `
        <h2 style="color:${getColor(item.EntityType)}">${item.Name}</h2>
        <p><strong>Κατηγορία:</strong> ${item.CategoryName}</p>
        <p><strong>Εποχή:</strong> ${item.EraName}</p>
        <hr>
        <p>${item.BiographyShort}</p>
        <p><em>${item.KeyContribution}</em></p>
    `;

    // 2. Αυτόματη Εικόνα από Wikipedia
    if (item.Wiki_URL) {
        const pageTitle = item.Wiki_URL.split('/').pop();
        const imageUrl = await getWikiImage(pageTitle);
        if (imageUrl) {
            imgElement.src = imageUrl;
            imgElement.style.display = "block";
        } else {
            imgElement.style.display = "none";
        }
    }

    // 3. Χάρτης
    if (item.Coordinate_Point && item.Coordinate_Point.includes(',')) {
        const [lat, lng] = item.Coordinate_Point.split(',').map(Number);
        if (marker) map.removeLayer(marker);
        marker = L.marker([lat, lng]).addTo(map);
        map.flyTo([lat, lng], 5);
    }
}

// Λειτουργία για τράβηγμα εικόνας από Wikipedia API
async function getWikiImage(title) {
    try {
        const response = await fetch(`https://el.wikipedia.org/api/rest_v1/page/summary/${title}`);
        const data = await response.json();
        return data.thumbnail ? data.thumbnail.source : null;
    } catch (e) {
        return null;
    }
}

function getColor(type) {
    const colors = { 'Person': '#3b82f6', 'Empire/State': '#ef4444', 'Event/War': '#f59e0b' };
    return colors[type] || '#10b981';
}
