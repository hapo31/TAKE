import React, { useState, useEffect, useRef } from "react";
import { ipcRenderer } from "electron";
import { GIFEncodeAdd, GIFEncodeStart } from "../../../utils/GIFEncoderEvent";
import SendBlobEvent from "../../../utils/SendBlobEvent";

type Props = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  saving: boolean;
  onSaved: () => void;
  frameRate: number;
  srcStream: MediaStream | null;
};

export default (props: Props) => {
  const [timer, setTimer] = useState(0);
  const [worker, setWorker] = useState<Worker | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const width = props.right - props.left;
  const height = props.bottom - props.top;

  useEffect(() => {
    if (worker === null) {
      // Worker でGIFの処理をする
      // TODO: 何故かそんなに早くなってない…
      const worker = new Worker("./scripts/worker.js");

      worker.addEventListener("message", e => {
        const data: SendBlobEvent = e.data;
        ipcRenderer.send("send-blob", {
          base64: data.base64,
          width: data.width,
          height: data.height
        });
        props.onSaved();
      });

      setWorker(worker);
    }

    if (props.saving && worker) {
      worker.postMessage({ type: "GIFEncodeFinish" });
      if (timer !== 0) {
        clearInterval(timer);
        setTimer(0);
      }
    }
    if (props.srcStream && videoRef && videoRef.current) {
      const video = videoRef.current;
      if (worker) {
        worker.postMessage({
          type: "GIFEncodeStart",
          width,
          height,
          quality: 20,
          // TODO: たぶん計算方法が間違ってる
          delay: 1000 / props.frameRate,
          repeat: 0
        } as GIFEncodeStart);
      }
      video.srcObject = props.srcStream;
      if (timer !== 0) {
        clearInterval(timer);
      }
      setTimer(
        window.setInterval(() => {
          if (canvasRef && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(
                video,
                props.left,
                props.top,
                width,
                height,
                0,
                0,
                width,
                height
              );
              if (worker) {
                worker.postMessage({
                  type: "GIFEncodeAdd",
                  imageData: ctx.getImageData(0, 0, width, height)
                } as GIFEncodeAdd);
              }
            }
          }
        }, 1000 / props.frameRate)
      );
      video.onloadedmetadata = () => video.play();
    }

    return () => {
      if (timer !== 0) {
        clearInterval(timer);
      }
    };
  }, [props.srcStream, props.saving]);

  return (
    <>
      {props.srcStream !== null ? (
        <>
          <video
            ref={videoRef}
            width={window.parent.screen.width}
            height={window.parent.screen.height}
            style={{ display: "none" }}
          />
          <canvas ref={canvasRef} width={width} height={height} />
        </>
      ) : null}
    </>
  );
};
