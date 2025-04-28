//import { Engine, Scene, ArcRotateCamera, HemisphericLight, Vector3, MeshBuilder, StandardMaterial, Texture, Color3, SceneLoader, InstancedMesh } from "babylonjs";
import { Engine, Scene, ArcRotateCamera, HemisphericLight, MotorEnabledJoint, Vector3, Mesh, AbstractMesh, ImportMeshAsync, MeshBuilder, StandardMaterial, Texture, Color3, SceneLoader, InstancedMesh } from "@babylonjs/core";
import { PhysicsImpostor, CannonJSPlugin, PhysicsJoint } from "@babylonjs/core/Physics";
import * as CANNON from "cannon-es";
import "@babylonjs/loaders";
import "@babylonjs/loaders/glTF";

import { Inspector } from '@babylonjs/inspector';

import { createLeafletTexture, latLonToTileXY } from "./map.ts"

import { createPerson, createSkinnedPerson, animatePerson } from "./person.ts";

const canvas = document.createElement("canvas");
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.style.position = "absolute";
canvas.id = "gameCanvas";
document.body.appendChild(canvas);

const engine = new Engine(canvas, true);
const scene = new Scene(engine);


scene.state = {
  person: {
    isGrounded: false,
    isWalking: false,
    speed: 4,
    angle: .5
  }
}

const useMap = true
const useBuildings = false
const mapDebug = true

// Inspector.Show(scene, {});

// not sure if this is needed
window.CANNON = CANNON;

let globalTime = 0;

// Camera & light
const camera = new ArcRotateCamera("camera", Math.PI / 2, Math.PI / 3, 100, Vector3.Zero(), scene);
camera.attachControl(canvas, true);
new HemisphericLight("light", new Vector3(1, 1, 0), scene);

// Enable physics
//scene.enablePhysics(new Vector3(0, -9.81, 0), new CannonJSPlugin(true, 10, CANNON));
scene.enablePhysics(new Vector3(0, 0, 0), new CannonJSPlugin(true, 10, CANNON));
let gravityEnabled = false;

// Ground with PNG texture
/* 
const ground = MeshBuilder.CreateGround("ground", { width: 512, height: 512 }, scene);
const groundMat = new StandardMaterial("groundMat", scene);
groundMat.diffuseTexture = new Texture("/ground.png", scene);
ground.material = groundMat;
*/
const groundSize = 512
const tileSize = 256
const ngTiles = 1 // neighboring tiles
const USE_UTM32 = true
const zoom = 13 
const zoomAdjust = USE_UTM32? -4 : 0

const ground = MeshBuilder.CreateGround("ground", { width: groundSize, height: groundSize }, scene);
const mapCenters = {
  "kaMarkt": { lat: 49.009229, lon: 8.403903 },
  "kaKunst": { lat: 49.011025, lon: 8.399885 },
  "kaZoo": { lat: 48.99672, lon: 8.40214 },
}

const tileGrid = Array.from({ length: ngTiles*2 + 1 }, () => Array(ngTiles*2 + 1).fill(0));
console.log("Tile grid", tileGrid);

const accidents = [
  { name:"amalienLeopold",	x: 455400.1622,y:	5428687.9744, lon:8.39011656400004,lat:	49.0094725400001},
  { name:"friedrichsplatz",	x: 456164.2146,	y: 5428501.1497, 	lon: 8.40058421800006, lat:49.0078467810001},
  { name:"zoo",	x: 0,	y: 0, 	lon: mapCenters.kaZoo.lon, lat:mapCenters.kaZoo.lat},
  {name:"a8",x:0,y:0, lat: 48.97072, lon: 8.44394},

]

// helper functions
// Helper: recursively find first mesh with geometry
function findFirstMeshWithGeometry(meshes: AbstractMesh[]): Mesh | null {
  for (const m of meshes) {
    if (m instanceof Mesh && m.getTotalVertices() > 0) return m;
  }
  return null;
}

// Load both GLTF models asynchronously
const loadModel = async (path: string, merge: boolean = false) => {
  const result = await ImportMeshAsync(path, scene);
  if (merge) {
    const meshes = result.meshes.filter(mesh => mesh instanceof Mesh && mesh.getTotalVertices() > 0) as Mesh[];
    if (meshes.length === 0) throw new Error(`No meshes with geometry found in ${path}`);
    meshes.forEach(mesh => mesh.parent = null);
    const merged = Mesh.MergeMeshes(meshes, true, true, undefined, false, true);
    return merged;
  } else {
    const mesh = findFirstMeshWithGeometry(result.meshes);
    if (!mesh) throw new Error(`No mesh with geometry found in ${path}`);
    mesh.parent = null;
    return mesh;
  }
};


// convert unfall coordinates to babylon
const accs = []
accidents.forEach((acc) => {
  const lon = acc.lon;
  const lat = acc.lat;
  const { x, y, pixelSize } = latLonToTileXY(lat, lon, zoom + zoomAdjust, USE_UTM32);
  console.log("Accident", acc.name, x, y, pixelSize);
  const pos = new Vector3(x, 0, y);
  console.log("Accident", acc.name, pos);
  accs.push(pos);
});
console.log("Accidents", accs);


// Create leaflet texture
if (useMap) {

  const gtx = await createLeafletTexture(scene,
    mapCenters.kaZoo.lat, mapCenters.kaZoo.lon, zoom + zoomAdjust, ngTiles,USE_UTM32);
  console.log("groundTexture dims", gtx.dims);

  const centerTileX = gtx.dims[4];
  const centerTileY = gtx.dims[5];

  for (let i = -ngTiles; i <= ngTiles; i++) {
    for (let j = -ngTiles; j <= ngTiles; j++) {
      const tileX = centerTileX + i;
      const tileY = centerTileY + j;
      tileGrid[ngTiles - j][ngTiles + i] = [tileX,tileY];
    }
  }
  console.log("Filled Tile Grid", tileGrid);

  const groundMat = new StandardMaterial("leafletMat", scene);
  groundMat.diffuseTexture = gtx.texture;
  groundMat.specularColor = new Color3(0.5, 0.5, 0.5); // Adjust reflectivity
  groundMat.specularPower = 100; // Control the sharpness of the reflection
  const groundScale = groundSize / gtx.dims[2]; // canvas width in pixels
  console.log("groundScale", groundScale,groundSize,gtx.dims[2]);
  const pxSize = gtx.dims[3];
  const unitSize = pxSize / groundScale
  console.log("ground px / unit size [m]", pxSize, unitSize);
  // compute offset of target to center
  const offsetX = -(gtx.dims[0] - tileSize / 2) * groundScale
  const offsetY = (gtx.dims[1] - tileSize / 2) * groundScale
  console.log("target offset", offsetX, offsetY);

  ground.material = groundMat;
  ground.rotation = new Vector3(0, Math.PI, 0);

  if (mapDebug) {
    const blueCube = MeshBuilder.CreateBox("blueCube", { size: 10 }, scene);
    blueCube.position = new Vector3(offsetX, 5, offsetY);
    const blueMat = new StandardMaterial("blueMat", scene);
    blueMat.diffuseColor = Color3.Blue();
    blueCube.material = blueMat;

    const redCube = MeshBuilder.CreateBox("blueCube", { size: 5 }, scene);

    // offset in tile
    const acc = accs[3]
    const redTile = [Math.floor(acc.x),Math.floor(acc.z)]
    console.log("Acc pos:", redTile);
    if (Math.abs(redTile[0] - centerTileX) > ngTiles || Math.abs(redTile[1] - centerTileY) > ngTiles) {
      console.log("Accident out of tile range", redTile, centerTileX, centerTileY);
    }
    const redOffs = [Math.floor(tileSize*(acc.x - redTile[0])), 
                     Math.floor(tileSize*(acc.z - redTile[1]))]
    console.log("Acc offset:", redOffs);
    // offset in tile
    let redX = -(redOffs[0] - tileSize / 2) * groundScale
    let redY = (redOffs[1] - tileSize / 2) * groundScale
    // find tile and adjust offset
    const redTileOffsX = redTile[0] - tileGrid[ngTiles][ngTiles][0]
    const redTileOffsY = redTile[1] - tileGrid[ngTiles][ngTiles][1]
    console.log("Tile offset", redTileOffsX, redTileOffsY);
    redX -= redTileOffsX * tileSize * groundScale
    redY += redTileOffsY * tileSize * groundScale

    //const redX = -offsetX + accs[0].x * groundScale
    // const redY = offsetY + accs[0].y * groundScale
    console.log("acc pos:", redX, redY);
    redCube.position = new Vector3(redX, 15, redY);
    const redMat = new StandardMaterial("redMat", scene);
    redMat.diffuseColor = Color3.Red();
    redCube.material = redMat;

  }

  const bikeModel = await loadModel("nextbike.glb",true);
  console.log("Bike model", bikeModel);
  bikeModel.setEnabled(false);
  bikeModel.isVisible = false;

  // Create 2 instances of model1 (moveable)
  const bikes: Mesh[] = [];
  // model1.material = texMat;
  for (let i = 0; i < 5; i++) {
    const inst = bikeModel.createInstance("bike_" + i);
    //const inst = bikeModel.clone("bike_" + i);
    inst.isVisible = true;
    inst.setEnabled(true);
    inst.scaling = new Vector3(10,10,10)
    inst.position = new Vector3(i * 10 -20, 0, 25);
    inst.showBoundingBox = true;
    inst.physicsImpostor = new PhysicsImpostor(
      inst, PhysicsImpostor.BoxImpostor, { mass: 3, restitution: 0.2, friction: .5 }, scene
    );

    bikes.push(inst);
  }
} else {
  const groundMat = new StandardMaterial("groundMat", scene);
  groundMat.diffuseColor = Color3.Gray();
  ground.material = groundMat;
}

ground.checkCollisions = true;
ground.physicsImpostor = new PhysicsImpostor(
  ground, 
  PhysicsImpostor.BoxImpostor, 
  { mass: 0, restitution: 0.5 }, 
  scene
);


  (async () => {
    const model1 = await loadModel("model1.glb");
    const model2 = await loadModel("model2.glb")
    const model3 = await loadModel("model3.glb")

    model1.setEnabled(false);
    model1.isVisible = false;
    model2.setEnabled(false);
    model2.isVisible = false;
    model3.setEnabled(false);
    model3.isVisible = false;

    // Material for model1 (color)
    const redMat = new StandardMaterial("redMat", scene);
    redMat.diffuseColor = Color3.Red();

    // Material2 for model1 (color)
    const blueMat = new StandardMaterial("redMat", scene);
    blueMat.diffuseColor = Color3.Blue();

    // Material for model2 (image texture)
    const texMat = new StandardMaterial("texMat", scene);
    texMat.diffuseTexture = new Texture("/texture1.png", scene);

    // Material for model3 (image texture)
    const texMat2 = new StandardMaterial("texMat", scene);
    texMat2.diffuseTexture = new Texture("/texture2.png", scene);

    // Create 2 instances of model1 (moveable)
    const movers: Mesh[] = [];
    // model1.material = texMat;
    for (let i = 0; i < 2; i++) {
      const inst = model1.clone("mover" + i);
      inst.isVisible = true;
      inst.setEnabled(true);
      // const inst = model1.createInstance("mover" + i);
      inst.position = new Vector3(i * 5 - 2, i * 5, 0);
      if (i == 0) inst.material = blueMat;
      movers.push(inst);
    }

    // Create 2 instances of model2 (physics objects)
    const droppers: Mesh[] = [];
    // model2.material = redMat;
    for (let i = 0; i < 3; i++) {
      const mdl = i == 0 ? model2 : model3;
      const inst = mdl.clone("dropper" + i);
      inst.isVisible = true;
      inst.setEnabled(true);
      // const inst = model2.createInstance("dropper" + i);
      inst.scaling = new Vector3(.3, .3, .2);

      inst.position = new Vector3(i * 10 - 10, (i + 1) * 5, - i * 15 + 8);
      inst.material = i == 0 ? redMat : i == 1 ? texMat : texMat2;
      inst.physicsImpostor = new PhysicsImpostor(
        inst, PhysicsImpostor.BoxImpostor, { mass: i == 0? 5:1, restitution: 0.3 }, scene
      );
      inst.physicsImpostor.onCollideEvent = (self, other) => {
        /*
        console.log(`onCollideEvent: self velocity: ${i}: ${self.getLinearVelocity()}, other velocity: ${other.getLinearVelocity()}`);
        const selfPosition = self.object?.getAbsolutePosition();
        console.log(`onCollideEvent: self position:  ${i}: ${selfPosition}`);
        */
      };

      droppers.push(inst);
    }

    // add joint between drops
    /*
    const joint = new CANNON.DistanceConstraint(droppers[0].physicsImpostor.physicsBody, droppers[1].physicsImpostor.physicsBody, {
      distance: 1,
      maxForce: 1000,
      localAnchorA: new CANNON.Vec3(0, 0, 0),
      localAnchorB: new CANNON.Vec3(0, 0, 0),
    });
    */
    /*
    var joint = new PhysicsJoint(PhysicsJoint.SpringJoint, {
    length: 5,
    stiffness: .5,
    damping: 0.1
    });
    droppers[1].physicsImpostor.addJoint(droppers[0].physicsImpostor, joint);  
    */
    //Add Joint
    const joint = new MotorEnabledJoint(PhysicsJoint.HingeJoint, {
      mainPivot: new Vector3(0, 0, 0),
      connectedPivot: new Vector3(5, 0, 0),
      mainAxis: new Vector3(0, 1, 1),
      connectedAxis: new Vector3(0, 1, 1),
    });
    droppers[1].physicsImpostor.addJoint(droppers[2].physicsImpostor, joint);
    joint.setMotor(0);

    // load person
    const person = createSkinnedPerson(scene);
    console.log(person)
    //person.bones.root.position = new Vector3(30,1,10)
    person.mesh.position = new Vector3(30, 5, 10)
    const personScale = new Vector3(5, 5, 5);
    person.mesh.scaling = personScale;
    person.mesh.physicsImpostor.forceUpdate(); // apply new size
    //person.mesh.scaling = new Vector3(5,4,6);
    person.mesh.showBoundingBox = true;
    //person.mesh.material.wireframe = true;

    //person.head.position = new Vector3(1, 25, 1);
    // person.body.position = new Vector3(1, 20, 1);
    function startWalking() {
      animatePerson(person, scene, engine);
    }


    // create buildings layer for geojson like so:
    // python3 geoMesh.py Gebaeudeflaeche_merged.geojson -s 2 -z -yz  -c
    if (useMap && useBuildings) {

      const bld = await loadModel("buildings.glb",true);
      if (bld) {
        bld.setEnabled(false);
        bld.isVisible = false;
        const buildings = bld.clone("buildings");

        const boundingInfo = buildings.getBoundingInfo();
        const boundingBox = boundingInfo.boundingBox;

        console.log("Buildings Bounding Box:");
        console.log("Minimum:", boundingBox.minimum);
        console.log("Maximum:", boundingBox.maximum);
        // Scale buildings to match ground dimensions and position at center
        const groundBoundingInfo = ground.getBoundingInfo();
        const groundSize = groundBoundingInfo.boundingBox.maximum.subtract(groundBoundingInfo.boundingBox.minimum);

        const buildingsBoundingInfo = buildings.getBoundingInfo();
        const buildingsSize = buildingsBoundingInfo.boundingBox.maximum.subtract(buildingsBoundingInfo.boundingBox.minimum);

        const scaleFactor = Math.min(
          groundSize.x / buildingsSize.x,
          groundSize.z / buildingsSize.z
        );
        console.log("Ground size", groundSize);
        console.log("Buildings size", buildingsSize);
        console.log("Scale factor", scaleFactor);
        buildings.scaling = new Vector3(scaleFactor, scaleFactor, scaleFactor);

        buildings.setEnabled(true);
        buildings.isVisible = true;
        buildings.position = new Vector3(-1, 10, -82);
        // rotate like ground texture
        buildings.rotation = new Vector3(Math.PI, 0, Math.PI)
        buildings.material = blueMat;
      }
    }


    // Main loop
    scene.onBeforeRenderObservable.add(() => {
      // Move first model instances (example logic)
      const time = performance.now() * 0.002;
      globalTime += 1 // Math.floor(time / 1000);
      //console.log("Global time: ", globalTime);
      movers.forEach((inst, i) => {
        inst.position.x += Math.sin(time + i) * 0.01;
      });


      // Check if droppers touch ground and dispose
      droppers.forEach((inst, i) => {
        if (globalTime == 50 && inst) {
          if (gravityEnabled == false) {
            gravityEnabled = true;
            console.log("Droppers: set gravity");
            const physicsEngine = scene.getPhysicsEngine();
            physicsEngine?.setGravity(new Vector3(0, -9.81, 0));
          }
        }
        if (globalTime == 150 && inst) {
          // impulse on dropper 0
          droppers[0].physicsImpostor.applyImpulse(new Vector3(2, 10, 10.6), droppers[0].getAbsolutePosition());
          joint.setMotor(3);
          startWalking();
        }

        if (inst && inst.position.y < 0.5) {
          inst.dispose();
          droppers[i] = null!;
          console.log("Droppers: disposed", i);
        }
      });
    });

  })();

engine.runRenderLoop(() => {
  scene.render();
});

window.addEventListener("resize", () => {
  engine.resize();
});
