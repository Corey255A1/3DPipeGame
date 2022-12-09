import { Engine, Scene, FreeCamera, Vector3, PointLight, Color3, Mesh, MeshBuilder, SceneLoader } from "@babylonjs/core";
import { AdvancedDynamicTexture, Button } from "@babylonjs/gui";
import { Environment } from "./Environment";

export class PipeGameMain {
    private _canvas:HTMLCanvasElement;
    private _engine:Engine;
    private _scene:Scene;
    private _camera:FreeCamera;
    private _environment:Environment;
    constructor(canvas_name:string) {
        // create the canvas html element and attach it to the webpage
        const element = document.getElementById(canvas_name);
        if(element == null) { throw "No Canvas Found"; }

        this._canvas = element as HTMLCanvasElement;

        // initialize babylon scene and engine
        this._engine = new Engine(this._canvas, true);
        this._scene = new Scene(this._engine);

        //var camera: ArcRotateCamera = new ArcRotateCamera("Camera", Math.PI / 2, Math.PI / 2, 15, Vector3.Zero(), scene);
        this._camera = new FreeCamera("thirdperson", new Vector3(0, 1, -3), this._scene);
        //var camera2: FollowCamera = new FollowCamera("FollowCamera", new Vector3(0,10,0), scene);
        this._environment = new Environment(this._scene);
        this._scene.activeCamera = this._camera;
        //camera2.heightOffset = 10;
        //camera2.attachControl(true);
        // camera.position.set(1,1,1);
        var ship_paused: boolean = true;
        var gui_window = AdvancedDynamicTexture.CreateFullscreenUI("options");

        var start_button = Button.CreateSimpleButton("start_button", "Start!");
        start_button.width = "150px"
        start_button.height = "40px";
        start_button.color = "white";
        start_button.cornerRadius = 20;
        start_button.background = "green";
        start_button.verticalAlignment = 1;
        start_button.top = -40;
        start_button.onPointerUpObservable.add(function () {
            ship_paused = false;
            gui_window.removeControl(start_button);
        });
        gui_window.addControl(start_button);



        const create_branch_options = function (count: number, callback: Function): Array<Button> {
            var btns: Array<Button> = [];
            for (let b = 0; b < count; b++) {
                var option: string = String.fromCharCode(65 + b);
                var btn = Button.CreateSimpleButton(option, option);
                btn.width = "150px"
                btn.height = "40px";
                btn.color = "white";
                btn.cornerRadius = 20;
                btn.background = "green";
                btn.verticalAlignment = 1;
                btn.top = -40;
                btn.left = -155 * (count - 1) / 2 + b * 155;
                btn.onPointerUpObservable.add(() => {
                    console.log(b);
                    callback(btn, b, option);
                });
                btns.push(btn);
            }
            return btns;
        }


        var test_light: PointLight = new PointLight("testlight", this._camera.position, this._scene);
        test_light.diffuse = new Color3(1, 0, 0);
        test_light.specular = new Color3(1, 0, 0);
        var sphere: Mesh = MeshBuilder.CreateSphere("sphere", { diameter: 1 }, this._scene);
        SceneLoader.ImportMesh(null, "./", "Ship.glb", this._scene, (meshes) => {
            const ship: Mesh = meshes[0] as Mesh;
            const ship_speed = 0.5;
            ship.position = new Vector3(0, 0, -5);
            var lastposition = ship.position.clone();
            test_light.position = ship.position;
            test_light.setEnabled(false);
            //var sectionIdx=0;
            var current_pipe = this._environment.Track.PipeStart;
            // var target = environment.pipeBuilder.points[sectionIdx];
            var target = current_pipe.Point;
            const camera_offset: Vector3 = new Vector3(0, 5, 0);
            var camera_rear_offset = -20;
            console.log("LOADED")
            var heading = ship.position.subtract(target).normalize().scale(-ship_speed);
            ship.lookAt(target);
            console.log(ship)


            var current_branch: number = -1;
            var branch_buttons: Array<Button>;
            const branch_callback = function (btn: Button, branch_number: number, option: string) {
                current_branch = branch_number;
                ship_paused = false;
            }

            this._scene.registerBeforeRender(() => {
                Vector3.LerpToRef(this._camera.position, (ship.position.subtract(ship.forward.scale(camera_rear_offset)).add(camera_offset)), 0.05, this._camera.position);
                this._camera.setTarget(ship.position);
                if (!ship_paused) {
                    ship.position.addInPlace(heading);
                    if (ship.position.subtract(target).lengthSquared() < ship_speed) {
                        if (current_pipe.Branches.length > 1 && current_branch === -1) {
                            ship_paused = true;
                            branch_buttons = create_branch_options(current_pipe.Branches.length, branch_callback);
                            branch_buttons.forEach(btn => gui_window.addControl(btn));
                            //currentPipe = currentPipe.Branches[Math.round(Math.random()*(currentPipe.Branches.length-1))];
                        }
                        else if (current_pipe.Branches.length > 1 && current_branch !== -1) {
                            current_pipe = current_pipe.Branches[current_branch];
                            //console.log(currentPipe);
                            //console.log(currentBranch);
                            current_branch = -1;
                            branch_buttons.forEach(btn => gui_window.removeControl(btn));
                            branch_buttons = [];
                        }
                        else {
                            current_pipe = current_pipe.Branches[0];
                        }
                        if (current_pipe === undefined) current_pipe = this._environment.Track.PipeStart;
                        if (current_pipe.GetAdditionalProperty("closecamera") === true) {
                            camera_offset.y = 1;
                            camera_rear_offset = -10;
                            test_light.setEnabled(true);
                        } else if (current_pipe.GetAdditionalProperty("closecamera") === false) {
                            camera_offset.y = 5;
                            camera_rear_offset = -20;
                            test_light.setEnabled(false);
                        }
                        target = current_pipe.Point;
                        //console.log(target);
                        ship.lookAt(target);
                        heading = ship.position.subtract(target).normalize().scale(-ship_speed);
                        //console.log(heading);
                    }
                }
            });

        });
        //SceneLoader.Append("./","Ship.glb",scene);

        //var north=new Vector3(0,0,1);        
        sphere.onBeforeDraw = () => {
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
                if (this._scene.debugLayer.isVisible()) {
                    this._scene.debugLayer.hide();
                } else {
                    this._scene.debugLayer.show();
                }
            }
        });

        // run the main render loop
        this._engine.runRenderLoop(() => {
            this._scene.render();
        });
    }
}