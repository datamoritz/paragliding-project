var map = L.map('map').setView([47.0, 13.0], 8); // Example coordinates/zoom
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

function getColor(climbRate) {
    return climbRate > 2.0  ? '#d73027' :
           climbRate > 1.5  ? '#fc8d59' :
           climbRate > 1.0  ? '#fee090' :
           climbRate > 0.5  ? '#e0f3f8' :
                              '#4575b4'; // Low climb rate (blue)
}

fetch('thermals_data.geojson')
    .then(response => response.json())
    .then(data => {
        L.geoJson(data, {
            pointToLayer: function (feature, latlng) {
                return L.circleMarker(latlng, {
                    radius: 4,
                    fillColor: getColor(feature.properties.climb_rate), // Apply color
                    color: "#000",
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                });
            },
            onEachFeature: function (feature, layer) {
                // Add popup when user clicks the dot
                layer.bindPopup("<b>Thermal ID:</b> " + feature.properties.id + 
                                "<br><b>Climb Rate:</b> " + feature.properties.climb_rate.toFixed(2) + " m/s" +
                                "<br><b>Entry Alt:</b> " + feature.properties.entry_alt.toFixed(0) + " m");
            }
        }).addTo(map);
    });
