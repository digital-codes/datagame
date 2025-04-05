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
  function latLonToTileXY(lat: number, lon: number, zoom: number): { x: number; y: number } {
    const latRad = (lat * Math.PI) / 180;
    const n = Math.pow(2, zoom);
    const x = Math.floor((lon + 180) / 360 * n);
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
    return { x, y };
  }
  
  // Get OpenStreetMap tile URL
  function getTileUrl(x: number, y: number, z: number): string {
    //return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    const url = `https://sgx.geodatenzentrum.de/wmts_basemapde/tile/1.0.0/de_basemapde_web_raster_farbe/default/GLOBAL_WEBMERCATOR/${z}/${y}/${x}.png`
	  //const url = "https://sgx.geodatenzentrum.de/wmts_basemapde/tile/1.0.0/de_basemapde_web_raster_farbe/default/GLOBAL_WEBMERCATOR/13/2812/4286.png"
    // console.log(url)
    return url 
  }
  
  // Draw multiple tiles to a canvas
  async function drawTiles(ctx: CanvasRenderingContext2D, tileX: number, tileY: number, zoom: number, count: number) {
    const tileSize = 256;
    for (let dx = 0; dx < count; dx++) {
      for (let dy = 0; dy < count; dy++) {
        const x = tileX + dx;
        const y = tileY + dy;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = getTileUrl(x, y, zoom);
  
        await new Promise<void>((res, rej) => {
          img.onload = () => {
            console.log("draoing tile")
            ctx.drawImage(img, dx * tileSize, dy * tileSize, tileSize, tileSize);
            res();
          };
          img.onerror = rej;
        });
      }
    }
  }
  
  // Main function to create the leaflet ground
  export async function createLeafletGround(
    scene: Scene,
    centerLat: number,
    centerLon: number,
    zoom: number,
    tileCount: number = 2
  ): Promise<Mesh> {
    const tileSize = 256;
    const canvasSize = tileCount * tileSize;
  
    const canvas = document.createElement("canvas");
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext("2d")!;
  
    const { x: centerX, y: centerY } = latLonToTileXY(centerLat, centerLon, zoom);
    const startX = centerX - Math.floor(tileCount / 2);
    const startY = centerY - Math.floor(tileCount / 2);

    //console.log(centerLat,centerLon)
    //console.log(startX,startY,tileCount)
    await drawTiles(ctx, startX, startY, zoom, tileCount);
  
    const texture = new DynamicTexture("leafletMap", canvas, scene, false);
    const mat = new StandardMaterial("leafletMat", scene);
    texture.update()
    mat.diffuseTexture = texture;
    mat.specularColor = new Color3(0.5, 0.5, 0.5); // Adjust reflectivity
    mat.specularPower = 64; // Control the sharpness of the reflection
  
    const size = 512 //10 * tileCount; // scale up for scene size
    const ground = MeshBuilder.CreateGround("leafletGround", { width: size, height: size }, scene);
    ground.material = mat;
  
    // Optional physics
    // ground.physicsImpostor = new BABYLON.PhysicsImpostor(ground, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0 }, scene);
  
    return ground;
  }
  
