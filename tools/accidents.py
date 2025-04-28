import utm32 as toUtm
import pandas as pd
import math 

path = "../public/"
file = "unfall2023"

df = pd.read_csv("".join([path,file,".csv"]), sep=';')
df.rename(columns={
    'XGCSWGS84': 'lon',
    'YGCSWGS84': 'lat',
}, inplace=True)
df.drop(columns=["OID_","PLST","UIDENTSTLAE","ULAND","UREGBEZ","UKREIS","UGEMEINDE","UART","UTYP1","ULICHTVERH","IstStrassenzustand","IstKrad","IstGkfz","IstSonstige","LINREFX","LINREFY",], inplace=True)

zooms = [14,13,12,11]
zoomAdjust = -4

center = (49.0069, 8.4037)  # Karlsruhe lat,lon

for zm in zooms:
    zoom = zm + zoomAdjust
    zcenter = toUtm.latlon_to_tilexy_utm32(center[0], center[1], zoom)
    try:
        centerTile = [math.floor(zcenter[0]), math.floor(zcenter[1])]
    except:
        print(f"Error calculating tile for zoom {zm}: {zcenter}")
        
    # df[f'Z_{zm}_X'] = df.apply(lambda row: math.floor(toUtm.latlon_to_tilexy_utm32(row['lat'], row['lon'], zoom)[0]), axis=1)
    # df[f'Z_{zm}_Y'] = df.apply(lambda row: math.floor(toUtm.latlon_to_tilexy_utm32(row['lat'], row['lon'], zoom)[1]), axis=1)
    # df[f'Z_{zm}_S'] = df.apply(lambda row: math.floor(toUtm.latlon_to_tilexy_utm32(row['lat'], row['lon'], zoom)[2]), axis=1)
    df[f'Z_{zm}'] = df.apply(lambda row: toUtm.latlon_to_tilexy_utm32(row['lat'], row['lon'], zoom), axis=1)
    

df.to_json("".join([path,file,".json"]), orient='records', lines=True, force_ascii=False)

