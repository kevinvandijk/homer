export function stringifyParams(paramsObject) {
  return Object.keys(paramsObject).map(key => {
    return `${encodeURIComponent(key)}=${encodeURIComponent(paramsObject[key])}`;
  }).join('&');
}
