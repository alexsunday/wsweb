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
import { createAxios } from './adapter'
import { AxiosInstance } from "axios";
import { dynamicLoadCssContent, dynamicLoadJsContent } from "./loader";

const parser = new DOMParser()
const decoder = new TextDecoder();
const allowed = ['SCRIPT', 'LINK', 'STYLE', 'TITLE', 'META'] as const;
const allowedSet = new Set<string>(allowed);
type allowedType = typeof allowed[number];

function nodeFilter(n: string): n is allowedType {
  return allowedSet.has(n);
}

export async function homeLoader(h: string, req: AxiosInstance) {
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
          loadScript(req, cur.src)
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
        loadStyle(req, cur.href);
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

async function loadStyle(req: AxiosInstance, href: string) {
  const rs = await req.get(href);
  if (rs.status < 200 || rs.status > 299) {
    throw new Error(`${href} request failed`);
  }
  if (!(rs.data instanceof Uint8Array)) {
    throw new Error("response not valid buffer");
  }
  dynamicLoadCssContent(decoder.decode(rs.data));
}

async function loadScript(req: AxiosInstance, src: string) {
  const rs = await req.get(src);
  if (rs.status < 200 || rs.status > 299) {
    throw new Error(`${src} request failed`);
  }
  if (!(rs.data instanceof Uint8Array)) {
    throw new Error("response not valid buffer");
  }
  dynamicLoadJsContent(decoder.decode(rs.data));
}

import homeHtmlBinary from '../../web/dist/index.html';

function main(w: Window) {
  const wsUrl = guessWsUrl(w.location.protocol, w.location.host);
  const web = new WebConn(wsUrl);
  web.open();

  const req = createAxios(web);
  web.addEventListener("open", () => {
    (w as any).__web = web;
    homeLoader(decoder.decode(homeHtmlBinary), req);
  });
}

main(window);
