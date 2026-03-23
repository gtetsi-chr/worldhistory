let map;
let marker;
window.historyData = [];

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadCSV();
});

function initMap() {
    map = L.map('map').setView([37.98, 23.72], 4);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

function loadCSV() {
    Papa.parse("data.csv", {
        download: true,
        header: true,
        delimiter: ";",
        skipEmptyLines: true,
        complete: function(results) {
            window.historyData = results.data;
            console.log("Data Loaded:", window.historyData.length, "rows");
            generateTimeline(); // Μόνο αφού φορτώσουν τα δεδομένα!
        }
    });
}

function generateTimeline() {
    const axis = document.getElementById('timeline-axis');
    axis.innerHTML = ""; 

    // Δημιουργούμε το timeline από το 2024 έως το -5000 ανά 50 έτη για περισσότερη ακρίβεια
    for (let year = 2024; year >= -5000; year -= 50) {
        const div = document.createElement('div');
        div.className = 'year-marker';
        
        // Ψάχνουμε αν υπάρχει κάποιος σημαντικός (Rank 1-3) σε αυτή τη χρονιά
        const match = window.historyData.find(item => {
            const s = parseInt(item.Start_Year);
            const e = parseInt(item.End_Year) || s;
            return (year >= s && year <= e) && (parseInt(item.Rank) <= 3);
        });

        const yearText = year > 0 ? year : Math.abs(year) + " π.Χ.";
        const nameText = match ? match.Name : "";

        div.innerHTML = `
            <div class="year-number">${yearText}</div>
            <div class="entity-name-preview">${nameText}</div>
        `;

        // ΠΡΟΣΟΧΗ: Το κλικ πρέπει να καλεί τη συνάρτηση σωστά
        div.addEventListener('click', () => {
            console.log("Clicked year:", year);
            filterByYear(year, div);
        });

        axis.appendChild(div);
    }
}

function filterByYear(year, element) {
    // 1. UI Αλλαγή στο timeline
    document.querySelectorAll('.year-marker').forEach(el => el.classList.remove('active'));
    element.classList.add('active');

    // 2. Εύρεση της καλύτερης εγγραφής για αυτή τη χρονιά
    const match = window.historyData.find(item => {
        const s = parseInt(item.Start_Year);
        const e = parseInt(item.End_Year) || s;
        return (year >= s && year <= e);
    });

    if (match) {
        displayEntity(match);
    } else {
        console.log("No match found for year", year);
    }
}

async function displayEntity(item) {
    // Κείμενα
    document.getElementById('card-content').innerHTML = `
        <h2 style="color:#38bdf8">${item.Name}</h2>
        <p><strong>${item.EraName}</strong> | ${item.CategoryName}</p>
        <p>${item.BiographyShort}</p>
        <p style="font-style:italic; border-top: 1px solid #334155; padding-top:10px;">${item.KeyContribution}</p>
    `;

    // Εικόνα Wikipedia
    const img = document.getElementById('entity-img');
    const loader = document.getElementById('img-loader');
    img.style.display = "none";
    loader.style.display = "block";

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
            loader.innerText = "Σφάλμα φόρτωσης";
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
