import { Point3D } from "./Point3D";

export class Move {
    public point: Point3D;
    public move: number;
    constructor(move: number, point: Point3D) {
        this.move = move;
        this.point = point;
    }
}