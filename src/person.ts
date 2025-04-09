// using ragdolls
import { Scene, Engine, Vector3, Space, MeshBuilder, StandardMaterial, Color3, VertexData, Mesh, Skeleton, Bone, Matrix } from "@babylonjs/core";
import { PhysicsImpostor, PhysicsJoint } from "@babylonjs/core/Physics";

function createPerson(scene: Scene) {
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

        const box = MeshBuilder.CreateBox(name, { height: size.y, width: size.x, depth: size.z }, scene);
        box.position = position;
        box.material = mat;
        box.physicsImpostor = new PhysicsImpostor(box, PhysicsImpostor.BoxImpostor, { mass: 1 }, scene);
        return box;
    }

    const ragdoll = {
        head: createBox("head", { x: 0.5 , y: 0.5 , z: 0.5  }, colors.head, new Vector3(0, 3.5 , 0)),
        body: createBox("body", { x: 1 , y: 1.5 , z: 0.5  }, colors.body, new Vector3(0, 2.5 , 0)),
        leftArm: createBox("leftArm", { x: 0.4 , y: 1 , z: 0.4  }, colors.arm, new Vector3(-0.8 , 2.5 , 0)),
        rightArm: createBox("rightArm", { x: 0.4 , y: 1 , z: 0.4  }, colors.arm, new Vector3(0.8 , 2.5 , 0)),
        leftLeg: createBox("leftLeg", { x: 0.4 , y: 1.2 , z: 0.4  }, colors.leg, new Vector3(-0.3 , 1 , 0)),
        rightLeg: createBox("rightLeg", { x: 0.4 , y: 1.2 , z: 0.4  }, colors.leg, new Vector3(0.3 , 1 , 0)),
        leftFoot: createBox("leftFoot", { x: 0.5 , y: 0.2 , z: 0.8  }, colors.foot, new Vector3(-0.3 , 0.3 , 0.3 )),
        rightFoot: createBox("rightFoot", { x: 0.5 , y: 0.2 , z: 0.8  }, colors.foot, new Vector3(0.3 , 0.3 , 0.3 ))
    };

    function addJoint(box1, box2, pivot1, pivot2) {
        const joint = new PhysicsJoint(PhysicsJoint.BallAndSocketJoint, {
            mainPivot: pivot1,
            connectedPivot: pivot2
        });
        box1.physicsImpostor.addJoint(box2.physicsImpostor, joint);
    }

    addJoint(ragdoll.head, ragdoll.body, new Vector3(0, -0.25 , 0), new Vector3(0, 0.75 , 0));
    addJoint(ragdoll.body, ragdoll.leftArm, new Vector3(-0.5 , 0.5 , 0), new Vector3(0, 0.5 , 0));
    addJoint(ragdoll.body, ragdoll.rightArm, new Vector3(0.5 , 0.5 , 0), new Vector3(0, 0.5 , 0));
    addJoint(ragdoll.body, ragdoll.leftLeg, new Vector3(-0.3 , -0.75 , 0), new Vector3(0, 0.6 , 0));
    addJoint(ragdoll.body, ragdoll.rightLeg, new Vector3(0.3 , -0.75 , 0), new Vector3(0, 0.6 , 0));
    addJoint(ragdoll.leftLeg, ragdoll.leftFoot, new Vector3(0, -0.6 , 0), new Vector3(0, 0.1 , -0.3 ));
    addJoint(ragdoll.rightLeg, ragdoll.rightFoot, new Vector3(0, -0.6 , 0), new Vector3(0, 0.1 , -0.3 ));

    return ragdoll;
}

function createSkinnedPerson1(scene) {
    const skeleton = new Skeleton("ragdollSkeleton", "0", scene);


    const root = new Bone("root", skeleton, null, Matrix.Translation(0, 2.5 , 0));
    const body = new Bone("body", skeleton, root, Matrix.Translation(0, 0, 0));
    const head = new Bone("head", skeleton, body, Matrix.Translation(0, 1.25 , 0));
    const leftArm = new Bone("leftArm", skeleton, body, Matrix.Translation(-1.75 , 0.5 , 0));
    const rightArm = new Bone("rightArm", skeleton, body, Matrix.Translation(1.75 , 0.5 , 0));
    const leftLeg = new Bone("leftLeg", skeleton, body, Matrix.Translation(-0.3 , -1.5 , 0));
    const rightLeg = new Bone("rightLeg", skeleton, body, Matrix.Translation(0.3 , -1.5 , 0));
    const leftFoot = new Bone("leftFoot", skeleton, leftLeg, Matrix.Translation(0, -0.5 , 0.3 ));
    const rightFoot = new Bone("rightFoot", skeleton, rightLeg, Matrix.Translation(0, -0.5 , 0.3 ));

    function makePart(name = "part", size, offset, matColor) {
        const box = MeshBuilder.CreateBox(name, { height: size.y , width: size.x , depth: size.z  }, scene);
        box.position.x += offset.x ;
        box.position.y += offset.y ;
        box.position.z += offset.z ;
        const mat = new StandardMaterial("mat", scene);
        mat.diffuseColor = Color3.FromHexString(matColor);
        box.material = mat;
        return box;
    }

    const parts = [
        makePart("sk_body", { x: 1, y: 1.5, z: 0.5 }, { x: 0, y: 2.5, z: 0 }, "#4444FF"), // body
        makePart("sk_head", { x: 0.8, y: 0.8, z: 0.8 }, { x: 0, y: 4, z: 0 }, "#FF4444"), // head
        makePart("sk_leftArm", { x: 0.4, y: 1.2, z: 0.4 }, { x: -.50, y: 2.5, z: 0 }, "#ccFFcc"), // leftArm
        makePart("sk_rightArm", { x: 0.4, y: 1.2, z: 0.4 }, { x: .50, y: 2.5, z: 0 }, "#44FF44"), // rightArm
        makePart("sk_leftLeg", { x: 0.4, y: 1.5, z: 0.4 }, { x: -.3, y: 1, z: 0 }, "#FFAA00"), // leftLeg
        makePart("sk_rightLeg", { x: 0.4, y: 1.5, z: 0.4 }, { x: .3, y: 1, z: 0 }, "#AAFF00"), // rightLeg
        makePart("sk_leftFoot", { x: 0.5, y: 0.2, z: 0.7 }, { x: -.3, y: .25, z: .30 }, "#AA00FF"), // leftFoot
        makePart("sk_rightFoot", { x: 0.5, y: 0.2, z: 0.7 }, { x: .3, y: .25, z: .30 }, "#AA00FF")  // rightFoot
    ];

    const merged = Mesh.MergeMeshes(parts, true, true, undefined, false, true);
    // merged.position.y = 2.5 ;
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

function createSkinnedPerson(scene) {
    const skeleton = new Skeleton("ragdollSkeleton", "0", scene);

    const partSpecs = {
        "body": {
            matrix: new Vector3(0 , 2.5 , 0 ),
            size: { x: 1, y: 1.5, z: 0.5 },
            parent: null,
            color: "#44FF44"
        },
        "head": {
            matrix: new Vector3(0 , 1.4 , 0 ),
            size: { x: 0.8, y: 0.8, z: 0.8 },
            parent: "body",
            color: "#44FF44"

        },
        "leftArm": {
            matrix: new Vector3(-1.1 , .5 , 0 ),
            size: { x: 1.1, y: .4, z: 0.4 },
            parent: "body",
            color: "#FFAA00"

        },
        "rightArm": {
            matrix: new Vector3(1.1 , .5 , 0 ),
            size: { x: 1.1, y: .4, z: 0.4 },
            parent: "body",
            color: "#AA00FF"
        },
        "leftLeg": {
            matrix: new Vector3(-0.3 , -1.6 , 0 ),
            size: { x: 0.4, y: 1.5, z: 0.4 },
            parent: "body",
            color: "#AA00FF"
        },
        "rightLeg": {
            matrix: new Vector3(0.3 , -1.6 , 0 ),
            size: { x: 0.4, y: 1.5, z: 0.4 },
            parent: "body",
            color: "#AA00FF"
        },
        "leftFoot": {
            matrix: new Vector3(0 , -1 , 0.2 ),
            size: { x: 0.5, y: 0.2, z: 0.7 },
            parent: "leftLeg",
            color: "#AA00FF"
        },
        "rightFoot": {
            matrix: new Vector3(0 , -1 , 0.2 ),
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
        const parent: Bone = boneMap[Object.keys(partSpecs).indexOf(partSpecs[key].parent)] || root;
        console.log("Bone:",key, parent.name);
        const b: Bone = new Bone(
            key,
            skeleton,
            parent, // partSpecs[key].parentIdx == -1 ? root : Object.keys(partSpecs).indexOf(key)boneMap[pIdx],
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
    const parts = {}

    const vertexRanges = []; // track ranges of vertices for bone assignment
    let vertexOffset = 0;

    boneMap.forEach((bone, index) => {
        console.log("Mesh:",bone.name);
        const mesh = MeshBuilder.CreateBox("part_" + bone.name, {
            width: partSpecs[bone.name].size.x ,
            height: partSpecs[bone.name].size.y ,
            depth: partSpecs[bone.name].size.z 
        }, scene);

        mesh.position = bone.getAbsolutePosition();

        const mat = new StandardMaterial("mat" + index, scene);
        mat.diffuseColor = Color3.FromHexString(partSpecs[bone.name].color);
        mesh.material = mat;
        mesh.skeleton = skeleton;

        const vertexCount = VertexData.ExtractFromMesh(mesh).positions.length / 3;
        console.log("Pushing bone:", bone.name, "vertexCount:", vertexCount);
        vertexRanges.push({ boneName: bone.name, start: vertexOffset, end: vertexOffset + vertexCount });
        vertexOffset += vertexCount;
            
        partMeshes.push(mesh);
        parts[bone.name] = mesh;
    });

    let finalMesh
    
    const mergeMeshes = true;
    if (mergeMeshes) {
        const merged = Mesh.MergeMeshes(partMeshes, true, true, undefined, false, true);
        merged.skeleton = skeleton;

        const vertexData = VertexData.ExtractFromMesh(merged);
        const numVertices = vertexData.positions.length / 3;
        console.log("numVertices:", numVertices, vertexData);
        const matricesIndices = [];
        const matricesWeights = [];

        for (let i = 0; i < numVertices; i++) {
            const boneIndex = (() => {
                for (const range of vertexRanges) {
                    if (i >= range.start && i < range.end) {
                        const bone = skeleton.bones.find(b => b.name === range.boneName);
                        const bIdx = skeleton.bones.indexOf(bone)
                        console.log("Bone index:", bIdx, "for bone:", bone.name);
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
        finalMesh = merged;
        const mat = new StandardMaterial("mat_" + "body", scene);
        mat.diffuseColor = Color3.FromHexString(partSpecs["body"].color);
        finalMesh.material = mat;

    } else {
        // if not merged, attach to bones
        Object.keys(parts).forEach(key => {
            parts[key].attachToBone(boneMap.find(bone => bone.name === key), null);
        });
        finalMesh = parts
    }

    // push root before retuning
    boneMap.unshift(root)

    const bones = boneMap.reduce((acc, bone) => {
        acc[bone.name] = bone;
        return acc;
    }, {});  
    console.log("bones:", bones);


    return {
        mesh: finalMesh,
        skeleton: skeleton,
        bones: bones
    };
}



function applyTorque(impostor, torqueVec) {
    const force = torqueVec.scale(1 / impostor.getObjectCenter().length());
    impostor.applyForce(force, impostor.getObjectCenter());
}

function animatePerson1(ragdoll, scene: Scene) {
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

function animatePerson(ragdoll, scene: Scene, engine: Engine) {
    // Simple walking animation using bone rotations
    let time = 0;
    scene.onBeforeRenderObservable.add(() => {
        time += engine.getDeltaTime() / 1000;
        const speed = 4;
        const angle = Math.sin(time * speed) * 0.5;

        ragdoll.bones.leftLeg.setRotation(new Vector3(angle, 0, 0), Space.LOCAL);
        ragdoll.bones.rightLeg.setRotation(new Vector3(-angle, 0, 0), Space.LOCAL);
        ragdoll.bones.leftArm.setRotation(new Vector3(0,0, -angle * 0.5), Space.LOCAL);
        ragdoll.bones.rightArm.setRotation(new Vector3(-angle * 0.5, 0, 0), Space.LOCAL);
        ragdoll.bones.head.setRotation(new Vector3(0,-angle * 0.5,0), Space.LOCAL);

        //ragdoll.mesh.position = ragdoll.bones.body.getAbsolutePosition();
        const dist = Math.abs(Math.cos(time * speed))
        ragdoll.mesh.position.addInPlace(new Vector3(-dist * .01, 0, dist * .01));

    });
}


export { createPerson, createSkinnedPerson, animatePerson };
