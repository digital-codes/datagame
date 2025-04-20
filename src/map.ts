import proj4 from "proj4";

const USE_UTM32 = true

import {
  MeshBuilder,
  StandardMaterial,
  DynamicTexture,
  Scene,
  Vector3,
  Color3,
  Mesh,
} from "@babylonjs/core";

// Convert lat/lon to tile numbers at a given zoom
function latLonToTileXY_int(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const latRad = (lat * Math.PI) / 180;
  const n = Math.pow(2, zoom);
  const x = Math.floor((lon + 180) / 360 * n);
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y };
}

function latLonToTileXY(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const latRad = (lat * Math.PI) / 180;
  const n = Math.pow(2, zoom);
  const x = (lon + 180) / 360 * n;
  const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;
  return { x, y }; // float values now
}


// Include proj4 (from CDN or your build system)
proj4.defs("EPSG:25832", "+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs");

function getTile25832(lat: number, lon: number, zoom: number) {
  // 1. Convert lat/lon to EPSG:25832
  const [X, Y] = proj4("EPSG:4326", "EPSG:25832", [lon, lat]);

  // 2. Tile matrix origin (top-left corner in meters)
  // Adjusted origin so that tile 205/357 at Z9 contains Karlsruhe
  /*
  The correct source of truth is the TileMatrixSet definition for DE_EPSG_25832_ADV, 
  published by Germany's AdV / BKG (Bundesamt für Kartographie und Geodäsie).

  In WMTS capabilities (XML)
  https://sgx.geodatenzentrum.de/wmts_basemapde/1.0.0/WMTSCapabilities.xml

You can find a block like this:

xml
Kopieren
Bearbeiten
<TileMatrixSet>
  <ows:Identifier>DE_EPSG_25832_ADV</ows:Identifier>
  ...
  <TileMatrix>
    <ows:Identifier>09</ows:Identifier>
    <ScaleDenominator>34123.67334</ScaleDenominator>
    <TopLeftCorner>-41947.0 6303978.0</TopLeftCorner>
    <TileWidth>256</TileWidth>
    <TileHeight>256</TileHeight>
    <MatrixWidth>2653</MatrixWidth>
    <MatrixHeight>3518</MatrixHeight>
    
  */
  // from specs
  const originX = -46133.17;
  const originY = 6301219.54

  
  // 3. Pixel sizes per zoom level (in meters)
  const pixelSizes = [
    4891.96981025128, 2445.98490512564, 1222.99245256282,
    611.49622628141, 305.748113140705, 152.874056570353,
    76.4370282851763, 38.2185141425881, 19.1092570712941,
    9.55462853564703, 4.77731426782352, 2.38865713391176,
    1.19432856695588, 0.597164283477939
  ];

  const pixelSize = pixelSizes[zoom];
  const tileSize = 256;
  const tileSpan = tileSize * pixelSize;

  const x = (X - originX) / tileSpan
  const y = (originY - Y) / tileSpan; // Invert Y for tile coordinates
  console.log("UTM tile:", x, y)
  return { x, y, pixelSize }
}


// UTM32 04/11/6 => 07/89/51 => 08/178/102 => 09/357/205 (zoo)

// Get OpenStreetMap tile URL
function getTileUrl(x: number, y: number, z: number): string {
  let url
  if (!USE_UTM32) {
    url = `https://sgx.geodatenzentrum.de/wmts_basemapde/tile/1.0.0/de_basemapde_web_raster_farbe/default/GLOBAL_WEBMERCATOR/${z}/${y}/${x}.png`
  } else {
    url = `https://sgx.geodatenzentrum.de/wmts_basemapde/tile/1.0.0/de_basemapde_web_raster_farbe/default/DE_EPSG_25832_ADV/${z.toString().padStart(2, "0")}/${y}/${x}.png`
  }
  console.log(x, y, z, url)
  return url
}

// Draw multiple tiles to a canvas
async function drawTiles(ctx: CanvasRenderingContext2D, tileX: number, tileY: number, zoom: number, count: number) {
  const tileSize = 256;
  for (let dx = -count; dx <= count; dx++) {
    for (let dy = -count; dy <= count; dy++) {
      const x = tileX + dx;
      const y = tileY + dy;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = getTileUrl(x, y, zoom);

      await new Promise<void>((res, rej) => {
        img.onload = () => {
          ctx.drawImage(img, (count + dx) * tileSize, (count + dy) * tileSize, tileSize, tileSize);
          ctx.strokeStyle = "red";
          ctx.lineWidth = 2;
          ctx.strokeRect((count + dx) * tileSize, (count + dy) * tileSize, tileSize, tileSize);
          res();
        };
        img.onerror = rej;
      });
    }
  }
}



async function createLeafletTexture(
  scene: Scene,
  centerLat: number,
  centerLon: number,
  zoom: number,
  tileCount: number = 1,
): Promise<{ texture: DynamicTexture; dims: number[] }> {
  const tileSize = 256;
  const canvasSize = (tileCount * 2 + 1) * tileSize;

  zoom = USE_UTM32 ? zoom - 5 : zoom

  const canvas = document.createElement("canvas");
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext("2d")!;
  /*
  const { x: centerX, y: centerY } = latLonToTileXY(centerLat, centerLon, zoom);
  const startX = centerX - Math.floor(tileCount / 2);
  const startY = centerY - Math.floor(tileCount / 2);
  */
  const { x: tileXExact, y: tileYExact } = !USE_UTM32 ? latLonToTileXY(centerLat, centerLon, zoom) : getTile25832(centerLat, centerLon, zoom);
  console.log("Tile:", tileXExact, tileYExact)

  // Integer tile range
  const startX = Math.floor(tileXExact);
  const startY = Math.floor(tileYExact);

  // Offset of center lat/lon within the tile grid
  const offsetX = (tileXExact - startX) * tileSize;
  const offsetY = (tileYExact - startY) * tileSize;
  console.log("offset", offsetX, offsetY);
  //console.log(centerLat,centerLon)
  //console.log(startX,startY,tileCount)
  await drawTiles(ctx, startX, startY, zoom, tileCount);

  const texture = new DynamicTexture("leafletMap", canvas, scene, false);
  texture.update()
  return { texture: texture as DynamicTexture, dims: [offsetX, offsetY, canvasSize] };
}

// Main function to create the leaflet ground
async function createLeafletGround(
  scene: Scene,
  centerLat: number,
  centerLon: number,
  zoom: number,
  tileCount: number = 1,
  size = 1000

): Promise<Mesh> {
  const tileSize = 256;
  const canvasSize = (tileCount * 2 + 1) * tileSize;

  const canvas = document.createElement("canvas");
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext("2d")!;
  /*
  const { x: centerX, y: centerY } = latLonToTileXY(centerLat, centerLon, zoom);
  const startX = centerX - Math.floor(tileCount / 2);
  const startY = centerY - Math.floor(tileCount / 2);
  */
  const { x: tileXExact, y: tileYExact } = !USE_UTM32 ? latLonToTileXY(centerLat, centerLon, zoom) : getTile25832(centerLat, centerLon, zoom);
  // console.log(tileXExact, tileYExact)

  // Integer tile range
  const startX = Math.round(tileXExact);
  const startY = Math.round(tileYExact);

  // Offset of center lat/lon within the tile grid
  const offsetX = (tileXExact - startX) * tileSize;
  const offsetY = (tileYExact - startY) * tileSize;
  console.log("offset", offsetX, offsetY);
  //console.log(centerLat,centerLon)
  //console.log(startX,startY,tileCount)
  await drawTiles(ctx, startX, startY, zoom, tileCount);

  const texture = new DynamicTexture("leafletMap", canvas, scene, false);
  const mat = new StandardMaterial("leafletMat", scene);
  texture.update()
  mat.diffuseTexture = texture;
  mat.specularColor = new Color3(0.5, 0.5, 0.5); // Adjust reflectivity
  mat.specularPower = 100; // Control the sharpness of the reflection

  // const size = tileSize * tileCount; // scale up for scene size
  const ground = MeshBuilder.CreateGround("leafletGround", { width: size, height: size }, scene);
  const scale = size / canvasSize;
  ground.material = mat;
  // Shift ground to align exact map center to Babylon (0, 0, 0)
  ground.position.x = offsetY * scale // 0 // offsetX / scale // > 0 ? (offsetX - tileSize / 2)  : (offsetX + tileSize / 2)// * worldTileSize - worldTileSize/2 //tileSize * tileCount / 2;
  ground.position.z = -offsetX * scale // 0 // offsetY / scale // > 0 ? (-offsetY + tileSize / 2)  : (offsetY + tileSize / 2) // * worldTileSize - worldTileSize/2 // tileSize * tileCount / 2;
  // ground.rotation = new Vector3(0, Math.PI, 0);

  // Optional physics
  // ground.physicsImpostor = new BABYLON.PhysicsImpostor(ground, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0 }, scene);

  return ground;
}

export { createLeafletGround, latLonToTileXY, drawTiles, createLeafletTexture }
