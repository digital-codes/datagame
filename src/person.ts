// using ragdolls
import { Scene, Vector3, MeshBuilder, StandardMaterial, Color3, VertexData, Mesh, Skeleton, Bone, Matrix } from "@babylonjs/core";
import { PhysicsImpostor, PhysicsJoint } from "@babylonjs/core/Physics";

function createPerson(scene: Scene, scale:Number = 1) {
    const colors = {
        head: "#FF0000",
        body: "#0000FF",
        arm: "#00FF00",
        leg: "#FFA500",
        foot: "#800080"
    };

    function createBox(name, size, color, position) {
        const mat = new StandardMaterial(name + "Mat", scene);
        mat.diffuseColor = Color3.FromHexString(color);

        const box = MeshBuilder.CreateBox(name, {height: size.y, width: size.x, depth: size.z}, scene);
        box.position = position;
        box.material = mat;
        box.physicsImpostor = new PhysicsImpostor(box, PhysicsImpostor.BoxImpostor, {mass: 1}, scene);
        return box;
    }

    const ragdoll = {
        head: createBox("head", {x: 0.5 * scale, y: 0.5 * scale, z: 0.5 * scale}, colors.head, new Vector3(0, 3.5 * scale, 0)),
        body: createBox("body", {x: 1 * scale, y: 1.5 * scale, z: 0.5 * scale}, colors.body, new Vector3(0, 2.5 * scale, 0)),
        leftArm: createBox("leftArm", {x: 0.4 * scale, y: 1 * scale, z: 0.4 * scale}, colors.arm, new Vector3(-0.8 * scale, 2.5 * scale, 0)),
        rightArm: createBox("rightArm", {x: 0.4 * scale, y: 1 * scale, z: 0.4 * scale}, colors.arm, new Vector3(0.8 * scale, 2.5 * scale, 0)),
        leftLeg: createBox("leftLeg", {x: 0.4 * scale, y: 1.2 * scale, z: 0.4 * scale}, colors.leg, new Vector3(-0.3 * scale, 1 * scale, 0)),
        rightLeg: createBox("rightLeg", {x: 0.4 * scale, y: 1.2 * scale, z: 0.4 * scale}, colors.leg, new Vector3(0.3 * scale, 1 * scale, 0)),
        leftFoot: createBox("leftFoot", {x: 0.5 * scale, y: 0.2 * scale, z: 0.8 * scale}, colors.foot, new Vector3(-0.3 * scale, 0.3 * scale, 0.3 * scale)),
        rightFoot: createBox("rightFoot", {x: 0.5 * scale, y: 0.2 * scale, z: 0.8 * scale}, colors.foot, new Vector3(0.3 * scale, 0.3 * scale, 0.3 * scale))
    };

    function addJoint(box1, box2, pivot1, pivot2) {
        const joint = new PhysicsJoint(PhysicsJoint.BallAndSocketJoint, {
            mainPivot: pivot1,
            connectedPivot: pivot2
        });
        box1.physicsImpostor.addJoint(box2.physicsImpostor, joint);
    }

    addJoint(ragdoll.head, ragdoll.body, new Vector3(0, -0.25 * scale, 0), new Vector3(0, 0.75 * scale, 0));
    addJoint(ragdoll.body, ragdoll.leftArm, new Vector3(-0.5 * scale, 0.5 * scale, 0), new Vector3(0, 0.5 * scale, 0));
    addJoint(ragdoll.body, ragdoll.rightArm, new Vector3(0.5 * scale, 0.5 * scale, 0), new Vector3(0, 0.5 * scale, 0));
    addJoint(ragdoll.body, ragdoll.leftLeg, new Vector3(-0.3 * scale, -0.75 * scale, 0), new Vector3(0, 0.6 * scale, 0));
    addJoint(ragdoll.body, ragdoll.rightLeg, new Vector3(0.3 * scale, -0.75 * scale, 0), new Vector3(0, 0.6 * scale, 0));
    addJoint(ragdoll.leftLeg, ragdoll.leftFoot, new Vector3(0, -0.6 * scale, 0), new Vector3(0, 0.1 * scale, -0.3 * scale));
    addJoint(ragdoll.rightLeg, ragdoll.rightFoot, new Vector3(0, -0.6 * scale, 0), new Vector3(0, 0.1 * scale, -0.3 * scale));

    return ragdoll;
}

function createSkinnedPerson1(scene, scale = 1) {
    const skeleton = new Skeleton("ragdollSkeleton", "0", scene);


    const root = new Bone("root", skeleton, null, Matrix.Translation(0, 2.5 * scale, 0));
    const body = new Bone("body", skeleton, root, Matrix.Translation(0, 0, 0));
    const head = new Bone("head", skeleton, body, Matrix.Translation(0, 1.25 * scale, 0));
    const leftArm = new Bone("leftArm", skeleton, body, Matrix.Translation(-1.75 * scale, 0.5 * scale, 0));
    const rightArm = new Bone("rightArm", skeleton, body, Matrix.Translation(1.75 * scale, 0.5 * scale, 0));
    const leftLeg = new Bone("leftLeg", skeleton, body, Matrix.Translation(-0.3 * scale, -1.5 * scale, 0));
    const rightLeg = new Bone("rightLeg", skeleton, body, Matrix.Translation(0.3 * scale, -1.5 * scale, 0));
    const leftFoot = new Bone("leftFoot", skeleton, leftLeg, Matrix.Translation(0, -0.5 * scale, 0.3 * scale));
    const rightFoot = new Bone("rightFoot", skeleton, rightLeg, Matrix.Translation(0, -0.5 * scale, 0.3 * scale));

    function makePart(name = "part", size, offset, matColor) {
        const box = MeshBuilder.CreateBox(name, {height: size.y * scale, width: size.x * scale, depth: size.z * scale}, scene);
        box.position.x += offset.x * scale;
        box.position.y += offset.y * scale;
        box.position.z += offset.z * scale;
        const mat = new StandardMaterial("mat", scene);
        mat.diffuseColor = Color3.FromHexString(matColor);
        box.material = mat;
        return box;
    }

    const parts = [
        makePart("sk_body",{x: 1, y: 1.5, z: 0.5}, {x: 0, y: 2.5, z: 0}, "#4444FF"), // body
        makePart("sk_head",{x: 0.8, y: 0.8, z: 0.8}, {x: 0, y: 4, z: 0}, "#FF4444"), // head
        makePart("sk_leftArm",{x: 0.4, y: 1.2, z: 0.4}, {x: -.50, y: 2.5, z: 0}, "#ccFFcc"), // leftArm
        makePart("sk_rightArm",{x: 0.4, y: 1.2, z: 0.4}, {x: .50, y: 2.5, z: 0}, "#44FF44"), // rightArm
        makePart("sk_leftLeg",{x: 0.4, y: 1.5, z: 0.4}, {x: -.3, y: 1, z: 0}, "#FFAA00"), // leftLeg
        makePart("sk_rightLeg",{x: 0.4, y: 1.5, z: 0.4}, {x: .3, y: 1, z: 0}, "#AAFF00"), // rightLeg
        makePart("sk_leftFoot",{x: 0.5, y: 0.2, z: 0.7}, {x: -.3, y: .25, z: .30}, "#AA00FF"), // leftFoot
        makePart("sk_rightFoot",{x: 0.5, y: 0.2, z: 0.7}, {x: .3, y: .25, z: .30}, "#AA00FF")  // rightFoot
    ];

    const merged = Mesh.MergeMeshes(parts, true, true, undefined, false, true);
    // merged.position.y = 2.5 * scale;
    merged.skeleton = skeleton;

    return {
        mesh: merged,
        skeleton: skeleton,
        bones: {
            root,
            body,
            head,
            leftArm,
            rightArm,
            leftLeg,
            rightLeg,
            leftFoot,
            rightFoot
        }
    };
}

function createSkinnedPerson(scene, scale = 1) {
    const skeleton = new Skeleton("ragdollSkeleton", "0", scene);

    const partSpecs = {
        "body": {
            matrix: new Vector3(0 * scale, 2.5 * scale, 0 * scale),
            size: {x: 1, y: 1.5, z: 0.5 },
            parentIdx: -1,
            color: "#FF4444"
        },
        "head": {
            matrix: new Vector3(0 * scale, 4 * scale, 0 * scale),
            size: { x: 0.8, y: 0.8, z: 0.8 },
            parentIdx: 0,
            color: "#44FF44"

        },
        "leftArm": {
            matrix: new Vector3(-0.7 * scale, 2.5 * scale, 0 * scale),
            size: { x: 0.4, y: 1.2, z: 0.4 },
            parentIdx: 0,
            color:  "#FFAA00"

        },
        "rightArm": {
            matrix: new Vector3(0.7 * scale, 2.5 * scale, 0 * scale),
            size: { x: 0.4, y: 1.2, z: 0.4 },
            parentIdx: 0,
            color: "#AA00FF"
        },
        "leftLeg": {
            matrix: new Vector3(-0.3 * scale, 1 * scale, 0 * scale),
            size: { x: 0.4, y: 1.5, z: 0.4 },
            parentIdx: 0,
            color: "#AA00FF"
        },
        "rightLeg": {
            matrix: new Vector3(0.3 * scale, 1 * scale, 0 * scale),
            size: { x: 0.4, y: 1.5, z: 0.4 },
            parentIdx: 0,
            color: "#AA00FF"
        },
        "leftFoot": {
            matrix: new Vector3(-.3 * scale, .25 * scale, 0.25 * scale),
            size: { x: 0.5, y: 0.2, z: 0.7 },
            parentIdx: 4, // leftLeg
            color: "#AA00FF"
        },
        "rightFoot": {
            matrix: new Vector3(.3 * scale, .25 * scale, 0.25 * scale),
            size: { x: 0.5, y: 0.2, z: 0.7 },
            parentIdx: 5, // rightLeg
            color: "#FF4444"
        }
    };

    // create root first
    const root = new Bone("root", skeleton, null, Matrix.Translation(0, 0, 0));

    const boneMap = []
    for (const key in partSpecs) {
        const pIdx = partSpecs[key].parentIdx;
        console.log(key,pIdx);
        const b = new Bone(
            key,
            skeleton,
            partSpecs[key].parentIdx == -1 ? root : boneMap[pIdx],
            Matrix.Translation(partSpecs[key].matrix.x, partSpecs[key].matrix.y, partSpecs[key].matrix.z)
        );
        boneMap.push(b);
    }

    /*
    const root = new Bone(
        "root",
        skeleton,
        null,
        Matrix.Translation(partSpecs.root.matrix.x, partSpecs.root.matrix.y, partSpecs.root.matrix.z)
    );
    */

    const partMeshes = [];

    boneMap.forEach((bone, index) => {
        console.log(bone.name, partSpecs[bone.name].color);
        const mesh = MeshBuilder.CreateBox("part" + index, {
            height: partSpecs[bone.name].size.x * scale,
            width: partSpecs[bone.name].size.y * scale,
            depth: partSpecs[bone.name].size.z * scale
        }, scene);

        mesh.position = bone.getAbsolutePosition();

        const mat = new StandardMaterial("mat" + index, scene);
        mat.diffuseColor = Color3.FromHexString(partSpecs[bone.name].color);
        mesh.material = mat;

        partMeshes.push(mesh);
    });

    const merged = Mesh.MergeMeshes(partMeshes, true, true, undefined, false, true);
    //merged.position.y = 2.5 * scale;
    merged.skeleton = skeleton;

    const vertexData = VertexData.ExtractFromMesh(merged);
    const numVertices = vertexData.positions.length / 3;
    const matricesIndices = [];
    const matricesWeights = [];

    for (let i = 0; i < numVertices; i++) {
        const idx = Math.floor(i / (numVertices / boneMap.length));
        matricesIndices.push(idx, 0, 0, 0);
        matricesWeights.push(1, 0, 0, 0);
    }

    vertexData.matricesIndices = matricesIndices;
    vertexData.matricesWeights = matricesWeights;
    vertexData.applyToMesh(merged);

    // push root before retuning
    boneMap.unshift(root)

    return {
        mesh: merged,
        skeleton: skeleton,
        bones: boneMap.reduce((acc, bone) => {
            acc[bone.name] = bone;
            return acc;
        }, {})
    };
}



function applyTorque(impostor, torqueVec) {
    const force = torqueVec.scale(1 / impostor.getObjectCenter().length());
    impostor.applyForce(force, impostor.getObjectCenter());
}

function animatePerson(ragdoll, scene:Scene) {
    let time = 0;

    scene.onBeforeRenderObservable.add(() => {
        time += scene.getEngine().getDeltaTime() / 1000;

        const frequency = 2;
        const amplitude = 2;

        const leftLegTorque = Math.sin(time * frequency) * amplitude;
        const rightLegTorque = -leftLegTorque;

        const leftArmTorque = -leftLegTorque * 0.5;
        const rightArmTorque = -rightLegTorque * 0.5;

        applyTorque(ragdoll.leftLeg.physicsImpostor, new Vector3(leftLegTorque, 0, 0));
        applyTorque(ragdoll.rightLeg.physicsImpostor, new Vector3(rightLegTorque, 0, 0));
        applyTorque(ragdoll.leftArm.physicsImpostor, new Vector3(leftArmTorque, 0, 0));
        applyTorque(ragdoll.rightArm.physicsImpostor, new Vector3(rightArmTorque, 0, 0));
    });
}



export { createPerson, createSkinnedPerson, animatePerson };
