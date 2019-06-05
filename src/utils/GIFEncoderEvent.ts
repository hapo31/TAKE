import WorkerEvent from "./WorkerEvent";

export interface GIFEncodeStart extends WorkerEvent {
  type: "GIFEncodeStart";
  width: number;
  height: number;
  quality: number;
  delay: number;
  repeat: number;
}

export function isGIFEncodeStart(e: WorkerEvent): e is GIFEncodeStart {
  return e.type === "GIFEncodeStart";
}

export interface GIFEncodeAdd extends WorkerEvent {
  type: "GIFEncodeAdd";
  imageData: ImageData;
}

export function isGIFEncodeAdd(e: WorkerEvent): e is GIFEncodeAdd {
  return e.type === "GIFEncodeAdd";
}

export interface GIFEncodeFinish extends WorkerEvent {
  type: "GIFEncodeFinish";
}

export function isGIFEncodeFinish(e: WorkerEvent): e is GIFEncodeFinish {
  return e.type === "GIFEncodeFinish";
}
