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
import { loadOrDefaultConfig, ApplicationConfig } from "./config";

class MyApp {
  private mainWindow: BrowserWindow | null = null;
  private windowToDisplayIdMap: Map<number, number> = new Map();
  private windows: (BrowserWindow | null)[] | null = null;
  private app: App;
  private mainURL: string = `file://${__dirname}/index.html`;

  private isRecording = false;

  private isDebug = false;

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

  private async create() {
    const [config, isCreatedConfigFile] = await loadOrDefaultConfig(
      "./config.json"
    );

    if (!this.configCheck(config)) {
      this.applicationExit();
    }

    if (isCreatedConfigFile) {
      // TODO: 初回作成時はなんか言うといいかも
    }

    const windowCommonOptions = {
      title: "TAKE",
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
      const outputFileType = config.useFFmpeg
        ? config.outputFormat || "webm"
        : "webm";
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
            if (!config.useFFmpeg) {
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
                  const command = ffmpeg(tmpfilename);
                  // false とかがセットされてたら PATH が通っているものとして扱う的なことにしたい
                  if (config.ffmpegPath) {
                    command.setFfmpegPath(config.ffmpegPath);
                  }

                  if (config.outputFormat === "mp4") {
                    command
                      .size(`${fixedWidth}x${fixedHeight}`)
                      .videoCodec("libx264")
                      .addOption("-pix_fmt", "yuv420p");
                  }
                  command
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

  private configCheck(config: ApplicationConfig) {
    switch (config.outputFormat) {
      case "mp4":
      case "webm":
      case "gif":
        return true;
      default:
        dialog.showErrorBox(
          "TAKE",
          `Unknown "outputFormat": "${
            config.outputFormat
          }"\nAvailable formats:\n"mp4"\n"gif"\n"webm"`
        );
        return false;
    }
  }
}

const myApp: MyApp = new MyApp(app);
