// --- ΓΕΝΙΚΕΣ ΜΕΤΑΒΛΗΤΕΣ (Global Variables) ---
let map; // Ο χάρτης Leaflet
let marker; // Το σημάδι (καρφίτσα) πάνω στον χάρτη
window.historyData = []; // Εδώ αποθηκεύονται όλα τα δεδομένα από το CSV
window.currentSelectedEntity = null; // Η οντότητα που έχει επιλέξει ο χρήστης αυτή τη στιγμή

// Περιμένουμε να φορτώσει η σελίδα πριν ξεκινήσουμε
document.addEventListener('DOMContentLoaded', () => {
    initMap(); // Δημιουργία χάρτη
    loadCSV(); // Φόρτωση δεδομένων
    setupEventListeners(); // Ενεργοποίηση κουμπιών (Search, AI κλπ)
});

// 1. Αρχικοποίηση του Χάρτη
function initMap() {
    map = L.map('map', { scrollWheelZoom: false }).setView([37.98, 23.72], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);
}

// 2. Φόρτωση και Ταξινόμηση Δεδομένων από το data.csv
function loadCSV() {
    Papa.parse("data.csv", {
        download: true,
        header: true,
        delimiter: ";",
        skipEmptyLines: true,
        complete: function(results) {
            // Ταξινομούμε τα δεδομένα: Τα πιο πρόσφατα έτη (π.χ. 2024) εμφανίζονται πρώτα
            window.historyData = results.data.sort((a, b) => {
                return parseInt(b.Start_Year) - parseInt(a.Start_Year);
            });
            console.log("Δεδομένα φορτώθηκαν:", window.historyData.length);
            generateTimeline(); 
        }
    });
}

// 3. Δημιουργία της λίστας στο αριστερό Timeline
function generateTimeline() {
    const axis = document.getElementById('timeline-axis');
    const tooltip = document.getElementById('custom-tooltip');
    axis.innerHTML = ""; 

    window.historyData.forEach((item, index) => {
        const div = document.createElement('div');
        
        // Απόδοση χρώματος ανάλογα με το είδος (Person, Empire κλπ)
        let typeClass = "";
        if (item.EntityType === "Person") typeClass = "marker-person";
        else if (item.EntityType === "Empire/State") typeClass = "marker-empire";
        else if (item.EntityType === "Invention") typeClass = "marker-invention";
        else if (item.EntityType === "Event/War") typeClass = "marker-event";
        else if (item.EntityType === "Movement/Culture") typeClass = "marker-culture";

        div.className = `year-marker ${typeClass}`;

		div.setAttribute('data-rank', item.Rank); // Αποθηκεύουμε το Rank από το CSV στο marker
        
        const yearVal = parseInt(item.Start_Year);
        const yearText = yearVal > 0 ? yearVal : Math.abs(yearVal) + " π.Χ.";

        div.innerHTML = `
            <span class="dot"></span>
            <div class="marker-info">
                <div class="year-number">${yearText}</div>
                <div class="entity-name-preview">${item.Name}</div>
            </div>
        `;

        // Λειτουργία Tooltip (εμφάνιση περίληψης στο hover)
        let tooltipTimeout;
        div.addEventListener('mouseenter', (e) => {
            tooltipTimeout = setTimeout(async () => {
                let imgHtml = "";
                // Φέρνουμε μια μικρογραφία από την Wikipedia αν υπάρχει URL
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

                tooltip.innerHTML = `${imgHtml}<strong>${item.Name}</strong><br><small>${item.BiographyShort.substring(0, 80)}...</small>`;
                tooltip.style.display = 'block';
                tooltip.style.top = (e.clientY + 15) + 'px';
                tooltip.style.left = (e.clientX + 15) + 'px';
                tooltip.style.opacity = '1';
            }, 500);
        });

        div.addEventListener('mouseleave', () => {
            clearTimeout(tooltipTimeout);
            tooltip.style.display = 'none';
        });

        // Όταν κάνουμε κλικ, δείχνουμε όλες τις πληροφορίες στο κέντρο
        div.addEventListener('click', () => {
            document.querySelectorAll('.year-marker').forEach(el => el.classList.remove('active'));
            div.classList.add('active');
            displayEntity(item);
        });

        axis.appendChild(div);
        if (index === 0) div.click(); // Επιλογή του πρώτου στοιχείου αυτόματα
    });

	updateZoomAndRank(); // Πρόσθεσε αυτή τη γραμμή εδώ για να "φιλτραριστούν" αμέσως τα Rank!
}

// 4. Εμφάνιση των στοιχείων της επιλεγμένης οντότητας
async function displayEntity(item) {
	window.currentSelectedEntity = item; // Ενημέρωση της "παγκόσμιας" μεταβλητής για την AI
	
    const cardContent = document.getElementById('card-content');
    
    // Προσπάθεια λήψης εικόνας
    let wikiImg = ""; 
    if (item.Wiki_URL) {
        const title = item.Wiki_URL.split('/').pop();
        try {
            const res = await fetch(`https://el.wikipedia.org/api/rest_v1/page/summary/${title}`);
            const data = await res.json();
            if (data.thumbnail) wikiImg = data.thumbnail.source;
        } catch(e) {}
    }

    // Κατασκευή του HTML για την κεντρική κάρτα
    const hasValue = (val) => val && val !== "NULL" && val !== "";

    let html = `
        <div class="entity-card-v2">
            <div class="card-main-row">
                ${wikiImg ? `<img src="${wikiImg}" class="entity-img-v2">` : ''}
                <div class="entity-header-info">
                    ${hasValue(item.EraName) ? `<span class="era-badge-v2">${item.EraName}</span>` : ''}
                    <h2 class="entity-name-v2">${item.Name}</h2>
                    <p class="entity-type-v2">${item.EntityType} • ${item.Category_Lvl1}</p>
                    <p class="entity-years-v2">${item.Start_Year} — ${item.End_Year}</p>
                </div>
            </div>
            <div class="entity-bio-v2"><p>${item.BiographyShort}</p></div>
    `;

    // Αν είναι πρόσωπο, δείξε επιπλέον στοιχεία (Ιδιότητα, Καταγωγή κλπ)
    if (item.EntityType === "Person") {
        html += `<div class="person-extra-info">`;
        if (hasValue(item.CategoryName)) html += `<p><strong>Ιδιότητα:</strong> ${item.CategoryName}</p>`;
        if (hasValue(item.PlaceOfOrigin)) html += `<p><strong>Καταγωγή:</strong> ${item.PlaceOfOrigin}</p>`;
        html += `</div>`;
    }

    if (hasValue(item.KeyContribution)) {
        html += `<div class="contribution-v2"><strong>Συνεισφορά:</strong><p>${item.KeyContribution}</p></div>`;
    }

    html += `</div>`;
    cardContent.innerHTML = html;
    
    // --- Ενημέρωση Wikipedia & Χάρτη ---
    updateWikipediaSection(item);
    updateMapMarker(item);

	// Ενημέρωση τίτλου AI
	const aiTitle = document.getElementById('ai-title');
    if (aiTitle) {
        aiTitle.innerHTML = item.EntityType === 'Person' 
            ? `🤖 Ρώτησε τον <span style="color:var(--accent);">${item.Name}</span>` 
            : `🤖 Ρώτησε την AI`;
    }
    document.getElementById('chat-box').innerHTML = ''; // Καθαρισμός προηγούμενου chat
}

// 5. Λειτουργία Wikipedia (Απομονωμένη για καθαρό κώδικα)
async function updateWikipediaSection(item) {
    const wikiIntro = document.getElementById('wiki-intro');
    const wikiFullContent = document.getElementById('wiki-full-content');
    const showMoreBtn = document.getElementById('show-more-wiki');
    const topLink = document.getElementById('wiki-top-link');

    wikiIntro.innerHTML = "Αναζήτηση στην Wikipedia...";
    wikiFullContent.style.display = "none";
    showMoreBtn.style.display = "none";

    if (item.Wiki_URL) {
        const wikiTitle = item.Wiki_URL.split('/').pop();
        topLink.href = `https://el.wikipedia.org/wiki/${wikiTitle}`;
        topLink.style.display = "block";

        try {
            const url = `https://el.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(wikiTitle)}&format=json&origin=*&prop=text&section=0`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.parse) {
                wikiIntro.innerHTML = `<div class="wiki-content">${data.parse.text["*"]}</div>`;
                showMoreBtn.style.display = "block";
                showMoreBtn.onclick = async () => {
                    const fullUrl = `https://el.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(wikiTitle)}&format=json&origin=*&prop=text`;
                    const fullRes = await fetch(fullUrl);
                    const fullData = await fullRes.json();
                    wikiIntro.style.display = "none";
                    wikiFullContent.innerHTML = `<div class="wiki-content">${fullData.parse.text["*"]}</div>`;
                    wikiFullContent.style.display = "block";
                    showMoreBtn.style.display = "none";
                };
            }
        } catch (err) { wikiIntro.innerHTML = "Δεν βρέθηκε λήμμα."; }
    }
}

// 6. Ενημέρωση Χάρτη
function updateMapMarker(item) {
    if (item.Coordinate_Point) {
        const coords = item.Coordinate_Point.split(',').map(Number);
        if (marker) map.removeLayer(marker);
        marker = L.marker(coords, { icon: createCustomIcon(item.EntityType) }).addTo(map);
        map.flyTo(coords, 6, { animate: true, duration: 1.5 });
    }
}

// 7. Βοηθητική συνάρτηση για το εικονίδιο του χάρτη
function createCustomIcon(type) {
    let color = "#3b82f6";
    if (type === "Empire/State") color = "#f97316";
    else if (type === "Invention") color = "#10b981";
    return L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white;"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
    });
}

// 8. Λειτουργία AI
// 8. Λειτουργία AI (Εμπλουτισμένο Context)
async function callAI() {
    const inputField = document.getElementById('ai-input');
    const chatBox = document.getElementById('chat-box');
    const question = inputField.value.trim();

    if (!question || !window.currentSelectedEntity) return;

    const entity = window.currentSelectedEntity; // Για ευκολία

    // Εμφάνιση ερώτησης χρήστη
    chatBox.innerHTML += `<p><strong>Εσείς:</strong> ${question}</p>`;
    inputField.value = ""; 
    
    const loadingId = "loading-" + Date.now();
    chatBox.innerHTML += `<p id="${loadingId}" style="color:var(--accent);">🤖 Σκέφτομαι...</p>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    // Εμπλουτισμός του Context με όλα τα διαθέσιμα πεδία από το CSV
    const enrichedContext = `
        Όνομα: ${entity.Name}
        Τύπος: ${entity.EntityType}
        Εποχή/Περίοδος: ${entity.EraName || 'Άγνωστη'}
        Χρονολογία: ${entity.Start_Year} έως ${entity.End_Year}
        Ιδιότητα: ${entity.CategoryName || ''}
        Σχολή/Ρεύμα: ${entity.School_Tag || ''}
        Βιογραφικό: ${entity.BiographyShort}
        Κύρια Συνεισφορά & Έργα: ${entity.KeyContribution || ''}
        Περιοχή: ${entity.PlaceOfOrigin || ''}
    `.trim();

    try {
        const response = await fetch("https://history.gtetsi.workers.dev/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                question: question,
                entityName: entity.Name,
                context: enrichedContext // Στέλνουμε το νέο, αναλυτικό context
            })
        });
        
        const data = await response.json();
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.remove();

        chatBox.innerHTML += `<p><strong>🤖 AI:</strong> ${data.text}</p>`;
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (err) {
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) loadingEl.innerText = "❌ Σφάλμα σύνδεσης με την AI.";
    }
}

// 9. Συγκεντρωτικοί Listeners για τα κουμπιά
function setupEventListeners() {
    // Αναζήτηση στο Timeline
    document.getElementById('timelineSearch').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.year-marker').forEach(marker => {
            const name = marker.querySelector('.entity-name-preview').innerText.toLowerCase();
            const year = marker.querySelector('.year-number').innerText.toLowerCase();
            marker.classList.toggle('hidden', !name.includes(term) && !year.includes(term));
        });
    });

document.getElementById('timelineSearch').addEventListener('input', applyFilters);

    // Κουμπιά Φίλτρων
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Αν πατηθεί το ήδη ενεργό, το απενεργοποιούμε
            if (btn.classList.contains('active')) {
                btn.classList.remove('active');
            } else {
                // Απενεργοποιούμε όλα τα άλλα και ενεργοποιούμε αυτό
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
            applyFilters(); // Εφαρμογή φίλτρου
        });
    });
	
    // AI Κουμπί και Enter
    document.getElementById('send-ai-btn').addEventListener('click', callAI);
    document.getElementById('ai-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') callAI();
    });

	// Listener για το Slider
	document.getElementById('zoomSlider').addEventListener('input', updateZoomAndRank);

	// Λειτουργία για το κουμπί Μείον (-)
	document.getElementById('zoomOut').addEventListener('click', () => {
	    const slider = document.getElementById('zoomSlider');
	    slider.value = parseInt(slider.value) - 1;
	    updateZoomAndRank(); // Καλούμε τη συνάρτηση για να ανανεωθεί το timeline
	});
	
	// Λειτουργία για το κουμπί Συν (+)
	document.getElementById('zoomIn').addEventListener('click', () => {
	    const slider = document.getElementById('zoomSlider');
	    slider.value = parseInt(slider.value) + 1;
	    updateZoomAndRank(); // Καλούμε τη συνάρτηση για να ανανεωθεί το timeline
	});
}

// 10. Λειτουργία Φιλτραρίσματος (EntityType)
function applyFilters() {
    const activeBtn = document.querySelector('.filter-btn.active');
    const searchTerm = document.getElementById('timelineSearch').value.toLowerCase();
    const selectedType = activeBtn ? activeBtn.getAttribute('data-type') : null;

    document.querySelectorAll('.year-marker').forEach(marker => {
        // Παίρνουμε τα δεδομένα από το marker (χρησιμοποιώντας το όνομα και το έτος που ήδη έχεις)
        const name = marker.querySelector('.entity-name-preview').innerText.toLowerCase();
        const year = marker.querySelector('.year-number').innerText.toLowerCase();
        
        // Έλεγχος αν ταιριάζει με το κείμενο αναζήτησης
        const matchesSearch = name.includes(searchTerm) || year.includes(searchTerm);
        
        // Έλεγχος αν ταιριάζει με τον τύπο (π.χ. Person)
        // Επειδή στο CSS βάζεις class "marker-person", ελέγχουμε αν η class περιέχει τον τύπο
        const markerClass = marker.className.toLowerCase();
        const matchesType = !selectedType || markerClass.includes(selectedType.toLowerCase().split('/')[0]);

        // Εμφάνιση ή απόκρυψη
        if (matchesSearch && matchesType) {
            marker.classList.remove('hidden');
        } else {
            marker.classList.add('hidden');
        }
    });
}

// 11. Λειτουργία Zoom & Rank Filtering
function updateZoomAndRank() {
    const zoomLevel = parseInt(document.getElementById('zoomSlider').value);
    document.getElementById('zoomValue').innerText = zoomLevel;

    // 1. Ρύθμιση απόστασης (Zoom)
    const newGap = zoomLevel * 5; 
    document.querySelector('.timeline-wrapper').style.setProperty('--zoom-gap', `${newGap}px`);

    // 2. Έλεγχος Rank
    document.querySelectorAll('.year-marker').forEach(marker => {
        const entityRank = parseInt(marker.getAttribute('data-rank')) || 10;
        
        if (entityRank <= zoomLevel) {
            // Σημαντικό γεγονός για το τρέχον επίπεδο
            marker.classList.remove('is-insignificant');
            marker.style.pointerEvents = "all";
        } else {
            // "Ασήμαντο" γεγονός - Σμίκρυνση
            marker.classList.add('is-insignificant');
            marker.style.pointerEvents = "none";
        }
    });
}
