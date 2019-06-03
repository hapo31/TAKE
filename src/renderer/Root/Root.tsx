import React, { useState } from "react";
import DragPoints from "./DragPoints/DragPoints";
import DrawRect from "../Styled/DrawRect";
import { Rect } from "../../utils/types";

type Props = {
  width: number;
  height: number;
};

export default (props: Props) => {
  const [startX, setStartX] = useState(-1);
  const [startY, setStartY] = useState(-1);
  const [endX, setEndX] = useState(-1);
  const [endY, setEndY] = useState(-1);

  const onMouseDown = (rect: Rect) => {
    setStartX(rect.left);
    setStartY(rect.top);
    setEndX(rect.right);
    setEndY(rect.bottom);
    console.log("onMouseDown", rect);
  };

  const onMouseDrag = (rect: Rect) => {
    setStartX(rect.left);
    setStartY(rect.top);
    setEndX(rect.right);
    setEndY(rect.bottom);
    console.log("onMouseDrag", rect);
  };

  const onMouseUp = (rect: Rect) => {
    setStartX(rect.left);
    setStartY(rect.top);
    setEndX(rect.right);
    setEndY(rect.bottom);
    console.log("onMouseUp", rect);
  };

  return (
    <DragPoints
      onMouseDown={onMouseDown}
      onMouseDrag={onMouseDrag}
      onMouseUp={onMouseUp}
    >
      <DrawRect
        width={props.width}
        height={props.height}
        top={startY}
        left={startX}
        right={endX}
        bottom={endY}
        color="black"
      />
    </DragPoints>
  );
};
