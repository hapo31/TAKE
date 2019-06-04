declare namespace Whammy {
  class Video {
    constructor(frameRate: number);
    add(src: CanvasRenderingContext2D | HTMLCanvasElement | string): void;
    compile(): Blob;
  }
}
