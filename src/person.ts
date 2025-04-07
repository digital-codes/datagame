// using ragdolls
import { Scene, Vector3, MeshBuilder, StandardMaterial, Color3 } from "@babylonjs/core";
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

export { createPerson };
