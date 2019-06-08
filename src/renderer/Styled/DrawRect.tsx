import React, { useRef, useEffect } from "react";

type Props = {
  width: number;
  height: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export default (props: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, props.width, props.height);
        ctx.globalAlpha = 1.0;
        ctx.font = "14px mono";
        ctx.fillText(
          `(${props.right},${props.bottom})`,
          props.right + 5,
          props.bottom + 15
        );
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = "#808080";
        ctx.fillRect(
          props.left,
          props.top,
          props.right - props.left,
          props.bottom - props.top
        );

        ctx.strokeStyle = "black";
        ctx.beginPath();
        ctx.moveTo(props.left, props.top);
        ctx.lineTo(props.right, props.top);
        ctx.lineTo(props.right, props.bottom);
        ctx.lineTo(props.left, props.bottom);
        ctx.lineTo(props.left, props.top);
        ctx.closePath();
        ctx.stroke();
      }
    }
  });

  return (
    <canvas
      style={{
        display: "fixed",
        right: "-1px",
        left: "-1px"
      }}
      width={`${props.width}px`}
      height={`${props.height}px`}
      ref={canvasRef}
    />
  );
};
