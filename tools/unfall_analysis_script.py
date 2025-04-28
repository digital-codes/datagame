
import pandas as pd
import numpy as np
import folium
from folium.plugins import HeatMap
from folium.plugins import HeatMapWithTime

# 1. Rohdaten laden
df = pd.read_csv("/mnt_ai/data/unfallAtlas/csv/Unfallorte2023_LinRef.csv",decimal=",",sep=";")
# Additional dataframes for different years
df_2022 = pd.read_csv("/mnt_ai/data/unfallAtlas/csv/Unfallorte2022_LinRef.csv", decimal=",", sep=";")
df_2021 = pd.read_csv("/mnt_ai/data/unfallAtlas/csv/Unfallorte2021_LinRef.csv", decimal=",", sep=";")
df_2020 = pd.read_csv("/mnt_ai/data/unfallAtlas/csv/Unfallorte2020_LinRef.csv", decimal=",", sep=";")
df_2019 = pd.read_csv("/mnt_ai/data/unfallAtlas/csv/Unfallorte2019_LinRef.csv", decimal=",", sep=";")

# Combine all dataframes into one
df = pd.concat([df, df_2022, df_2021,df_2020,df_2019], ignore_index=True)

df.rename(columns={
    'XGCSWGS84': 'lon',
    'YGCSWGS84': 'lat',
}, inplace=True)


df.drop(index=df[df.ULAND != 8].index,inplace=True)
df.drop(index=df[df.UREGBEZ != 2].index,inplace=True)
df.drop(index=df[df.UKREIS != 12].index,inplace=True)
df.drop(columns=["OID_","PLST","UIDENTSTLAE","ULAND","UREGBEZ","UKREIS","UGEMEINDE","UART","UTYP1","ULICHTVERH","IstStrassenzustand","IstKrad","IstGkfz","IstSonstige","LINREFX","LINREFY",], inplace=True)

df.to_json('unfall_alle.json', orient='records', lines=True, force_ascii=False)

# 2. Projektion in ein lokales metrisches Koordinatensystem
meters_per_degree = 111320
origin_lon = df['lon'].mean()
origin_lat = df['lat'].mean()

df['x_m'] = (df['lon'] - origin_lon) * meters_per_degree * np.cos(np.radians(origin_lat))
df['y_m'] = (df['lat'] - origin_lat) * meters_per_degree

# 3. Rasterzellen erstellen (50m)
grid_size = 50  # Meter
df['grid_x'] = (df['x_m'] // grid_size).astype(int)
df['grid_y'] = (df['y_m'] // grid_size).astype(int)

# 4. Heatmap-Daten berechnen
heatmap_data = df.groupby(['grid_x', 'grid_y']).size().reset_index(name='counts')
heatmap_data = heatmap_data[heatmap_data['counts'] >= 1]

# Mittelpunktkoordinaten berechnen
heatmap_data['x_m_center'] = (heatmap_data['grid_x'] + 0.5) * grid_size
heatmap_data['y_m_center'] = (heatmap_data['grid_y'] + 0.5) * grid_size

heatmap_data['lon_center'] = (heatmap_data['x_m_center'] / (meters_per_degree * np.cos(np.radians(origin_lat)))) + origin_lon
heatmap_data['lat_center'] = (heatmap_data['y_m_center'] / meters_per_degree) + origin_lat

# 5. CSV-Dateien speichern
heatmap_data.to_csv('unfall_raster_50m_mit_mittelpunkt.csv', index=False)


# 6. Heatmap-Daten vorbereiten: pro Jahr und Monat
df['year_month'] = df['UJAHR'].astype(str) + '-' + df['UMONAT'].astype(str).str.zfill(2)
time_slices = sorted(df['year_month'].unique())

heat_data_by_month = []

for ym in time_slices:
    monthly = df[df['year_month'] == ym]
    heatmap_data = monthly.groupby(['grid_x', 'grid_y']).size().reset_index(name='counts')

    if heatmap_data.empty:
        heat_data_by_month.append([])  # Leere Liste für Monate ohne Daten
        continue

    heatmap_data['x_m_center'] = (heatmap_data['grid_x'] + 0.5) * grid_size
    heatmap_data['y_m_center'] = (heatmap_data['grid_y'] + 0.5) * grid_size

    heatmap_data['lon_center'] = (heatmap_data['x_m_center'] / (meters_per_degree * np.cos(np.radians(origin_lat)))) + origin_lon
    heatmap_data['lat_center'] = (heatmap_data['y_m_center'] / meters_per_degree) + origin_lat

    heat_points = heatmap_data[['lat_center', 'lon_center', 'counts']].values.tolist()
    heat_data_by_month.append(heat_points)


# 7. Interaktive Karte erstellen
m = folium.Map(location=[origin_lat, origin_lon], zoom_start=13)

# Benutzerdefinierter Farbverlauf
gradient = {0.2: "black", 0.4: "maroon", 0.6: "orange", 0.8: "yellow"}

# 8. Animierte Heatmap
HeatMapWithTime(
    data=heat_data_by_month,
    index=time_slices,
    radius=15,
    auto_play=True,
    max_opacity=0.8,
    gradient=gradient
).add_to(m)

# Legende anpassen
legend_html = '''
<div style="
    position: fixed; 
    bottom: 50px; left: 50px; width: 240px; height: 130px; 
    background-color: white;
    border:2px solid grey; 
    z-index:9999; 
    font-size:14px;
    padding: 10px;
">
<b>Legende: Unfall-Hotspots</b><br>
<span style="background-color:black;width:15px;height:15px;display:inline-block;"></span> Niedrig<br>
<span style="background-color:maroon;width:15px;height:15px;display:inline-block;"></span> Mittel<br>
<span style="background-color:orange;width:15px;height:15px;display:inline-block;"></span> Hoch<br>
<span style="background-color:yellow;width:15px;height:15px;display:inline-block;"></span> Sehr hoch<br>
</div>
'''

m.get_root().html.add_child(folium.Element(legend_html))


# 9. Karte speichern
m.save('unfall_heatmap_mit_animation.html')

print("Fertig: Animierte Heatmap nach Jahren erstellt.")


