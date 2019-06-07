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
  private windows: (BrowserWindow | null)[] | null = null;
  private app: App;
  private mainURL: string = `file://${__dirname}/index.html`;

  private isDebug = false;
  private isUseFFmpeg = true;

  constructor(app: App) {
    this.app = app;
    this.app.on("window-all-closed", this.onWindowAllClosed.bind(this));
    this.app.on("ready", this.create.bind(this));
    this.app.on("activate", this.onActivated.bind(this));
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

    this.windows = displays.map(display => {
      const bw = new BrowserWindow({
        ...display.bounds,
        ...windowCommonOptions
      });
      if (display.id === screen.getPrimaryDisplay().id) {
        this.mainWindow = bw;
      }
      return bw;
    });

    this.windows.forEach(window => {
      if (window) {
        window.loadURL(this.mainURL);
      }
    });

    if (this.isDebug) {
      this.windows.forEach(window => {
        if (window) {
          window.webContents.openDevTools();
        }
      });
    }

    const menu = Menu.buildFromTemplate([]);
    Menu.setApplicationMenu(menu);

    this.windows.forEach(window => {
      if (window) {
        // 1個でもウインドウが手動で閉じられたら終了する
        window.on("closed", () => {
          this.applicationExit();
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
          if (window) {
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
                if (this.mainWindow) {
                  this.mainWindow.close();
                }
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

    ipcMain.on("window-minimize", () => {
      if (this.mainWindow && this.isDebug === false) {
        this.mainWindow.setOpacity(0.0);
        this.mainWindow.setAlwaysOnTop(false);
        this.mainWindow.blur();
      }
    });

    ipcMain.on("app-exit", () => {
      this.applicationExit();
    });

    globalShortcut.register("Escape", () => {
      if (this.mainWindow) {
        this.mainWindow.webContents.send("shortcut-key", { key: "Escape" });
      }
    });
  }

  private onReady() {
    this.create();
  }

  private onActivated() {
    if (this.mainWindow !== null) {
      this.create();
    }
  }

  private applicationExit() {
    if (this.windows) {
      this.windows.forEach((window, index, arr) => {
        if (window) {
          window.close();
        }
        arr[index] = null;
      });
    }
  }
}

const myApp: MyApp = new MyApp(app);
