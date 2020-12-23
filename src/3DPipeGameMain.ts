import "@babylonjs/core/Debug/debugLayer";
import "@babylonjs/inspector";
import "@babylonjs/loaders/glTF";
import {AdvancedDynamicTexture, Button} from "@babylonjs/gui";
import {  Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Mesh, MeshBuilder, SceneLoader, FollowCamera, Material, StandardMaterial, Color3, Matrix, Axis, CSG, Texture, CubeTexture, FreeCamera, VertexBuffer, FloatArray, DirectionalLight, ShadowGenerator, PointLight } from "@babylonjs/core";

import { PipeTree, TrackUtils, Tunnel, Point3D, Move, Track } from "./TrackBuilder"


class MapNavi{
    public point:Point3D;
    public startingPoint:Point3D;
    public h:number;
    public width:number;
    public height:number;
    public depth:number;
    public map:Array<Array<Array<number>>>;
    public moves:Array<Move>;
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
        this.moves.push(new Move(dir,this.point));
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
    public skybox: Mesh;
    public track:Track;
    constructor(scene:Scene){
        
        this.skybox = MeshBuilder.CreateBox("skyBox", {width:1600,height:6400, depth:3200}, scene);
        const skyboxMaterial = new StandardMaterial("skyBox", scene);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.reflectionTexture = new CubeTexture("imgs/skybox", scene);
        skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
        skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
        skyboxMaterial.specularColor = new Color3(0, 0, 0);
        this.skybox.material = skyboxMaterial;


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
        
        
        //Generate the Map... To Be Done Server Side Eventually
        const max_movements = 10;

        let navis:Array<Array<Move>> = [];
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
                    if(navi.TestDirection(1)){ navi.Move(1); navi.Move(1);}
                    else if(navi.TestDirection(-1)){navi.Move(-1);navi.Move(-1);} 
            }
            navi.Move(0)
            navis.push(navi.moves);
        }
        
        this.track = new Track(navis, scene);
        
        var light1: HemisphericLight = new HemisphericLight("light1", new Vector3(1, 1, 0), scene);
        // var light = new DirectionalLight("dir01", new Vector3(-1, -2, -1), scene);
        // light.position = new Vector3(800, 100, 3200);
        // light.intensity = 0.1;
        // light.diffuse = new Color3(1, 1, 1);
        // light.setDirectionToTarget(new Vector3(800,0,3200));


        // var shadowGenerator = new ShadowGenerator(1024, light);
        // shadowGenerator.getShadowMap().renderList.push(this.track.ground);

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

        
        var testlight:PointLight = new PointLight("testlight",camera.position,scene);
        testlight.diffuse = new Color3(1,0,0);
        testlight.specular = new Color3(1,0,0);
        var sphere: Mesh = MeshBuilder.CreateSphere("sphere", { diameter: 1 }, scene);
        SceneLoader.ImportMesh(null, "./", "Ship.glb",scene,(meshes)=>{
            const ship:Mesh = meshes[0];
            const shipSpeed = 0.5;
            ship.position = new Vector3(0,0,-5);
            var lastposition = ship.position.clone();
            testlight.position=ship.position;
            testlight.setEnabled(false);
            //var sectionIdx=0;
            var currentPipe = environment.track.pipe_start;
           // var target = environment.pipeBuilder.points[sectionIdx];
            var target = currentPipe.point;
            const cameraoffset: Vector3 = new Vector3(0,5,0);
            var camerarearoffset = -20;
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
                Vector3.LerpToRef(camera.position, (ship.position.subtract(ship.forward.scale(camerarearoffset)).add(cameraoffset)), 0.05, camera.position );
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
                            //console.log(currentPipe);
                            //console.log(currentBranch);
                            currentBranch = -1;
                            branch_buttons.forEach(btn=>gui_window.removeControl(btn));
                            branch_buttons = [];
                        }
                        else
                        {
                            currentPipe = currentPipe.branches[0];
                        }
                        if(currentPipe===undefined) currentPipe = environment.track.pipe_start;
                        if(currentPipe.metadata["closecamera"]===true){
                            cameraoffset.y=1;
                            camerarearoffset= -10;
                            testlight.setEnabled(true);
                        }else if(currentPipe.metadata["closecamera"]===false){
                            cameraoffset.y=5;
                            camerarearoffset=-20;
                            testlight.setEnabled(false);
                        }
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