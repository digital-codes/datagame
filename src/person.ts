// using ragdolls
import { Scene, Engine, Vector3, Scalar, Quaternion, Angle, Space, MeshBuilder, StandardMaterial, Color3, VertexData, Mesh, Skeleton, Bone, Matrix } from "@babylonjs/core";
import { PhysicsImpostor, PhysicsJoint } from "@babylonjs/core/Physics";

interface CustomScene extends Scene {
  state: {
    person: {
      isGrounded: boolean;
      isWalking: boolean;
      speed: number;
      angle: number;
      fallen:boolean ;
      recovering:boolean;
    };
  };
}


interface SkinnedPerson {
    mesh: Mesh;
    skeleton: Skeleton;
    bones: Record<string, Bone>;
    velocity: Vector3;
}

function createPerson(scene: CustomScene) {
    const colors = {
        head: "#FF0000",
        body: "#0000FF",
        arm: "#00FF00",
        leg: "#FFA500",
        foot: "#800080"
    };

    function createBox(name: string, size: { x: number; y: number; z: number }, color: string, position: Vector3) {
        const mat = new StandardMaterial(name + "Mat", scene);
        mat.diffuseColor = Color3.FromHexString(color);

        const box = MeshBuilder.CreateBox(name, { height: size.y, width: size.x, depth: size.z }, scene);
        box.position = position;
        box.material = mat;
        box.physicsImpostor = new PhysicsImpostor(box, PhysicsImpostor.BoxImpostor, { mass: 1 }, scene);
        return box;
    }

    const ragdoll = {
        head: createBox("head", { x: 0.5, y: 0.5, z: 0.5 }, colors.head, new Vector3(0, 3.5, 0)),
        body: createBox("body", { x: 1, y: 1.5, z: 0.5 }, colors.body, new Vector3(0, 2.5, 0)),
        leftArm: createBox("leftArm", { x: 0.4, y: 1, z: 0.4 }, colors.arm, new Vector3(-0.8, 2.5, 0)),
        rightArm: createBox("rightArm", { x: 0.4, y: 1, z: 0.4 }, colors.arm, new Vector3(0.8, 2.5, 0)),
        leftLeg: createBox("leftLeg", { x: 0.4, y: 1.2, z: 0.4 }, colors.leg, new Vector3(-0.3, 1, 0)),
        rightLeg: createBox("rightLeg", { x: 0.4, y: 1.2, z: 0.4 }, colors.leg, new Vector3(0.3, 1, 0)),
        leftFoot: createBox("leftFoot", { x: 0.5, y: 0.2, z: 0.8 }, colors.foot, new Vector3(-0.3, 0.3, 0.3)),
        rightFoot: createBox("rightFoot", { x: 0.5, y: 0.2, z: 0.8 }, colors.foot, new Vector3(0.3, 0.3, 0.3))
    };

    function addJoint(box1:Mesh, box2:Mesh, pivot1:Vector3, pivot2:Vector3) {
        const joint = new PhysicsJoint(PhysicsJoint.BallAndSocketJoint, {
            mainPivot: pivot1,
            connectedPivot: pivot2
        });
        box1.physicsImpostor!.addJoint(box2.physicsImpostor!, joint);
    }

    addJoint(ragdoll.head, ragdoll.body, new Vector3(0, -0.25, 0), new Vector3(0, 0.75, 0));
    addJoint(ragdoll.body, ragdoll.leftArm, new Vector3(-0.5, 0.5, 0), new Vector3(0, 0.5, 0));
    addJoint(ragdoll.body, ragdoll.rightArm, new Vector3(0.5, 0.5, 0), new Vector3(0, 0.5, 0));
    addJoint(ragdoll.body, ragdoll.leftLeg, new Vector3(-0.3, -0.75, 0), new Vector3(0, 0.6, 0));
    addJoint(ragdoll.body, ragdoll.rightLeg, new Vector3(0.3, -0.75, 0), new Vector3(0, 0.6, 0));
    addJoint(ragdoll.leftLeg, ragdoll.leftFoot, new Vector3(0, -0.6, 0), new Vector3(0, 0.1, -0.3));
    addJoint(ragdoll.rightLeg, ragdoll.rightFoot, new Vector3(0, -0.6, 0), new Vector3(0, 0.1, -0.3));

    return ragdoll;
}


function createSkinnedPerson(scene: CustomScene) {
    const skeleton = new Skeleton("ragdollSkeleton", "0", scene);

    const partSpecs = {
        "body": {
            matrix: new Vector3(0, 2.5, 0),
            size: { x: 1, y: 1.5, z: 0.5 },
            parent: null,
            color: "#44FF44"
        },
        "head": {
            matrix: new Vector3(0, 1.4, 0),
            size: { x: 0.8, y: 0.8, z: 0.8 },
            parent: "body",
            color: "#44FF44"

        },
        "leftArm": {
            matrix: new Vector3(-1.1, .5, 0),
            size: { x: 1.1, y: .4, z: 0.4 },
            parent: "body",
            color: "#FFAA00"

        },
        "rightArm": {
            matrix: new Vector3(1.1, .5, 0),
            size: { x: 1.1, y: .4, z: 0.4 },
            parent: "body",
            color: "#AA00FF"
        },
        "leftLeg": {
            matrix: new Vector3(-0.3, -1.6, 0),
            size: { x: 0.4, y: 1.5, z: 0.4 },
            parent: "body",
            color: "#AA00FF"
        },
        "rightLeg": {
            matrix: new Vector3(0.3, -1.6, 0),
            size: { x: 0.4, y: 1.5, z: 0.4 },
            parent: "body",
            color: "#AA00FF"
        },
        "leftFoot": {
            matrix: new Vector3(0, -1, 0.2),
            size: { x: 0.5, y: 0.2, z: 0.7 },
            parent: "leftLeg",
            color: "#AA00FF"
        },
        "rightFoot": {
            matrix: new Vector3(0, -1, 0.2),
            size: { x: 0.5, y: 0.2, z: 0.7 },
            parent: "rightLeg",
            color: "#FF4444"
        }
    };

    // create root first
    const root = new Bone("root", skeleton, null, Matrix.Translation(0, 0, 0));
    // create bones from partspecs
    const boneMap = []
    for (const key in partSpecs) {
        const parentName = partSpecs[key as keyof typeof partSpecs].parent;
        const parent: Bone = parentName ? boneMap[Object.keys(partSpecs).indexOf(parentName)] : root;
        // console.log("Bone:",key, parent.name);
        const b: Bone = new Bone(
            key,
            skeleton,
            parent, // partSpecs[key].parentIdx == -1 ? root : Object.keys(partSpecs).indexOf(key)boneMap[pIdx],
            Matrix.Translation(partSpecs[key as keyof typeof partSpecs].matrix.x, partSpecs[key as keyof typeof partSpecs].matrix.y, partSpecs[key as keyof typeof partSpecs].matrix.z)
        );
        boneMap.push(b);
    }

    const partMeshes = [] as Mesh[]; // track meshes for merging

    const vertexRanges : { boneName: string; start: number; end: number }[] = []; // track ranges of vertices for bone assignment
    let vertexOffset = 0;

    boneMap.forEach((bone, index) => {
        // console.log("Mesh:",bone.name);
        const mesh = MeshBuilder.CreateBox("part_" + bone.name, {
            width: partSpecs[bone.name as keyof typeof partSpecs].size.x,
            height: partSpecs[bone.name as keyof typeof partSpecs].size.y,
            depth: partSpecs[bone.name as keyof typeof partSpecs].size.z
        }, scene);

        mesh.position = bone.getAbsolutePosition();

        const mat = new StandardMaterial("mat" + index, scene);
        mat.diffuseColor = Color3.FromHexString(partSpecs[bone.name as keyof typeof partSpecs].color);
        mesh.material = mat;
        mesh.skeleton = skeleton;

        const vertexData = VertexData.ExtractFromMesh(mesh);
        const vertexCount = vertexData.positions ? vertexData.positions.length / 3 : 0;
        // console.log("Pushing bone:", bone.name, "vertexCount:", vertexCount);
        vertexRanges.push({ boneName: bone.name, start: vertexOffset, end: vertexOffset + vertexCount });
        vertexOffset += vertexCount;

        partMeshes.push(mesh);
    });

    const merged = Mesh.MergeMeshes(partMeshes, true, true, undefined, false, true);
    merged!.skeleton = skeleton;
    merged!.alwaysSelectAsActiveMesh = true; // disables frustum culling

    if (!merged) {
        throw new Error("Mesh.MergeMeshes returned null");
    }
    const vertexData = VertexData.ExtractFromMesh(merged);
    const numVertices = vertexData.positions!.length / 3;
    const matricesIndices = [];
    const matricesWeights = [];

    for (let i = 0; i < numVertices; i++) {
        const boneIndex = (() => {
            for (const range of vertexRanges) {
                if (i >= range.start && i < range.end) {
                    const bone = skeleton.bones.find(b => b.name === range.boneName);
                    const bIdx = bone ? skeleton.bones.indexOf(bone) : -1;
                    // console.log("Bone index:", bIdx, "for bone:", bone.name);
                    return bIdx
                }
            }
            return 0; // fallback
        })();

        matricesIndices.push(boneIndex, 0, 0, 0);
        matricesWeights.push(1, 0, 0, 0);
    }

    vertexData.matricesIndices = matricesIndices;
    vertexData.matricesWeights = matricesWeights;
    vertexData.applyToMesh(merged);

    // reposition physics base to bottom of object
    // Set Y so feet rest on the ground (based on height of model)
    // do before adding physics
    merged.computeWorldMatrix(true); // ensure bounding info is accurate

    const mat = new StandardMaterial("mat_" + "body", scene);
    mat.diffuseColor = Color3.FromHexString(partSpecs["body"].color);
    merged.material = mat;

    // LAST! action: add physics
    merged.physicsImpostor = new PhysicsImpostor(
        merged,
        PhysicsImpostor.BoxImpostor,
        { mass: 1, friction: 0.5, restitution: 0.2 },
        scene
    );
    merged.physicsImpostor.onCollideEvent = (self, other) => {
        const selfName = (self.object as Mesh)?.name || "unknown";
        const otherName = (other.object as Mesh)?.name || "unknown";
        if (otherName !== "ground") {
            console.log(`Collision detected: self = ${selfName}, other = ${otherName}`);
            scene.state.person.speed = 0;
        }
        //console.log(`onCollideEvent: self velocity: ${self.getLinearVelocity()}, other velocity: ${other.getLinearVelocity()}`);
        //const selfPosition = self.object?.getAbsolutePosition();
        //console.log(`onCollideEvent: self position:  ${selfPosition}`);
    };


    // push root before retuning
    boneMap.unshift(root)

    const bones = boneMap.reduce((acc: Record<string, Bone>, bone) => {
        acc[bone.name] = bone;
        return acc;
    }, {} as Record<string, Bone>);
    console.log("bones:", bones);

    const skinnedPerson: SkinnedPerson = {
        mesh: merged,
        skeleton: skeleton,
        bones: bones,
        velocity: new Vector3(0, 0, 0)
    };

    return skinnedPerson;

}


function animatePerson(ragdoll:SkinnedPerson, scene: CustomScene, engine: Engine) {
    // Simple walking animation using bone rotations
    let time = 0;
    scene.onBeforeRenderObservable.add(() => {
        time += engine.getDeltaTime() / 1000;
        const speed = scene.state.person.speed;
        const angle = scene.state.person.angle * Math.sin(time * speed);

        ragdoll.bones.leftLeg.setRotation(new Vector3(angle, 0, 0), Space.LOCAL);
        ragdoll.bones.rightLeg.setRotation(new Vector3(-angle, 0, 0), Space.LOCAL);
        ragdoll.bones.leftArm.setRotation(new Vector3(0, 0, -angle * 0.5), Space.LOCAL);
        ragdoll.bones.rightArm.setRotation(new Vector3(-angle * 0.5, 0, 0), Space.LOCAL);
        ragdoll.bones.head.setRotation(new Vector3(0, -angle * 0.5, 0), Space.LOCAL);

        //ragdoll.mesh.position = ragdoll.bones.body.getAbsolutePosition();
        const dist = Math.abs(Math.cos(time * speed))
        if (speed != 0) {
            ragdoll.mesh.position.addInPlace(new Vector3(-dist * .01, 0, dist * .01));
        }


        // Local axes
        const localY = Vector3.TransformNormal(Vector3.Up(), ragdoll.mesh.getWorldMatrix()).normalize();
        const localZ = Vector3.TransformNormal(Vector3.Forward(), ragdoll.mesh.getWorldMatrix()).normalize();
        const globalY = Vector3.Up();

        // How off is local Y from world Y
        const dotY = Vector3.Dot(localY, globalY);
        const angleRad = Math.acos(dotY);
        const angleDeg = Angle.FromRadians(angleRad).degrees();
        const tiltAmount = Math.abs(angleDeg);

        // Only apply impulse if there's significant tilt
        if (tiltAmount > 10 && tiltAmount < 85) {
            console.log("Tilted!", tiltAmount);
            // Strength grows with tilt
            const strength = Scalar.Clamp((tiltAmount - 10) / 75, 0, 1);
            const basePower = 0.2 + 0.1 * strength;

            // Direction to push = opposite of current lean (local Y)
            // But reduce Z drift using localZ — blends stabilization and upright
            const correctionDir = localY.scale(-1).add(localZ.scale(-0.5)).normalize();
            const impulse = correctionDir.scale(basePower);
            console.log("Impulse:", impulse);
            ragdoll.mesh.physicsImpostor!.applyImpulse(impulse, ragdoll.mesh.getAbsolutePosition());
        }


        /*
        const localY = Vector3.TransformNormal(Vector3.Up(), ragdoll.mesh.getWorldMatrix()).normalize();
        const angleRad = Math.acos(Vector3.Dot(localY, Vector3.Up()));
        const angleDeg = Angle.FromRadians(angleRad).degrees();

        if (Math.abs(angleDeg) > 10 && Math.abs(angleDeg) < 85) {
            console.log("Stabilizing!",angleDeg);
            const correction = new Vector3(0, angleDeg > 0 ? -.2 : 0.2, 0);
            ragdoll.mesh.physicsImpostor.applyImpulse(correction, ragdoll.mesh.getAbsolutePosition());
        }
        */

        if (Math.abs(angleDeg) >= 85 && !scene.state.person.fallen) {
            console.log("Fallen!");
            scene.state.person.fallen = true;
            scene.state.person.recovering = false;
        }

        if (scene.state.person.fallen && Math.abs(angleDeg) < 10 && !scene.state.person.recovering) {
            console.log("Recovering!");
            scene.state.person.recovering = true;
            ragdoll.mesh.physicsImpostor!.setLinearVelocity(Vector3.Zero());
            ragdoll.mesh.physicsImpostor!.setAngularVelocity(Vector3.Zero());
            ragdoll.mesh.physicsImpostor!.setDeltaRotation(Quaternion.Identity());
            ragdoll.mesh.physicsImpostor!.setDeltaPosition(ragdoll.mesh.getAbsolutePosition().add(new Vector3(0, 1, 0)));
        }

        if (!scene.state.person.fallen) {
            ragdoll.bones.leftLeg.setRotation(new Vector3(angle, 0, 0), Space.LOCAL);
            ragdoll.bones.rightLeg.setRotation(new Vector3(-angle, 0, 0), Space.LOCAL);
            ragdoll.bones.leftArm.setRotation(new Vector3(-angle * 0.5, 0, 0), Space.LOCAL);
            ragdoll.bones.rightArm.setRotation(new Vector3(angle * 0.5, 0, 0), Space.LOCAL);
            ragdoll.bones.leftFoot.setRotation(new Vector3(Math.sin(time * speed + Math.PI) * 0.3, 0, 0), Space.LOCAL);
            ragdoll.bones.rightFoot.setRotation(new Vector3(Math.sin(time * speed) * 0.3, 0, 0), Space.LOCAL);

            const velocity = ragdoll.mesh.physicsImpostor!.getLinearVelocity();
            const isGrounded = Math.abs(velocity!.y) < 0.1;

            if (isGrounded) {
                const walkImpulse = new Vector3(0, 0, -0.01);
                ragdoll.mesh.physicsImpostor!.applyImpulse(walkImpulse, ragdoll.mesh.getAbsolutePosition());
            }
        }

        /*
        // Check if grounded (simple check)
        const velocity = ragdoll.mesh.physicsImpostor.getLinearVelocity();
        scene.state.person.isGrounded = Math.abs(velocity.y) < 0.1;

        // Only move forward if grounded
        if (scene.state.person.isGrounded && !scene.state.person.isWalking) {
            console.log("Push!")
            scene.state.person.isWalking = true;
            const walkImpulse = new Vector3(0, 0, -2);
            const pos = ragdoll.mesh.getAbsolutePosition();
            console.log("ragdoll pos:", pos);
            ragdoll.mesh.physicsImpostor.applyImpulse(walkImpulse, pos);
        }
        */


    });
}


export { createPerson, createSkinnedPerson, animatePerson };
