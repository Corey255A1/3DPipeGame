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

        const c1 = this.branches.length>0?this.branches[0].point.subtract(this.point).normalize():this.point.subtract(this.previous.point).normalize();
        const c2 = vec_y;            
        const cross = c1.cross(c2).normalize().scale(0.5);

        return [this.point.subtract(cross),this.point.add(cross)];

    }


    public static GeneratePipeHelper(tree:PipeTree, meshes:Array<Mesh>, scene:Scene, leftPoints:Array<Vector3>, rightPoints:Array<Vector3>)
    {
        if(tree.branches.length <= 1){
            var points = tree.GetTrackPoints();
            leftPoints.push(points[0]);
            rightPoints.push(points[1]);
        }
        if (tree.branches.length !== 1){
            if(leftPoints.length>1 && rightPoints.length>1){
                meshes.push(MeshBuilder.CreateTube("left",{path:leftPoints, radius:0.2}, scene));
                meshes.push(MeshBuilder.CreateTube("right",{path:rightPoints, radius:0.2}, scene));
            }
            leftPoints = [];
            rightPoints = [];
        }

        for(var tree of tree.branches)
        {
            PipeTree.GeneratePipeHelper(tree, meshes, scene, leftPoints, rightPoints);
        }
    }

    public static GeneratePipeMeshes(tree:PipeTree, meshes:Array<Mesh>, scene:Scene)
    {
        PipeTree.GeneratePipeHelper(tree,meshes,scene,[],[]);
    }

    // public static GeneratePipeMeshes(root:PipeTree, scene:Scene):Array<Mesh>{
    //     var meshes:Array<Mesh> = [];
    //     var points = root.GetTrackPoints();
    //     for(var tree of root.branches)
    //     {
    //         const next_points = tree.GetTrackPoints();
    //         meshes.push(MeshBuilder.CreateTube("left",{path:[points[0],next_points[0]], radius:0.2}, scene));
    //         meshes.push(MeshBuilder.CreateTube("right",{path:[points[1],next_points[1]], radius:0.2}, scene));
    //         this.GeneratePipeMeshesHelper(tree, meshes, scene);
    //     }
    //     return meshes;
    // }
}

class PipeTrackBuilder
{
    public turn_step:number;
    public sections:number;
    public points:Array<Vector3>;
    constructor(resolution:number, start:Vector3, direction:Vector3){
        this.turn_step = Math.PI*2/resolution;
        this.sections = resolution;
        //start = start.cross(start.add(heading)).normalize().scale(3);
        this.points = [start, start.add(direction)];
    }

    get LastPoint(){
        return this.points[this.points.length-1];
    }

    get LastDirection(){
        return this.LastPoint.subtract(this.FromBack(1)).clone().normalize();
    }

    GenerateTrack(){
        var left = [];
        var right = [];
        const vec_z = new Vector3(0,0,1);
        const vec_y = new Vector3(0,1,0);

        this.points.forEach((p,i)=>{
            const c1 = (i<this.points.length-2)?this.points[i+1].subtract(p): p.subtract(this.points[i-1]);
            const c2 = vec_y;            
            const cross = c1.cross(c2).normalize().scale(0.5);
            left.push(p.subtract(cross));
            right.push(p.add(cross));
        });


        return [left,right];
    }

    FromBack(count:number){
        return this.points[this.points.length-count-1];
    }

    Straight(length:number, elevation:number){
        var direction:Vector3;
        if(this.points.length>1)
        {
            direction = this.LastPoint.subtract(this.FromBack(1));
            direction.normalize();
        }
        else{
            direction = new Vector3(0,0,1);
        }
        if(elevation!=0){
            const c2 = new Vector3(0,1,0);            
            const cross = direction.cross(c2).normalize();
            var rotMatrix = Matrix.RotationAxis(cross, elevation);
            direction = Vector3.TransformNormal(direction, rotMatrix);
        }

        this.points.push(this.LastPoint.add(direction.scale(length)));
    }

    Turn(angle:number, radius:number, direction:number)
    {
        const section_size =(Math.PI*radius*2)/this.sections;
        const startVector = this.LastPoint.add(this.LastDirection.scale(section_size));
        console.log(startVector);
        var rotMatrix = Matrix.RotationAxis(Axis.Y, this.turn_step*direction);
        for(var theta=0; theta<angle-this.turn_step; theta+=this.turn_step)
        {
            this.points.push(this.LastPoint.add(Vector3.TransformNormal(this.LastDirection, rotMatrix).scale(section_size)));
        }


    }



    
}


class Environment
{
    public ground: Mesh;
    public pipe1: Mesh;
    public pipe2: Mesh;
    public pipeBuilder:PipeTrackBuilder;
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
                currentPipe = currentPipe.branches[0];
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