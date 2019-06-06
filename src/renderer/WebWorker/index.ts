import {
  isGIFEncodeStart,
  isGIFEncodeAdd,
  isGIFEncodeFinish
} from "../../utils/GIFEncoderEvent";
import encode64 from "../../utils/b64";

let encoder: GIFEncoder | null = null;
let width = 0;
let height = 0;

const base = location.href.substring(
  0,
  location.href.length - "worker.js".length
);

importScripts(
  `${base}/LZWEncoder.js`,
  `${base}/NeuQuant.js`,
  `${base}/GIFEncoder.js`
);

self.addEventListener("message", e => {
  if (isGIFEncodeStart(e.data)) {
    encoder = new GIFEncoder();
    width = e.data.width;
    height = e.data.height;
    encoder.setSize(e.data.width, e.data.height);
    encoder.setQuality(e.data.quality);
    encoder.setDelay(e.data.delay);
    encoder.setRepeat(e.data.repeat);
    encoder.start();
  } else if (isGIFEncodeAdd(e.data)) {
    if (encoder) {
      encoder.addFrame(e.data.imageData.data, true);
    }
  } else if (isGIFEncodeFinish(e.data)) {
    if (encoder) {
      encoder.finish();
      const b64 = encode64(encoder.stream().getData());
      self.postMessage({ base64: b64, width, height }, (null as any) as string);
    }
    encoder = null;
  }
});
