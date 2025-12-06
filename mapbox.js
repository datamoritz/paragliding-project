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
    map.addLayer({
        'id': 'thermal-extrusions', // New layer ID
        'type': 'fill-extrusion', // Use fill-extrusion for 3D shapes
        'source': 'thermals',
        'paint': {
            
            // 1. HEIGHT: Set the top of the extrusion to the Entry Altitude
            'fill-extrusion-height': ['get', 'entry_alt'],
            
            // 2. BASE: Set the base of the extrusion to a fixed low altitude (e.g., 500m)
            'fill-extrusion-base': 500,

            // 3. COLOR (Same color interpolation logic as before)
            'fill-extrusion-color': [
                'interpolate',
                ['linear'],
                ['get', 'entry_alt'], 
                
                500, '#800026', // Lowest Altitude: Dark Red
                1000, '#e31a1c',
                1500, '#fecc5c',
                2000, '#ffffb2' // Highest Altitude: Light Yellow
            ],
            
            // 4. OPACITY
            'fill-extrusion-opacity': 0.7
        }
    });

    // 5. Add Interaction (Popups)
    // NOTE: Mapbox uses the 'center' coordinate for click detection on extrusions
    map.on('click', 'thermal-extrusions', (e) => {
        // ... (Popup logic remains the same, but target 'thermal-extrusions') ...
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
