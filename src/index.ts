import {
  BrowserWindow,
  app,
  App,
  Menu,
  screen,
  ipcMain,
  dialog,
  globalShortcut,
  Tray,
} from "electron";
import fs, { promises as fsPromises } from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import tempfile from "tempfile";
import SendBlobEvent from "./utils/SendBlobEvent";
import {
  loadOrDefaultConfig,
  ApplicationConfig,
  createDefaultConfigJson,
} from "./config";
import { exec } from "child_process";
import Logging from "./utils/Logging";

const isDev = process.env.NODE_ENV !== "production";

console.log({ mode: process.env.NODE_ENV });

if (!isDev) {
  process.on("uncaughtException", () => {
    process.exit();
  });
}

class MyApp {
  private windowToDisplayIdMap: Map<number, number> = new Map();
  private windows: BrowserWindow[] | null = null;
  private app: App;
  private mainURL = `file://${__dirname}/index.html`;

  private config: ApplicationConfig;

  private isShowingDialog = false;

  private readonly defaultConfig: ApplicationConfig = {
    useFFmpeg: false,
    ffmpegPath: false,
    defaultFormat: "webm",
  };

  private tray: Tray | null = null;

  private isRecording = false;

  constructor(app: App) {
    this.app = app;
    this.app.on("ready", this.onReady);
    this.app.on("activate", this.onActivated);
    // 「何もしないハンドラ」を渡しておかないとデフォルトのハンドラが実行されてアプリが終了しちゃう
    this.app.on("window-all-closed", this.onWindowAllClosed);

    this.config = this.defaultConfig;

    process.on("uncaughtException", (error) => {
      Logging.error(error);
      dialog.showErrorBox("error", error.message);
    });
  }

  private onReady = () => {
    this.init().catch((err) => {
      Logging.error(err);
      dialog.showErrorBox("error", err.message);
    });
  };

  private onActivated = () => {
    if (this.windows !== null) {
      this.createWindows().catch((err) => {
        dialog.showErrorBox("error", err.message);
      });
    }
  };

  private onWindowAllClosed = () => {
    return;
  };

  private async init() {
    const gotTheLock = app.requestSingleInstanceLock();

    if (!gotTheLock) {
      this.applicationExit();
      return;
    }

    if (!fs.existsSync("config.json")) {
      createDefaultConfigJson("./config.json", this.defaultConfig);
    }

    this.tray = new Tray(`${__dirname}/images/icon.ico`);

    this.tray.setToolTip("TAKE - take a screenshot.");

    const menu = Menu.buildFromTemplate([
      {
        icon: `${__dirname}/images/rec.png`,
        label: "Record",
        click: (_) => {
          this.createWindows();
        },
      },
      {
        label: 'Open "config.json"',
        click: (_) => {
          switch (process.platform) {
            case "win32":
              exec("start ./config.json");
              break;
            case "darwin":
              exec("open ./config.json");
              break;
            default:
              exec("vi ./config.json");
          }
        },
      },
      {
        label: "Close",
        click: (_) => {
          this.applicationExit();
        },
      },
    ]);
    this.tray.setContextMenu(menu);

    ipcMain.on("send-blob", async (_: Electron.Event, data: SendBlobEvent) => {
      this.windows?.forEach((window) => {
        if (window && !window.isDestroyed()) {
          window.close();
        }
      });

      this.isShowingDialog = true;
      const fixedWidth =
        data.width % 16 === 0
          ? data.width
          : data.width + (16 - (data.width % 16));
      const fixedHeight =
        data.height % 16 === 0
          ? data.height
          : data.height + (16 - (data.height % 16));
      const buffer = Buffer.from(data.arrayBuffer);
      if (this.windows && isDev === false) {
        this.windows.forEach((window) => {
          if (window && !window.isDestroyed()) {
            window.setAlwaysOnTop(true);
          }
        });
      }
      /* eslint-disable @typescript-eslint/no-explicit-any */

      const pathStr = (
        await dialog.showSaveDialog(null as any, {
          title: "save",
          defaultPath: ".",
        })
      ).filePath;

      /* eslint-enable @typescript-eslint/no-explicit-any */
      if (pathStr) {
        if (this.config.useFFmpeg) {
          const tmpfilename = tempfile(".mp4");

          await fsPromises.writeFile(tmpfilename, buffer);

          const command = ffmpeg(tmpfilename);
          const extRaw = path.extname(pathStr).slice(1);
          const isContainsExt = extRaw.length !== 0;
          const ext = extRaw || this.config.defaultFormat;

          const fileName = !isContainsExt ? `${pathStr}.${ext}` : pathStr;

          // false とかがセットされてたら PATH が通っているものとして扱う的なことにしたい
          if (this.config.ffmpegPath) {
            command.setFfmpegPath(this.config.ffmpegPath);
          }

          if (ext === "mp4") {
            command
              .size(`${fixedWidth}x${fixedHeight}`)
              .videoCodec("libx264")
              .addOption("-pix_fmt", "yuv420p");
          }

          command
            .output(fileName)
            .on("end", () => {
              fs.unlink(tmpfilename, (err) => {
                if (err) {
                  throw err;
                }
              });
            })
            .on("error", (err) => {
              throw err;
            })
            .run();
        } else {
          const extRaw = path.extname(pathStr).slice(1);
          const isContainsExt = extRaw.length !== 0;
          const fileName = !isContainsExt ? `${pathStr}.webm` : pathStr;
          await fsPromises.writeFile(fileName, buffer);
        }
      }
      this.allWindowClose();
    });

    ipcMain.on("window-hide", (e: Electron.Event) => {
      if (this.windows && isDev === false) {
        this.windows.forEach((window) => {
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

    globalShortcut.register("Super+Shift+A", () => {
      this.createWindows();
    });
  }

  private async createWindows() {
    if (this.windows != null) {
      return;
    }

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
      opacity: 0.3,
      webPreferences: {
        nodeIntegration: true,
      },
    };

    const displays = screen.getAllDisplays();

    const windows = displays.map((display) => {
      const bw = new BrowserWindow({
        ...display.bounds,
        ...windowCommonOptions,
      });
      // 各ウインドウから id を取得出来るように、 BrowserWindow と display の id を紐付ける
      this.windowToDisplayIdMap.set(bw.id, display.id);
      return bw;
    });

    windows.forEach((window) => {
      if (window) {
        window.loadURL(
          `${this.mainURL}?id=${this.windowToDisplayIdMap.get(window.id)}`
        );
      }
    });

    windows.forEach((window) => {
      if (window) {
        // 1個でもウインドウが手動で閉じられたらそのセッションは終了
        window.on("closed", () => {
          if (!this.isRecording) {
            this.allWindowClose();
          }
        });
      }
    });

    globalShortcut.register("Escape", () => {
      if (this.windows && !this.isShowingDialog) {
        if (this.isRecording) {
          this.windows.forEach((window) => {
            if (window && !window.isDestroyed()) {
              window.webContents.send("shortcut-key", {
                name: "RecordingStop",
              });
            }
          });
        } else {
          this.windows.forEach((window) => {
            if (window && !window.isDestroyed()) {
              window.close();
            }
          });
          this.allWindowClose();
        }
      }
    });

    this.windows = windows;
  }

  private applicationExit() {
    this.allWindowClose();
    this.app.quit();
  }

  private allWindowClose() {
    if (this.windows) {
      this.windows.forEach((window) => {
        if (window && !window.isDestroyed()) {
          window.close();
        }
      });
      if (globalShortcut.isRegistered("Escape")) {
        globalShortcut.unregister("Escape");
      }
      this.windows = null;
      this.isShowingDialog = false;
    }
  }

  private configCheck(config: ApplicationConfig) {
    switch (config.defaultFormat) {
      case "mp4":
      case "webm":
      case "gif":
        return true;
      default:
        dialog.showErrorBox(
          "TAKE",
          `Unknown "defaultFormat": "${config.defaultFormat}"\nAvailable formats:\n"mp4"\n"gif"\n"webm"`
        );
        return false;
    }
  }
}

const myApp: MyApp = new MyApp(app);
