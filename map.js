// -------------------------
// MAP INITIALIZATION
// -------------------------
var map = L.map('map').setView([47.7, 14.2], 8);

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
    if (prob < 0.10) return 'rgba(0,0,0,0)';     // invisible
    if (prob < 0.20) return '#deebf7';           // very light blue
    if (prob < 0.30) return '#c6dbef';           // light blue
    if (prob < 0.40) return '#9ecae1';           // medium-light blue
    if (prob < 0.50) return '#6baed6';           // medium blue
    if (prob < 0.60) return '#4292c6';           // medium-dark blue
    if (prob < 0.70) return '#2171b5';           // dark blue
    if (prob < 0.80) return '#08519c';           // very dark blue
    if (prob < 0.90) return '#08306b';           // navy blue
    return '#000000';                            // near-certain → black
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

            return L.circleMarker(latlng, {
                radius: 6,
                fillColor: colorPred(prob),
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.90
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
        'Thermals colored by <b>Prediction Probability</b>.';
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
};

btnPred.onclick = () => {
    loadPredThermals();
    btnPred.classList.replace("btn-outline-primary", "btn-primary");
    btnPast.classList.replace("btn-primary", "btn-outline-primary");
};



// Default mode
loadPastThermals();
