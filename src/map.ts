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
  
    const canvas = document.createElement("canvas");
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext("2d")!;
    /*
    const { x: centerX, y: centerY } = latLonToTileXY(centerLat, centerLon, zoom);
    const startX = centerX - Math.floor(tileCount / 2);
    const startY = centerY - Math.floor(tileCount / 2);
    */
    const { x: tileXExact, y: tileYExact } = latLonToTileXY(centerLat, centerLon, zoom);

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
    const { x: tileXExact, y: tileYExact } = latLonToTileXY(centerLat, centerLon, zoom);

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
  
export {createLeafletGround, latLonToTileXY, drawTiles, createLeafletTexture }
