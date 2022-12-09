import { Mesh, FloatArray, Material, Scene, Vector3, MeshBuilder, VertexBuffer, StandardMaterial, Color3, Nullable } from "@babylonjs/core";
import { Move } from "./Move";
import { PipeTree } from "./PipeTree";
import { TrackUtils } from "./TrackUtils";
import { Tunnel } from "./Tunnel";

export class Track {
    private _pipe_start: PipeTree;
    private _pipe_end: PipeTree;
    private _ground: Mesh;
    private _ground_vertex_buffer: FloatArray;
    private _ground_width: number;
    private _ground_length: number;
    private _ground_sub_width: number;
    private _ground_sub_length: number;
    private _ground_y_offset: number;
    private _tunnel_basic_material: StandardMaterial;
    
    constructor(instructions: Array<Array<Move>>, scene: Scene) {
        this._pipe_start = new PipeTree(new Vector3(0, 0, 0));
        this._pipe_end = new PipeTree(new Vector3(0, 0, 2), this._pipe_start);
        this._pipe_start.Branches.push(this._pipe_end);
        this._ground_width = 1600;
        this._ground_length = 6400;
        this._ground_sub_width = this._ground_width / 10;
        this._ground_sub_length = this._ground_length / 10;
        this._ground_y_offset = 200;
        this._ground = MeshBuilder.CreateGround("g", {
            width: this._ground_width,
            height: this._ground_length,
            subdivisionsX: this._ground_sub_width - 1, //Subtract 1 to make segment divisions odd.
            subdivisionsY: this._ground_sub_length - 1,
            updatable: true
        }, scene);

        const vertex_buffer: Nullable<FloatArray> = this._ground.getVerticesData(VertexBuffer.PositionKind);
        if (vertex_buffer != null) {
            this._ground_vertex_buffer = vertex_buffer;
            for (let gheight = 1; gheight < this._ground_vertex_buffer.length; gheight += 3) {
                this._ground_vertex_buffer[gheight] = Math.random() * 80;
            }
        }
        else {
            this._ground_vertex_buffer = new Float32Array(0);
        }
        this._ground.position.z += 3000; //Give a little buffer to the edge
        this._ground.position.y -= 5;
        this._ground.rotation.y = Math.PI;

        this._tunnel_basic_material = new StandardMaterial("tunnelmat", scene);
        this._tunnel_basic_material.diffuseColor = new Color3(0, 0.1, 0.5);

        this._tunnel_basic_material.specularColor = new Color3(1, 1, 1);
        const track_material = new StandardMaterial("track", scene);
        track_material.diffuseColor = new Color3(0.2, 0.2, 0.2);
        PipeTree.Material = track_material;

        instructions.forEach((instruction) => {
            instruction.forEach((move) => {
                //setPoint(move.Point.x, move.Point.y, 16, imagedata, move.Point.z/8);
                //console.log(this.pipe_end.Point);
                this.updateTerrainHeight(this._pipe_end.Point.x, this._pipe_end.Point.z, this._pipe_end.Point.y);

                switch (move.move) {
                    case 0: this._pipe_end = this._pipe_end.Straight(10, 0); break;
                    case 1: this._pipe_end = this._pipe_end.Turn(TrackUtils.NINETYDEG, 10, 1, (seg) => { this.updateTerrainHeightWithSegment(seg) }); break;
                    case -1: this._pipe_end = this._pipe_end.Turn(TrackUtils.NINETYDEG, 10, -1, (seg) => { this.updateTerrainHeightWithSegment(seg) }); break;
                    case 5: this._pipe_end = this._pipe_end.Straight(5, 0.5); this._pipe_end = this._pipe_end.Straight(1, -0.5); break
                    case 6: this._pipe_end = this._pipe_end.Straight(5, -0.5); this._pipe_end = this._pipe_end.Straight(1, 0.5); break;
                }
            });
            var tunnel = new Tunnel(Math.random() > 0.5 ? 4 : 2,
                this._pipe_end,
                scene, 150, this._tunnel_basic_material,
                (seg) => { this.updateTerrainHeightWithSegment(seg) });
            tunnel.BranchEnds.forEach((br) => {
                br.SetAdditionalProperty("closecamera", true);
            })
            this._pipe_end = PipeTree.JoinPipes(tunnel.BranchEnds, this._pipe_end.GetPointStraight(200, 0), this._pipe_end.LastDirection);
            this._pipe_end.SetAdditionalProperty("closecamera", false);
            //Flatten out area around the tunnel
            this.updateTerrainHeightWithSegment(this._pipe_end);
            for (let tx = tunnel.LowerLeft.x; tx < tunnel.UpperRight.x; tx += 10) {
                for (let zx = tunnel.LowerLeft.z - 20; zx < tunnel.UpperRight.z + 100; zx += 10) {
                    this.updateTerrainHeight(tx, zx, tunnel.LowerLeft.y);
                }
            }
        });
        let meshes: Array<Mesh> = [];
        PipeTree.GeneratePipeMeshes(this._pipe_start, meshes, scene);
        this.ApplyTerrainHeight();
        var ground_material: StandardMaterial = new StandardMaterial("groundMat", scene);
        ground_material.diffuseColor = new Color3(0, 0.5, 0);
        ground_material.specularColor = new Color3(0, 0, 0);
        this._ground.material = ground_material;
        this._ground.receiveShadows = true;
        this._ground.convertToFlatShadedMesh();
    }

    public get PipeStart():PipeTree{
        return this._pipe_start;
    }
    public get PipeEnd():PipeTree{
        return this._pipe_end;
    }
    ApplyTerrainHeight() {
        this._ground.updateVerticesData(VertexBuffer.PositionKind, this._ground_vertex_buffer);
    }

    updateTerrainHeightWithSegment(segment: PipeTree) {
        this.updateTerrainHeight(segment.Point.x, segment.Point.z, segment.Point.y)
    }
    updateTerrainHeight(worldx: number, worldy: number, worldz: number) {
        //[0]=x [1]=y(Elevation) [2]=z
        //console.log(worldx)
        worldy = Math.floor((worldy + this._ground_y_offset) / 10);
        worldx = Math.floor(worldx / 10);
        //console.log(worldx);
        const fz = Math.floor(worldz);
        //console.log(fz)
        const w2 = Math.floor(this._ground_sub_width / 2);
        const w3 = this._ground_sub_width * 3;


        for (let hx = worldx - 3; hx < worldx + 1; hx += 1) {
            for (let hy = worldy - 1; hy < worldy + 2; hy += 1) {
                let idx = (1 + 3 * (w2 - hx - 1)) + hy * w3;
                if (idx > 0 && idx < this._ground_vertex_buffer.length) {
                    this._ground_vertex_buffer[idx] = fz;
                }
            }

        }
    }
}