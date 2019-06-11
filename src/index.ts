import {
  BrowserWindow,
  app,
  App,
  Menu,
  screen,
  ipcMain,
  dialog,
  globalShortcut
} from "electron";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import tempfile from "tempfile";
import SendBlobEvent from "./utils/SendBlobEvent";

class MyApp {
  private mainWindow: BrowserWindow | null = null;
  private windowToDisplayIdMap: Map<number, number> = new Map();
  private windows: (BrowserWindow | null)[] | null = null;
  private app: App;
  private mainURL: string = `file://${__dirname}/index.html`;

  private isRecording = false;

  private isDebug = false;
  private isUseFFmpeg = true;

  constructor(app: App) {
    this.app = app;
    this.app.on("window-all-closed", this.onWindowAllClosed.bind(this));
    this.app.on("ready", this.create.bind(this));
    this.app.on("activate", this.onActivated.bind(this));
  }

  private onReady() {
    this.create();
  }

  private onActivated() {
    if (this.windows !== null) {
      this.create();
    }
  }

  private onWindowAllClosed() {
    this.app.quit();
  }

  private create() {
    const windowCommonOptions = {
      title: "cap-taro",
      acceptFirstMouse: true,
      frame: false,
      alwaysOnTop: true,
      resizable: false,
      movable: false,
      skipTaskbar: true,
      transparent: true,
      opacity: this.isDebug ? 1.0 : 0.3,
      webPreferences: {
        nodeIntegration: true
      }
    };

    const displays = screen.getAllDisplays();

    const windows = displays.map(display => {
      const bw = new BrowserWindow({
        ...display.bounds,
        ...windowCommonOptions
      });
      // 各ウインドウから id を取得出来るように、 BrowserWindow と display の id を紐付ける
      this.windowToDisplayIdMap.set(bw.id, display.id);
      if (display.id === screen.getPrimaryDisplay().id) {
        this.mainWindow = bw;
      }
      return bw;
    });

    windows.forEach(window => {
      if (window) {
        window.loadURL(
          `${this.mainURL}?id=${this.windowToDisplayIdMap.get(window.id)}`
        );
      }
    });

    if (this.isDebug) {
      windows.forEach(window => {
        if (window) {
          window.webContents.openDevTools();
        }
      });
    }

    const menu = Menu.buildFromTemplate([]);
    Menu.setApplicationMenu(menu);

    windows.forEach(window => {
      if (window) {
        // 1個でもウインドウが手動で閉じられたら終了する
        window.on("closed", () => {
          if (!this.isRecording) {
            this.applicationExit();
          }
        });
      }
    });

    ipcMain.on("send-blob", (e: Electron.Event, data: SendBlobEvent) => {
      const fixedWidth =
        data.width % 16 === 0
          ? data.width
          : data.width + (16 - (data.width % 16));
      const fixedHeight =
        data.height % 16 === 0
          ? data.height
          : data.height + (16 - (data.height % 16));

      const blob = Buffer.from(data.base64, "base64");
      const outputFileType = "mp4";
      if (this.windows && this.isDebug === false) {
        this.windows.forEach(window => {
          if (window && !window.isDestroyed()) {
            window.setAlwaysOnTop(true);
          }
        });
      }
      dialog.showSaveDialog(
        this.mainWindow!,
        {
          title: "save",
          defaultPath: ".",
          filters: [
            {
              name: outputFileType,
              extensions: [outputFileType]
            }
          ]
        },
        (path?: string) => {
          if (path) {
            if (!this.isUseFFmpeg) {
              fs.writeFile(path, blob, err => {
                if (err) {
                  dialog.showErrorBox("error", err.message);
                }
                this.applicationExit();
              });
            } else {
              const tmpfilename = tempfile(".mp4");
              fs.writeFile(tmpfilename, blob, async err => {
                if (err) {
                  dialog.showErrorBox("error", err.message);
                }
                try {
                  ffmpeg(tmpfilename)
                    .addOption("-pix_fmt", "yuv420p")
                    .size(`${fixedWidth}x${fixedHeight}`)
                    .videoCodec("libx264")
                    .output(path)
                    .on("end", () => {
                      fs.unlink(tmpfilename, err => {
                        this.applicationExit();
                        if (err) {
                          console.error(err);
                          dialog.showErrorBox("error", err.message);
                          this.applicationExit();
                        }
                      });
                    })
                    .on("error", err => {
                      console.error(err);
                      dialog.showErrorBox("error", err.message);
                      this.applicationExit();
                    })
                    .run();
                } catch (e) {
                  console.error(e);
                  this.applicationExit();
                }
              });
            }
          } else {
            // キャンセル時の挙動
            this.applicationExit();
          }
        }
      );
    });

    ipcMain.on("window-hide", (e: Electron.Event) => {
      if (this.windows && this.isDebug === false) {
        this.windows.forEach(window => {
          if (window) {
            window.setOpacity(0.0);
            window.setAlwaysOnTop(false);
            window.blur();
          }
        });
      }
    });

    ipcMain.on("start-recording", () => {
      this.isRecording = true;
    });

    globalShortcut.register("Escape", () => {
      if (this.windows) {
        this.windows.forEach(window => {
          if (window) {
            window.webContents.send("shortcut-key", { name: "RecordingStop" });
          }
        });
      }
    });

    this.windows = windows;
  }

  private applicationExit() {
    if (this.windows) {
      this.windows.forEach(window => {
        if (window && !window.isDestroyed()) {
          window.close();
        }
      });
    }
    this.app.quit();
  }
}

const myApp: MyApp = new MyApp(app);
