//Corey Wunderlich 2022
//https://www.wundervisionenvisionthefuture.com/

import { Vector3, Mesh, PointLight, Material, Scene, MeshBuilder, CSG } from "@babylonjs/core";
import { PipeTree } from "./PipeTree";
import { TrackUtils } from "./TrackUtils";

export class Tunnel {
    private _length: number;
    private _height: number;
    private _width: number;
    private _lower_left: Vector3;
    private _upper_right: Vector3;
    private _tunnel_mesh: Mesh;
    private _starting_pipe: PipeTree;
    private _branch_ends: Array<PipeTree>;
    private _branch_lights: Array<PointLight>;
    private _material: Material;

    constructor(number_of_branches: number, pipe_tree: PipeTree, scene: Scene, tunnel_length: number, tunnel_material: Material, segment_callback: (tree: PipeTree) => void) {
        this._length = tunnel_length;
        this._width = tunnel_length;
        this._height = 30;
        this._starting_pipe = pipe_tree;
        this._material = tunnel_material;
        this._branch_lights = [];
        const half_tunnel = tunnel_length / 2;
        //var t1 = pipetree.point;
        var t2 = this._starting_pipe.GetPointStraight(half_tunnel + half_tunnel / 4, 0);
        this._branch_ends = [];
        var temp_box = MeshBuilder.CreateBox("box", { width: this._length * 0.9, height: this._height, depth: this._length * 0.9 }, scene);
        temp_box.position.copyFrom(t2);
        var temp_tunnel_csg = CSG.FromMesh(temp_box);
        temp_box.dispose();
        let angle = -TrackUtils.FOURTYFIVEDEG;
        for (var b = 0; b < number_of_branches; b++) {
            let branch = this._starting_pipe.AddBranch(angle, 20);
            segment_callback(branch);
            branch = branch.Turn(Math.abs(angle), 5, angle < 0 ? 1 : -1, segment_callback);
            angle += TrackUtils.EIGHTHPI;
            if (Math.abs(angle) < 0.001) { angle = TrackUtils.EIGHTHPI; }
            let tunnel_end: Vector3 = branch.GetPointStraight(this._length, 0);
            for (let l = 0; l < 1; l++) {
                //    let light = new PointLight("tunnel_light",Vector3.Lerp(branch.point,tunnelEnd,.5),scene);
                //    light.intensity = 0.1;
                let m = MeshBuilder.CreateSphere("sphere", { diameter: 1 }, scene);
                m.position = Vector3.Lerp(branch.Point, tunnel_end, .5);

            }
            var hole_mesh = MeshBuilder.CreateTube("hole", { path: [branch.Point, tunnel_end], radius: 3, sideOrientation: 2, tessellation: 32 }, scene);
            // var h2 = MeshBuilder.CreateCylinder("c",{height:this.length, diameter:6, sideOrientation:2});
            // h2.position = Vector3.Lerp(branch.point,tunnelEnd,.5);
            // h2.rotation.x = TrackUtils.NINETYDEG;
            var cutter = CSG.FromMesh(hole_mesh);
            temp_tunnel_csg = temp_tunnel_csg.subtract(cutter)
            hole_mesh.dispose();
            //h2.dispose();
            branch = branch.Straight(this._length, 0);
            segment_callback(branch);
            this._branch_ends.push(branch);



        }
        this._tunnel_mesh = temp_tunnel_csg.toMesh("decisionTunnel", this._material, scene);
        this._lower_left = this._tunnel_mesh.position.clone();
        this._lower_left.x -= half_tunnel;
        this._lower_left.z -= half_tunnel;
        this._upper_right = this._tunnel_mesh.position.clone();
        this._upper_right.x += half_tunnel;
        this._upper_right.z += half_tunnel;

    }

    public get BranchEnds():Array<PipeTree>{
        return this._branch_ends;
    }
    public get UpperRight():Vector3{
        return this._upper_right;
    }
    public get LowerLeft():Vector3{
        return this._lower_left;
    }
}