import { nanoid } from "nanoid";
import { MessageSchema, Message_Type } from './gen/ws_pb';
import type { Message, Request, Response } from './gen/ws_pb';
import { create, toBinary, fromBinary } from "@bufbuild/protobuf";
import Defered from "./defered";

export function guessWsUrl(protocol: string, host: string) {
  let wsUrl = "";
  if (protocol === "http:") {
    wsUrl += "ws://";
  } else if (protocol === "https:") {
    wsUrl += "wss://";
  } else {
    throw new Error('unknown protocol!');
  }

  const id = nanoid();
  wsUrl += host + `/websocket?id=${id}`;
  return wsUrl;
}

function mergeBuf(b1: Uint8Array, b2: Uint8Array): Uint8Array {
  const buf = new Uint8Array(b1.byteLength + b2.byteLength);
  buf.set(b1, 0);
  buf.set(b2, b1.byteLength);
  return buf;
}

export class WebConn extends EventTarget {
  private url = "";
  private txid = 1;
  private ws: WebSocket | null = null;
  private requests: Map<number, Defered<Response>> = new Map();
  private buf: Uint8Array = new Uint8Array();

  constructor(wsUrl: string) {
    super();
    this.url = wsUrl;
  }

  public open() {
    if (this.ws !== null) {
      throw new Error('不允许重复连接');
    }
    this.ws = new WebSocket(this.url);
    this.ws.onclose = (e) => {
      this.onClose(e);
    }
    this.ws.onerror = e => {
      this.onError(e);
    }
    this.ws.onmessage = e => {
      this.onMessage(e);
    }
    this.ws.onopen = e => {
      this.onOpen(e);
      this.dispatchEvent(new CustomEvent("open"));
    }
  }

  private getTxId() {
    const txid = this.txid;
    this.txid += 1;
    return txid;
  }

  /**
   * 发送一个HTTP请求并等待回复
   * 1. 构造 request 请求
   */
  public async doHttp(verb: string, path: string, header: string[], body: Uint8Array): Promise<Response> {
    const txid = this.getTxId();
    const defered = new Defered<Response>();
    this.requests.set(txid, defered);

    console.log(`verb: ${verb}, path: ${path}`);
    // 构造并发送请求
    const msg = create(MessageSchema, {
      type: Message_Type.REQUEST,
      request: {
        id: BigInt(txid),
        verb: verb,
        path: path,
        body: body,
        headers: header,
      }
    });
    this.sendMessage(msg);
    const rs = await defered.promise;
    this.requests.delete(txid);
    return rs;
  }

  private sendMessage(msg: Message) {
    const content = toBinary(MessageSchema, msg);

    const out = new Uint8Array(content.byteLength + 6);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, content.byteLength, false);
    dv.setUint16(4, 0x01, false);
    out.set(content, 6);

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('connection not open');
    }
    this.ws.send(out);
  }

  private onOpen(e: Event) {
    console.log("websocket opened!");
  }

  private onMessage(e: MessageEvent<any>) {
    const msg = e.data;
    if (!(msg instanceof Blob)) {
      console.warn(`expected receive a valid blob`);
      console.log(msg);
      return;
    }
    msg.arrayBuffer().then(rs => {
      this.receivedData(rs);
    });
  }

  private receivedData(msg: ArrayBuffer) {
    // 前6字节是头 需要流式处理
    const cur = new Uint8Array(msg);
    this.buf = mergeBuf(this.buf, cur);
    // 循环处理
    while (true) {
      if (this.buf.byteLength < 6) {
        break;
      }
      // 先取出6字节头
      const head = this.buf.slice(0, 6);
      const dv = new DataView(head.buffer);
      const left = dv.getUint32(0, false);
      if (left > 128 * 1024 * 1024) {
        throw new Error('too large frame!');
      }
      // 如果缓冲区里的数据不够 退出处理流程
      if ((this.buf.byteLength - 6) < left) {
        break;
      }
      const body = this.buf.slice(6, 6 + left);
      const msgObj = fromBinary(MessageSchema, body);
      // 如果裁去了包体还有剩余
      if ((this.buf.byteLength - 6 - left) > 0) {
        this.buf = this.buf.slice(6 + left);
      } else {
        this.buf = new Uint8Array();
      }
      this.handleValidFrame(msgObj);
    }
  }

  private handleValidFrame(msgObj: Message) {
    if (msgObj.type === Message_Type.REQUEST) {
      // handle request
      if (!msgObj.request) {
        console.warn("receive a valid frame, type is REQUEST, but request object is empty!");
        return;
      }
      return this.handleRequest(msgObj.request);
    } else if (msgObj.type === Message_Type.RESPONSE) {
      if (!msgObj.response) {
        console.warn("receive a valid frame, type is RESPONSE, but response object is empty!");
        return;
      }
      return this.handleResponse(msgObj.response);
    }
    console.error("unknown msgtype", msgObj.type);
    console.log(msgObj);
  }

  handleResponse(rsp: Response) {
    const txid = Number(BigInt.asUintN(64, rsp.id));
    const defered = this.requests.get(txid);
    if (!defered) {
      console.warn("received a response, but not match the request");
      return;
    }
    defered.resolve(rsp);
  }

  private handleRequest(req: Request) {
    //
  }

  private onError(e: Event) {
    throw new Error("Method not implemented1");
  }

  private onClose(e: CloseEvent) {
    throw new Error("Method not implemented2");
  }
}