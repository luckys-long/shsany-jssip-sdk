import * as jssip from "jssip";
import { URI } from "jssip";
import { v4 as uuidv4 } from "uuid";
import { State } from "./index.d";

import {
  EndEvent,
  HoldEvent,
  IceCandidateEvent,
  IncomingEvent,
  OutgoingEvent,
  PeerConnectionEvent,
  RTCSession,
} from "jssip/lib/RTCSession";

export default class ShsanyCall {
  //创建audio控件，播放声音的地方
  private audioView = document.createElement("audio");
  private ua: jssip.UA;
  private socket: jssip.WebSocketInterface;
  private localAgent: String;
  //对方号码
  private otherLegNumber: String | undefined;
  //呼叫中session:呼出、呼入、当前
  private outgoingSession: RTCSession | undefined;
  private incomingSession: RTCSession | undefined;
  private currentSession: RTCSession | undefined;
  private sessionMap: Map<string, RTCSession> = new Map();

  private deviceState: State = State.Idle;

  constructor() {}

  public sipInit(
    regInfo: {
      username: string;
      password: string;
      serverIp: string;
      deviceIP: string;
    },
    sipInitCallBack: () => void
  ) {
    const { username, password, serverIp, deviceIP } = regInfo;
    let socket = new jssip.WebSocketInterface(`ws://${serverIp}:5066`);

    let configuration = {
      socket,
    };
    this.ua = new jssip.UA(configuration);
  }
}
