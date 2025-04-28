import pyproj
import math

def latlon_to_tilexy_utm32(lat, lon, zoom):
    # 1. Convert lat/lon (EPSG:4326) to EPSG:25832
    transformer = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:25832", always_xy=True)
    X, Y = transformer.transform(lon, lat)

    # 2. Origin (from DE_EPSG_25832_ADV)
    originX = -46133.17
    originY = 6301219.54

    # 3. Pixel sizes per zoom level
    pixel_sizes = [
        4891.96981025128, 2445.98490512564, 1222.99245256282,
        611.49622628141, 305.748113140705, 152.874056570353,
        76.4370282851763, 38.2185141425881, 19.1092570712941,
        9.55462853564703, 4.77731426782352, 2.38865713391176,
        1.19432856695588, 0.597164283477939
    ]

    pixel_size = pixel_sizes[zoom]
    tile_size = 256  # pixels
    tile_span = tile_size * pixel_size  # meters

    # 4. Calculate tile x/y
    x = (X - originX) / tile_span
    y = (originY - Y) / tile_span  # invert Y

    return [x,y,pixel_size]

# Example usage:
if __name__ == "__main__":
    lat = 49.0069   # Karlsruhe
    lon = 8.4037
    zoom = 9
    result = latlon_to_tilexy_utm32(lat, lon, zoom)
    print(result)

