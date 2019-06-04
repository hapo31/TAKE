import React, { useState, useRef } from "react";
import DragPoints from "./DragPoints/DragPoints";
import DrawRect from "../Styled/DrawRect";
import { Rect } from "../../utils/types";
import CutVideoRect from "./CutVideoRect/CutVideoRect";
import { desktopCapturer, DesktopCapturerSource, ipcRenderer } from "electron";

type Props = {
  width: number;
  height: number;
};

export default (props: Props) => {
  const [left, setLeft] = useState(-1);
  const [top, setTop] = useState(-1);
  const [right, setRight] = useState(-1);
  const [bottom, setBottom] = useState(-1);
  const [isMouseUp, setMouseUp] = useState(false);
  const [saveVideo, setSaveVideo] = useState(false);

  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const onMouseDown = (rect: Rect) => {
    setVideoStream(null);
    setLeft(rect.left);
    setTop(rect.top);
    setRight(rect.right);
    setBottom(rect.bottom);
  };

  const onMouseDrag = (rect: Rect) => {
    setLeft(rect.left);
    setTop(rect.top);
    setRight(rect.right);
    setBottom(rect.bottom);
  };

  const onMouseUp = (rect: Rect) => {
    setLeft(rect.left);
    setTop(rect.top);
    setRight(rect.right);
    setBottom(rect.bottom);
    setMouseUp(true);
    ipcRenderer.send("window-minimize");
    // 仮で５秒後に save 発動
    window.setTimeout(() => {
      setSaveVideo(true);
      console.log("start save");
    }, 5000);
    desktopCapturer
      .getSources({ types: ["window", "screen"] })
      .then(async sources => {
        try {
          // 型定義が間違っているので仕方なく as unknown as DesktopCapturerSource[] している
          for (const source of (sources as unknown) as DesktopCapturerSource[]) {
            if (source.name === "Screen 1") {
              const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                  mandatory: {
                    chromeMediaSource: "desktop",
                    chromeMediaSourceId: source.id
                  }
                } as any
              });
              setVideoStream(stream);
            }
          }
        } catch (e) {
          console.error(e);
        }
      });
  };

  const onSaved = () => {
    setSaveVideo(false);
  };

  return (
    <DragPoints
      onMouseDown={onMouseDown}
      onMouseDrag={onMouseDrag}
      onMouseUp={onMouseUp}
    >
      {videoStream === null ? (
        <DrawRect
          width={props.width}
          height={props.height}
          top={top}
          left={left}
          right={right}
          bottom={bottom}
          color="white"
        />
      ) : null}
      <CutVideoRect
        left={left}
        right={right}
        top={top}
        bottom={bottom}
        srcStream={videoStream}
        frameRate={30}
        saving={saveVideo}
        onSaved={onSaved}
      />
    </DragPoints>
  );
};
