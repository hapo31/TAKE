export default function blobToBase64(blob: Blob) {
  return new Promise<string>((res, rej) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      res(result.substring(result.indexOf("base64,") + 7));
    };
    reader.onerror = e => {
      rej(e);
    };

    reader.readAsDataURL(blob);
  });
}
