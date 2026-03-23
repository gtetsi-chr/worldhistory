let map;
let marker;

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadData(); // Πρώτα φορτώνουμε τα δεδομένα
});

function initMap() {
    map = L.map('map').setView([37.98, 23.72], 4);
    
    // Χάρτης που υποστηρίζει καλύτερα ελληνικά ονόματα (CartoDB Voyager)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors',
        language: 'el' // Προσπάθεια για εξαναγκασμό ελληνικών
    }).addTo(map);
}

function loadData() {
    Papa.parse("data.csv", {
        download: true,
        header: true,
        delimiter: ";",
        skipEmptyLines: true,
        complete: function(results) {
            window.historyData = results.data;
            // Αφού έχουμε τα δεδομένα, φτιάχνουμε το timeline
            generateTimeline();
        }
    });
}

function generateTimeline() {
    const axis = document.getElementById('timeline-axis');
    axis.innerHTML = ""; // Καθαρισμός

    for (let year = 2024; year >= -5000; year -= 100) {
        const div = document.createElement('div');
        div.className = 'year-marker';

        // Εύρεση αν υπάρχει κάποιος σημαντικός σε αυτή τη χρονιά (Rank 1)
        const personInYear = window.historyData.find(item => {
            const s = parseInt(item.Start_Year);
            const e = parseInt(item.End_Year) || s;
            return year >= s && year <= e && parseInt(item.Rank) <= 2;
        });

        const yearLabel = year > 0 ? year : Math.abs(year) + " π.Χ.";
        const nameLabel = personInYear ? personInYear.Name : "";

        div.innerHTML = `
            <span class="year-number">${yearLabel}</span>
            <span class="entity-name-preview">${nameLabel}</span>
        `;

        div.onclick = () => filterByYear(year, div);
        axis.appendChild(div);
    }
}

async function displayEntity(item) {
    // Στοιχεία UI
    const cardContent = document.getElementById('card-content');
    const imgElement = document.getElementById('entity-img');
    const loader = document.getElementById('img-loader');

    cardContent.innerHTML = `<h2>${item.Name}</h2><p>${item.BiographyShort}</p>`;

    // Wikipedia Image Logic
    if (item.Wiki_URL) {
        loader.style.display = "block";
        imgElement.style.display = "none";
        
        // Καθαρίζουμε το URL για να πάρουμε τον τίτλο
        const title = decodeURIComponent(item.Wiki_URL.split('/wiki/').pop());
        const imageUrl = await getWikiImage(title);
        
        if (imageUrl) {
            imgElement.src = imageUrl;
            imgElement.style.display = "block";
            loader.style.display = "none";
        } else {
            loader.innerText = "Δεν βρέθηκε εικόνα";
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

async function getWikiImage(title) {
    try {
        // Χρήση του Wikipedia API για τα ελληνικά
        const url = `https://el.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
        const response = await fetch(url);
        const data = await response.json();
        return data.originalimage ? data.originalimage.source : (data.thumbnail ? data.thumbnail.source : null);
    } catch (e) {
        console.error("Wiki Error:", e);
        return null;
    }
}

// ... η filterByYear παραμένει ίδια
