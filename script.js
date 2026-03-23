const csvUrl = 'data.csv';

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    generateTimelineMarkers();
});

function loadData() {
    Papa.parse(csvUrl, {
        download: true,
        header: true,
        delimiter: ";",
        skipEmptyLines: true,
        encoding: "UTF-8", // Προσθήκη για τα Ελληνικά
        complete: function(results) {
            window.historyData = results.data;
            console.log("Data Loaded:", window.historyData);
        }
    });
}

function generateTimelineMarkers() {
    const axis = document.getElementById('timeline-axis');
    // Από το 2024 έως το -5000 με βήμα 100 έτη
    for (let year = 2024; year >= -5000; year -= 100) {
        const div = document.createElement('div');
        div.className = 'year-marker';
        div.innerText = year > 0 ? year : Math.abs(year) + " π.Χ.";
        
        // Εδώ ορίζουμε τι θα γίνεται στο κλικ
        div.onclick = () => filterByYear(year);
        
        axis.appendChild(div);
    }
}

// Η συνάρτηση που έλειπε!
function filterByYear(selectedYear) {
    console.log("Searching for year around:", selectedYear);
    
    // Ψάχνουμε εγγραφές όπου το selectedYear είναι ανάμεσα στο Start και End Year
    // Ή εγγραφές που ξεκινάνε κοντά σε αυτό το έτος (π.χ. +/- 50 χρόνια)
    const matches = window.historyData.filter(item => {
        const start = parseInt(item.Start_Year);
        const end = parseInt(item.End_Year);
        
        // Αν είναι πρόσωπο (στιγμιαίο γεγονός στο timeline) ή αν το έτος είναι εντός ορίων
        return (selectedYear >= start && selectedYear <= end) || (Math.abs(start - selectedYear) <= 50);
    });

    if (matches.length > 0) {
        // Ταξινομούμε βάσει Rank (για να δείξουμε το πιο σημαντικό πρώτο)
        matches.sort((a, b) => parseInt(a.Rank) - parseInt(b.Rank));
        displayEntity(matches[0]);
    } else {
        alert("Δεν βρέθηκαν καταχωρήσεις για αυτή την περίοδο.");
    }
}

function displayEntity(entity) {
    const display = document.getElementById('entity-display');
    
    // Έλεγχος για κενή εικόνα
    const imageHtml = entity.Image_Path 
        ? `<img src="${entity.Image_Path}" alt="${entity.Name}" class="entity-img">` 
        : `<div class="img-placeholder">Δεν υπάρχει εικόνα</div>`;

    display.innerHTML = `
        <div class="entity-card-inner">
            <div class="entity-header">
                <span class="badge">${entity.EntityType}</span>
                <span class="era-tag">${entity.EraName}</span>
                <h1>${entity.Name}</h1>
                <p class="origin"><strong>Καταγωγή:</strong> ${entity.PlaceOfOrigin}</p>
            </div>
            
            ${imageHtml}

            <div class="content-body">
                <div class="bio">
                    <h3>Βιογραφικό</h3>
                    <p>${entity.BiographyShort}</p>
                </div>
                <div class="contribution">
                    <h3>Σημαντική Συνεισφορά</h3>
                    <p>${entity.KeyContribution}</p>
                </div>
                <div class="meta-info">
                    <span><strong>Σχολή:</strong> ${entity.School_Tag}</span> | 
                    <span><strong>Status:</strong> ${entity.Gender}</span>
                </div>
            </div>
            
            <footer class="entity-footer">
                <a href="${entity.Wiki_URL}" target="_blank" class="wiki-link">Περισσότερα στη Wikipedia →</a>
            </footer>
        </div>
    `;
}
