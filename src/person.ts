// using ragdolls
import { Scene, Vector3, MeshBuilder, StandardMaterial, Color3, VertexData, Skeleton, Bone, Matrix } from "@babylonjs/core";
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

function createSkinnedPerson(scene, scale = 1) {
    const skeleton = new Skeleton("ragdollSkeleton", "0", scene);

    const root = new Bone("root", skeleton, null, Matrix.Translation(0, 2.5 * scale, 0));
    const body = new Bone("body", skeleton, root, Matrix.Translation(0, 0, 0));
    const head = new Bone("head", skeleton, body, Matrix.Translation(0, 1.25 * scale, 0));
    const leftArm = new Bone("leftArm", skeleton, body, Matrix.Translation(-0.75 * scale, 0.5 * scale, 0));
    const rightArm = new Bone("rightArm", skeleton, body, Matrix.Translation(0.75 * scale, 0.5 * scale, 0));
    const leftLeg = new Bone("leftLeg", skeleton, body, Matrix.Translation(-0.3 * scale, -1.5 * scale, 0));
    const rightLeg = new Bone("rightLeg", skeleton, body, Matrix.Translation(0.3 * scale, -1.5 * scale, 0));
    const leftFoot = new Bone("leftFoot", skeleton, leftLeg, Matrix.Translation(0, -0.5 * scale, 0.3 * scale));
    const rightFoot = new Bone("rightFoot", skeleton, rightLeg, Matrix.Translation(0, -0.5 * scale, 0.3 * scale));

    function makePart(size, offsetY, matColor) {
        const box = MeshBuilder.CreateBox("part", {height: size.y * scale, width: size.x * scale, depth: size.z * scale}, scene);
        box.position.y = offsetY * scale;
        const mat = new StandardMaterial("mat", scene);
        mat.diffuseColor = Color3.FromHexString(matColor);
        box.material = mat;
        return box;
    }

    const parts = [
        makePart({x: 1, y: 1.5, z: 0.5}, 2.5, "#4444FF"), // body
        makePart({x: 0.8, y: 0.8, z: 0.8}, 4, "#FF4444"), // head
        makePart({x: 0.4, y: 1.2, z: 0.4}, 2.5, "#44FF44"), // leftArm
        makePart({x: 0.4, y: 1.2, z: 0.4}, 2.5, "#44FF44"), // rightArm
        makePart({x: 0.4, y: 1.5, z: 0.4}, 1, "#FFAA00"), // leftLeg
        makePart({x: 0.4, y: 1.5, z: 0.4}, 1, "#FFAA00"), // rightLeg
        makePart({x: 0.5, y: 0.2, z: 0.7}, 0.25, "#AA00FF"), // leftFoot
        makePart({x: 0.5, y: 0.2, z: 0.7}, 0.25, "#AA00FF")  // rightFoot
    ];

    const merged = Mesh.MergeMeshes(parts, true, true, undefined, false, true);
    merged.position.y = 2.5 * scale;
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
