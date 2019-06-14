import {
  BrowserWindow,
  app,
  App,
  Menu,
  screen,
  ipcMain,
  dialog,
  globalShortcut,
  Tray
} from "electron";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import tempfile from "tempfile";
import SendBlobEvent from "./utils/SendBlobEvent";
import { loadOrDefaultConfig, ApplicationConfig } from "./config";
import { throws } from "assert";

class MyApp {
  private mainWindow: BrowserWindow | null = null;
  private windowToDisplayIdMap: Map<number, number> = new Map();
  private windows: (BrowserWindow | null)[] | null = null;
  private app: App;
  private mainURL: string = `file://${__dirname}/index.html`;

  private config: ApplicationConfig;

  private readonly defaultConfig: ApplicationConfig = {
    useFFmpeg: false,
    ffmpegPath: false,
    outputFormat: "webm"
  };
  private tray: Tray | null = null;

  private isRecording = false;

  private isDebug = false;

  constructor(app: App) {
    this.app = app;
    this.app.on("ready", this.onReady.bind(this));
    this.app.on("activate", this.onActivated.bind(this));

    this.config = this.defaultConfig;
  }

  private onReady() {
    this.init();
    this.createWindows();
  }

  private onActivated() {
    if (this.windows !== null) {
      this.createWindows();
    }
  }

  private async init() {
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
      const outputFileType = this.config.useFFmpeg
        ? this.config.outputFormat || "webm"
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
            if (!this.config.useFFmpeg) {
              fs.writeFile(path, blob, err => {
                if (err) {
                  this.showCommonErrorBox(err);
                }
                this.allWindowClose();
              });
            } else {
              const tmpfilename = tempfile(".mp4");
              fs.writeFile(tmpfilename, blob, async err => {
                if (err) {
                  this.showCommonErrorBox(err);
                  this.allWindowClose();
                }
                try {
                  const command = ffmpeg(tmpfilename);
                  // false とかがセットされてたら PATH が通っているものとして扱う的なことにしたい
                  if (this.config.ffmpegPath) {
                    command.setFfmpegPath(this.config.ffmpegPath);
                  }

                  if (this.config.outputFormat === "mp4") {
                    command
                      .size(`${fixedWidth}x${fixedHeight}`)
                      .videoCodec("libx264")
                      .addOption("-pix_fmt", "yuv420p");
                  }
                  command
                    .output(path)
                    .on("end", () => {
                      fs.unlink(tmpfilename, err => {
                        if (err) {
                          this.showCommonErrorBox(err);
                        }
                        this.allWindowClose();
                      });
                    })
                    .on("error", err => {
                      this.showCommonErrorBox(err);
                      this.allWindowClose();
                    })
                    .run();
                } catch (e) {
                  this.showCommonErrorBox(err);
                  this.allWindowClose();
                }
              });
            }
          } else {
            // キャンセル時の挙動
            this.allWindowClose();
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

    globalShortcut.register("Super+Alt+A", () => {
      this.createWindows();
    });
  }

  private async createWindows() {
    const [config, isCreatedConfigFile] = await loadOrDefaultConfig(
      "./config.json",
      this.defaultConfig
    );

    if (!this.configCheck(config)) {
      this.allWindowClose();
    }

    if (isCreatedConfigFile) {
      // TODO: 初回作成時はなんか言うといいかも
    }

    this.config = config;

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

    this.windows = windows;
  }

  private applicationExit() {
    this.allWindowClose();
    globalShortcut.removeAllListeners();
    this.app.quit();
  }

  private allWindowClose() {
    if (this.windows) {
      this.windows.forEach(window => {
        if (window && !window.isDestroyed()) {
          window.close();
        }
      });

      this.windows = null;
    }
  }

  private showCommonErrorBox(error: any) {
    console.error(error);
    dialog.showErrorBox("error", error.message);
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
