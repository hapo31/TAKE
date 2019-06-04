import React, { useState, useEffect, useRef } from "react";
import { ipcRenderer } from "electron";

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
  const [encoder, setEncoder] = useState<Whammy.Video | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (props.saving && encoder) {
      const blob = encoder.compile();
      const filereader = new FileReader();
      filereader.readAsDataURL(blob);
      filereader.onloadend = () => {
        const b64 = filereader.result;
        ipcRenderer.send("compile-webm", b64);
        props.onSaved();
      };
    }
    if (props.srcStream && videoRef && videoRef.current) {
      const video = videoRef.current;
      const encoder = new Whammy.Video(props.frameRate);
      setEncoder(encoder);
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
              const width = props.right - props.left;
              const height = props.bottom - props.top;
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
              encoder.add(ctx);
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
          <canvas
            ref={canvasRef}
            width={props.right - props.left}
            height={props.bottom - props.top}
          />
        </>
      ) : null}
    </>
  );
};
