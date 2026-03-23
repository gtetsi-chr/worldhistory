let map;
let marker;
window.historyData = [];

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadCSV();
});

// 1. Ρυθμίσεις Χάρτη (Ελληνικά & Ανάγλυφο)
function initMap() {
    const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM' });
    const relief = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { attribution: '© OpenTopoMap' });
    const modern = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '© CartoDB' });

    map = L.map('map', {
        center: [37.98, 23.72],
        zoom: 4,
        layers: [relief] // Προεπιλογή το Ανάγλυφο
    });

    const baseMaps = { "Ανάγλυφο": relief, "Οδοί": streets, "Μοντέρνο": modern };
    L.control.layers(baseMaps).addTo(map);
}

// 2. Φόρτωση και Ταξινόμηση Δεδομένων
function loadCSV() {
    Papa.parse("data.csv", {
        download: true,
        header: true,
        delimiter: ";",
        skipEmptyLines: true,
        complete: function(results) {
            // Ταξινόμηση: Το "σήμερα" πάνω, το 5000 π.Χ. κάτω
            window.historyData = results.data.sort((a, b) => {
                return parseInt(b.Start_Year) - parseInt(a.Start_Year);
            });
            console.log("Data Loaded & Sorted:", window.historyData.length);
            generateTimeline(); 
        }
    });
}

// 3. Δημιουργία Timeline (Μόνο οι εγγραφές του CSV)
function generateTimeline() {
    const axis = document.getElementById('timeline-axis');
    axis.innerHTML = ""; 

    window.historyData.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'year-marker';
        
        const yearVal = parseInt(item.Start_Year);
        const yearText = yearVal > 0 ? yearVal : Math.abs(yearVal) + " π.Χ.";

        div.innerHTML = `
            <div class="year-number">${yearText}</div>
            <div class="entity-name-preview">${item.Name}</div>
        `;

        div.addEventListener('click', () => {
            // Αφαίρεση προηγούμενου active
            document.querySelectorAll('.year-marker').forEach(el => el.classList.remove('active'));
            div.classList.add('active');
            displayEntity(item);
        });

        axis.appendChild(div);

        // Προβολή του πρώτου στοιχείου αυτόματα στην αρχή
        if (index === 0) div.click();
    });
}

// 4. Προβολή Δεδομένων & Wikipedia Image
async function displayEntity(item) {
    // Ενημέρωση Κειμένων
    document.getElementById('card-content').innerHTML = `
        <h2 style="color:#38bdf8">${item.Name}</h2>
        <p><strong>${item.EraName}</strong> | ${item.CategoryName}</p>
        <p>${item.BiographyShort}</p>
        <div style="margin-top:15px; padding-top:10px; border-top:1px solid #334155; font-size:0.9rem;">
            <strong>Συνεισφορά:</strong> ${item.KeyContribution}
        </div>
    `;

    // Εικόνα Wikipedia
    const img = document.getElementById('entity-img');
    const loader = document.getElementById('img-loader');
    img.style.display = "none";
    loader.style.display = "block";
    loader.innerText = "Αναζήτηση εικόνας...";

    if (item.Wiki_URL) {
        const title = item.Wiki_URL.split('/').pop();
        try {
            const response = await fetch(`https://el.wikipedia.org/api/rest_v1/page/summary/${title}`);
            const data = await response.json();
            if (data.thumbnail) {
                img.src = data.thumbnail.source;
                img.style.display = "block";
                loader.style.display = "none";
            } else {
                loader.innerText = "Δεν βρέθηκε εικόνα";
            }
        } catch (e) {
            loader.innerText = "Σφάλμα Wiki";
        }
    }

    // Χάρτης
    if (item.Coordinate_Point) {
        const coords = item.Coordinate_Point.split(',').map(Number);
        if (marker) map.removeLayer(marker);
        marker = L.marker(coords).addTo(map);
        map.flyTo(coords, 6);
    }
}
