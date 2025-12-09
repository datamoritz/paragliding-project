// -------------------------
// MAP INITIALIZATION
// -------------------------
var map = L.map('map').setView([47.0, 13.0], 8);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let layerGroup = L.layerGroup().addTo(map);

// -------------------------
// COLOR SCALES
// -------------------------

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
    return prob > 0.8 ? '#000000' :
           prob > 0.6 ? '#08306b' :
           prob > 0.4 ? '#08519c' :
           prob > 0.2 ? '#6baed6' :
                        '#deebf7';
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
                radius: 4,
                fillColor: colorPast(feature.properties.avg_climb_rate),
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            });
        },
        onEachFeature: function (feature, layer) {
            const p = feature.properties;
            layer.bindPopup(`
                <b>Past Thermal</b><br>
                Avg climb: ${p.avg_climb_rate.toFixed(2)} m/s<br>
                Max climb: ${p.max_climb_rate.toFixed(2)} m/s<br>
                Entry alt: ${p.entry_alt} m<br>
                Exit alt: ${p.exit_alt} m<br>
                Duration: ${p.duration_s}s
            `);
        }
    }).addTo(layerGroup);

    modeLabel.innerHTML = 'Thermals colored by <b>Average Climb Rate</b> (m/s).';
}


// -------------------------
// RENDER PREDICTED THERMALS
// -------------------------
async function loadPredThermals() {
    const data = await loadData();
    layerGroup.clearLayers();

    L.geoJSON(data, {
        pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, {
                radius: 5,
                fillColor: colorPred(feature.properties.pred_prob),
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.9
            });
        },
        onEachFeature: function (feature, layer) {
            const p = feature.properties;

            let html = `
                <b>Predicted Thermal</b><br>
                Probability: ${(p.pred_prob * 100).toFixed(1)}%<br><hr>
                <b>Weather Features</b><br>
            `;

            for (const key in p) {
                if (!["lat_center","lon_center","pred_prob","avg_climb_rate"].includes(key)) {
                    html += `${key}: ${p[key]}<br>`;
                }
            }

            layer.bindPopup(html);
        }
    }).addTo(layerGroup);

    modeLabel.innerHTML = 'Thermals colored by <b>Prediction Probability</b>.';
}


// -------------------------
// BUTTON TOGGLES
// -------------------------
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
