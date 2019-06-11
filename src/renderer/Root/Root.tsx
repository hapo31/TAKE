import React, { useState, useEffect, useCallback } from "react";
import DragPoints from "./DragPoints/DragPoints";
import DrawRect from "../Styled/DrawRect";
import { Rect } from "../../utils/types";
import CutVideoRect from "./CutVideoRect/CutVideoRect";
import { desktopCapturer, DesktopCapturerSource, ipcRenderer } from "electron";
import SendBlobEvent from "../../utils/SendBlobEvent";
import ShortCutKeyEvent from "../../utils/ShortCutKeyEvent";

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
  const [isRecording, setIsRecording] = useState(false);
  const [saveVideo, setSaveVideo] = useState(false);

  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    ipcRenderer.on("shortcut-key", (_: Electron.Event, e: ShortCutKeyEvent) => {
      switch (e.name) {
        // RecordingStop で録画終了
        case "RecordingStop": {
          if (isRecording) {
            setSaveVideo(true);
          } else {
            // 録画中でなければウインドウを閉じる
            window.close();
          }
        }
      }
    });

    return () => {
      ipcRenderer.removeAllListeners("shortcut-key");
    };
  }, [isRecording]);

  const onMouseDown = useCallback(
    (rect: Rect) => {
      if (saveVideo || isRecording) {
        return;
      }
      setVideoStream(null);
      setRect(rect);
    },
    [saveVideo, isRecording]
  );

  const onMouseDrag = useCallback(
    (rect: Rect) => {
      if (saveVideo || isRecording) {
        return;
      }
      setRect(rect);
    },
    [saveVideo, isRecording]
  );

  const onMouseUp = useCallback(
    (rect: Rect) => {
      if (saveVideo || isRecording) {
        return;
      }

      // 面積が10ピクセル以下のときは何もしない
      if ((rect.right - rect.left) * (rect.bottom - rect.top) < 10) {
        return;
      }

      setRect(rect);
      ipcRenderer.send("window-hide");
      desktopCapturer.getSources({ types: ["screen"] }).then(async sources => {
        try {
          // 型定義が間違っているので仕方なく as unknown as DesktopCapturerSource[] している
          for (const source of (sources as unknown) as DesktopCapturerSource[]) {
            if (source.display_id.toString() === window.name) {
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
              setIsRecording(true);
            }
          }
        } catch (e) {
          console.error(e);
        }
      });
    },
    [saveVideo, isRecording]
  );

  const onSave = useCallback((ev: SendBlobEvent) => {
    const n = new Notification("cap-taro", { body: "Saving..." });
    ipcRenderer.send("send-blob", {
      base64: ev.base64,
      width: ev.width,
      height: ev.height
    });
    setSaveVideo(false);
    setIsRecording(false);
    setVideoStream(null);
  }, []);

  const onStart = useCallback(() => {
    const n = new Notification("cap-taro", { body: "Record started." });
    ipcRenderer.send("start-recording");
  }, []);

  return (
    <DragPoints
      onMouseDown={onMouseDown}
      onMouseDrag={onMouseDrag}
      onMouseUp={onMouseUp}
    >
      {videoStream === null && rect.left !== -1 && rect.top !== -1 ? (
        <DrawRect
          width={props.width}
          height={props.height}
          top={rect.top}
          left={rect.left}
          right={rect.right}
          bottom={rect.bottom}
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
        onStart={onStart}
        onSave={onSave}
      />
    </DragPoints>
  );
};
