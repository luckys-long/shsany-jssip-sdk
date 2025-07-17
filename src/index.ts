import * as jssip from "jssip";
import { URI } from "jssip";
// import { v4 as uuidv4 } from "uuid";

import {
  State,
  CallEndEvent,
  StateListenerMessage,
  LatencyStat,
  NetworkLatencyStat,
  CallDirection,
  CallDirectionEnum,
  InitConfig,
} from "./index.d";

import {
  EndEvent,
  HoldEvent,
  // IceCandidateEvent,
  IncomingEvent,
  OutgoingEvent,
  PeerConnectionEvent,
  RTCSession,
} from "jssip/lib/RTCSession";

import {
  IncomingMessageEvent,
  IncomingRTCSessionEvent,
  OutgoingMessageEvent,
  OutgoingRTCSessionEvent,
} from "jssip/lib/UA";

export default class ShsanyCall {
  //媒体控制
  private constraints = {
    audio: true,
    video: false,
  };

  //创建audio控件，播放声音的地方
  private audioView = document.createElement("audio");
  private ua: jssip.UA;
  private socket: jssip.WebSocketInterface;
  private localAgent: string;
  //对方号码
  // private otherLegNumber: string | undefined;
  //呼叫中session:呼出、呼入、当前
  private outgoingSession: RTCSession | undefined;
  // @ts-ignore: Will be used in future implementation
  private incomingSession: RTCSession | undefined;
  private currentSession: RTCSession | undefined;
  // private sessionMap: Map<string, RTCSession> = new Map();
  public localIp: string;

  //呼叫方向 outbound:呼出/inbound:呼入
  private direction: CallDirection | undefined;

  //当前通话的网络延迟统计定时器(每秒钟获取网络情况)
  private currentLatencyStatTimer: ReturnType<typeof setInterval> | undefined;
  private currentStatReport!: NetworkLatencyStat;

  //回调函数
  private stateEventListener: Function | undefined;

  // 是否监测麦克风权限
  private checkMic: boolean;

  constructor(config: InitConfig) {
    this.ua = null as any;
    this.socket = null as any;
    this.localIp = "";
    this.checkMic = config.checkMic;
    this.localAgent = config.extNo;
    if (config.stateEventListener !== null) {
      this.stateEventListener = config.stateEventListener;
    }
    if (config.checkMic) {
      this.micCheck();
    }
    this.sipInit({
      username: config.extNo,
      password: config.extPwd,
      serverIp: config.fsHost,
      deviceIP: config.host,
      port: config.port,
    });
  }

  public sipInit(regInfo: {
    username: string;
    password: string;
    serverIp: string;
    deviceIP: string;
    port: number;
  }) {
    const { username, password, serverIp, deviceIP, port = 5060 } = regInfo;
    const sipUri = new URI("sip", username, serverIp, port);
    console.log("sipUri", sipUri.toString());
    this.localIp = deviceIP;
    this.socket = new jssip.WebSocketInterface(`wss://${serverIp}:7443`);
    let configuration = {
      sockets: [this.socket],
      uri: sipUri.toString(),
      password: password,
      outbound_proxy_set: `ws://${serverIp}:7443`,
      contact_uri: `sip:${username}@${deviceIP}:20455;rtcweb-breaker=yes;transport=ws`,
      session_timers: false,
      register: true,
      display_name: username,
      register_expires: 120,
      mediaconstraints: {},
    };

    this.ua = new jssip.UA(configuration);
    this.ua.on("connected", (_e) => {
      this.onChangeState(State.CONNECTED, null);
    });

    this.ua.on("disconnected", (e) => {
      this.ua.stop();
      if (e.error) {
        this.onChangeState(State.ERROR, {
          msg: "websocket连接失败,请检查地址或网络",
        });
      }
    });
    // 注册成功
    this.ua.on("registered", (_data) => {
      this.onChangeState(State.REGISTERED, { localAgent: this.localAgent });
    });
    // 取消注册
    this.ua.on("unregistered", (_e) => {
      this.ua.stop();
      this.onChangeState(State.UNREGISTERED, { localAgent: this.localAgent });
    });
    // 注册失败
    this.ua.on("registrationFailed", (e) => {
      this.onChangeState(State.REGISTER_FAILED, { msg: "注册失败" + e.cause });
    });
    // 注册到期前几秒触发
    this.ua.on("registrationExpiring", () => {
      this.ua.register();
    });

    this.ua.on(
      "newRTCSession",
      (data: IncomingRTCSessionEvent | OutgoingRTCSessionEvent) => {
        const session = data.session;
        let currentEvent: String;
        if (data.originator === "remote") {
          // 远程来电
          this.incomingSession = data.session;
          this.currentSession = session;
          this.direction = CallDirectionEnum.INBOUND;
          currentEvent = State.INCOMING_CALL;
        } else {
          this.direction = CallDirectionEnum.OUTBOUND;
          currentEvent = State.OUTGOING_CALL;
          // 处理呼叫逻辑
        }
        const hasVideo = this.hasVideoStream(session);
        session.on("peerconnection", (evt: PeerConnectionEvent) => {
          // 处理媒体流
          this.handleMedia(evt.peerconnection, hasVideo);
        });
        // 来电振铃
        session.on("progress", (_evt: IncomingEvent | OutgoingEvent) => {
          this.onChangeState(currentEvent, {
            direction: this.direction,
            otherLegNumber: data.request.from.uri.user,
            // @ts-ignore
            // callId: data.request.call_id,
            callId: data.session.id,
            isTransfer: data.request.getHeader("X-Is-From-Transfer"),
          });
        });
        // 来电接通
        session.on("accepted", () => {
          this.onChangeState(State.IN_CALL, null);
        });

        // 来电挂断
        session.on("ended", (evt: EndEvent) => {
          const evtData: CallEndEvent = {
            answered: true,
            cause: evt.cause,
            // @ts-ignore
            code: evt.message?.status_code ?? 0,
            originator: evt.originator,
          };
          this.cleanCallingData();
          this.onChangeState(State.CALL_END, evtData);
        });

        // 来电失败
        session.on("failed", (evt: EndEvent) => {
          const evtData: CallEndEvent = {
            answered: false,
            cause: evt.cause,
            // @ts-ignore
            code: evt.message?.status_code ?? 0,
            originator: evt.originator,
          };
          this.cleanCallingData();
          this.onChangeState(State.CALL_END, evtData);
        });

        // 通话保持
        session.on("hold", (_evt: HoldEvent) => {
          this.onChangeState(State.HOLD, null);
        });

        // 通话恢复
        session.on("unhold", (_evt: HoldEvent) => {
          this.onChangeState(State.IN_CALL, null);
        });
      }
    );

    this.ua.on(
      "newMessage",
      (data: IncomingMessageEvent | OutgoingMessageEvent) => {
        switch (data.message.direction) {
          case "incoming":
            const body = data.request.body;
            if (!body) return;
            this.onChangeState(State.MESSAGE_INCOMING, body);
        }
      }
    );
    //启动UA
    this.ua.start();
  }

  private onChangeState(
    event: String,
    data:
      | StateListenerMessage
      | CallEndEvent
      | LatencyStat
      | string
      | Object
      | null
      | undefined
  ) {
    if (undefined === this.stateEventListener) {
      return;
    }
    this.stateEventListener(event, data);
  }

  private handleMedia(pc: RTCPeerConnection, isVideo: boolean = false) {
    this.audioView.autoplay = true;
    this.audioView.srcObject = null;

    this.currentStatReport = {
      outboundPacketsSent: 0,
      outboundLost: 0,
      inboundLost: 0,
      inboundPacketsSent: 0,
    };
    this.currentLatencyStatTimer = setInterval(() => {
      pc.getStats().then((stats) => {
        stats.forEach((report) => {
          if (report.type == "media-source") {
            this.currentStatReport.outboundAudioLevel = report.audioLevel;
          }
          if (
            report.type != "remote-inbound-rtp" &&
            report.type != "inbound-rtp" &&
            report.type != "remote-outbound-rtp" &&
            report.type != "outbound-rtp"
          ) {
            return;
          }
          switch (report.type) {
            case "outbound-rtp": // 客户端发送的-上行
              this.currentStatReport.outboundPacketsSent = report.packetsSent;
              break;
            case "remote-inbound-rtp": //服务器收到的-对于客户端来说也就是上行
              this.currentStatReport.outboundLost = report.packetsLost;
              //延时(只会在这里有这个)
              this.currentStatReport.roundTripTime = report.roundTripTime;
              break;
            case "inbound-rtp": //客户端收到的-下行
              this.currentStatReport.inboundLost = report.packetsLost;
              this.currentStatReport.inboundAudioLevel = report.audioLevel;
              break;
            case "remote-outbound-rtp": //服务器发送的-对于客户端来说就是下行
              this.currentStatReport.inboundPacketsSent = report.packetsSent;
              break;
          }
        });
        let ls: LatencyStat = {
          latencyTime: 0,
          upLossRate: 0,
          downLossRate: 0,
          downAudioLevel: 0,
          upAudioLevel: 0,
        };

        if (this.currentStatReport.inboundAudioLevel != undefined) {
          ls.downAudioLevel = this.currentStatReport.inboundAudioLevel;
        }
        if (this.currentStatReport.outboundAudioLevel != undefined) {
          ls.upAudioLevel = this.currentStatReport.outboundAudioLevel;
        }

        if (
          this.currentStatReport.inboundLost &&
          this.currentStatReport.inboundPacketsSent
        ) {
          ls.downLossRate =
            this.currentStatReport.inboundLost /
            this.currentStatReport.inboundPacketsSent;
        }
        if (
          this.currentStatReport.outboundLost &&
          this.currentStatReport.outboundPacketsSent
        ) {
          ls.upLossRate =
            this.currentStatReport.outboundLost /
            this.currentStatReport.outboundPacketsSent;
        }
        if (this.currentStatReport.roundTripTime != undefined) {
          ls.latencyTime = Math.floor(
            this.currentStatReport.roundTripTime * 1000
          );
        }
        console.debug(
          "上行/下行(丢包率):" +
            (ls.upLossRate * 100).toFixed(2) +
            "% / " +
            (ls.downLossRate * 100).toFixed(2) +
            "%",
          "延迟:" + ls.latencyTime.toFixed(2) + "ms"
        );
        this.onChangeState(State.LATENCY_STAT, ls);
      });
    }, 1000);

    if ("addTrack" in pc) {
      if (isVideo) {
        // 视频通话处理
        pc.ontrack = (media) => {
          this.onChangeState(State.REMOTE_STREAM_READY, {
            stream: media.streams[0],
          });
        };
      } else {
        // 非视频处理
        pc.ontrack = (media) => {
          if (media.streams.length > 0 && media.streams[0].active) {
            this.audioView.srcObject = media.streams[0];
          }
        };
      }
    } else {
      // @ts-ignore
      pc.onaddstream = (media: { stream: any }) => {
        const remoteStream = media.stream;
        if (isVideo) {
          this.onChangeState(State.REMOTE_STREAM_READY, {
            stream: remoteStream,
          });
        } else {
          if (remoteStream.active) {
            this.audioView.srcObject = remoteStream;
          }
        }
      };
    }
  }

  public register() {
    if (this.ua.isConnected()) {
      this.ua.register();
    } else {
      this.onChangeState(State.ERROR, {
        msg: "websocket尚未连接，请先连接ws服务器.",
      });
    }
  }

  public unregister() {
    if (this.ua && this.ua.isConnected() && this.ua.isRegistered()) {
      this.ua.unregister({ all: true });
    } else {
      this.onChangeState(State.ERROR, { msg: "尚未注册，操作禁止." });
    }
  }

  // 发送消息
  public sendMessage = (target: string, content: string) => {
    let options = {
      contentType: "text/plain",
    };
    this.ua.sendMessage(target, content, options);
  };

  public call(phoneNumber: string | number, isVideo: boolean) {
    this.checkMic && this.micCheck();
    if (this.ua && this.ua.isRegistered()) {
      let eventHandlers = {
        peerconnection: (e: { peerconnection: RTCPeerConnection }) => {
          this.handleMedia(e.peerconnection, isVideo);
        },
      };
      let options = {
        eventHandlers: eventHandlers,
        mediaConstraints: {
          audio: true,
          video: isVideo
            ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30, max: 60 },
              }
            : false,
        } as MediaStreamConstraints,
        pcConfig: {},
        rtcOfferConstraints: {
          offerToReceiveAudio: true,
          offerToReceiveVideo: isVideo,
        },
      };
      const sip_uri_ = `sip:${phoneNumber}@${this.localIp}:5060`;
      this.outgoingSession = this.ua.call(sip_uri_, options);
      this.currentSession = this.outgoingSession;
    } else {
      this.onChangeState(State.ERROR, { msg: "请在注册成功后再发起外呼请求." });
      return "";
    }
  }

  public answer() {
    if (this.currentSession && this.currentSession.isInProgress()) {
      const hasVideo = this.hasVideoStream(this.currentSession);
      this.currentSession.answer({
        mediaConstraints: {
          audio: true,
          video: hasVideo,
        },
        
        pcConfig: {},
        rtcAnswerConstraints: {
          offerToReceiveAudio: true,
          offerToReceiveVideo: hasVideo,
        },
      });
    } else {
      this.onChangeState(State.ERROR, {
        msg: "非法操作，通话尚未建立或状态不正确，请勿操作",
      });
    }
  }

  // 判断当前通话是否是视频通话
  private hasVideoStream(session: RTCSession): boolean {
    const sdp = session?._request?.body;
    if (!sdp) return false;
    // 检查 SDP 中是否包含视频媒体描述
    return sdp.includes("m=video");
  }

  // 挂断
  public hangup() {
    if (this.currentSession && !this.currentSession.isEnded()) {
      this.currentSession.terminate();
    } else {
      this.onChangeState(State.ERROR, {
        msg: "当前通话不存在，无法执行挂断操作。",
      });
    }
  }

  public hold() {
    console.log("---保持", this.currentSession);

    if (!this.currentSession || !this.checkCurrentCallIsActive()) {
      return;
    }
    let options = {
      useUpdate: false,
    };
    let done = () => {};
    try {
      this.currentSession?.hold(options, done);
    } catch (error) {
      this.onChangeState(State.ERROR, {
        msg: "保持通话失败: " + error,
      });
    }
  }
  //取消保持
  public unhold() {
    if (!this.currentSession || !this.checkCurrentCallIsActive()) {
      return;
    }
    if (!this.currentSession.isOnHold()) {
      return;
    }
    let options = {
      useUpdate: false,
    };
    let done = () => {};
    this.currentSession.unhold(options, done);
  }

  public mute() {
    if (!this.currentSession || !this.checkCurrentCallIsActive()) {
      return;
    }
    this.currentSession.mute();
    this.onChangeState(State.MUTE, null);
  }
  //取消静音
  public unmute() {
    if (!this.currentSession || !this.checkCurrentCallIsActive()) {
      return;
    }
    this.currentSession.unmute();
    this.onChangeState(State.UNMUTE, null);
  }

  //转接
  public transfer(phone: string) {
    if (!this.currentSession || !this.checkCurrentCallIsActive()) {
      return;
    }
    this.currentSession.refer(phone);
  }

  // 检查当前通话是否可用
  private checkCurrentCallIsActive(): boolean {
    if (!this.currentSession || !this.currentSession.isEstablished()) {
      this.onChangeState(State.ERROR, {
        msg: "当前通话不存在或已销毁，无法执行该操作。",
      });
      return false;
    }
    return true;
  }

  // 检测麦克风
  public micCheck() {
    if (!navigator.mediaDevices) {
      this.onChangeState(State.MIC_ERROR, {
        msg: "麦克风检测异常,请检查麦克风权限是否开启,是否在HTTPS站点",
      });
      return;
    }
    navigator.mediaDevices
      .getUserMedia(this.constraints)
      .then((_) => {
        console.log("麦克风获取成功");
        _.getTracks().forEach((track) => {
          track.stop();
        });
      })
      .catch(() => {
        // 拒绝
        this.onChangeState(State.MIC_ERROR, {
          msg: "麦克风检测异常,请检查麦克风",
        });
      });
  }

  // 清除通话数据
  private cleanCallingData() {
    this.outgoingSession = undefined;
    this.incomingSession = undefined;
    this.currentSession = undefined;
    this.direction = undefined;
    if (this.audioView.srcObject) {
      const stream = this.audioView.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      this.audioView.srcObject = null;
    }

    clearInterval(this.currentLatencyStatTimer);
    this.currentLatencyStatTimer = undefined;
    this.currentStatReport = {
      outboundPacketsSent: 0,
      outboundLost: 0,
      inboundLost: 0,
      inboundPacketsSent: 0,
    };
  }
}


