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

// Βοηθητική συνάρτηση για το χρώμα του Marker στον χάρτη
function createCustomIcon(type) {
    let color = "#3b82f6"; // Προεπιλογή: Μπλε (Person)
    if (type === "Empire/State") color = "#f97316"; // Πορτοκαλί
    else if (type === "Invention") color = "#10b981"; // Πράσινο
    else if (type === "Event/War") color = "#8b5cf6"; // Μοβ
    else if (type === "Movement/Culture") color = "#ec4899"; // Ροζ

    return L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.5);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
    });
}

// 4. Προβολή Δεδομένων & Wikipedia Image
async function displayEntity(item) {
    // 1. Ενημέρωση της αριστερής κάρτας (Κείμενα από το CSV)
    const cardContent = document.getElementById('card-content');
    cardContent.innerHTML = `
        <span class="era-badge">${item.EraName || 'Ιστορική Περίοδος'}</span>
        <h2 style="color:#38bdf8; margin: 0 0 10px 0;">${item.Name}</h2>
        <p style="margin-bottom: 10px;">
            <strong>${item.CategoryName}</strong> 
            ${item.PlaceOfOrigin ? `| <span style="color:#94a3b8">${item.PlaceOfOrigin}</span>` : ''}
        </p>
        <p style="line-height: 1.5;">${item.BiographyShort}</p>
        
        <div class="contribution-box">
            <strong>Συνεισφορά:</strong> ${item.KeyContribution}
            ${item.School_Tag ? `<span class="school-tag">Σχολή/Ρεύμα: ${item.School_Tag}</span>` : ''}
        </div>
    `;

    // 2. Wikipedia Λήμμα (Αντικατάσταση της εικόνας με κείμενο)
    const wikiBody = document.getElementById('wiki-body');
    wikiBody.innerHTML = "<div style='color:var(--accent)'>Φόρτωση λήμματος Wikipedia...</div>";

    if (item.Wiki_URL) {
        // Παίρνουμε το όνομα του λήμματος από το URL (π.χ. Μέγας_Αλέξανδρος)
        const wikiTitle = item.Wiki_URL.split('/').pop();
        
        try {
            // Χρήση του MediaWiki Action API για λήψη του κειμένου (section 0 = εισαγωγή)
            const url = `https://el.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(wikiTitle)}&format=json&origin=*&prop=text&section=0`;
            
            const response = await fetch(url);
            const data = await response.json();

            if (data.parse && data.parse.text) {
                let cleanHtml = data.parse.text["*"];
                
                // Διόρθωση των links ώστε να ανοίγουν σε νέα καρτέλα
                cleanHtml = cleanHtml.replace(/href="\/wiki\//g, 'target="_blank" href="https://el.wikipedia.org/wiki/');
                
                // Προσθήκη συνδέσμου για πλήρες άρθρο στο τέλος
                const fullArticleLink = `
                    <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #334155;">
                        <a href="https://el.wikipedia.org/wiki/${wikiTitle}" target="_blank" style="color: brown; font-weight: bold; text-decoration: none;">
                            Διαβάστε ολόκληρο το άρθρο στη Wikipedia →
                        </a>
                    </div>`;
                
                if (data.parse && data.parse.text) {
                let cleanHtml = data.parse.text["*"];
                
                // Διόρθωση των links
                cleanHtml = cleanHtml.replace(/href="\/wiki\//g, 'target="_blank" href="https://el.wikipedia.org/wiki/');
                
                // Ενημέρωση του περιεχομένου
                wikiBody.innerHTML = `
                    <div class="wiki-content">
                        ${cleanHtml}
                        <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #a2a9b1;">
                            <a href="https://el.wikipedia.org/wiki/${wikiTitle}" target="_blank" style="color: brown; font-weight: bold;">
                                Διαβάστε ολόκληρο το άρθρο στη Βικιπαίδεια →
                            </a>
                        </div>
                    </div>
                `;
                
                // Αυτόματη κύλιση στην κορυφή του πλασίου κάθε φορά που αλλάζει η οντότητα
                document.getElementById('image-container').scrollTop = 0;
            } else {
                wikiBody.innerHTML = `<p>Δεν βρέθηκε λήμμα για το: <b>${item.Name}</b>.</p>`;
            }
        } catch (err) {
            wikiBody.innerHTML = "Σφάλμα κατά τη σύνδεση με την Wikipedia.";
        }
    } else {
        wikiBody.innerHTML = "Δεν υπάρχει διαθέσιμος σύνδεσμος Wikipedia για αυτή την εγγραφή.";
    }

    // 3. Χάρτης
    if (item.Coordinate_Point) {
        const coords = item.Coordinate_Point.split(',').map(Number);
        if (marker) map.removeLayer(marker);
        marker = L.marker(coords, { icon: createCustomIcon(item.EntityType) }).addTo(map);
        marker.bindPopup(`<b>${item.Name}</b>`).openPopup();
        map.flyTo(coords, 6, { animate: true, duration: 1.5 });
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
