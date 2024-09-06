import axios, { AxiosRequestHeaders, AxiosHeaders, AxiosResponseHeaders, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import {WebConn} from './ws';

function parseHeaders(h: AxiosRequestHeaders): string[] {
  const rs: string[] = [];
  for(const key in h) {
    rs.push(`${key}: ${h[key]}`);
  }
  return rs;
}

function toHeaders(headers: string[]): AxiosResponseHeaders {
  const obj = new AxiosHeaders();
  for(const item of headers) {
    const pos = item.indexOf(":");
    if(pos === -1) {
      console.warn(`header [${item}] parse not found comma`);
      continue;
    }
    const key = item.slice(0, pos);
    const val = item.slice(pos+2);
    obj.set(key, val);
  }
  return obj;
}

function parseReqPath(u: string) {
  if(u.startsWith("/")) {
    return u;
  }
  const reqUrl = new URL(u);
  const reqPath = reqUrl.pathname + reqUrl.search + reqUrl.hash;
  return reqPath;
}

/**
export interface AxiosResponse<T = any, D = any> {
  data: T;
  status: number;
  statusText: string;
  headers: RawAxiosResponseHeaders | AxiosResponseHeaders;
  config: InternalAxiosRequestConfig<D>;
  request?: any;
}
 */
async function doWebRequest(req: InternalAxiosRequestConfig, web: WebConn): Promise<AxiosResponse> {
  const verb = req.method || "GET";
  const reqPath = parseReqPath(req.url || "/");
  const headers = req.headers;
  const body = req.data;
  const rs = await web.doHttp(verb, reqPath, parseHeaders(headers), body)
  return {
    data: rs.body,
    status: rs.status,
    statusText: rs.message,
    headers: toHeaders(rs.headers),
    config: req,
    request: req,
  }
}

export function createAxios(w: WebConn) {
  const axiosInstance = axios.create({
    adapter: cfg => {
      return doWebRequest(cfg, w);
    }
  });
  return axiosInstance;
}