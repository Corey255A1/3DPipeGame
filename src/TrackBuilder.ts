import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import {AdvancedDynamicTexture, Button} from "@babylonjs/gui";
import {  Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Mesh, MeshBuilder, SceneLoader, FollowCamera, Material, StandardMaterial, Color3, Matrix, Axis, CSG, Texture, CubeTexture, FreeCamera } from "@babylonjs/core";




export class PipeTree
{
    
    public branches:Array<PipeTree>;
    public point:Vector3;
    public previous:PipeTree;
    public last_direction:Vector3;
    public traversed:boolean;
    public metadata:Object;
    //public next_direction:Vector3;
    public static Material:Material;
    public static TurnSections:number = 64;
    public static TurnStep:number = Math.PI*2/PipeTree.TurnSections;
    constructor(previous:PipeTree, point:Vector3){
        this.traversed =false;
        this.branches = [];
        this.metadata = {};
        this.previous = previous;
        this.point = point;
        if(this.previous!==undefined){
            this.last_direction = this.point.subtract(this.previous.point).normalize();
            //this.previous.next_direction = this.last_direction;
            //console.log(this.previous);
        }
        
    }

    public AddBranch(angle:number, length:number):PipeTree{
        var rotMatrix = Matrix.RotationAxis(Axis.Y, angle);
        
        var branch = new PipeTree(this,this.point.add(Vector3.TransformNormal(this.last_direction, rotMatrix).scale(length)));
        this.branches.push(branch);
        return branch;
    }

    public AddExisting(branch:PipeTree){
        if(this.branches.length == 0){
            this.branches.push(branch);
        }else{
            this.branches[0] = branch;
        }
    }

    public GetPointStraight(length:number, elevation:number):Vector3{
        var newDirection:Vector3;
        if(elevation!=0){
            const c2 = new Vector3(0,1,0);            
            const cross = this.last_direction.cross(c2).normalize();
            var rotMatrix = Matrix.RotationAxis(cross, elevation);
            newDirection = Vector3.TransformNormal(this.last_direction, rotMatrix).scale(length);
        }
        else{
            newDirection = this.last_direction.scale(length);
        }
        return (this.point.add(newDirection));
    }

    public PipeTo(vector:Vector3):PipeTree{
        const newpipe = new PipeTree(this, vector);
        if(this.branches.length == 0){
            this.branches.push(newpipe);
        }else{
            this.branches[0] = newpipe;
        }
        return newpipe;
    }

    public Straight(length:number, elevation:number):PipeTree{
        var newDirection:Vector3;
        if(elevation!=0){
            const c2 = new Vector3(0,1,0);            
            const cross = this.last_direction.cross(c2).normalize();
            var rotMatrix = Matrix.RotationAxis(cross, elevation);
            newDirection = Vector3.TransformNormal(this.last_direction, rotMatrix);
        }
        else{
            newDirection = this.last_direction;
        }
        const newpipe = new PipeTree(this, (this.point.add(newDirection.scale(length))));
        if(this.branches.length == 0){
            this.branches.push(newpipe);
        }else{
            this.branches[0] = newpipe;
        }
        return newpipe;
    }

    public Turn(angle:number, radius:number, direction:number, segmentCallback?:Function):PipeTree
    {
        const section_size =(Math.PI*radius*2)/PipeTree.TurnSections;
        //console.log(PipeTree.TurnStep)
        const startVector = this.last_direction.scale(section_size);
        //console.log(startVector);
        var rotMatrix = Matrix.RotationAxis(Axis.Y, PipeTree.TurnStep*direction);
        var previousPipe:PipeTree = this;
        var end  = (angle)-(PipeTree.TurnStep/2);
        let i=0;
        for(var theta=0; theta<end; theta+=PipeTree.TurnStep)
        {
            var newPipe:PipeTree = new PipeTree(previousPipe, previousPipe.point.add(Vector3.TransformNormal(previousPipe.last_direction, rotMatrix).scale(section_size)))
            if(segmentCallback!==undefined){
                segmentCallback(newPipe);
            }
            previousPipe.branches.push(newPipe);
            previousPipe = newPipe;
            i++;
        }
        //console.log(theta);

        return previousPipe;
    }

    public GetTrackPoints():Array<Vector3>{
        var left = [];
        var right = [];
        const vec_z = new Vector3(0,0,1);
        const vec_y = new Vector3(0,1,0);

        const c1 = this.branches.length===1?this.branches[0].point.subtract(this.point).normalize():this.point.subtract(this.previous.point).normalize();
        const c2 = vec_y;            
        const cross = c1.cross(c2).normalize().scale(0.5);

        return [this.point.subtract(cross),this.point.add(cross)];

    }

    public static JoinPipes(pipes:Array<PipeTree>, pointToJoin:Vector3, direction:Vector3):PipeTree{
        let pipe:PipeTree = new PipeTree(pipes[0], pointToJoin)
        let pipeEnd:PipeTree = pipe.PipeTo(pointToJoin.add(direction));
        for(let p=0; p<pipes.length; p++){
            pipes[p].AddExisting(pipe);
        }
        return pipeEnd;
    }


    public static GeneratePipeHelper(root:PipeTree, meshes:Array<Mesh>, scene:Scene, leftPoints:Array<Vector3>, rightPoints:Array<Vector3>)
    {
        //if(tree.branches.length <= 1){
            
            var points = root.GetTrackPoints();
            leftPoints.push(points[0]);
            rightPoints.push(points[1]);
        //}
        if (root.branches.length !== 1){
            if(leftPoints.length>1 && rightPoints.length>1){
                const l = MeshBuilder.CreateTube("left",{path:leftPoints, radius:0.2}, scene);
                const r = MeshBuilder.CreateTube("right",{path:rightPoints, radius:0.2}, scene);
                l.material = PipeTree.Material;
                r.material = PipeTree.Material;
                meshes.push(l);
                meshes.push(r);
            }
            //leftPoints = [];
            //rightPoints = [];
        }

       
        for(var branch of root.branches)
        {                
            if (root.branches.length !== 1)
            {
                leftPoints = [points[0]];
                rightPoints = [points[1]];
            }
            if(branch.traversed === false){
                PipeTree.GeneratePipeHelper(branch, meshes, scene, leftPoints, rightPoints);
                branch.traversed = true;
            }else{
                var branchpoints = branch.GetTrackPoints();
                leftPoints.push(branchpoints[0]);
                rightPoints.push(branchpoints[1]);
                const l = MeshBuilder.CreateTube("left",{path:leftPoints, radius:0.2}, scene);
                const r = MeshBuilder.CreateTube("right",{path:rightPoints, radius:0.2}, scene);
                l.material = PipeTree.Material;
                r.material = PipeTree.Material;
                meshes.push(l);
                meshes.push(r);
            }
        }
    }

    public static GeneratePipeMeshes(tree:PipeTree, meshes:Array<Mesh>, scene:Scene)
    {
        PipeTree.GeneratePipeHelper(tree,meshes,scene,[],[]);
    }


    public static GenerateTrack(root:PipeTree, sections:number):PipeTree{
        let current_direction = 0;
        let vec:Vector3;
        let pipetree = root;
        for(let p=0;p<sections;p++){            
            const randir = Math.random();
            if(randir>0.25){
                const ran = Math.random();
                let r = ran>0.30?0:ran>0.15?0.5:-0.5;
                let dist = 5+Math.floor(Math.random()*5);
                vec = pipetree.GetPointStraight(dist,(current_direction-r));
                //just flatten it out if the point is going underground
                if(vec.y<0){
                    r = 0;
                    vec = pipetree.GetPointStraight(dist,r);
                }
                pipetree = pipetree.PipeTo(vec);
                current_direction = r;
            }
            else{
                if(current_direction!==0){
                    pipetree = pipetree.Straight(1,(current_direction));
                    current_direction=0;
                }
                const ran = Math.random();
                
                pipetree = pipetree.Turn(TrackUtils.NINETYDEG, 5, ran>0.5?1:-1);

            }
        }
        if(current_direction!==0){
            pipetree = pipetree.Straight(1,(current_direction));
            current_direction=0;
        }
        return pipetree;
    }
}


export class TrackUtils{

    static NINETYDEG = Math.PI/2;
    static FOURTYFIVEDEG = Math.PI/4;
    static EIGHTHPI = Math.PI/8;
    constructor(){

    }
    static CreateTunnel(pipetree:PipeTree, scene:Scene, tunnelLength:number, tunnelMaterial:Material, segmentCallback?:Function):[Array<PipeTree>, Mesh,[Vector3, Vector3]]{
        const halftunnel = tunnelLength/2;
        //var t1 = pipetree.point;
        var t2 = pipetree.GetPointStraight(halftunnel+21,0);
        let branches:Array<PipeTree> =[];
        var tunnel = MeshBuilder.CreateBox("box", {width:tunnelLength*0.9, height:30, depth:tunnelLength*0.9}, scene);
        
        tunnel.position.copyFrom(t2);
        var tnnl = CSG.FromMesh(tunnel);
        tunnel.dispose();
        let angle = -TrackUtils.FOURTYFIVEDEG;
        for(var b=0;b<4;b++){
            let branch = pipetree.AddBranch(angle,20);
            segmentCallback(branch);
            branch = branch.Turn(Math.abs(angle),5,angle<0?1:-1,segmentCallback);
            angle+=TrackUtils.EIGHTHPI;
            if(Math.abs(angle)<0.001){angle=TrackUtils.EIGHTHPI;}
            let tunnelEnd:Vector3 = branch.GetPointStraight(tunnelLength,0);
            var holemesh = MeshBuilder.CreateTube("hole",{path:[branch.point,tunnelEnd], radius:3, sideOrientation:2}, scene);
            var cutter = CSG.FromMesh(holemesh);
            tnnl = tnnl.subtract(cutter)
            holemesh.dispose();

            branch = branch.Straight(tunnelLength,0);
            segmentCallback(branch);
            branches.push(branch);
        }
        let corner1:Vector3 = tunnel.position.clone();
        corner1.x -= halftunnel;
        corner1.z -= halftunnel;
        let corner2:Vector3 = tunnel.position.clone();
        corner2.x += halftunnel;
        corner2.z += halftunnel;
        return [branches, tnnl.toMesh("decisionTunnel", tunnelMaterial, scene),[corner1, corner2]];
    }
}