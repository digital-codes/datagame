//import { Engine, Scene, ArcRotateCamera, HemisphericLight, Vector3, MeshBuilder, StandardMaterial, Texture, Color3, SceneLoader, InstancedMesh } from "babylonjs";
import { Engine, Scene, ArcRotateCamera, HemisphericLight, MotorEnabledJoint, Vector3, Mesh, AbstractMesh, ImportMeshAsync, MeshBuilder, StandardMaterial, Texture, Color3, SceneLoader, InstancedMesh } from "@babylonjs/core";
import { PhysicsImpostor, CannonJSPlugin, PhysicsJoint } from "@babylonjs/core/Physics";
import * as CANNON from "cannon-es";
import "@babylonjs/loaders";
import "@babylonjs/loaders/glTF";

import { Inspector } from '@babylonjs/inspector';

import { createLeafletTexture, drawTiles } from "./map.ts"

import { createPerson, createSkinnedPerson, animatePerson } from "./person.ts";

const canvas = document.createElement("canvas");
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.style.position = "absolute";
canvas.id = "gameCanvas";
document.body.appendChild(canvas);

const engine = new Engine(canvas, true);
const scene = new Scene(engine);

const useMap = false
const mapDebug = false

Inspector.Show(scene, {});

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
const ground = MeshBuilder.CreateGround("ground", { width: groundSize, height: groundSize }, scene);
const mapCenters = {
  "kaMarkt": { lat: 49.009229, lon: 8.403903 },
  "kaKunst": { lat: 49.011025, lon: 8.399885 },
  "kaZoo": { lat: 48.99672, lon: 8.40214 },
}
// Create leaflet texture
if (useMap) {

const gtx = await createLeafletTexture(scene,
  mapCenters.kaZoo.lat, mapCenters.kaZoo.lon, 14, 1);
console.log("groundTexture dims", gtx.dims);
const groundMat = new StandardMaterial("leafletMat", scene);
groundMat.diffuseTexture = gtx.texture;
groundMat.specularColor = new Color3(0.5, 0.5, 0.5); // Adjust reflectivity
groundMat.specularPower = 100; // Control the sharpness of the reflection
const groundScale = groundSize / gtx.dims[2];
console.log("groundScale", groundScale);
// compute offset of target to center
const tileSize = 256
const offsetX = -(gtx.dims[0] - tileSize / 2) * groundScale
const offsetY = (gtx.dims[1] - tileSize / 2) * groundScale

ground.material = groundMat;
ground.rotation = new Vector3(0, Math.PI, 0);
ground.checkCollisions = true;
ground.physicsImpostor = new PhysicsImpostor(
  ground, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.5 }, scene
);

if (mapDebug) {
  const blueCube = MeshBuilder.CreateBox("blueCube", { size: 10 }, scene);
  blueCube.position = new Vector3(offsetX, 5, offsetY);
  const blueMat = new StandardMaterial("blueMat", scene);
  blueMat.diffuseColor = Color3.Blue();
  blueCube.material = blueMat;
}
} else {
  const groundMat = new StandardMaterial("groundMat", scene);
  groundMat.diffuseColor = Color3.Gray();
  ground.material = groundMat;
}

ground.checkCollisions = true;
ground.physicsImpostor = new PhysicsImpostor(
  ground, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.5 }, scene
)

// Helper: recursively find first mesh with geometry
function findFirstMeshWithGeometry(meshes: AbstractMesh[]): Mesh | null {
  for (const m of meshes) {
    if (m instanceof Mesh && m.getTotalVertices() > 0) return m;
  }
  return null;
}

// Load both GLTF models asynchronously
const loadModel = async (path: string) => {
  const result = await ImportMeshAsync(path, scene);
  const mesh = findFirstMeshWithGeometry(result.meshes);

  if (!mesh) throw new Error(`No mesh with geometry found in ${path}`);
  mesh.parent = null;
  return mesh;
};

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

    inst.position = new Vector3(i * 10 - 10, (i + 1) * 5, i * 15 - 8);
    inst.material = i == 0 ? redMat : i == 1 ? texMat : texMat2;
    inst.physicsImpostor = new PhysicsImpostor(
      inst, PhysicsImpostor.BoxImpostor, { mass: 1, restitution: 0.3 }, scene
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
  const person = createSkinnedPerson(scene, 5);
  console.log(person)
  //person.bones.root.position = new Vector3(30,1,10)
  person.mesh.position = new Vector3(30,1,10)
  person.mesh.scaling = new Vector3(2,1,1);
  person.mesh.showBoundingBox = true;
  //person.head.position = new Vector3(1, 25, 1);
  // person.body.position = new Vector3(1, 20, 1);
  function startWalking() {
    animatePerson(person, scene,engine);
  }


  // create buildings layer for geojson like so:
  // python3 geoMesh.py Gebaeudeflaeche_merged.geojson -s 2 -z -yz  -c
  if (useMap) {

  const bld = await loadModel("buildings.glb");
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
        droppers[0].physicsImpostor.applyImpulse(new Vector3(.2, 3, .2), droppers[0].getAbsolutePosition());
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
