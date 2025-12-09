# Script to run daily at midnight to predict thermal presence for the next day

# Load Libraries
import requests
import pandas as pd
import numpy as np
import joblib
from datetime import datetime
from sklearn.cluster import KMeans
import pathlib

# Paths
ROOT = pathlib.Path(__file__).resolve().parent.parent   # repo root
MODELS = ROOT / "models"
DATA = ROOT / "data"
OUTPUT = MODELS / "output"   # or ROOT / "output" if you want it elsewhere

# Load Models
stage1 = joblib.load(MODELS / "stage1_rf.pkl")
stage2 = joblib.load(MODELS / "stage2_rf.pkl")

print("Models loaded.")

# Load Thermal Locations
df_thermals = pd.read_csv(DATA / "thermals_for_github.csv")
print("Thermal locations loaded.")


## HELPER FUNCTIONS ##

# Cluster thermal locations to reduce weather API calls
def cluster_thermal_locations(df_thermals, K=120, random_state=42):
    """
    Cluster thermal locations (lat/lon) into K clusters to minimize
    the number of weather API calls needed.

    Returns:
        df_out          -> original DataFrame with new 'cluster_id'
        weather_points  -> DataFrame of cluster centroids (lat, lon)
        kmeans_model    -> fitted KMeans object
    """
    df = df_thermals.copy()

    # Extract coordinates
    coords = df[["lat_center", "lon_center"]].values

    # Run K-Means
    kmeans = KMeans(
        n_clusters=K,
        random_state=random_state,
        n_init=10
    )
    df["cluster_id"] = kmeans.fit_predict(coords)

    # Create DataFrame of centroid lat/lon (weather-fetching points)
    weather_points = pd.DataFrame(
        kmeans.cluster_centers_,
        columns=["lat", "lon"]
    )

    print(f"Clustering complete. {K} cluster centroids created.")
    print(f"Example weather points:\n{weather_points.head()}")

    return df, weather_points, kmeans

    """
    Compute the min/max lat/lon from the thermal dataset.
    Adds padding (in degrees) so the weather grid extends slightly outside.
    """
    min_lat = df["lat_center"].min() - pad
    max_lat = df["lat_center"].max() + pad
    min_lon = df["lon_center"].min() - pad
    max_lon = df["lon_center"].max() + pad

    return round(min_lat, 3), round(max_lat, 3), round(min_lon, 3), round(max_lon, 3)

# Fetch weather for LON/LAT BOUNDING BOX
def fetch_cell_forecast(lat, lon):

    # Convert numpy floats → Python floats (CRITICAL)
    lat = float(lat)
    lon = float(lon)

    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": [
            "temperature_2m",
            "dewpoint_2m",
            "windspeed_10m",
            "shortwave_radiation",
            "boundary_layer_height",
            "cloudcover_low"
        ],
      #  "models": "ecmwf_ifs04",     # global + works in Austria
        "forecast_days": 1,
        "timezone": "Europe/Vienna"
    }

    r = requests.get(url, params=params)

    # Safety: check if JSON valid
    try:
        data = r.json()
    except Exception:
        raise ValueError("Forecast API did not return valid JSON")

    # Safety: check if hourly data exists
    if "hourly" not in data:
        raise ValueError(f"No hourly data returned for lat={lat}, lon={lon}")

    df = pd.DataFrame(data["hourly"])
    df["time"] = pd.to_datetime(df["time"], errors="coerce")

    return df


    """
    Calls fetch_cell_forecast(lat, lon) once per cluster centroid.

    Args:
        weather_points : DataFrame with columns ['lat', 'lon']
        fetch_func     : function(lat, lon) → DataFrame (your fetch_cell_forecast)

    Returns:
        dict mapping cluster_id → weather DataFrame
    """
    cluster_weather = {}

    for cluster_id, row in weather_points.iterrows():
        lat = float(row["lat"])
        lon = float(row["lon"])
        print(f"Fetching weather for cluster {cluster_id} at ({lat:.4f}, {lon:.4f})...")

        df_w = fetch_func(lat, lon)
        cluster_weather[cluster_id] = df_w

    return cluster_weather

def assign_weather_to_thermals(df_thermals, cluster_weather):
    """
    For each thermal row, attach the weather DataFrame of its cluster.
    Returns a dict: thermal_id → weather DataFrame
    """
    thermal_weather = {}

    for idx, row in df_thermals.iterrows():
        cid = row["cluster_id"]
        thermal_id = row["thermal_id"]

        # assign cluster-level weather
        thermal_weather[thermal_id] = cluster_weather[cid]

    return thermal_weather


    """
    Fetches 24h weather (raw + engineered features) once per cluster centroid.

    Args:
        weather_points : DataFrame with ['lat', 'lon'] for each cluster
        fetch_func     : function(lat, lon) → DataFrame with engineered features

    Returns:
        dict: cluster_id → weather DataFrame (24 rows per cluster)
    """
    cluster_weather = {}

    for cluster_id, row in weather_points.iterrows():
        lat = float(row["lat"])
        lon = float(row["lon"])

        print(f"Fetching weather for cluster {cluster_id} at ({lat:.4f}, {lon:.4f})...")

        try:
            df_w = fetch_func(lat, lon)

            # Safety check: must contain at least 1 forecast row
            if df_w is None or len(df_w) == 0:
                print(f"⚠️ Cluster {cluster_id} returned EMPTY weather data — skipping.")
                continue

            # Store final engineered 24h dataframe
            cluster_weather[cluster_id] = df_w

        except Exception as e:
            print(f"❌ Error fetching weather for cluster {cluster_id}: {e}")
            continue

    print(f"✔ Finished fetching weather for {len(cluster_weather)} clusters.")
    return cluster_weather


    """
    Fetches 24h weather (raw + engineered features) once per cluster centroid.

    Args:
        weather_points : DataFrame with ['lat', 'lon'] for each cluster centroid

    Returns:
        dict: cluster_id → weather DataFrame (24 rows)
    """
    cluster_weather = {}

    for cluster_id, row in weather_points.iterrows():
        lat = float(row["lat"])
        lon = float(row["lon"])

        print(f"Fetching weather for cluster {cluster_id} at ({lat:.4f}, {lon:.4f})...")

        try:
            df_w = fetch_cell_forecast(lat, lon)

            # must return a non-empty dataframe
            if df_w is None or len(df_w) == 0:
                print(f"⚠️ Empty weather for cluster {cluster_id} — skipping.")
                continue

            # Optional: compute engineered weather features here
            # df_w = derive_weather_features(df_w)

            cluster_weather[cluster_id] = df_w

        except Exception as e:
            print(f"❌ Error fetching weather for cluster {cluster_id}: {e}")
            continue

    print(f"✔ Finished fetching weather for {len(cluster_weather)} clusters.")
    return cluster_weather

def build_full_weather_table(df_clustered, cluster_weather):
    """
    Create one large DataFrame with:
        thermal_id, cluster_id, time, raw weather vars

    cluster_weather: dict {cluster_id → weather_df}
    df_clustered: original thermals with cluster_id assigned
    """
    rows = []

    for _, row in df_clustered.iterrows():
        tid  = row["thermal_id"]
        cid  = row["cluster_id"]

        df_w = cluster_weather[cid]

        # Add thermal_id & cluster_id columns
        df_temp = df_w.copy()
        df_temp["thermal_id"] = tid
        df_temp["cluster_id"] = cid

        rows.append(df_temp)

    # Combine everything into ONE table
    df_full = pd.concat(rows, ignore_index=True)

    return df_full

def fetch_weather_for_clusters(weather_points, fetch_func):
    """
    Calls fetch_func(lat, lon) once per cluster centroid.

    Args:
        weather_points : DataFrame with ['lat','lon']
        fetch_func     : function(lat, lon) → DataFrame

    Returns:
        dict {cluster_id : weather_df}
    """
    cluster_weather = {}

    for cluster_id, row in weather_points.iterrows():
        lat = float(row["lat"])
        lon = float(row["lon"])

        print(f"Fetching weather for cluster {cluster_id} at ({lat:.4f}, {lon:.4f})...")

        df_w = fetch_func(lat, lon)
        cluster_weather[cluster_id] = df_w

    return cluster_weather

## HELPER FUNCTIONS ##



# RUN DAILY PREDICTION PIPELINE

# Step 1: cluster thermals
df_clustered, weather_points, kmeans = cluster_thermal_locations(df_thermals, K=150)

# Step 2: fetch weather for each cluster
cluster_weather = fetch_weather_for_clusters(weather_points, fetch_cell_forecast)



# STEP 3: Predict probabilities for each cluster
print("Building prediction columns...")

# Create empty columns for 24h predictions
for h in range(24):
    df_clustered[f"stage1_prob_h{h:02d}"] = np.nan
    df_clustered[f"stage2_prob_h{h:02d}"] = np.nan

for cid, df_weather in cluster_weather.items():
    print(f"\nComputing predictions for cluster {cid} ...")

    # -------------------------------------------------------
    # A) DERIVED FEATURES NEEDED FOR BOTH MODELS
    # -------------------------------------------------------
    LCL = df_weather["temperature_2m"] - df_weather["dewpoint_2m"]
    thermal_ratio = df_weather["shortwave_radiation"] / (df_weather["shortwave_radiation"].max() + 1e-6)
    wind_stress = df_weather["windspeed_10m"] ** 2
    time_sin = np.sin(df_weather["time"].dt.hour * 2 * np.pi / 24)
    year_day_cos = np.cos(df_weather["time"].dt.dayofyear * 2 * np.pi / 365)

    # -------------------------------------------------------
    # B) BUILD STAGE 1 FEATURE MATRIX
    # -------------------------------------------------------
    X1 = pd.DataFrame({
        "windspeed_10m": df_weather["windspeed_10m"],
        "shortwave_radiation": df_weather["shortwave_radiation"],
        "boundary_layer_height": df_weather["boundary_layer_height"],
        "cloudcover_low": df_weather["cloudcover_low"],
        "LCL_height_m": LCL
    })

    # Order must match training
    X1 = X1[[
        "windspeed_10m",
        "shortwave_radiation",
        "boundary_layer_height",
        "cloudcover_low",
        "LCL_height_m"
    ]]

    # -------------------------------------------------------
    # C) BUILD STAGE 2 FEATURE MATRIX
    # -------------------------------------------------------
    X2 = pd.DataFrame({
        "dewpoint_2m": df_weather["dewpoint_2m"],
        "shortwave_radiation": df_weather["shortwave_radiation"],
        "LCL_height_m": LCL,
        "thermal_potential_ratio": thermal_ratio,
        "wind_stress_proxy": wind_stress,
        "time_sin": time_sin,
        "year_day_cos": year_day_cos
    })

    X2 = X2[[
        "dewpoint_2m",
        "shortwave_radiation",
        "LCL_height_m",
        "thermal_potential_ratio",
        "wind_stress_proxy",
        "time_sin",
        "year_day_cos"
    ]]

    # -------------------------------------------------------
    # D) APPLY MODELS
    # -------------------------------------------------------
    p1 = stage1.predict_proba(X1)[:, 1]
    p2 = stage2.predict_proba(X2)[:, 1]

    print(f"Cluster {cid}: First 5 stage1 probabilities:", p1[:5])
    print(f"Cluster {cid}: First 5 stage2 probabilities:", p2[:5])

    # -------------------------------------------------------
    # E) INSERT RESULTS INTO df_clustered
    # -------------------------------------------------------
    idx = df_clustered["cluster_id"] == cid

    for h in range(24):
        df_clustered.loc[idx, f"stage1_prob_h{h:02d}"] = p1[h]
        df_clustered.loc[idx, f"stage2_prob_h{h:02d}"] = p2[h]

print("\nPrediction insertion complete.")


# Combine stage 1 + stage 2 probabilities
for h in range(24):
    p1 = df_clustered[f"stage1_prob_h{h:02d}"]
    p2 = df_clustered[f"stage2_prob_h{h:02d}"]

    df_clustered[f"strong_prob_h{h:02d}"] = p1 * p2

# Clean up intermediate columns
stage1_cols = [c for c in df_clustered.columns if "stage1_prob" in c]
stage2_cols = [c for c in df_clustered.columns if "stage2_prob" in c]

df_clustered = df_clustered.drop(columns = stage1_cols + stage2_cols)


# Step 4:Save final predictions
#PATH_OUTPUT = "/Users/moritzknodler/Documents/00_Lectures/0_Fall 2025/ML/z_Project/Models/thermals_with_predictions.csv"
#df_clustered.to_csv(OUTPUT / "thermal_predictions.csv", index=False)

#print("Saved:", OUTPUT / "thermal_predictions.csv")
print(df_clustered.shape)

import json

# Convert DataFrame to GeoJSON
def df_to_geojson(df, lat_col="lat_center", lon_col="lon_center", out_path="thermals.geojson"):
    features = []

    for _, row in df.iterrows():
        props = row.drop([lat_col, lon_col]).to_dict()

        feature = {
            "type": "Feature",
            "properties": props,
            "geometry": {
                "type": "Point",
                "coordinates": [float(row[lon_col]), float(row[lat_col])]
            }
        }
        features.append(feature)

    geojson = {
        "type": "FeatureCollection",
        "features": features
    }

    with open(out_path, "w") as f:
        json.dump(geojson, f, indent=2)

    print(f"GeoJSON saved → {out_path}")

# Save as GeoJSON

import json

# Convert DataFrame to GeoJSON
def df_to_geojson(df, lat_col="lat_center", lon_col="lon_center", out_path="thermals.geojson"):
    features = []

    for _, row in df.iterrows():
        props = row.drop([lat_col, lon_col]).to_dict()

        feature = {
            "type": "Feature",
            "properties": props,
            "geometry": {
                "type": "Point",
                "coordinates": [float(row[lon_col]), float(row[lat_col])]
            }
        }
        features.append(feature)

    geojson = {
        "type": "FeatureCollection",
        "features": features
    }

    with open(out_path, "w") as f:
        json.dump(geojson, f, indent=2)

    print(f"GeoJSON saved → {out_path}")

# Save as GeoJSON
df_to_geojson(df_clustered, out_path="models/thermal_predictions.geojson")
