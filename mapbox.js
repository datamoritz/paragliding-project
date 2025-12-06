// mapbox.js

// 1. Set Access Token and Initialize Map
mapboxgl.accessToken = 'YOUR_MAPBOX_ACCESS_TOKEN'; // <<< REPLACE THIS WITH YOUR TOKEN

const map = new mapboxgl.Map({
    container: 'mapbox-map', // Target the correct container ID
    style: 'mapbox://styles/mapbox/light-v11', // Standard Mapbox style
    center: [13.0, 47.0], // Lon, Lat center of your region
    zoom: 7 
});

// 2. Load Data and Add Layer
map.on('load', () => {
    // A. Add the GeoJSON file as a data source
    map.addSource('thermals', {
        type: 'geojson',
        data: 'thermals_data.geojson' // Uses the SAME GeoJSON file
    });

    // B. Add a layer to visualize the data from the source
    map.addLayer({
        'id': 'thermal-points',
        'type': 'circle',
        'source': 'thermals',
        'paint': {
            'circle-radius': 4,
            'circle-stroke-color': '#000',
            'circle-stroke-width': 0.5,
            
            // CRITICAL: Define the color scale based on the 'entry_alt' property
            'circle-color': [
                'interpolate',
                ['linear'],
                ['get', 'entry_alt'], // Property name from GeoJSON
                
                // Define the stops (altitude in meters and corresponding color)
                500, '#800026', // Lowest Altitude: Dark Red
                1000, '#e31a1c',
                1500, '#fecc5c',
                2000, '#ffffb2' // Highest Altitude: Light Yellow
            ]
        }
    });

    // C. Add Interaction (Popups)
    map.on('click', 'thermal-points', (e) => {
        // Ensure features[0] exists before accessing properties
        if (e.features && e.features.length > 0) {
            const properties = e.features[0].properties;
            new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(
                    `<b>Thermal ID:</b> ${properties.id}<br>` +
                    `<b>Climb Rate:</b> ${properties.climb_rate.toFixed(2)} m/s<br>` +
                    `<b>Entry Alt:</b> ${properties.entry_alt.toFixed(0)} m`
                )
                .addTo(map);
        }
    });
    
    // Optional: Fit bounds to the data when loaded
    map.on('sourcedata', (e) => {
        if (e.isSourceLoaded && e.sourceId === 'thermals') {
            const features = map.querySourceFeatures('thermals');
            if (features.length > 0) {
                const bounds = new mapboxgl.LngLatBounds();
                features.forEach((f) => {
                    // Coordinates are [lon, lat]
                    bounds.extend(f.geometry.coordinates);
                });
                map.fitBounds(bounds, {
                    padding: 50,
                    duration: 0 
                });
            }
        }
    });
});
