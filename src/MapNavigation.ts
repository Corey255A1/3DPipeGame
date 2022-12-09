//Corey Wunderlich 2022
//https://www.wundervisionenvisionthefuture.com/

import { Move } from "./trackbuilder/Move";
import { Point3D } from "./trackbuilder/Point3D";

export class MapNavigation {
    public point: Point3D;
    public startingPoint: Point3D;
    public h: number;
    public width: number;
    public height: number;
    public depth: number;
    public map: Array<Array<Array<number>>>;
    public moves: Array<Move>;
    constructor(width: number, height: number, x: number, y: number, z: number) {
        this.point = new Point3D(x, y, z);
        this.startingPoint = this.point;
        this.width = width;
        this.height = height;
        this.depth = 4;
        this.h = 0;
        this.map = [];
        this.moves = [];
        for (let x = 0; x < this.width; x++) {
            this.map.push([]);
            for (let y = 0; y < this.height; y++) {
                this.map[x].push([]);
                for (let z = 0; z < this.depth; z++) {
                    this.map[x][y].push(-10);
                }
            }
        }
    }

    MoveToStart() {
        this.point = this.startingPoint;
    }

    Move(dir: number) {
        this.map[this.point.x][this.point.y][this.point.z] = dir;
        this.point = this.GetPointInDir(dir);
        if (dir != 5 && dir != 6) {
            this.h = this.GetWorldDirection(dir);
        }
        this.moves.push(new Move(dir, this.point));
    }

    GetMove(): number {
        return this.map[this.point.x][this.point.y][this.point.z];
    }

    NextMove() {
        let newh = this.GetMove();
        this.point = this.GetPointInDir(newh);
        if (newh != 5 && newh != 6) {
            this.h = this.GetWorldDirection(newh);
        }
        console.log(this.point);
    }

    CheckBound(x: number, y: number, z: number): boolean {
        return (x < 0 || y < 0 || z < 0 || x >= this.width || y >= this.height || z >= this.depth)
    }
    TestDirection(dir: number): boolean {
        let point = this.GetPointInDir(dir);
        return !this.CheckBound(point.x, point.y, point.z) && this.map[point.x][point.y][point.z] === -10;
    }
    GetWorldDirection(dir: number) {
        let newh = this.h + dir; if (newh < 0) { newh += 4 };
        if (newh == 4) newh = 0;
        return newh;
    }
    ChangeZ(up: boolean): Point3D {
        if (up) {
            return new Point3D(this.point.x, this.point.y, this.point.z + 1);
        }
        else {
            return new Point3D(this.point.x, this.point.y, this.point.z - 1);
        }
    }
    GetPointInDir(dir: number): Point3D {
        if (dir == 5 || dir == 6) {
            return this.ChangeZ(dir == 5);
        } else {
            let newh = this.GetWorldDirection(dir);
            switch (newh) {
                case 1: return new Point3D(this.point.x + 1, this.point.y, this.point.z);
                case 2: return new Point3D(this.point.x, this.point.y - 1, this.point.z);
                case 3: return new Point3D(this.point.x - 1, this.point.y, this.point.z);
                case 0:
                default:
                    return new Point3D(this.point.x, this.point.y + 1, this.point.z);
            }
        }

    }
}