// mapbox.js

// 1. Set Access Token and Initialize Map
mapboxgl.accessToken = 'pk.eyJ1IjoibW9rbjQ5ODkiLCJhIjoiY21pdHA5NXoyMHkwMTNlcTJyZ3M1ODRlbiJ9.Sldlyj-1jfE6Qws-n1aoVQ'; // <<< REPLACE THIS WITH YOUR TOKEN

const map = new mapboxgl.Map({
    container: 'mapbox-map', // Target the correct container ID
    style: 'mapbox://styles/mapbox/light-v11', // Standard Mapbox style
    center: [13.0, 47.0], // Lon, Lat center of your region
    zoom: 7 
});

map.on('load', () => {
    // A. Add the GeoJSON file as a data source (REMAINS THE SAME)
    map.addSource('thermals', {
        type: 'geojson',
        data: 'thermals_data.geojson' 
    });

    // B. ADD TERRAIN (OPTIONAL, BUT RECOMMENDED FOR 3D EFFECT)
    map.addSource('mapbox-dem', {
        'type': 'raster-dem',
        'url': 'mapbox://mapbox.terrain-rgb',
        'tileSize': 512,
        'maxzoom': 14
    });
    map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 }); // Exaggerate terrain for better look

    // C. Add a 3D EXTRUSION Layer to visualize the thermal data
    // C. Add a CIRCLE Layer to visualize the thermal data
    map.addLayer({
        'id': 'thermal-points-test', // New test layer ID
        'type': 'circle', // <--- Reverting to a simple circle layer
        'source': 'thermals',
        'paint': {
            'circle-radius': 4,
            'circle-color': [ // Keep the color scale
                'interpolate',
                ['linear'],
                ['get', 'entry_alt'], 
                
                500, '#800026', 
                1000, '#e31a1c',
                1500, '#fecc5c',
                2000, '#ffffb2' 
            ],
            'circle-opacity': 0.8
        }
    });

    // 5. Add Interaction (Popups)
    // NOTE: Mapbox uses the 'center' coordinate for click detection on extrusions
    // 5. Add Interaction (Popups)
        // NOTE: Mapbox uses the 'center' coordinate for click detection on extrusions
        map.on('click', 'thermal-extrusions', (e) => {
            
            // 1. Check if a feature was actually clicked
            if (e.features && e.features.length > 0) {
                
                // 2. Extract the properties (id, climb_rate, entry_alt) from the feature
                const properties = e.features[0].properties;
    
                // 3. Create and display the popup
                new mapboxgl.Popup()
                    // Set the location of the popup to the click coordinates
                    .setLngLat(e.lngLat) 
                    .setHTML(
                        `<b>Thermal ID:</b> ${properties.id}<br>` +
                        `<b>Climb Rate:</b> ${properties.climb_rate.toFixed(2)} m/s<br>` +
                        `<b>Entry Alt:</b> ${properties.entry_alt.toFixed(0)} m`
                    )
                    .addTo(map);
            }
        });
    
    // 6. Set Camera to Enable 3D View (Pitch and Zoom)
    map.setPitch(45); // Set the tilt angle to 45 degrees
    map.setZoom(10); // Zoom in closer for the 3D effect
    
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
