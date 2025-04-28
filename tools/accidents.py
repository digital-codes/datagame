import utm32 as toUtm
import pandas as pd
import os 
import math 

df = pd.read_csv('../public/unfall2023.csv', sep=';')

zooms = [14,13,12,11]
zoomAdjust = -4

center = (49.0069, 8.4037)  # Karlsruhe

for zm in zooms:
    zoom = zm + zoomAdjust
    zcenter = toUtm.latlon_to_tilexy_utm32(center[0], center[1], zoom)
    try:
        centerTile = [math.floor(zcenter[0]), math.floor(zcenter[1])]
    except:
        print(f"Error calculating tile for zoom {zm}: {zcenter}")
        
    df[f'Z_{zm}_X'] = df.apply(lambda row: math.floor(toUtm.latlon_to_tilexy_utm32(row['YGCSWGS84'], row['XGCSWGS84'], zoom)[0]), axis=1)
    df[f'Z_{zm}_Y'] = df.apply(lambda row: math.floor(toUtm.latlon_to_tilexy_utm32(row['YGCSWGS84'], row['XGCSWGS84'], zoom)[1]), axis=1)

df.drop(columns=["OID_","UIDENTSTLAE","ULAND","UREGBEZ","UKREIS","UGEMEINDE","UART","UTYP1","ULICHTVERH","IstStrassenzustand","IstKrad","IstGkfz","IstSonstige","LINREFX","LINREFY",], inplace=True)
df.to_json('accidents.json', orient='records', lines=True, force_ascii=False)

