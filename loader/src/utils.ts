
export function parseReqPath(u: string) {
  if(u.startsWith("/")) {
    return u;
  }
  const reqUrl = new URL(u);
  const reqPath = reqUrl.pathname + reqUrl.search + reqUrl.hash;
  return reqPath;
}

export function parseHeaders(h: Record<string, string>): string[] {
  const rs: string[] = [];
  for(const key in h) {
    rs.push(`${key}: ${h[key]}`);
  }
  return rs;
}

export function parseHeadersInit(h: HeadersInit): string[] {
  // [string, string][] | Record<string, string> | Headers;
  if(Array.isArray(h)) {
    const rs: string[] = [];
    for(const t of h) {
      rs.push(`${t[0]}: ${t[1]}`);
    }
    return rs;
  } else if(h instanceof Headers) {
    const rs: string[] = [];
    h.forEach((val, key) => {
      rs.push(`${key}: ${val}`);
    })
    return rs;
  } else {
    // Record<string, string>
    return parseHeaders(h);
  }
}

const encoder = new TextEncoder();
export async function parseReqBody(reqBody: BodyInit): Promise<Uint8Array> {
  let body = new Uint8Array();
  // only support Blob, ArrayBuffer, String
  if(typeof reqBody === 'string') {
    body = encoder.encode(reqBody);
  } else if(reqBody instanceof Blob) {
    const buf = await reqBody.arrayBuffer()
    body = new Uint8Array(buf);
  } else if(reqBody instanceof ArrayBuffer) {
    body = new Uint8Array(reqBody);
  } else if(reqBody instanceof FormData) {
    throw new Error('unsupported FormData now');
  } else if(reqBody instanceof URLSearchParams) {
    body = encoder.encode(reqBody.toString());
  } else if(reqBody instanceof ReadableStream) {
    throw new Error('unsupported ReadableStream now');
  } else {
    throw new Error('unsupported this body format now');
  }

  return body;
}

export function toHeaders(headers: string[]): Record<string, string> {
  const obj:Record<string, string> = {};
  for(const item of headers) {
    const pos = item.indexOf(":");
    if(pos === -1) {
      console.warn(`header [${item}] parse not found comma`);
      continue;
    }
    const key = item.slice(0, pos);
    const val = item.slice(pos+2);
    obj[key] = val;
  }
  return obj;
}
