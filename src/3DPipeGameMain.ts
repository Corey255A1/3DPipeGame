import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import {AdvancedDynamicTexture, Button} from "@babylonjs/gui";
import {  Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Mesh, MeshBuilder, SceneLoader, FollowCamera, Material, StandardMaterial, Color3, Matrix, Axis, CSG, Texture, CubeTexture, FreeCamera } from "@babylonjs/core";


const NINETYDEG = Math.PI/2;
const FOURTYFIVEDEV = Math.PI/4;

class PipeTree
{
    public branches:Array<PipeTree>;
    public point:Vector3;
    public previous:PipeTree;
    public last_direction:Vector3;
    public traversed:boolean;
    //public next_direction:Vector3;
    public static TurnSections:number = 64;
    public static TurnStep:number = Math.PI*2/PipeTree.TurnSections;
    constructor(previous:PipeTree, point:Vector3){
        this.traversed =false;
        this.branches = [];
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

    public Turn(angle:number, radius:number, direction:number):PipeTree
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
                meshes.push(MeshBuilder.CreateTube("left",{path:leftPoints, radius:0.2}, scene));
                meshes.push(MeshBuilder.CreateTube("right",{path:rightPoints, radius:0.2}, scene));
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
                meshes.push(MeshBuilder.CreateTube("left",{path:leftPoints, radius:0.2}, scene));
                meshes.push(MeshBuilder.CreateTube("right",{path:rightPoints, radius:0.2}, scene));
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
                
                pipetree = pipetree.Turn(Math.PI/2, 5, ran>0.5?1:-1);

            }
        }
        if(current_direction!==0){
            pipetree = pipetree.Straight(1,(current_direction));
            current_direction=0;
        }
        return pipetree;
    }
}

class Point3D{
    public x:number;
    public y:number;
    public z:number;
    constructor(x,y,z){
        this.x=x;
        this.y=y;
        this.z=z;
    }
}

class MapNavi{
    public point:Point3D;
    public startingPoint:Point3D;
    public h:number;
    public width:number;
    public height:number;
    public depth:number;
    public map:Array<Array<Array<number>>>;
    public moves:Array<number>;
    constructor(width,height,x,y,z){
        this.point = new Point3D(x,y,z);
        this.startingPoint = this.point;
        this.width = width;
        this.height = height;
        this.depth = 4;
        this.h=0;
        this.map = [];
        this.moves = [];
        for(let x=0;x<this.width;x++){
            this.map.push([]);
            for(let y=0;y<this.height;y++){
                this.map[x].push([]);
                for(let z=0;z<this.depth;z++){
                    this.map[x][y].push(-10);
                }
            }
        }
    }

    MoveToStart(){
        this.point = this.startingPoint;
    }

    Move(dir:number){
        this.map[this.point.x][this.point.y][this.point.z] = dir;
        this.point = this.GetPointInDir(dir);
        if(dir!=5 && dir!=6)
        {
            this.h = this.GetWorldDirection(dir);
        }
        this.moves.push(dir);
    }

    GetMove():number{
        return this.map[this.point.x][this.point.y][this.point.z];
    }

    NextMove(){
        let newh = this.GetMove();
        this.point = this.GetPointInDir(newh);
        if(newh!=5 && newh!=6)
        {
            this.h = this.GetWorldDirection(newh);
        }
        console.log(this.point);
    }

    CheckBound(x:number, y:number, z:number):boolean{
        return (x<0 || y<0 || z<0 || x>=this.width || y>=this.height || z>=this.depth)
    }
    TestDirection(dir:number):boolean{
        let point = this.GetPointInDir(dir);
        return !this.CheckBound(point.x, point.y, point.z) && this.map[point.x][point.y][point.z]===-10;
    }
    GetWorldDirection(dir:number){
        let newh = this.h+dir; if(newh<0){newh+=4};
        if(newh==4)newh=0;
        return newh;
    }
    ChangeZ(up:boolean):Point3D{
        if(up){
           return new Point3D(this.point.x, this.point.y, this.point.z+1);           
        }
        else{
            return new Point3D(this.point.x, this.point.y, this.point.z-1);
        }
    }
    GetPointInDir(dir:number):Point3D{
        if(dir==5 || dir==6){
            return this.ChangeZ(dir==5);
        }else{
            let newh = this.GetWorldDirection(dir);
            switch(newh){
                case 1: return new Point3D(this.point.x+1, this.point.y, this.point.z);
                case 2: return new Point3D(this.point.x, this.point.y-1, this.point.z);
                case 3: return new Point3D(this.point.x-1, this.point.y, this.point.z);
                case 0:
                default:
                return  new Point3D(this.point.x, this.point.y+1, this.point.z);
            }
        }

    }
}


class Environment
{
    public ground: Mesh;
    public pipe1: Mesh;
    public pipe2: Mesh;
    public pipeTree:PipeTree;
    public skybox: Mesh;
    constructor(scene:Scene){
        this.ground = MeshBuilder.CreatePlane("ground", {width:2000, height:2000}, scene);
        this.ground.position.z = 0;
        this.ground.rotate(new Vector3(1,0,0),Math.PI/2);
        var groundMat:StandardMaterial = new StandardMaterial("groundMat", scene);
        groundMat.diffuseColor = new Color3(0,1,0);
        this.ground.material = groundMat;

        // this.skybox = MeshBuilder.CreateBox("skyBox", {size:2000}, scene);
        // const skyboxMaterial = new StandardMaterial("skyBox", scene);
        // skyboxMaterial.backFaceCulling = false;
        // skyboxMaterial.reflectionTexture = new CubeTexture("imgs/skybox", scene);
        // skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
        // skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
        // skyboxMaterial.specularColor = new Color3(0, 0, 0);
        // this.skybox.material = skyboxMaterial;




        //var pipePoints: Array<Vector3> = [new Vector3(0,0,0), new Vector3(0,1,0), new Vector3(0,2,1), new Vector3(0,2,2), new Vector3(0,2,700)];

        this.pipeTree = new PipeTree(undefined, new Vector3(0,0,0))
        var treebuilder = new PipeTree(this.pipeTree, new Vector3(0,0,2));
        this.pipeTree.branches.push(treebuilder);


        const direction_randomizer_params = {
            "0":[
                {move:0,percent:0.7},
                {move:1,percent:0.15},
                {move:-1,percent:0.15}
            ],
            "1":[
                {move:0,percent:0.25},
                {move:1,percent:0.05},
                {move:-1,percent:0.7}
            ],
            "2":[
                {move:0,percent:0.0},
                {move:1,percent:0.5},
                {move:-1,percent:0.5}
            ],
            "3":[
                {move:0,percent:0.25},
                {move:1,percent:0.7},
                {move:-1,percent:0.05}
            ]        
        }
        
        
        const max_movements = 10;
        var Meshes:Array<Mesh> = []
        for(let landmark=0;landmark<5;landmark++)
        {
            //Generate Intermediate Track
            let navi = new MapNavi(16,64,8,0,0);
            for(let p=0;p<max_movements;p++){
                let ranmove = Math.random();
                let params = direction_randomizer_params[navi.h];
                let percentage = 0
                for(let m=0;m<params.length;m++)
                {
                    percentage +=params[m].percent;
                    if(percentage > 2){
                        p=max_movements;
                        break;
                    }
                    else if(ranmove < percentage){
                        if(navi.TestDirection(params[m].move)){
                            if(params[m].move == 0 && Math.random()>0.5){
                                let zran = Math.random();
                                if(zran > navi.point.z*0.1)
                                {
                                    if(navi.TestDirection(5)){
                                        navi.Move(5);
                                        break;
                                    }
                                    else if(navi.TestDirection(6)){
                                        navi.Move(6);
                                        break;
                                    }
                                }else{
                                    if(navi.TestDirection(6)){
                                        navi.Move(6);
                                        break;
                                    }
                                    else if(navi.TestDirection(5)){
                                        navi.Move(5);
                                        break;
                                    }
                                }
                            }
                            navi.Move(params[m].move);
                            break;
                        }
                    }
                }                
                //console.log(p);
            }
            switch(navi.h){
                case 1:navi.Move(-1); break;
                case 3: navi.Move(1);break;
                case 2:
                    if(navi.TestDirection(1)) navi.Move(1);
                    else if(navi.TestDirection(-1)) navi.Move(-1);
            }
            navi.Move(0)

            //Mark            
            navi.moves.forEach((move)=>{
                switch(move){
                    case 0:treebuilder = treebuilder.Straight(10,0); break;
                    case 1: treebuilder = treebuilder.Turn(NINETYDEG,10,1); break;
                    case -1: treebuilder = treebuilder.Turn(NINETYDEG,10,-1); break;
                    case 5: treebuilder = treebuilder.Straight(5,0.5);treebuilder = treebuilder.Straight(1,-0.5); break;
                    case 6: treebuilder = treebuilder.Straight(5,-0.5);treebuilder = treebuilder.Straight(1,0.5); break;
                }
            })
            var branches:Array<PipeTree>;
            [branches] = this.CreateTunnel(treebuilder, scene,100);
            treebuilder = PipeTree.JoinPipes(branches,treebuilder.GetPointStraight(200,0), treebuilder.last_direction);

            //Meshes.push(Mesh.MergeMeshes(meshes, true));
        }
        var meshes:Array<Mesh> = [];
        PipeTree.GeneratePipeMeshes(this.pipeTree,meshes,scene);
        console.log("meshes " + meshes.length);
       // Meshes.forEach(m=>m.isVisible = false);

        //let endPoint = navi.point;
        //console.log(navi.map);


        

        
        //treebuilder = PipeTree.GenerateTrack(treebuilder, 40);
        // treebuilder = treebuilder.Straight(10,0);
        // var branches:Array<PipeTree>;
        // treebuilder = PipeTree.GenerateTrack(treebuilder, 40);
        // [branches] = this.CreateTunnel(treebuilder, scene,100);
        // treebuilder = PipeTree.JoinPipes(branches,treebuilder.GetPointStraight(200,0));
        // treebuilder = PipeTree.GenerateTrack(treebuilder, 40);

        // [branches] = this.CreateTunnel(treebuilder, scene,100);
        // treebuilder = PipeTree.JoinPipes(branches,treebuilder.GetPointStraight(200,0));
        

        //treebuilder= treebuilder.Straight(15,0);
        // pipetree = pipetree.Straight(5,0.5);
        // pipetree = pipetree.Straight(5,0.5);
        // treebuilder = treebuilder.Turn(Math.PI*2, 5, 1);
        // treebuilder= treebuilder.Straight(15,0);
        // treebuilder = treebuilder.Turn(Math.PI*2, 5, -1);
        // treebuilder= treebuilder.Straight(15,0);
        // treebuilder = treebuilder.Turn(Math.PI, 5, 1);
        // treebuilder= treebuilder.Straight(15,0);
        // treebuilder = treebuilder.Turn(Math.PI, 5, 1);
        // treebuilder= treebuilder.Straight(15,0);
        // pipetree = pipetree.Turn(Math.PI/2, 5, -1);
        // pipetree = pipetree.Straight(5,0);
        // pipetree = pipetree.Straight(5,0);
       

        // var p1 = treebuilder.AddBranch(-Math.PI/4,20);
        // var p2 = treebuilder.AddBranch(-Math.PI/8,20);
        // var p3 = treebuilder.AddBranch(Math.PI/8,20);
        // var p4 = treebuilder.AddBranch(Math.PI/4,20); 
        
        // p1 = p1.Turn(Math.PI/4,5,1);
        // p2 = p2.Turn(Math.PI/8,5,1);
        // p3 = p3.Turn(Math.PI/8,5,-1);
        // p4 = p4.Turn(Math.PI/4,5,-1);


        // var sourceMat = new StandardMaterial("sourceMat", scene);
        // sourceMat.wireframe = false;
        // sourceMat.backFaceCulling = false;

        // var p21 = p2.point;
        // var p22 = p2.GetPointStraight(20,0);
        // var bhole2 = MeshBuilder.CreateTube("tunnel",{path:[p21,p22], radius:3, sideOrientation:2}, scene);
        // //bhole2.material = sourceMat;
        // var tcut2 = CSG.FromMesh(bhole2);
        // bhole2.dispose();

        // var tnnl = CSG.FromMesh(tunnel);
        // tunnel.dispose();

        // p1 = p1.Straight(20,0);
        // p2 = p2.Straight(20,0);
        // p3 = p3.Straight(20,0);
        // p4 = p4.Straight(20,0);

        // p1 = PipeTree.GenerateTrack(p1, 20);
        // p2 = PipeTree.GenerateTrack(p2, 20);
        // p3 = PipeTree.GenerateTrack(p3, 20);
        // p4 = PipeTree.GenerateTrack(p4, 20);
        
        

        // p1 = p1.Straight(10,0.5);
        // p1 = p1.Straight(1,-0.5);
        // p1 = p1.Turn(Math.PI/4, 5, -1);
        // p1 = p1.Straight(5,0);
        // p1 = p1.Turn(Math.PI/4, 5, -1);
        // p1 = p1.Straight(10,0.5);

        // var p11 = p1.AddBranch(-Math.PI/4,5);
        // var p12 = p1.AddBranch(Math.PI/4,5); 


        // p11 = p11.Straight(10,-0.5);
        // p11 = p11.Turn(Math.PI/4, 5, -1);
        // p11 = p11.Straight(5,0);
        // p11 = p11.Turn(Math.PI/4, 5, -1);
        // p11 = p11.Straight(10,0.5);

        // p12 = p12.Straight(10,-0.5);
        // p12 = p12.Straight(1,0.5);
        // p12 = p12.Turn(Math.PI/2, 5, 1);
        // p12 = p12.Turn(Math.PI/2, 5, -1);
        // p12 = p12.Turn(Math.PI/2, 5, 1);
        // p12 = p12.Turn(Math.PI/2, 5, -1);

        // p2 = p2.Straight(10,-0.5);
        // p2 = p2.Straight(1,0.5);
        // p2 = p2.Turn(Math.PI/2, 5, 1);
        // p2 = p2.Turn(Math.PI/2, 5, -1);
        // p2 = p2.Turn(Math.PI/2, 5, 1);
        // p2 = p2.Turn(Math.PI/2, 5, -1);

        // p3 = p3.Straight(10,0.5);
        // p3 = p3.Straight(1,-0.5);
        // p3 = p3.Turn(Math.PI/2, 5, -1);
        // p3 = p3.Straight(5,0);
        // p3 = p3.Turn(Math.PI/2, 5, -1);
        // p3 = p3.Straight(10,0.5);

        // p4 = p4.Straight(10,-0.5);
        // p4 = p4.Straight(1,0.5);
        // p4 = p4.Turn(Math.PI/2, 5, 1);
        // p4 = p4.Turn(Math.PI/2, 5, -1);
        // p4 = p4.Straight(12,0.0);
        // p4 = p4.Turn(Math.PI/2, 5, -1);
        // p2 = p2.Straight(5,0);
        // p4.AddExisting(p2);

        // p2 = p2.Straight(1,0);
        
        // p4 = p4.Turn(Math.PI/2, 5, 1);
        // p4 = p4.Turn(Math.PI/2, 5, -1);

      
    }


    CreateTunnel(pipetree:PipeTree, scene:Scene, tunnelLength:number):[Array<PipeTree>, Mesh]{
        var t1 = pipetree.point;
        var t2 = pipetree.GetPointStraight(tunnelLength/2+21,0);
        let branches:Array<PipeTree> =[];
        var tunnel = MeshBuilder.CreateBox("box", {width:tunnelLength*0.9, height:10, depth:tunnelLength*0.9}, scene)
        tunnel.position.copyFrom(t2);
        var tnnl = CSG.FromMesh(tunnel);
        tunnel.dispose();
        let angle = -Math.PI/4;
        for(var b=0;b<4;b++){
            let branch = pipetree.AddBranch(angle,20)
            branch = branch.Turn(Math.abs(angle),5,angle<0?1:-1);
            angle+=Math.PI/8;
            if(Math.abs(angle)<0.001){angle=Math.PI/8;}
            let tunnelEnd:Vector3 = branch.GetPointStraight(tunnelLength,0);
            var holemesh = MeshBuilder.CreateTube("hole",{path:[branch.point,tunnelEnd], radius:3, sideOrientation:2}, scene);
            var cutter = CSG.FromMesh(holemesh);
            tnnl = tnnl.subtract(cutter)
            holemesh.dispose();
            branch = branch.Straight(tunnelLength,0);
            branches.push(branch);
        }
        return [branches, tnnl.toMesh("decisionTunnel", undefined, scene)];
    }
}

class App {
    constructor() {
        // create the canvas html element and attach it to the webpage
        var canvas = document.createElement("canvas");
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.id = "gameCanvas";
        document.body.appendChild(canvas);

        // initialize babylon scene and engine
        var engine = new Engine(canvas, true);
        var scene = new Scene(engine);

        //var camera: ArcRotateCamera = new ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 2, 15, Vector3.Zero(), scene);
        var camera: FreeCamera = new FreeCamera("thirdperson",new Vector3(0,1,-3), scene);
        //var camera2: FollowCamera = new FollowCamera("FollowCamera", new Vector3(0,10,0), scene);
        var environment: Environment = new Environment(scene);
        scene.activeCamera = camera;
        //camera2.heightOffset = 10;
        //camera2.attachControl(true);
        // camera.position.set(1,1,1);
        var ship_paused:boolean = true;
        var gui_window = AdvancedDynamicTexture.CreateFullscreenUI("options");
        
        var start_button = Button.CreateSimpleButton("start_button", "Start!");
        start_button.width = "150px"
        start_button.height = "40px";
        start_button.color = "white";
        start_button.cornerRadius = 20;
        start_button.background = "green";
        start_button.verticalAlignment = 1;
        start_button.top = -40;
        start_button.onPointerUpObservable.add(function() {
            ship_paused = false;
            gui_window.removeControl(start_button);
        });
        gui_window.addControl(start_button); 



        const create_branch_options = function(count:number, callback:Function):Array<Button>{
            var btns:Array<Button> = [];
            for(let b=0; b<count; b++){
                var option:string = String.fromCharCode(65+b);
                var btn = Button.CreateSimpleButton(option, option);
                btn.width = "150px"
                btn.height = "40px";
                btn.color = "white";
                btn.cornerRadius = 20;
                btn.background = "green";
                btn.verticalAlignment = 1;
                btn.top = -40;
                btn.left = -155*(count-1)/2 + b*155;
                btn.onPointerUpObservable.add(()=>{
                    console.log(b);
                    callback(btn, b, option);
                });
                btns.push(btn);
            }
            return btns;
        }

        var light1: HemisphericLight = new HemisphericLight("light1", new Vector3(1, 1, 0), scene);
        var sphere: Mesh = MeshBuilder.CreateSphere("sphere", { diameter: 1 }, scene);
        SceneLoader.ImportMesh(null, "./", "Ship.glb",scene,(meshes)=>{
            const ship:Mesh = meshes[0];
            const shipSpeed = 0.5;
            ship.position = new Vector3(0,0,-5);
            var lastposition = ship.position.clone();
            //var sectionIdx=0;
            var currentPipe = environment.pipeTree
           // var target = environment.pipeBuilder.points[sectionIdx];
            var target = currentPipe.point;
            const cameraoffset: Vector3 = new Vector3(0,2,0);
            console.log("LOADED")
            var heading = ship.position.subtract(target).normalize().scale(-shipSpeed);
            ship.lookAt(target);
            console.log(ship)
            

            var currentBranch:number = -1;
            var branch_buttons:Array<Button>;
            const branch_callback = function(btn:Button, branch_number:number ,option:string){
                currentBranch = branch_number;
                ship_paused = false;                
            }

            scene.registerBeforeRender(()=>{
                Vector3.LerpToRef(camera.position, (ship.position.subtract(ship.forward.scale(-20)).add(cameraoffset)), 0.05, camera.position );
                camera.setTarget(ship.position);
                if(!ship_paused){
                    ship.position.addInPlace(heading);
                    if(ship.position.subtract(target).lengthSquared()<shipSpeed){
                        if(currentPipe.branches.length>1 && currentBranch===-1){
                            ship_paused = true;
                            branch_buttons = create_branch_options(currentPipe.branches.length, branch_callback);
                            branch_buttons.forEach(btn=>gui_window.addControl(btn)); 
                            //currentPipe = currentPipe.branches[Math.round(Math.random()*(currentPipe.branches.length-1))];
                        }
                        else if(currentPipe.branches.length>1 && currentBranch!==-1)
                        {
                            currentPipe = currentPipe.branches[currentBranch];
                            console.log(currentPipe);
                            console.log(currentBranch);
                            currentBranch = -1;
                            branch_buttons.forEach(btn=>gui_window.removeControl(btn));
                            branch_buttons = [];
                        }
                        else
                        {
                            currentPipe = currentPipe.branches[0];
                        }
                        if(currentPipe===undefined) currentPipe = environment.pipeTree;
                        target = currentPipe.point;
                        //console.log(target);
                        ship.lookAt(target);
                        heading = ship.position.subtract(target).normalize().scale(-shipSpeed);
                        //console.log(heading);
                    }
                }
            });

        });
        //SceneLoader.Append("./","Ship.glb",scene);

        //var north=new Vector3(0,0,1);        
        sphere.onBeforeDraw = ()=>{
            return;
            // sphere.position.addInPlace(heading);
            // if(sphere.position.subtract(target).lengthSquared()<sphereSpeed){
            //     sectionIdx++;
            //     if(sectionIdx>=environment.pipeBuilder.points.length) sectionIdx=0;
            //     target = environment.pipeBuilder.points[sectionIdx];
            //     console.log(target);
            //     sphere.lookAt(target);
            //     heading = sphere.position.subtract(target).normalize().scale(-sphereSpeed);
            //     console.log(heading);
            //     if(sectionIdx>=environment.pipeBuilder.points.length){
            //         sectionIdx=-1;
            //     }
            // }
        }

        // hide/show the Inspector
        window.addEventListener("keydown", (ev) => {
            // Shift+Ctrl+Alt+I
            if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
                if (scene.debugLayer.isVisible()) {
                    scene.debugLayer.hide();
                } else {
                    scene.debugLayer.show();
                }
            }
        });

        // run the main render loop
        engine.runRenderLoop(() => {
            scene.render();
        });
    }
}
new App();