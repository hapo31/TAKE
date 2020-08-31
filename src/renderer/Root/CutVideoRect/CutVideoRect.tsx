import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import SendBlobEvent from "../../../utils/SendBlobEvent";

type Props = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  saving: boolean;
  onStart: () => void;
  onSave: (ev: SendBlobEvent) => void;
  frameRate: number;
  srcStream: MediaStream | null;
};

export default (props: Props) => {
  const [timer, setTimer] = useState(0);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const width = props.right - props.left;
  const height = props.bottom - props.top;

  useEffect(() => {
    if (recorder === null && canvasRef && canvasRef.current) {
      const recorder = new MediaRecorder(canvasRef.current.captureStream(), {
        mimeType: "video/webm;codecs=H264",
        audioBitsPerSecond: 0,
        videoBitsPerSecond: 2500 * 1024,
      });
      recorder.addEventListener("dataavailable", async (e) => {
        if (canvasRef.current && recorder) {
          props.onSave({
            width: canvasRef.current.width,
            height: canvasRef.current.height,
            arrayBuffer: await e.data.arrayBuffer(),
          });
        }
      });
      recorder.start();
      setRecorder(recorder);
    }
    if (props.srcStream && videoRef && videoRef.current) {
      const video = videoRef.current;
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
            }
          }
        }, 1000 / props.frameRate)
      );
      video.onloadedmetadata = () => video.play();
      props.onStart();
    }

    if (props.saving && recorder) {
      if (recorder.state === "recording") {
        recorder.stop();
      }
      if (timer !== 0) {
        clearInterval(timer);
        setTimer(0);
      }
    }
    return () => {
      if (timer !== 0) {
        clearInterval(timer);
      }
      if (recorder && recorder.state === "recording") {
        recorder.stop();
      }
      setRecorder(null);
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
