// Φόρτωση του CSV
const csvUrl = 'data.csv';

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    generateTimelineMarkers();
});

function loadData() {
    Papa.parse(csvUrl, {
        download: true,
        header: true,
        delimiter: ";", // Εδώ ορίζουμε ότι ο διαχωριστής είναι το ερωτηματικό
        skipEmptyLines: true, // Καλό είναι να υπάρχει για να μην χτυπάει σε κενές γραμμές στο τέλος
        complete: function(results) {
            window.historyData = results.data;
            console.log("Data Loaded:", window.historyData);
            
            // Προαιρετικά: Εμφάνισε το πρώτο στοιχείο μόλις φορτώσουν
            if(window.historyData.length > 0) {
                displayEntity(window.historyData[0]);
            }
        },
        error: function(err) {
            console.error("Σφάλμα κατά τη φόρτωση του CSV:", err);
        }
    });
}

function generateTimelineMarkers() {
    const axis = document.getElementById('timeline-axis');
    // Από το 2024 έως το -5000 (π.Χ.) με βήμα 100 έτη
    for (let year = 2024; year >= -5000; year -= 100) {
        const div = document.createElement('div');
        div.className = 'year-marker';
        div.innerText = year > 0 ? year : Math.abs(year) + " π.Χ.";
        div.onclick = () => filterByYear(year);
        axis.appendChild(div);
    }
}

function displayEntity(entity) {
    const display = document.getElementById('entity-display');
    display.innerHTML = `
        <div class="entity-header">
            <span class="badge">${entity.EntityType}</span>
            <h1>${entity.Name}</h1>
            <p class="era">${entity.EraName} | ${entity.CategoryName}</p>
        </div>
        <img src="${entity.Image_Path}" alt="${entity.Name}" style="width:100%; border-radius:10px; margin: 20px 0;">
        <div class="content">
            <h3>Σύνοψη</h3>
            <p>${entity.BiographyShort}</p>
            <h3>Συνεισφορά & Vibe</h3>
            <p>${entity.KeyContribution}</p>
        </div>
        <a href="${entity.Wiki_URL}" target="_blank" class="wiki-btn">Διαβάστε στη Wikipedia</a>
    `;
}
