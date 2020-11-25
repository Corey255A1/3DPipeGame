import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Mesh, MeshBuilder, SceneLoader, FollowCamera, Material, StandardMaterial, Color3, Matrix, Axis, CSG } from "@babylonjs/core";

class PipeTree
{
    public branches:Array<PipeTree>;
    public point:Vector3;
    public previous:PipeTree;
    public last_direction:Vector3;
    //public next_direction:Vector3;
    public static TurnSections:number = 25;
    public static TurnStep:number = Math.PI*2/PipeTree.TurnSections;
    constructor(previous:PipeTree, point:Vector3){

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
        const startVector = this.last_direction.scale(section_size);
        console.log(startVector);
        var rotMatrix = Matrix.RotationAxis(Axis.Y, PipeTree.TurnStep*direction);
        var previousPipe:PipeTree = this;
        for(var theta=0; theta<angle-PipeTree.TurnStep; theta+=PipeTree.TurnStep)
        {
            var newPipe:PipeTree = new PipeTree(previousPipe, previousPipe.point.add(Vector3.TransformNormal(previousPipe.last_direction, rotMatrix).scale(section_size)))
            previousPipe.branches.push(newPipe);
            previousPipe = newPipe;
        }

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

        for(var tree of root.branches)
        {
            if (root.branches.length !== 1)
            {
                leftPoints = [points[0]];
                rightPoints = [points[1]];
            }
            PipeTree.GeneratePipeHelper(tree, meshes, scene, leftPoints, rightPoints);
        }
    }

    public static GeneratePipeMeshes(tree:PipeTree, meshes:Array<Mesh>, scene:Scene)
    {
        PipeTree.GeneratePipeHelper(tree,meshes,scene,[],[]);
    }
}


class Environment
{
    public ground: Mesh;
    public pipe1: Mesh;
    public pipe2: Mesh;
    public pipeTree:PipeTree;
    
    constructor(scene:Scene){
        this.ground = MeshBuilder.CreatePlane("ground", {width:50, height:2000}, scene);
        this.ground.position.z = 990;
        this.ground.rotate(new Vector3(1,0,0),Math.PI/2);
        var groundMat:StandardMaterial = new StandardMaterial("groundMat", scene);
        groundMat.diffuseColor = new Color3(0,1,0);
        this.ground.material = groundMat;

        //var pipePoints: Array<Vector3> = [new Vector3(0,0,0), new Vector3(0,1,0), new Vector3(0,2,1), new Vector3(0,2,2), new Vector3(0,2,700)];

        this.pipeTree = new PipeTree(undefined, new Vector3(0,0,0))
        var pipetree = new PipeTree(this.pipeTree, new Vector3(0,0,2));
        this.pipeTree.branches.push(pipetree);

        pipetree = pipetree.Straight(15,0.5);
        pipetree = pipetree.Straight(5,-0.5);
        pipetree = pipetree.Turn(Math.PI/2, 5, 1);
        pipetree = pipetree.Turn(Math.PI/2, 5, -1);
        pipetree = pipetree.Straight(5,0);
        pipetree = pipetree.Straight(5,0);
        var p1 = pipetree.AddBranch(Math.PI/8,5);
        var p2 = pipetree.AddBranch(-Math.PI/8,5);
        p1 = p1.Straight(10,0.5);
        p1 = p1.Straight(1,-0.5);
        p1 = p1.Turn(Math.PI/2, 5, -1);
        p1 = p1.Straight(5,0);
        p1 = p1.Turn(Math.PI/2, 5, -1);
        p1 = p1.Straight(10,0.5);

        p2 = p2.Straight(10,-0.5);
        p2 = p2.Straight(1,0.5);
        p2 = p2.Turn(Math.PI/2, 5, 1);
        p2 = p2.Turn(Math.PI/2, 5, -1);
        p2 = p2.Turn(Math.PI/2, 5, 1);
        p2 = p2.Turn(Math.PI/2, 5, -1);

        var meshes:Array<Mesh> = [];
        PipeTree.GeneratePipeMeshes(this.pipeTree,meshes,scene);
        
        var pipeTrack:Mesh = Mesh.MergeMeshes(meshes, true);        
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

        var camera: ArcRotateCamera = new ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 2, 2, Vector3.Zero(), scene);
        var camera2: FollowCamera = new FollowCamera("FollowCamera", new Vector3(0,10,0), scene);
        var environment: Environment = new Environment(scene);
        scene.activeCamera = camera2;
        camera2.heightOffset = 10;
        camera2.attachControl(true);
        // camera.position.set(1,1,1);
        
        

        var light1: HemisphericLight = new HemisphericLight("light1", new Vector3(1, 1, 0), scene);
        var sphere: Mesh = MeshBuilder.CreateSphere("sphere", { diameter: 1 }, scene);
        SceneLoader.ImportMesh(null, "./", "Ship.glb",scene,(meshes)=>{
            const ship:Mesh = meshes[0];
            const shipSpeed = 0.5;
            var lastposition = ship.position.clone();
            //var sectionIdx=0;
            var currentPipe = environment.pipeTree
           // var target = environment.pipeBuilder.points[sectionIdx];
            var target = currentPipe.point;
            camera2.lockedTarget = ship;
            console.log("LOADED")
            var heading = ship.position.subtract(target).normalize().scale(-shipSpeed);
            ship.lookAt(target);
            console.log(ship)
            scene.registerBeforeRender(()=>{
            ship.position.addInPlace(heading);
            if(ship.position.subtract(target).lengthSquared()<shipSpeed){
                if(currentPipe.branches.length>1){
                    currentPipe = currentPipe.branches[Math.round(Math.random()*(currentPipe.branches.length-1))];
                }
                else
                {
                    currentPipe = currentPipe.branches[0];
                }
                if(currentPipe===undefined) currentPipe = environment.pipeTree;
                target = currentPipe.point;
                console.log(target);
                ship.lookAt(target);
                heading = ship.position.subtract(target).normalize().scale(-shipSpeed);
                console.log(heading);
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