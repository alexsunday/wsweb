import { parseHeadersInit, parseReqBody, parseReqPath, toHeaders } from "./utils";

export async function _fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if(!window.__web) {
    throw new Error('adapter not initialized!');
  }
  const webObj = window.__web;
  let reqUrl = "";
  let method = "GET";
  if(typeof input === 'string') {
    reqUrl = input;
  }
  if(input instanceof URL) {
    reqUrl = input.pathname + input.search + input.hash;
  } else if(input instanceof Request) {
    reqUrl = input.url;
    method = input.method;
  }

  let body = new Uint8Array(0);
  let headers: string[] = [];
  if(init) {
    const reqBody = init.body;
    if(reqBody) {
      body = await parseReqBody(reqBody);
    }
    const reqHeaders = init.headers;
    if(reqHeaders) {
      headers = parseHeadersInit(reqHeaders);
    }
    if(init.method) {
      method = init.method;
    }
    if(init.referrer) {
      //
    }
  }

  const response = await webObj.doHttp(method, parseReqPath(reqUrl), headers, body);
  return new Response(response.body, {
    headers: toHeaders(response.headers),
    status: response.status,
    statusText: response.message,
  })
}
