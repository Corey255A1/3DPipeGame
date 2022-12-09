import { Vector3, Material, Matrix, Axis, Mesh, Scene, MeshBuilder } from "@babylonjs/core";
import { TrackUtils } from "./TrackUtils";

export class PipeTree {

    private _branches: Array<PipeTree>;
    private _point: Vector3;
    private _previous: PipeTree | null;
    private _last_direction: Vector3;
    private _traversed: boolean;
    private _additional_properties: Map<string, any>;
    //public next_direction:Vector3;
    public static Material: Material;
    public static TurnSections: number = 64;
    public static TurnStep: number = Math.PI * 2 / PipeTree.TurnSections;
    constructor(point: Vector3, previous?: PipeTree) {
        this._traversed = false;
        this._branches = [];
        this._additional_properties = new Map<string, any>();
        this._point = point;
        if (previous != null && previous != undefined) {
            this._previous = previous;
            this._last_direction = this._point.subtract(this._previous._point).normalize();
            //this.previous.next_direction = this.last_direction;
            //console.log(this.previous);
        } else {
            this._previous = null;
            this._last_direction = Vector3.Zero();
        }

    }

    public get Point(): Vector3 {
        return this._point;
    }
    public get Branches(): Array<PipeTree> {
        return this._branches;
    }
    public get LastDirection(): Vector3 {
        return this._last_direction;
    }

    public SetAdditionalProperty(name: string, value: any) {
        this._additional_properties.set(name, value);
    }
    public GetAdditionalProperty(name: string): any {
        return this._additional_properties.get(name);
    }

    public AddBranch(angle: number, length: number): PipeTree {
        var rotMatrix = Matrix.RotationAxis(Axis.Y, angle);

        var branch = new PipeTree(this._point.add(Vector3.TransformNormal(this._last_direction, rotMatrix).scale(length)), this);
        this._branches.push(branch);
        return branch;
    }

    public AddExisting(branch: PipeTree) {
        if (this._branches.length == 0) {
            this._branches.push(branch);
        } else {
            this._branches[0] = branch;
        }
    }

    public GetPointStraight(length: number, elevation: number): Vector3 {
        var newDirection: Vector3;
        if (elevation != 0) {
            const c2 = new Vector3(0, 1, 0);
            const cross = this._last_direction.cross(c2).normalize();
            var rotMatrix = Matrix.RotationAxis(cross, elevation);
            newDirection = Vector3.TransformNormal(this._last_direction, rotMatrix).scale(length);
        }
        else {
            newDirection = this._last_direction.scale(length);
        }
        return (this._point.add(newDirection));
    }

    public PipeTo(vector: Vector3): PipeTree {
        const newpipe = new PipeTree(vector, this);
        if (this._branches.length == 0) {
            this._branches.push(newpipe);
        } else {
            this._branches[0] = newpipe;
        }
        return newpipe;
    }

    public Straight(length: number, elevation: number): PipeTree {
        var newDirection: Vector3;
        if (elevation != 0) {
            const c2 = new Vector3(0, 1, 0);
            const cross = this._last_direction.cross(c2).normalize();
            var rotMatrix = Matrix.RotationAxis(cross, elevation);
            newDirection = Vector3.TransformNormal(this._last_direction, rotMatrix);
        }
        else {
            newDirection = this._last_direction;
        }
        const newpipe = new PipeTree((this._point.add(newDirection.scale(length))), this);
        if (this._branches.length == 0) {
            this._branches.push(newpipe);
        } else {
            this._branches[0] = newpipe;
        }
        return newpipe;
    }

    public Turn(angle: number, radius: number, direction: number, segmentCallback?: (tree: PipeTree) => void): PipeTree {
        const section_size = (Math.PI * radius * 2) / PipeTree.TurnSections;
        //console.log(PipeTree.TurnStep)
        const startVector = this._last_direction.scale(section_size);
        //console.log(startVector);
        var rotMatrix = Matrix.RotationAxis(Axis.Y, PipeTree.TurnStep * direction);
        var previousPipe: PipeTree = this;
        var end = (angle) - (PipeTree.TurnStep / 2);
        let i = 0;
        for (var theta = 0; theta < end; theta += PipeTree.TurnStep) {
            var newPipe: PipeTree = new PipeTree(previousPipe._point.add(Vector3.TransformNormal(previousPipe._last_direction, rotMatrix).scale(section_size)), previousPipe)
            if (segmentCallback != undefined) {
                segmentCallback(newPipe);
            }

            previousPipe._branches.push(newPipe);
            previousPipe = newPipe;
            i++;
        }
        //console.log(theta);

        return previousPipe;
    }

    public GetTrackPoints(): Array<Vector3> {
        var left = [];
        var right = [];
        const vec_z = new Vector3(0, 0, 1);
        const vec_y = new Vector3(0, 1, 0);
        let c1: Vector3;
        if (this._branches.length == 1) {
            c1 = this._branches[0]._point.subtract(this._point).normalize();
        } else if (this._previous != null) {
            c1 = this._point.subtract(this._previous._point).normalize();
        } else {
            c1 = Vector3.Zero();
        }
        const c2 = vec_y;
        const cross = c1.cross(c2).normalize().scale(0.5);

        return [this._point.subtract(cross), this._point.add(cross)];

    }

    public static JoinPipes(pipes: Array<PipeTree>, pointToJoin: Vector3, direction: Vector3): PipeTree {
        let pipe: PipeTree = new PipeTree(pointToJoin, pipes[0])
        let pipeEnd: PipeTree = pipe.PipeTo(pointToJoin.add(direction));
        for (let p = 0; p < pipes.length; p++) {
            pipes[p].AddExisting(pipe);
        }
        return pipeEnd;
    }


    public static GeneratePipeHelper(root: PipeTree, meshes: Array<Mesh>, scene: Scene, leftPoints: Array<Vector3>, rightPoints: Array<Vector3>) {
        //if(tree.branches.length <= 1){

        var points = root.GetTrackPoints();
        leftPoints.push(points[0]);
        rightPoints.push(points[1]);
        //}
        if (root._branches.length !== 1) {
            if (leftPoints.length > 1 && rightPoints.length > 1) {
                const l = MeshBuilder.CreateTube("left", { path: leftPoints, radius: 0.2, tessellation: 32 }, scene);
                const r = MeshBuilder.CreateTube("right", { path: rightPoints, radius: 0.2, tessellation: 32 }, scene);
                l.material = PipeTree.Material;
                r.material = PipeTree.Material;
                meshes.push(l);
                meshes.push(r);
            }
            //leftPoints = [];
            //rightPoints = [];
        }


        for (var branch of root._branches) {
            if (root._branches.length !== 1) {
                leftPoints = [points[0]];
                rightPoints = [points[1]];
            }
            if (branch._traversed === false) {
                PipeTree.GeneratePipeHelper(branch, meshes, scene, leftPoints, rightPoints);
                branch._traversed = true;
            } else {
                var branchpoints = branch.GetTrackPoints();
                leftPoints.push(branchpoints[0]);
                rightPoints.push(branchpoints[1]);
                const l = MeshBuilder.CreateTube("left", { path: leftPoints, radius: 0.2, tessellation: 32 }, scene);
                const r = MeshBuilder.CreateTube("right", { path: rightPoints, radius: 0.2, tessellation: 32 }, scene);
                l.material = PipeTree.Material;
                r.material = PipeTree.Material;
                meshes.push(l);
                meshes.push(r);
            }
        }
    }

    public static GeneratePipeMeshes(tree: PipeTree, meshes: Array<Mesh>, scene: Scene) {
        PipeTree.GeneratePipeHelper(tree, meshes, scene, [], []);
    }


    //Generate a Random Pipe Track
    public static GenerateTrack(root: PipeTree, sections: number): PipeTree {
        let current_direction = 0;
        let vec: Vector3;
        let pipe_tree = root;
        for (let p = 0; p < sections; p++) {
            const randir = Math.random();
            if (randir > 0.25) {
                const ran = Math.random();
                let r = ran > 0.30 ? 0 : ran > 0.15 ? 0.5 : -0.5;
                let dist = 5 + Math.floor(Math.random() * 5);
                vec = pipe_tree.GetPointStraight(dist, (current_direction - r));
                //just flatten it out if the point is going underground
                if (vec.y < 0) {
                    r = 0;
                    vec = pipe_tree.GetPointStraight(dist, r);
                }
                pipe_tree = pipe_tree.PipeTo(vec);
                current_direction = r;
            }
            else {
                if (current_direction !== 0) {
                    pipe_tree = pipe_tree.Straight(1, (current_direction));
                    current_direction = 0;
                }
                const ran = Math.random();

                pipe_tree = pipe_tree.Turn(TrackUtils.NINETYDEG, 5, ran > 0.5 ? 1 : -1);

            }
        }
        if (current_direction !== 0) {
            pipe_tree = pipe_tree.Straight(1, (current_direction));
            current_direction = 0;
        }
        return pipe_tree;
    }
}