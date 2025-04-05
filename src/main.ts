//import { Engine, Scene, ArcRotateCamera, HemisphericLight, Vector3, MeshBuilder, StandardMaterial, Texture, Color3, SceneLoader, InstancedMesh } from "babylonjs";
import { Engine, Scene, ArcRotateCamera, HemisphericLight, Vector3, Mesh, AbstractMesh, ImportMeshAsync, MeshBuilder, StandardMaterial, Texture, Color3, SceneLoader, InstancedMesh } from "@babylonjs/core";
import { PhysicsImpostor, CannonJSPlugin } from "@babylonjs/core/Physics";
import * as CANNON from "cannon-es";
import "@babylonjs/loaders";
import "@babylonjs/loaders/glTF";

const canvas = document.createElement("canvas");
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.style.position = "absolute";
canvas.id = "gameCanvas";
document.body.appendChild(canvas);

const engine = new Engine(canvas, true);
const scene = new Scene(engine);

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
const ground = MeshBuilder.CreateGround("ground", { width: 100, height: 100 }, scene);
const groundMat = new StandardMaterial("groundMat", scene);
groundMat.diffuseTexture = new Texture("/ground.png", scene);
ground.material = groundMat;
ground.checkCollisions = true;
ground.physicsImpostor = new PhysicsImpostor(
  ground, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.5 }, scene
);

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

  // Create 2 instances of model1 (moveable)
  const movers: Mesh[] = [];
  // model1.material = texMat;
  for (let i = 0; i < 2; i++) {
    const inst = model1.clone("mover" + i);
    inst.isVisible = true;
    inst.setEnabled(true);
    // const inst = model1.createInstance("mover" + i);
    inst.position = new Vector3(i * 5 - 2, i*5, 0);
    if (i == 0) inst.material = blueMat;
    movers.push(inst);
  }

  // Create 2 instances of model2 (physics objects)
  const droppers: InstancedMesh[] = [];
  // model2.material = redMat;
  for (let i = 0; i < 3; i++) {
    const mdl = i == 0 ? model2 : model3;
    const inst = mdl.clone("dropper" + i);
    inst.isVisible = true;
    inst.setEnabled(true);
    // const inst = model2.createInstance("dropper" + i);
    inst.scaling = new Vector3(.3,.3,.2);

    inst.position = new Vector3(i * 10 - 10, (i+1)*5 , i*15 - 8);
    inst.material = i == 1 ? redMat : texMat;
    inst.physicsImpostor = new PhysicsImpostor(
      inst, PhysicsImpostor.BoxImpostor, { mass: 1, restitution: 0.3 }, scene
    );
    inst.physicsImpostor.onCollideEvent = (self, other) => {
      console.log(`onCollideEvent: self velocity: ${i}: ${self.getLinearVelocity()}, other velocity: ${other.getLinearVelocity()}`);
      const selfPosition = self.object?.getAbsolutePosition();
      console.log(`onCollideEvent: self position:  ${i}: ${selfPosition}`);
    };

    droppers.push(inst);
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
      }

      if (inst && inst.position.y < 0.5) {
        inst.dispose();
        droppers[i] = null!;
        console.log("Droppers: disposed",i);
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
