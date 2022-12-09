//Corey Wunderlich 2022
//https://www.wundervisionenvisionthefuture.com/

import { Scene, Material, Mesh, Vector3, MeshBuilder, CSG } from "@babylonjs/core";
import { PipeTree } from "./PipeTree";

export class TrackUtils {

    public static NINETYDEG = Math.PI / 2;
    public static FOURTYFIVEDEG = Math.PI / 4;
    public static EIGHTHPI = Math.PI / 8;

    constructor() {

    }
    static CreateTunnel(pipe_tree: PipeTree, scene: Scene, tunnel_length: number, tunnel_material: Material, segment_callback?: (tree: PipeTree) => void): [Array<PipeTree>, Mesh, [Vector3, Vector3]] {
        const halftunnel = tunnel_length / 2;
        //var t1 = pipetree.point;
        var t2 = pipe_tree.GetPointStraight(halftunnel + 21, 0);
        let branches: Array<PipeTree> = [];
        var tunnel = MeshBuilder.CreateBox("box", { width: tunnel_length * 0.9, height: 30, depth: tunnel_length * 0.9 }, scene);

        tunnel.position.copyFrom(t2);
        var tnnl = CSG.FromMesh(tunnel);
        tunnel.dispose();
        let angle = -TrackUtils.FOURTYFIVEDEG;
        for (var b = 0; b < 4; b++) {
            let branch = pipe_tree.AddBranch(angle, 20);
            if (segment_callback != undefined) { segment_callback(branch); }

            branch = branch.Turn(Math.abs(angle), 5, angle < 0 ? 1 : -1, segment_callback);
            angle += TrackUtils.EIGHTHPI;
            if (Math.abs(angle) < 0.001) { angle = TrackUtils.EIGHTHPI; }
            let tunnelEnd: Vector3 = branch.GetPointStraight(tunnel_length, 0);
            var holemesh = MeshBuilder.CreateTube("hole", { path: [branch.Point, tunnelEnd], radius: 3, sideOrientation: 2 }, scene);
            var cutter = CSG.FromMesh(holemesh);
            tnnl = tnnl.subtract(cutter)
            holemesh.dispose();

            branch = branch.Straight(tunnel_length, 0);

            if (segment_callback != undefined) { segment_callback(branch); }
            branches.push(branch);
        }
        let corner1: Vector3 = tunnel.position.clone();
        corner1.x -= halftunnel;
        corner1.z -= halftunnel;
        let corner2: Vector3 = tunnel.position.clone();
        corner2.x += halftunnel;
        corner2.z += halftunnel;
        return [branches, tnnl.toMesh("decisionTunnel", tunnel_material, scene), [corner1, corner2]];
    }
}