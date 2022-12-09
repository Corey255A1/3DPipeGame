import { Mesh, Scene, MeshBuilder, StandardMaterial, CubeTexture, Texture, Color3, HemisphericLight, Vector3 } from "@babylonjs/core";
import { MapNavigation } from "./MapNavigation";
import { Move } from "./trackbuilder/Move";
import { Track } from "./trackbuilder/Track";

export class Environment {
    private _skybox: Mesh;
    private _track: Track;
    constructor(scene: Scene) {

        this._skybox = MeshBuilder.CreateBox("skyBox", { width: 1600, height: 6400, depth: 3200 }, scene);
        const skyboxMaterial = new StandardMaterial("skyBox", scene);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.reflectionTexture = new CubeTexture("imgs/skybox", scene);
        skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
        skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
        skyboxMaterial.specularColor = new Color3(0, 0, 0);
        this._skybox.material = skyboxMaterial;


        const direction_randomizer_params = new Map<number, any>(
            [
                [0,
                    [
                        { move: 0, percent: 0.7 },
                        { move: 1, percent: 0.15 },
                        { move: -1, percent: 0.15 }
                    ]
                ],
                [1,
                    [
                        { move: 0, percent: 0.25 },
                        { move: 1, percent: 0.05 },
                        { move: -1, percent: 0.7 }
                    ]
                ],
                [2,
                    [
                        { move: 0, percent: 0.0 },
                        { move: 1, percent: 0.5 },
                        { move: -1, percent: 0.5 }
                    ],
                ],
                [3,
                    [
                        { move: 0, percent: 0.25 },
                        { move: 1, percent: 0.7 },
                        { move: -1, percent: 0.05 }
                    ]
                ]
            ]);


        //Generate the Map... To Be Done Server Side Eventually
        const max_movements = 10;

        let navis: Array<Array<Move>> = [];
        for (let landmark = 0; landmark < 5; landmark++) {
            //Generate Intermediate Track
            let navi = new MapNavigation(16, 64, 8, 0, 0);

            for (let p = 0; p < max_movements; p++) {
                let ranmove = Math.random();
                let params = direction_randomizer_params.get(navi.h);
                let percentage = 0
                for (let m = 0; m < params.length; m++) {
                    percentage += params[m].percent;
                    if (percentage > 2) {
                        p = max_movements;
                        break;
                    }
                    else if (ranmove < percentage) {
                        if (navi.TestDirection(params[m].move)) {
                            if (params[m].move == 0 && Math.random() > 0.5) {
                                let zran = Math.random();
                                if (zran > navi.point.z * 0.1) {
                                    if (navi.TestDirection(5)) {
                                        navi.Move(5);
                                        break;
                                    }
                                    else if (navi.TestDirection(6)) {
                                        navi.Move(6);
                                        break;
                                    }
                                } else {
                                    if (navi.TestDirection(6)) {
                                        navi.Move(6);
                                        break;
                                    }
                                    else if (navi.TestDirection(5)) {
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
            switch (navi.h) {
                case 1: navi.Move(-1); break;
                case 3: navi.Move(1); break;
                case 2:
                    if (navi.TestDirection(1)) { navi.Move(1); navi.Move(1); }
                    else if (navi.TestDirection(-1)) { navi.Move(-1); navi.Move(-1); }
            }
            navi.Move(0)
            navis.push(navi.moves);
        }

        this._track = new Track(navis, scene);

        var light1: HemisphericLight = new HemisphericLight("light1", new Vector3(1, 1, 0), scene);
        // var light = new DirectionalLight("dir01", new Vector3(-1, -2, -1), scene);
        // light.position = new Vector3(800, 100, 3200);
        // light.intensity = 0.1;
        // light.diffuse = new Color3(1, 1, 1);
        // light.setDirectionToTarget(new Vector3(800,0,3200));


        // var shadowGenerator = new ShadowGenerator(1024, light);
        // shadowGenerator.getShadowMap().renderList.push(this.track.ground);

    }

    public get Track():Track{
        return this._track;
    }


}