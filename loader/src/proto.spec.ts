import {test, describe} from '@jest/globals'

test('hello', () => {
  console.log("HELLO");
})

import {MessageSchema, Message_Type, RequestSchema, ResponseSchema} from './gen/ws_pb';
import type{ Message, Request, Response} from './gen/ws_pb';
import { create, toBinary, fromBinary, toJson } from "@bufbuild/protobuf";

test('protobuf', () => {
  const msg = create(MessageSchema, {
    type: Message_Type.REQUEST,
    request: {
      id: BigInt(1),
      verb: "GET",
      path: "/path/to/hello",
      body: new Uint8Array(),
      headers: [],
    }
  });
  const content = toBinary(MessageSchema, msg);
  console.log(content.length);
  console.log(content);

  const rs = fromBinary(MessageSchema, content);
  console.log(rs.request!.path);
})