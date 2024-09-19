import axios, { AxiosRequestHeaders, AxiosHeaders, AxiosResponseHeaders, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import {WebConn} from './ws';
import { parseReqPath } from './utils';

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

async function doWebRequest(req: InternalAxiosRequestConfig, web: WebConn): Promise<AxiosResponse> {
  const verb = req.method || "GET";
  const reqPath = parseReqPath(req.url || "/");
  const headers = req.headers;
  const body = req.data;
  const rs = await web.doHttp(verb, reqPath, parseHeaders(headers), body);
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