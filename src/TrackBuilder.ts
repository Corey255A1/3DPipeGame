import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import {AdvancedDynamicTexture, Button} from "@babylonjs/gui";
import {  Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Mesh, MeshBuilder, SceneLoader, FollowCamera, Material, StandardMaterial, Color3, Matrix, Axis, CSG, Texture, CubeTexture, FreeCamera, VertexBuffer, FloatArray, PointLight } from "@babylonjs/core";




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
                const l = MeshBuilder.CreateTube("left",{path:leftPoints, radius:0.2, tessellation:32}, scene);
                const r = MeshBuilder.CreateTube("right",{path:rightPoints, radius:0.2, tessellation:32}, scene);
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
                const l = MeshBuilder.CreateTube("left",{path:leftPoints, radius:0.2, tessellation:32}, scene);
                const r = MeshBuilder.CreateTube("right",{path:rightPoints, radius:0.2, tessellation:32}, scene);
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


    //Generate a Random Pipe Track
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
export class Point3D{
    public x:number;
    public y:number;
    public z:number;
    constructor(x,y,z){
        this.x=x;
        this.y=y;
        this.z=z;
    }
}
export class Move{
    public point:Point3D;
    public move:number;
    constructor(move:number, point:Point3D){
        this.move = move;
        this.point = point;
    }
}

export class Track{
    public tunnels:Array<Tunnel>;
    public pipe_start:PipeTree;
    public pipe_end:PipeTree;
    public pipe_mesh:Mesh;
    public ground:Mesh;
    public ground_vertex_buffer:FloatArray;
    public ground_width:number;
    public ground_width_div_2:number
    public ground_length:number;
    public ground_sub_width:number;
    public ground_sub_length:number;
    public ground_y_offset:number;
    public tunnel_basic_material:Material;
    constructor(instructions:Array<Array<Move>>, scene:Scene){
        this.pipe_start = new PipeTree(undefined, new Vector3(0,0,0))
        this.pipe_end = new PipeTree(this.pipe_start, new Vector3(0,0,2));
        this.pipe_start.branches.push(this.pipe_end);
        this.ground_width = 1600;
        this.ground_width_div_2 = this.ground_width/2;
        this.ground_length = 6400;
        this.ground_sub_width = this.ground_width/10;
        this.ground_sub_length = this.ground_length/10;
        this.ground_y_offset = 200;
        this.ground =MeshBuilder.CreateGround("g",{
            width:this.ground_width,
            height:this.ground_length,
            subdivisionsX:this.ground_sub_width-1, //Subtract 1 to make segment divisions odd.
            subdivisionsY:this.ground_sub_length-1,
            updatable:true}, 
            scene);

        
        this.ground_vertex_buffer = this.ground.getVerticesData(VertexBuffer.PositionKind);
        for(let gheight=1;gheight<this.ground_vertex_buffer.length;gheight+=3){
            this.ground_vertex_buffer[gheight] = Math.random()*80;
        }
        this.ground.position.z +=3000; //Give a little buffer to the edge
        this.ground.position.y -= 5;
        this.ground.rotation.y = Math.PI;





        this.tunnel_basic_material = new StandardMaterial("tunnelmat", scene);
        this.tunnel_basic_material.diffuseColor = new Color3(0,0.1, 0.5);

        this.tunnel_basic_material.specularColor = new Color3(1,1, 1);
        const trackmat = new StandardMaterial("track", scene);
        trackmat.diffuseColor = new Color3(0.2,0.2, 0.2);
        PipeTree.Material = trackmat;

        instructions.forEach((instruction)=>{
                instruction.forEach((move)=>{
                //setPoint(move.point.x, move.point.y, 16, imagedata, move.point.z/8);
                //console.log(this.pipe_end.point);
                this.updateTerrainHeight(this.pipe_end.point.x, this.pipe_end.point.z, this.pipe_end.point.y);

                switch(move.move){
                    case 0:this.pipe_end = this.pipe_end.Straight(10,0); break;
                    case 1: this.pipe_end = this.pipe_end.Turn(TrackUtils.NINETYDEG,10,1,(seg)=>{this.updateTerrainHeightWithSegment(seg)}); break;
                    case -1: this.pipe_end = this.pipe_end.Turn(TrackUtils.NINETYDEG,10,-1,(seg)=>{this.updateTerrainHeightWithSegment(seg)}); break;
                    case 5: this.pipe_end = this.pipe_end.Straight(5,0.5);this.pipe_end = this.pipe_end.Straight(1,-0.5); break
                    case 6: this.pipe_end = this.pipe_end.Straight(5,-0.5);this.pipe_end = this.pipe_end.Straight(1,0.5); break;
                }
            });
            var tunnel = new Tunnel(Math.random()>0.5?4:2,this.pipe_end, scene,150, this.tunnel_basic_material,(seg)=>{this.updateTerrainHeightWithSegment(seg)});
            tunnel.branch_ends.forEach((br)=>{br.metadata["closecamera"]=true;})
            this.pipe_end = PipeTree.JoinPipes(tunnel.branch_ends,this.pipe_end.GetPointStraight(200,0), this.pipe_end.last_direction);
            this.pipe_end.metadata["closecamera"]=false;
            //Flatten out area around the tunnel
            this.updateTerrainHeightWithSegment(this.pipe_end);
            for(let tx=tunnel.lower_left.x;tx<tunnel.upper_right.x;tx+=10){
                for(let zx=tunnel.lower_left.z-20;zx<tunnel.upper_right.z+100;zx+=10){
                    this.updateTerrainHeight(tx, zx, tunnel.lower_left.y);
                }
            }
        });
        let meshes:Array<Mesh> = [];
        PipeTree.GeneratePipeMeshes(this.pipe_start,meshes,scene);
        this.ApplyTerrainHeight();
        var groundMat:StandardMaterial = new StandardMaterial("groundMat", scene);
        groundMat.diffuseColor = new Color3(0,0.5,0);
        groundMat.specularColor = new Color3(0,0,0);
        this.ground.material = groundMat;
        this.ground.receiveShadows = true;
        this.ground.convertToFlatShadedMesh(); 
    }
    ApplyTerrainHeight(){
        this.ground.updateVerticesData(VertexBuffer.PositionKind, this.ground_vertex_buffer);
    }

    updateTerrainHeightWithSegment(segment:PipeTree){
        this.updateTerrainHeight(segment.point.x, segment.point.z, segment.point.y)
    }
    updateTerrainHeight(worldx:number, worldy:number, worldz:number){
        //[0]=x [1]=y(Elevation) [2]=z
        //console.log(worldx)
        worldy=Math.floor((worldy+this.ground_y_offset)/10);
        worldx = Math.floor(worldx/10);
        //console.log(worldx);
        const fz = Math.floor(worldz);
        //console.log(fz)
        const w2 = Math.floor(this.ground_sub_width/2);
        const w3 = this.ground_sub_width*3;


        for(let hx=worldx-3;hx<worldx+1;hx+=1){
            for(let hy=worldy-1;hy<worldy+2;hy+=1){
                let idx = (1+3*(w2 - hx-1)) + hy*w3;
                if(idx>0 && idx<this.ground_vertex_buffer.length){
                    this.ground_vertex_buffer[idx] = fz;
                }
            }

        }
    }
}

export class Tunnel{
    public length:number;
    public height:number;
    public width:number;
    public lower_left:Vector3;
    public upper_right:Vector3;
    public tunnel_mesh:Mesh;
    public starting_pipe:PipeTree;
    public branch_ends:Array<PipeTree>;
    public branch_lights:Array<PointLight>;
    public material:Material;
    constructor(number_of_branches:number, pipetree:PipeTree, scene:Scene, tunnel_length:number, tunnel_material:Material, segmentCallback?:Function){
        this.length = tunnel_length;
        this.width = tunnel_length;
        this.height = 30;
        this.starting_pipe = pipetree;
        this.material = tunnel_material;
        this.branch_lights = [];
        const halftunnel = tunnel_length/2;
        //var t1 = pipetree.point;
        var t2 = this.starting_pipe.GetPointStraight(halftunnel+halftunnel/4,0);
        this.branch_ends =[];
        var tempbox = MeshBuilder.CreateBox("box", {width:this.length*0.9, height:this.height, depth:this.length*0.9}, scene);
        tempbox.position.copyFrom(t2);
        var temptunnelcsg = CSG.FromMesh(tempbox);
        tempbox.dispose();
        let angle = -TrackUtils.FOURTYFIVEDEG;
        for(var b=0;b<number_of_branches;b++){
            let branch = this.starting_pipe.AddBranch(angle,20);
            segmentCallback(branch);
            branch = branch.Turn(Math.abs(angle),5,angle<0?1:-1,segmentCallback);
            angle+=TrackUtils.EIGHTHPI;
            if(Math.abs(angle)<0.001){angle=TrackUtils.EIGHTHPI;}
            let tunnelEnd:Vector3 = branch.GetPointStraight(this.length,0);
            for(let l=0;l<1;l++){
            //    let light = new PointLight("tunnel_light",Vector3.Lerp(branch.point,tunnelEnd,.5),scene);
            //    light.intensity = 0.1;
               let m = MeshBuilder.CreateSphere("sphere", { diameter: 1 }, scene);
               m.position = Vector3.Lerp(branch.point,tunnelEnd,.5);

            }
            var holemesh = MeshBuilder.CreateTube("hole",{path:[branch.point,tunnelEnd], radius:3, sideOrientation:2, tessellation:32}, scene);
            // var h2 = MeshBuilder.CreateCylinder("c",{height:this.length, diameter:6, sideOrientation:2});
            // h2.position = Vector3.Lerp(branch.point,tunnelEnd,.5);
            // h2.rotation.x = TrackUtils.NINETYDEG;
            var cutter = CSG.FromMesh(holemesh);
            temptunnelcsg = temptunnelcsg.subtract(cutter)
            holemesh.dispose();
            //h2.dispose();
            branch = branch.Straight(this.length,0);
            segmentCallback(branch);
            this.branch_ends.push(branch);



        }
        this.tunnel_mesh = temptunnelcsg.toMesh("decisionTunnel", this.material, scene);
        this.lower_left = this.tunnel_mesh.position.clone();
        this.lower_left.x -= halftunnel;
        this.lower_left.z -= halftunnel;
        this.upper_right = this.tunnel_mesh.position.clone();
        this.upper_right.x += halftunnel;
        this.upper_right.z += halftunnel;
        
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