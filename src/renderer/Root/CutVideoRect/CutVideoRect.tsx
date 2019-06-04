import React, { useState, useEffect, useRef } from "react";

type Props = {
  left: number;
  top: number;
  right: number;
  bottom: number;

  frameRate: number;
  srcStream: MediaStream | null;
};

export default (props: Props) => {
  const [timer, setTimer] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
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
  }, [props.srcStream]);

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
