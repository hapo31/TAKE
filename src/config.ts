import fs from "fs";

export type ApplicationConfig = {
  useFFmpeg?: boolean;
  ffmpegPath?: string | false;
  outputFormat?: "mp4" | "gif" | "webm";
};

export async function loadOrDefaultConfig(path: string) {
  return new Promise<[ApplicationConfig, boolean]>((res, rej) => {
    fs.readFile(path, (err, data) => {
      if (err) {
        createDefaultConfigJson(path)
          .then((data: ApplicationConfig) => {
            res([data, true]);
            return;
          })
          .catch(err => {
            rej(err);
            return;
          });

        return;
      } else {
        try {
          const config: ApplicationConfig = JSON.parse(data.toString());
          res([config, false]);
        } catch (e) {
          rej(e);
        }
      }
    });
  });
}

export async function createDefaultConfigJson(path: string) {
  return new Promise<ApplicationConfig>((res, rej) => {
    const data: ApplicationConfig = {
      useFFmpeg: false,
      ffmpegPath: false,
      outputFormat: "webm"
    };
    fs.writeFile(path, JSON.stringify(data, null, "  "), err => {
      if (err) {
        rej(err.message);
        return;
      }
      res(data);
    });
  });
}
