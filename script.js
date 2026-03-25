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
    
	window.currentSelectedEntity = item; // Αποθήκευση του τρέχοντος αντικειμένου για την AI
	
    // 1. Ενημέρωση Αριστερής Κάρτας (CSV Data)
	const cardContent = document.getElementById('card-content');
    
    // Λήψη εικόνας από Wikipedia (όπως στο tooltip)
    let wikiImg = ""; 
    if (item.Wiki_URL) {
        const title = item.Wiki_URL.split('/').pop();
        try {
            const res = await fetch(`https://el.wikipedia.org/api/rest_v1/page/summary/${title}`);
            const data = await res.json();
            if (data.thumbnail) wikiImg = data.thumbnail.source;
        } catch(e) {}
    }

    // Βοηθητική συνάρτηση για να ελέγχουμε αν ένα πεδίο έχει έγκυρη τιμή
    const hasValue = (val) => val && val !== "NULL" && val !== "";

    // Χτίσιμο του HTML δυναμικά
    let html = `
        <div class="entity-card-v2">
            <div class="card-main-row">
                ${wikiImg ? `<img src="${wikiImg}" class="entity-img-v2">` : ''}
                <div class="entity-header-info">
                    ${hasValue(item.EraName) ? `<span class="era-badge-v2">${item.EraName}</span>` : ''}
                    <h2 class="entity-name-v2">${item.Name}</h2>
                    <p class="entity-type-v2">${item.EntityType} 
                        ${hasValue(item.Category_Lvl1) ? `• ${item.Category_Lvl1}` : ''}
                        ${hasValue(item.Category_Lvl2) ? ` (${item.Category_Lvl2})` : ''}
                    </p>
                    <p class="entity-years-v2">
                        ${item.Start_Year} ${parseInt(item.Start_Year) < 0 ? 'π.Χ.' : ''} 
                        — 
                        ${item.End_Year} ${parseInt(item.End_Year) < 0 ? 'π.Χ.' : ''}
                    </p>
                </div>
            </div>

            <div class="entity-bio-v2">
                ${hasValue(item.BiographyShort) ? `<p>${item.BiographyShort}</p>` : ''}
            </div>
    `;

    // Ειδικά πεδία ΜΟΝΟ για Πρόσωπα (Person)
    if (item.EntityType === "Person") {
        html += `<div class="person-extra-info">`;
        
        if (hasValue(item.CategoryName)) html += `<p><strong>Ιδιότητα:</strong> ${item.CategoryName}</p>`;
        if (hasValue(item.Gender)) html += `<p><strong>Φύλο:</strong> ${item.Gender}</p>`;
        if (hasValue(item.PlaceOfOrigin)) html += `<p><strong>Τόπος Καταγωγής:</strong> ${item.PlaceOfOrigin}</p>`;
        if (hasValue(item.Start_Date)) html += `<p><strong>Ημ/νία Γέννησης:</strong> ${item.Start_Date}</p>`;
        if (hasValue(item.End_Date)) html += `<p><strong>Ημ/νία Θανάτου:</strong> ${item.End_Date}</p>`;
        if (hasValue(item.School_Tag)) html += `<p><strong>Σχολή/Ρεύμα:</strong> ${item.School_Tag}</p>`;
        
        html += `</div>`;
    }

    // Συνεισφορά (για όλους αν υπάρχει)
    if (hasValue(item.KeyContribution)) {
        html += `
            <div class="contribution-v2">
                <strong>Κύρια Συνεισφορά:</strong>
                <p>${item.KeyContribution}</p>
            </div>
        `;
    }

    html += `</div>`; // Κλείσιμο κεντρικού div
    cardContent.innerHTML = html;
    
    // 2. Wikipedia 
    const wikiIntro = document.getElementById('wiki-intro');
    const wikiFullContent = document.getElementById('wiki-full-content');
    const showMoreBtn = document.getElementById('show-more-wiki');
    const topLink = document.getElementById('wiki-top-link');
    
    // ΠΛΗΡΗΣ ΕΠΑΝΑΦΟΡΑ: Καθαρίζουμε τα πάντα πριν τη νέα αναζήτηση
    wikiIntro.innerHTML = "Αναζήτηση στην Wikipedia...";
    wikiIntro.style.display = "block"; // Επαναφορά εμφάνισης εισαγωγής
    wikiFullContent.innerHTML = "";
    wikiFullContent.style.display = "none";
    
    showMoreBtn.innerText = "Δείξε περισσότερα"; // Επαναφορά κειμένου κουμπιού
    showMoreBtn.style.display = "none";

    if (item.Wiki_URL) {
        const urlParts = item.Wiki_URL.split('/');
        const wikiTitle = urlParts[urlParts.length - 1];
        
        if (topLink) {
            topLink.href = `https://el.wikipedia.org/wiki/${wikiTitle}`;
            topLink.style.display = "block";
        }

        try {
			// Φέρνουμε πρώτα την εισαγωγή (Section 0)
            const url = `https://el.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(wikiTitle)}&format=json&origin=*&prop=text&section=0`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.parse && data.parse.text) {
                let cleanHtml = data.parse.text["*"];
                cleanHtml = cleanHtml.replace(/href="\/wiki\//g, 'target="_blank" href="https://el.wikipedia.org/wiki/');
                
				// Χρήση της εικόνας που ήδη βρήκαμε για το tooltip (αν υπάρχει) ή από το CSV
                let imgHtml = "";
                if (item.Image_Path) {
                    imgHtml = `<img src="${item.Image_Path}" class="wiki-main-img" style="float:right; margin:10px; max-width:120px;" onerror="this.style.display='none'">`;
                }

                wikiIntro.innerHTML = `<div class="wiki-content">${imgHtml}${cleanHtml}</div>`;
                showMoreBtn.style.display = "block";

                // Λειτουργία κουμπιού "Δείξε περισσότερα"
                showMoreBtn.onclick = async () => {
                    showMoreBtn.innerText = "Φόρτωση...";
                    try {
						// Φέρνουμε ΟΛΟ το κείμενο εκτός από το section 0 που ήδη έχουμε
                        const fullUrl = `https://el.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(wikiTitle)}&format=json&origin=*&prop=text&mobileformat=1`;
                        const fullRes = await fetch(fullUrl);
                        const fullData = await fullRes.json();
                        
                        let fullHtml = fullData.parse.text["*"];
                        fullHtml = fullHtml.replace(/href="\/wiki\//g, 'target="_blank" href="https://el.wikipedia.org/wiki/');
                        
                        // Απόκρυψη εισαγωγής και εμφάνιση πλήρους κειμένου
                        wikiIntro.style.display = "none";
                        wikiFullContent.innerHTML = `<div class="wiki-content">${fullHtml}</div>`;
                        wikiFullContent.style.display = "block";
                        showMoreBtn.style.display = "none";
                    } catch (err) {
                        showMoreBtn.innerText = "Σφάλμα φόρτωσης";
                        console.error("Wiki Full Load Error:", err);
                    }
                };

				// Scroll στην κορυφή
                document.getElementById('image-container').scrollTop = 0;
            } else {
                wikiIntro.innerHTML = "Δεν βρέθηκε λήμμα στη Βικιπαίδεια.";
            }
        } catch (err) {
            wikiIntro.innerHTML = "Σφάλμα σύνδεσης με τη Βικιπαίδεια.";
        }
    }

    // 3. Χάρτης
    if (item.Coordinate_Point) {
        const coords = item.Coordinate_Point.split(',').map(Number);
        if (marker) map.removeLayer(marker);
        marker = L.marker(coords, { icon: createCustomIcon(item.EntityType) }).addTo(map);
        marker.bindPopup(`<b>${item.Name}</b>`).openPopup();
        map.flyTo(coords, 6, { animate: true, duration: 1.5 });
    }

	// 4. ΕΝΗΜΕΡΩΣΗ AI ZONE
    const aiTitle = document.querySelector('.ai-zone h3');
    const chatBox = document.getElementById('chat-box');

    // Καθαρισμός της συνομιλίας όταν αλλάζει η οντότητα
    chatBox.innerHTML = ''; 

    // Δυναμικός Τίτλος: "Ρώτησε την [Name]" αν είναι πρόσωπο, αλλιώς "Ρώτησε την AI"
    if (item.EntityType === 'Person') {
        aiTitle.innerHTML = `🤖 Ρώτησε τον/την <span style="color:var(--accent);">${item.Name}</span>`;
    } else {
        aiTitle.innerHTML = `🤖 Ρώτησε την AI`;
    }
    // Κρατάμε το item global για να το βλέπει η callAI()
    window.currentSelectedEntity = item;

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
// --- ΛΕΙΤΟΥΡΓΙΑ AI CHATBOX ---

// Μεταβλητή για να ξέρουμε ποιο entity είναι επιλεγμένο αυτή τη στιγμή
let currentSelectedEntity = null;

// Ενημέρωση της currentSelectedEntity όταν επιλέγεται κάτι (θα το βάλουμε μέσα στην displayEntity αργότερα)
async function callAI() {
    const inputField = document.getElementById('ai-input');
    const chatBox = document.getElementById('chat-box');
    const question = inputField.value.trim();

    if (!question) return;
    if (!window.currentSelectedEntity) {
        chatBox.innerHTML += `<p style="color:orange;">⚠️ Παρακαλώ επιλέξτε πρώτα ένα πρόσωπο ή γεγονός από το χρονολόγιο.</p>`;
        return;
    }

    // Εμφάνιση ερώτησης χρήστη
    chatBox.innerHTML += `<p><strong>Εσείς:</strong> ${question}</p>`;
    inputField.value = ""; // Καθαρισμός input
    
    // Εμφάνιση "Σκέφτεται..."
    const loadingId = "loading-" + Date.now();
    chatBox.innerHTML += `<p id="${loadingId}" style="color:var(--accent);">🤖 Η AI σκέφτεται...</p>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const WORKER_URL = "https://history.gtetsi.workers.dev"; // Π.χ. https://...workers.dev

        const response = await fetch(WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                question: question,
                entityName: window.currentSelectedEntity.Name,
                context: window.currentSelectedEntity.BiographyShort + " " + window.currentSelectedEntity.KeyContribution
            })
        });

        const data = await response.json();
        
        // Αφαίρεση του "Σκέφτεται..." και εμφάνιση απάντησης
        document.getElementById(loadingId).remove();
        chatBox.innerHTML += `<p><strong>🤖 AI:</strong> ${data.text}</p>`;
        chatBox.scrollTop = chatBox.scrollHeight;

    } catch (err) {
        document.getElementById(loadingId).innerText = "❌ Σφάλμα σύνδεσης με την AI.";
    }
}

// Event Listeners για το κουμπί και το Enter
document.getElementById('send-ai-btn').addEventListener('click', callAI);
document.getElementById('ai-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') callAI();
});
