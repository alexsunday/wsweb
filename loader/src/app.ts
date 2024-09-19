/**
 * 连接到服务器，使用websocket加载整个网站
 * 1. 连接到websocket
 * 2. 创建一个固定的 #app 到 body
 * 3. 解析 HTML 获取要加载的 JS 与 CSS
 * 4. 使用 ws 解析并加载上述内容
 * 
 * HTML 内容形如这样：
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <link rel="icon" href="data:;base64,=">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vite App</title>
    <script type="module" crossorigin src="/assets/index-a7vVztxq.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-DcocGvzi.css">
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>
 */

import { guessWsUrl, WebConn } from "./ws";
import { dynamicLoadCssContent, dynamicLoadJsContent } from "./loader";
import { _fetch } from "./adapter";

const parser = new DOMParser()
const decoder = new TextDecoder();
const encoder = new TextEncoder();
const allowed = ['SCRIPT', 'LINK', 'STYLE', 'TITLE', 'META'] as const;
const allowedSet = new Set<string>(allowed);
type allowedType = typeof allowed[number];

function nodeFilter(n: string): n is allowedType {
  return allowedSet.has(n);
}

export async function homeLoader(h: string, web: WebConn) {
  const doc = parser.parseFromString(h, "text/html");
  document.body.innerHTML = '<div id="app"/>';
  // parse head
  const head = doc.head.childNodes;
  for (let i = 0; i != head.length; i++) {
    const cur = head[i];
    if (cur.nodeType !== Node.ELEMENT_NODE) {
      continue;
    }
    // 暂时只关注 link 与 script
    const tagName = cur.nodeName;
    if (!nodeFilter(tagName)) {
      continue;
    }
    switch (tagName) {
      case 'SCRIPT':
        if (!(cur instanceof HTMLScriptElement)) {
          console.warn("script tag not a valid script element?");
          continue;
        }
        if (cur.src === "") {
          // 直接把这个标签加入 document
          document.head.appendChild(cur);
        } else {
          // 设定动态加载 必须使用ws通道加载
          loadScript(web, cur.src)
        }
        break;
      case 'LINK':
        if (!(cur instanceof HTMLLinkElement)) {
          console.warn("link tag not a valid link element?");
          continue;
        }
        if (cur.rel !== "stylesheet") {
          continue;
        }
        loadStyle(web, cur.href);
        break;
      case 'STYLE':
      case 'META':
      case 'TITLE':
        document.head.appendChild(cur);
        break;
      default:
        break;
    }
  }
}

async function doWebRequest(web: WebConn, reqPath: string, method: string, headers: Map<string, string>, body: any) {
  const verb = method || "GET";
  const header: string[] = [];
  for(const key of headers.keys()) {
    const val = headers.get(key);
    header.push(`${key}: ${val}`);
  }
  return web.doHttp(verb, reqPath, header, body);
}

  /*
  url 有多种可能性
  1. 以 / 开头
  2. 以 // 开头
  3. 以 https? 开头
  4. 以 域名开头
  */
function extractUrl(u: string) :string {
  if(u.startsWith("http")) {
    const url = new URL(u);
    return url.pathname + url.search + url.hash;
  }
  if(u.startsWith("/")) {
    return u;
  }
  throw new Error(`cannot support URL:[${u}] now`);
}

async function fetchResource(web: WebConn, u: string, headers: Map<string, string>) {
 console.log(`URL: ${u}`);
 const url = extractUrl(u);
  const rs = await doWebRequest(web, url, "GET", headers, undefined);
  if(rs.status < 200 || rs.status > 299) {
    throw new Error(`${u} fetch failed`);
  }
  if (!(rs.body instanceof Uint8Array)) {
    throw new Error("response not valid buffer");
  }
  return rs.body;
}

async function loadStyle(web: WebConn, href: string) {
  const headers = new Map<string, string>([
    ['Accept', 'text/css,*/*;q=0.1']
  ]);
  const rs = await fetchResource(web, href, headers);
  dynamicLoadCssContent(decoder.decode(rs));
}

async function loadScript(web: WebConn, src: string) {
  const headers = new Map<string, string>([
    ['Accept', 'application/javascript']
  ]);
  const rs = await fetchResource(web, src, headers);
  dynamicLoadJsContent(decoder.decode(rs));
}

const homeHtmlBinary = require("../../server/dist/index.html");
function main(w: Window) {
  const wsUrl = guessWsUrl(w.location.protocol, w.location.host);
  const web = new WebConn(wsUrl);
  web.open();

  web.addEventListener("open", () => {
    w.__web = web;
    w.__fetch = _fetch;
    homeLoader(decoder.decode(homeHtmlBinary), web);
  });
}

main(window);
