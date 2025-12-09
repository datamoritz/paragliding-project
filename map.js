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

function colorPast(climbRate) {
    return climbRate > 2.0 ? '#d73027' :
           climbRate > 1.5 ? '#fc8d59' :
           climbRate > 1.0 ? '#fee090' :
           climbRate > 0.5 ? '#e0f3f8' :
                             '#4575b4';
}

function colorPred(prob) {
    return prob > 0.7 ? '#000000' :
           prob > 0.5 ? '#08306b' :
           prob > 0.3 ? '#08519c' :
           prob > 0.1 ? '#6baed6' :
                        '#deebf7';
}

// -------------------------
// LOADERS
// -------------------------

async function loadPastThermals() {
    // ✅ FIXED PATH — change this to your real past thermals file
    const response = await fetch("models/past_thermals.geojson");
    const data = await response.json();

    layerGroup.clearLayers();

    L.geoJSON(data, {
        pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, {
                radius: 5,
                fillColor: colorPast(feature.properties.avg_climb_rate),
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
                Avg Climb: ${p.avg_climb_rate.toFixed(2)} m/s<br>
                Max Climb: ${p.max_climb_rate.toFixed(2)} m/s<br>
                Entry Alt: ${p.entry_alt} m<br>
                Exit Alt: ${p.exit_alt} m<br>
                Duration: ${p.duration_s} s
            `);
        }
    }).addTo(layerGroup);

    document.getElementById("modeLabel").innerHTML =
        'Thermals colored by <b>Average Climb Rate</b> (m/s).';
}


async function loadPredThermals() {
    // ✅ FIXED PATH — matches your GitHub repo
    const response = await fetch("models/thermal_predictions.geojson");
    const data = await response.json();

    layerGroup.clearLayers();

    L.geoJSON(data, {
        pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, {
                radius: 6,
                fillColor: colorPred(feature.properties.pred_prob),
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.9
            });
        },
        onEachFeature: function (feature, layer) {
            let p = feature.properties;

            let html = `<b>Predicted Thermal</b><br>
            Probability: ${(p.pred_prob * 100).toFixed(1)}%<br><hr>
            <b>Weather Features</b><br>`;

            for (let key in p) {
                if (!["lat", "lon", "pred_prob"].includes(key)) {
                    html += `${key}: ${p[key]}<br>`;
                }
            }

            layer.bindPopup(html);
        }
    }).addTo(layerGroup);

    document.getElementById("modeLabel").innerHTML =
        'Thermals colored by <b>Predicted Thermal Probability</b>.';
}

// -------------------------
// BUTTON TOGGLES
// -------------------------

document.getElementById("btnPast").onclick = () => {
    loadPastThermals();
    btnPast.classList.replace("btn-outline-primary", "btn-primary");
    btnPred.classList.replace("btn-primary", "btn-outline-primary");
};

document.getElementById("btnPred").onclick = () => {
    loadPredThermals();
    btnPred.classList.replace("btn-outline-primary", "btn-primary");
    btnPast.classList.replace("btn-primary", "btn-outline-primary");
};

// Default mode
loadPastThermals();
