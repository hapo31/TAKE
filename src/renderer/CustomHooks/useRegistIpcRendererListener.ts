import ShortCutKeyEvent from "../../utils/ShortCutKeyEvent";
import { useEffect } from "react";
import { ipcRenderer } from "electron";

export default (
  channel: string,
  listener: (electronEvent: Electron.Event, keyEvent: ShortCutKeyEvent) => void,
  deps: any[]
) => {
  useEffect(() => {
    ipcRenderer.on(channel, listener);
    return () => {
      ipcRenderer.removeAllListeners(channel);
    };
  }, deps);
};
