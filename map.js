// -------------------------
// MAP INITIALIZATION
// -------------------------
var map = L.map('map').setView([47.5, 13.5], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let layerGroup = L.layerGroup().addTo(map);

// -------------------------
// COLOR SCALES
// -----------------------var map = L.map('map').setView([47.7, 14.2], 8);

// Past thermals — color by avg climb rate
function colorPast(climbRate) {
    return climbRate > 2.0 ? '#d73027' :
           climbRate > 1.5 ? '#fc8d59' :
           climbRate > 1.0 ? '#fee090' :
           climbRate > 0.5 ? '#e0f3f8' :
                             '#4575b4';
}

// Predicted thermals — light blue → blue → black
function colorPred(prob) {
    if (prob < 0.10) return 'rgba(0,0,0,0)';   // hidden
    if (prob < 0.20) return '#fde0f6';         // very light pink
    if (prob < 0.30) return '#f7b1ea';         // pastel pink
    if (prob < 0.40) return '#e77edc';         // medium pink
    if (prob < 0.50) return '#d24bcf';         // raspberry
    if (prob < 0.60) return '#b51fbf';         // strong magenta
    if (prob < 0.70) return '#9911a9';         // dark magenta
    if (prob < 0.80) return '#6c0c7c';         // plum
    if (prob < 0.90) return '#490657';         // deep purple
    return '#2a0233';                          // near black-purple (highest confidence)
}


// -------------------------
// LOAD THERMALS (SAME FILE)
// -------------------------
async function loadData() {
    const r = await fetch("./models/thermal_predictions.geojson");
    return await r.json();
}


// -------------------------
// RENDER PAST THERMALS
// -------------------------
async function loadPastThermals() {
    const data = await loadData();
    layerGroup.clearLayers();

    L.geoJSON(data, {
        pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, {
                radius: 5,
                fillColor: colorPast(feature.properties.avg_climb), // FIXED
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.85
            });
        },
        onEachFeature: function (feature, layer) {
            const p = feature.properties;

            layer.bindPopup(`
                <b>Past Thermal</b><br>
                Avg Climb: ${p.avg_climb.toFixed(2)} m/s<br>   <!-- FIXED -->
                Max Climb: ${p.max_climb.toFixed(2)} m/s<br>
                Entry Alt: ${p.entry_alt} m<br>
                Exit Alt: ${p.exit_alt} m<br>
                Duration: ${p.duration_s} s
            `);
        }
    }).addTo(layerGroup);

    modeLabel.innerHTML =
        'Thermals colored by <b>Average Climb Rate</b> (m/s).';
}


// -------------------------
// RENDER PREDICTED THERMALS
// -------------------------
async function loadPredThermals() {
    const data = await loadData();
    layerGroup.clearLayers();

    const currentHour = new Date().getHours();   // system hour (0–23)
    const probKey = `strong_prob_h${String(currentHour).padStart(2, "0")}`;

    L.geoJSON(data, {
        pointToLayer: function (feature, latlng) {

            // ✔ Extract probability correctly
            let prob = feature.properties[probKey];
            if (prob === undefined || prob === null) prob = 0;
            if (prob < 0.1) return null; // skip creating marker

            return L.circleMarker(latlng, {
                radius: 5,
                fillColor: colorPred(prob),
                color: "#000",
                weight: 0.6,
                opacity: 0.8,
                fillOpacity: 0.85
            });
        },
        onEachFeature: function (feature, layer) {

            let p = feature.properties;
            let prob = p[probKey] || 0;
        
            let html = `
                <b>Predicted Thermal</b><br>
                Probability: ${(prob * 100).toFixed(1)}%<br>
                <hr>
                <b>Weather / Feature Inputs</b><br>
            `;
        
            for (let key in p) {
        
                // ❌ Hide ALL probability fields  
                if (key.toLowerCase().includes("prob")) continue;
        
                // ❌ Hide lat/lon center values
                if (key === "lat_center" || key === "lon_center") continue;
        
                html += `${key}: ${p[key]}<br>`;
            }
        
            layer.bindPopup(html);
        }
    }).addTo(layerGroup);

    modeLabel.innerHTML =
        'Thermals colored by current <b>Prediction Probability</b> (updated hourly).';
}


// -------------------------
// BUTTON TOGGLES
// -------------------------
// Set initial button state
btnPast.classList.add("btn-primary");
btnPast.classList.remove("btn-outline-primary");

btnPred.classList.add("btn-outline-primary");
btnPred.classList.remove("btn-primary");

btnPast.onclick = () => {
    loadPastThermals();
    btnPast.classList.replace("btn-outline-primary", "btn-primary");
    btnPred.classList.replace("btn-primary", "btn-outline-primary");
    showLegend("legendPast");
};

btnPred.onclick = () => {
    loadPredThermals();
    btnPred.classList.replace("btn-outline-primary", "btn-primary");
    btnPast.classList.replace("btn-primary", "btn-outline-primary");
    showLegend("legendPred");
};


function showLegend(id) {
    document.getElementById("legendPred").style.display = "none";
    document.getElementById("legendPast").style.display = "none";
    document.getElementById(id).style.display = "block";
}

function hideLegend(id) {
    document.getElementById(id).style.display = "none";
}


// Default mode
loadPastThermals();
showLegend("legendPast");
