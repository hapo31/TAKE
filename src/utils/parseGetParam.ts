export default function(): { [x: string]: string } {
  const { href } = location;
  if (href.indexOf("?") == -1) {
    return {};
  }
  return href
    .substring(href.indexOf("?") + 1, href.length)
    .split("&")
    .reduce((prev, param) => {
      const [name, val] = param.split("=");
      return Object.assign(prev, {
        [decodeURIComponent(name)]: decodeURIComponent(val)
      });
    }, {});
}
