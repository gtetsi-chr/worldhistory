let map;
let marker;
window.historyData = [];

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadCSV();
});

function initMap() {
    map = L.map('map').setView([37.98, 23.72], 4);

    // ΕΠΙΛΟΓΗ 1: Standard OpenStreetMap (Αυτή που ζήτησες)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    /* --- ΑΛΛΕΣ ΕΠΙΛΟΓΕΣ (Βγάλε τα // για να τις ενεργοποιήσεις) --- */
    
    // ΕΠΙΛΟΓΗ 2: Ανάγλυφο (OpenTopoMap)
    // L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png').addTo(map);
    
    // ΕΠΙΛΟΓΗ 3: Μοντέρνο γκρι (CartoDB Positron)
    // L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(map);
    
    // ΕΠΙΛΟΓΗ 4: Δορυφόρος (Esri World Imagery)
    // L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(map);

    // Επιλογή 5: CartoDB Dark (Για dark mode)
    // L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);;
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

    // Επιλογή του tooltip element
    const tooltip = document.getElementById('custom-tooltip');

    window.historyData.forEach((item, index) => {
        const div = document.createElement('div');
        
        // Καθορισμός κλάσης χρώματος βάσει EntityType
        let typeClass = "";
        if (item.EntityType === "Person") typeClass = "marker-person";
        else if (item.EntityType === "Empire/State") typeClass = "marker-empire";
        else if (item.EntityType === "Invention") typeClass = "marker-invention";
        else if (item.EntityType === "Event/War") typeClass = "marker-event";
        else if (item.EntityType === "Movement/Culture") typeClass = "marker-culture";

        div.className = `year-marker ${typeClass}`;
        
        const yearVal = parseInt(item.Start_Year);
        const yearText = yearVal > 0 ? yearVal : Math.abs(yearVal) + " π.Χ.";

        // Προσθήκη του span class="dot" για το κυκλάκι
        div.innerHTML = `
            <span class="dot"></span>
            <div class="marker-info">
                <div class="year-number">${yearText}</div>
                <div class="entity-name-preview">${item.Name}</div>
            </div>
        `;

        // --- ΜΗΧΑΝΙΣΜΟΣ TOOLTIP ---
        let tooltipTimeout;

        div.addEventListener('mouseenter', (e) => {
            // Εμφάνιση μετά από 0.5 δευτερόλεπτο hover
            tooltipTimeout = setTimeout(async () => {
                let imgHtml = "";
                
                // Προσπάθεια λήψης εικόνας από Wikipedia για το tooltip
                if (item.Wiki_URL) {
                    const title = item.Wiki_URL.split('/').pop();
                    try {
                        const res = await fetch(`https://el.wikipedia.org/api/rest_v1/page/summary/${title}`);
                        const data = await res.json();
                        if (data.thumbnail) {
                            imgHtml = `<img src="${data.thumbnail.source}" style="width:100%; height:100px; object-fit:cover; border-radius:4px; margin-bottom:5px;">`;
                        }
                    } catch(err) {}
                }

                tooltip.innerHTML = `
                    ${imgHtml}
                    <strong style="color:var(--accent); display:block;">${item.Name}</strong>
                    <small style="color:#94a3b8; line-height:1.2;">${item.BiographyShort.substring(0, 80)}...</small>
                `;

                tooltip.style.display = 'block';
                tooltip.style.top = (e.clientY + 15) + 'px';
                tooltip.style.left = (e.clientX + 15) + 'px';
                tooltip.style.opacity = '1';
            }, 500);
        });

        div.addEventListener('mousemove', (e) => {
            // Το tooltip ακολουθεί το ποντίκι
            tooltip.style.top = (e.clientY + 15) + 'px';
            tooltip.style.left = (e.clientX + 15) + 'px';
        });

        div.addEventListener('mouseleave', () => {
            clearTimeout(tooltipTimeout);
            tooltip.style.display = 'none';
            tooltip.style.opacity = '0';
        });
        // --- ΤΕΛΟΣ ΜΗΧΑΝΙΣΜΟΥ TOOLTIP ---

        div.addEventListener('click', () => {
            document.querySelectorAll('.year-marker').forEach(el => el.classList.remove('active'));
            div.classList.add('active');
            displayEntity(item);
        });

        axis.appendChild(div);

        if (index === 0) div.click(); 
    });
}

// Συνάρτηση για τη δημιουργία χρωματιστού Icon ανάλογα με το EntityType
function createCustomIcon(type) {
    let color = "#3b82f6"; // Default blue
    if (type === "Empire/State") color = "#f97316";
    if (type === "Invention") color = "#10b981";
    if (type === "Event/War") color = "#8b5cf6";
    if (type === "Movement/Culture") color = "#ec4899";

    return L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
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

// Λειτουργία Αναζήτησης μέσα στο Χρονολόγιο
document.getElementById('timelineSearch').addEventListener('input', function(e) {
    const term = e.target.value.toLowerCase(); // Τι έγραψε ο χρήστης
    const markers = document.querySelectorAll('.year-marker');

    markers.forEach(marker => {
        const name = marker.querySelector('.entity-name-preview').innerText.toLowerCase();
        const year = marker.querySelector('.year-number').innerText.toLowerCase();
        
        // Αν το όνομα ή η χρονιά περιλαμβάνουν αυτό που γράψαμε
        if (name.includes(term) || year.includes(term)) {
            marker.classList.remove('hidden'); // Δείξε το
        } else {
            marker.classList.add('hidden'); // Κρύψτο
        }
    });
});
