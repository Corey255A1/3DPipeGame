import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Mesh, MeshBuilder, SceneLoader, FollowCamera, Material, StandardMaterial, Color3, Matrix, Axis } from "@babylonjs/core";

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
    constructor(scene:Scene){
        this.ground = MeshBuilder.CreatePlane("ground", {width:50, height:2000}, scene);
        this.ground.position.z = 990;
        this.ground.rotate(new Vector3(1,0,0),Math.PI/2);
        var groundMat:StandardMaterial = new StandardMaterial("groundMat", scene);
        groundMat.diffuseColor = new Color3(0,1,0);
        this.ground.material = groundMat;

        //var pipePoints: Array<Vector3> = [new Vector3(0,0,0), new Vector3(0,1,0), new Vector3(0,2,1), new Vector3(0,2,2), new Vector3(0,2,700)];
        this.pipeBuilder = new PipeTrackBuilder(25, new Vector3(0,0,0), new Vector3(0,0,2));
        this.pipeBuilder.Straight(15,0.5);
        this.pipeBuilder.Straight(3,-0.5);
        this.pipeBuilder.Turn(Math.PI/2, 5, 1);
        this.pipeBuilder.Straight(3,0);
        this.pipeBuilder.Turn(Math.PI/2, 5, -1);
        this.pipeBuilder.Straight(5,0);
        this.pipeBuilder.Turn(Math.PI/2, 5, -1);
        this.pipeBuilder.Straight(5,0);
        this.pipeBuilder.Turn(Math.PI/2, 5, 1);
        this.pipeBuilder.Straight(25,-0.1);
        this.pipeBuilder.Straight(1,0.1);
        this.pipeBuilder.Turn(Math.PI/2, 5, 1);
        this.pipeBuilder.Turn(Math.PI/2, 5, -1);
        this.pipeBuilder.Turn(Math.PI/4, 5, 1);
        this.pipeBuilder.Turn(Math.PI/4, 5, -1);
        this.pipeBuilder.Turn(Math.PI/4, 5, 1);
        this.pipeBuilder.Turn(Math.PI/4, 5, -1);
        this.pipeBuilder.Turn(Math.PI/4, 5, 1);
        this.pipeBuilder.Turn(Math.PI/4, 5, -1);
        // this.pipeBuilder.Straight(3);
        // this.pipeBuilder.Turn(Math.PI/2, 10, new Vector3(0,0,-1));
        // this.pipeBuilder.Straight(10);
        // this.pipeBuilder.Turn(Math.PI/2, 10, new Vector3(1,0,0));
        // this.pipeBuilder.Straight(10);
        // this.pipeBuilder.Turn(Math.PI/2, 10, new Vector3(-1,0,0));
        // this.pipeBuilder.Straight(10);
        // this.pipeBuilder.Turn(Math.PI/2, 10, new Vector3(-1,0,0));
        var track = this.pipeBuilder.GenerateTrack();
        console.log(track[0]);
        console.log(track[1]);
        this.pipe1 = MeshBuilder.CreateTube("tubural1",{path:track[0], radius:0.2}, scene);
        this.pipe2 = MeshBuilder.CreateTube("tubural2",{path:track[1], radius:0.2}, scene);
        
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
        //SceneLoader.Append("./","Box.glb",scene);

        camera2.lockedTarget = sphere;
        var lastposition = sphere.position.clone();
        var sectionIdx=0;
        var target = environment.pipeBuilder.points[sectionIdx];
        sphere.lookAt(target);
        //var north=new Vector3(0,0,1);
        const sphereSpeed = 0.5;
        var heading = sphere.position.subtract(target).normalize().scale(-sphereSpeed);
        sphere.onBeforeDraw = ()=>{
            sphere.position.addInPlace(heading);
            if(sphere.position.subtract(target).lengthSquared()<sphereSpeed){
                sectionIdx++;
                if(sectionIdx>=environment.pipeBuilder.points.length) sectionIdx=0;
                target = environment.pipeBuilder.points[sectionIdx];
                console.log(target);
                sphere.lookAt(target);
                heading = sphere.position.subtract(target).normalize().scale(-sphereSpeed);
                console.log(heading);
                if(sectionIdx>=environment.pipeBuilder.points.length){
                    sectionIdx=-1;
                }
            }
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