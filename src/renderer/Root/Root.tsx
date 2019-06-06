import React, { useState, useRef, useEffect } from "react";
import DragPoints from "./DragPoints/DragPoints";
import DrawRect from "../Styled/DrawRect";
import { Rect } from "../../utils/types";
import CutVideoRect from "./CutVideoRect/CutVideoRect";
import { desktopCapturer, DesktopCapturerSource, ipcRenderer } from "electron";
import SendBlobEvent from "../../utils/SendBlobEvent";

type Props = {
  width: number;
  height: number;
};

export default (props: Props) => {
  const [rect, setRect] = useState({
    left: -1,
    top: -1,
    right: -1,
    bottom: -1
  });
  const [isMouseUp, setMouseUp] = useState(false);
  const [saveVideo, setSaveVideo] = useState(false);

  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  const onMouseDown = (rect: Rect) => {
    if (saveVideo) {
      return;
    }
    setVideoStream(null);
    setRect(rect);
  };

  const onMouseDrag = (rect: Rect) => {
    if (saveVideo) {
      return;
    }
    setRect(rect);
  };

  const onMouseUp = (rect: Rect) => {
    if (saveVideo) {
      return;
    }
    setRect(rect);
    setMouseUp(true);
    ipcRenderer.send("window-minimize");
    // 仮で10秒後に save 発動
    window.setTimeout(() => {
      setSaveVideo(true);
      console.log("start save");
    }, 10 * 1000);
    desktopCapturer
      .getSources({ types: ["window", "screen"] })
      .then(async sources => {
        try {
          // 型定義が間違っているので仕方なく as unknown as DesktopCapturerSource[] している
          for (const source of (sources as unknown) as DesktopCapturerSource[]) {
            // TODO: Primary display name different in Operationg Systems
            if (source.name === "Screen 1" || source.name === "Entire screen") {
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

  const onSave = (ev: SendBlobEvent) => {
    ipcRenderer.send("send-blob", {
      base64: ev.base64,
      width: ev.width,
      height: ev.height
    });
    setSaveVideo(false);
    setVideoStream(null);
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
          top={rect.top}
          left={rect.left}
          right={rect.right}
          bottom={rect.bottom}
          color="white"
        />
      ) : null}
      <CutVideoRect
        left={rect.left}
        right={rect.right}
        top={rect.top}
        bottom={rect.bottom}
        srcStream={videoStream}
        frameRate={15}
        saving={saveVideo}
        onSave={onSave}
      />
    </DragPoints>
  );
};
