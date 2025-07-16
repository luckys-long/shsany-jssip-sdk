var L = Object.defineProperty;
var m = (s, t, e) => t in s ? L(s, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : s[t] = e;
var a = (s, t, e) => m(s, typeof t != "symbol" ? t + "" : t, e);
import * as p from "jssip";
import { URI as I } from "jssip";
var i = /* @__PURE__ */ ((s) => (s.MIC_ERROR = "MIC_ERROR", s.ERROR = "ERROR", s.CONNECTED = "CONNECTED", s.DISCONNECTED = "DISCONNECTED", s.REGISTERED = "REGISTERED", s.UNREGISTERED = "UNREGISTERED", s.REGISTER_FAILED = "REGISTER_FAILED", s.INCOMING_CALL = "INCOMING_CALL", s.OUTGOING_CALL = "OUTGOING_CALL", s.IN_CALL = "IN_CALL", s.HOLD = "HOLD", s.CALL_END = "CALL_END", s.MUTE = "MUTE", s.UNMUTE = "UNMUTE", s.LATENCY_STAT = "LATENCY_STAT", s.MESSAGE_INCOMING = "MESSAGE_INCOMING", s.Idle = "Idle", s))(i || {}), g = /* @__PURE__ */ ((s) => (s.OUTBOUND = "outbound", s.INBOUND = "inbound", s))(g || {});
class v {
  constructor(t) {
    //媒体控制
    a(this, "constraints", {
      audio: !0,
      video: !1
    });
    //创建audio控件，播放声音的地方
    a(this, "audioView", document.createElement("audio"));
    a(this, "ua");
    a(this, "socket");
    a(this, "localAgent");
    //对方号码
    // private otherLegNumber: string | undefined;
    //呼叫中session:呼出、呼入、当前
    a(this, "outgoingSession");
    // @ts-ignore: Will be used in future implementation
    a(this, "incomingSession");
    a(this, "currentSession");
    // private sessionMap: Map<string, RTCSession> = new Map();
    a(this, "localIp");
    //呼叫方向 outbound:呼出/inbound:呼入
    a(this, "direction");
    //当前通话的网络延迟统计定时器(每秒钟获取网络情况)
    a(this, "currentLatencyStatTimer");
    a(this, "currentStatReport");
    //回调函数
    a(this, "stateEventListener");
    // 是否监测麦克风权限
    a(this, "checkMic");
    // 发送消息
    a(this, "sendMessage", (t, e) => {
      let o = {
        contentType: "text/plain"
      };
      this.ua.sendMessage(t, e, o);
    });
    this.ua = null, this.socket = null, this.localIp = "", this.checkMic = t.checkMic, this.localAgent = t.extNo, t.stateEventListener !== null && (this.stateEventListener = t.stateEventListener), t.checkMic && this.micCheck(), this.sipInit({
      username: t.extNo,
      password: t.extPwd,
      serverIp: t.fsHost,
      deviceIP: t.host,
      port: t.port
    });
  }
  sipInit(t) {
    const { username: e, password: o, serverIp: n, deviceIP: d, port: l = 5060 } = t, C = new I("sip", e, n, l);
    console.log("sipUri", C.toString()), this.localIp = d, this.socket = new p.WebSocketInterface(`wss://${n}:7443`);
    let E = {
      sockets: [this.socket],
      uri: C.toString(),
      password: o,
      outbound_proxy_set: `ws://${n}:7443`,
      contact_uri: `sip:${e}@${d}:20455;rtcweb-breaker=yes;transport=ws`,
      session_timers: !1,
      register: !0,
      display_name: e,
      register_expires: 120,
      mediaconstraints: {}
    };
    this.ua = new p.UA(E), this.ua.on("connected", (r) => {
      this.onChangeState(i.CONNECTED, null);
    }), this.ua.on("disconnected", (r) => {
      this.ua.stop(), r.error && this.onChangeState(i.ERROR, {
        msg: "websocket连接失败,请检查地址或网络"
      });
    }), this.ua.on("registered", (r) => {
      this.onChangeState(i.REGISTERED, { localAgent: this.localAgent });
    }), this.ua.on("unregistered", (r) => {
      this.ua.stop(), this.onChangeState(i.UNREGISTERED, { localAgent: this.localAgent });
    }), this.ua.on("registrationFailed", (r) => {
      this.onChangeState(i.REGISTER_FAILED, { msg: "注册失败" + r.cause });
    }), this.ua.on("registrationExpiring", () => {
      this.ua.register();
    }), this.ua.on(
      "newRTCSession",
      (r) => {
        const c = r.session;
        let S;
        r.originator === "remote" ? (this.incomingSession = r.session, this.currentSession = c, this.direction = g.INBOUND, S = i.INCOMING_CALL) : (this.direction = g.OUTBOUND, S = i.OUTGOING_CALL), c.on("peerconnection", (u) => {
          this.handleAudio(u.peerconnection);
        }), c.on("progress", (u) => {
          this.onChangeState(S, {
            direction: this.direction,
            otherLegNumber: r.request.from.uri.user,
            // @ts-ignore
            // callId: data.request.call_id,
            callId: r.session.id,
            isTransfer: r.request.getHeader("X-Is-From-Transfer")
          });
        }), c.on("accepted", () => {
          this.onChangeState(i.IN_CALL, null);
        }), c.on("ended", (u) => {
          var h;
          const R = {
            answered: !0,
            cause: u.cause,
            // @ts-ignore
            code: ((h = u.message) == null ? void 0 : h.status_code) ?? 0,
            originator: u.originator
          };
          this.cleanCallingData(), this.onChangeState(i.CALL_END, R);
        }), c.on("failed", (u) => {
          var h;
          const R = {
            answered: !1,
            cause: u.cause,
            // @ts-ignore
            code: ((h = u.message) == null ? void 0 : h.status_code) ?? 0,
            originator: u.originator
          };
          this.cleanCallingData(), this.onChangeState(i.CALL_END, R);
        }), c.on("hold", (u) => {
          this.onChangeState(i.HOLD, null);
        }), c.on("unhold", (u) => {
          this.onChangeState(i.IN_CALL, null);
        });
      }
    ), this.ua.on(
      "newMessage",
      (r) => {
        switch (r.message.direction) {
          case "incoming":
            const c = r.request.body;
            if (!c) return;
            this.onChangeState(i.MESSAGE_INCOMING, c);
        }
      }
    ), this.ua.start();
  }
  onChangeState(t, e) {
    this.stateEventListener !== void 0 && this.stateEventListener(t, e);
  }
  // 处理媒体流
  handleAudio(t) {
    this.audioView.autoplay = !0, this.currentStatReport = {
      outboundPacketsSent: 0,
      outboundLost: 0,
      inboundLost: 0,
      inboundPacketsSent: 0
    }, this.currentLatencyStatTimer = setInterval(() => {
      t.getStats().then((e) => {
        e.forEach((n) => {
          if (n.type == "media-source" && (this.currentStatReport.outboundAudioLevel = n.audioLevel), !(n.type != "remote-inbound-rtp" && n.type != "inbound-rtp" && n.type != "remote-outbound-rtp" && n.type != "outbound-rtp"))
            switch (n.type) {
              case "outbound-rtp":
                this.currentStatReport.outboundPacketsSent = n.packetsSent;
                break;
              case "remote-inbound-rtp":
                this.currentStatReport.outboundLost = n.packetsLost, this.currentStatReport.roundTripTime = n.roundTripTime;
                break;
              case "inbound-rtp":
                this.currentStatReport.inboundLost = n.packetsLost, this.currentStatReport.inboundAudioLevel = n.audioLevel;
                break;
              case "remote-outbound-rtp":
                this.currentStatReport.inboundPacketsSent = n.packetsSent;
                break;
            }
        });
        let o = {
          latencyTime: 0,
          upLossRate: 0,
          downLossRate: 0,
          downAudioLevel: 0,
          upAudioLevel: 0
        };
        this.currentStatReport.inboundAudioLevel != null && (o.downAudioLevel = this.currentStatReport.inboundAudioLevel), this.currentStatReport.outboundAudioLevel != null && (o.upAudioLevel = this.currentStatReport.outboundAudioLevel), this.currentStatReport.inboundLost && this.currentStatReport.inboundPacketsSent && (o.downLossRate = this.currentStatReport.inboundLost / this.currentStatReport.inboundPacketsSent), this.currentStatReport.outboundLost && this.currentStatReport.outboundPacketsSent && (o.upLossRate = this.currentStatReport.outboundLost / this.currentStatReport.outboundPacketsSent), this.currentStatReport.roundTripTime != null && (o.latencyTime = Math.floor(
          this.currentStatReport.roundTripTime * 1e3
        )), console.debug(
          "上行/下行(丢包率):" + (o.upLossRate * 100).toFixed(2) + "% / " + (o.downLossRate * 100).toFixed(2) + "%",
          "延迟:" + o.latencyTime.toFixed(2) + "ms"
        ), this.onChangeState(i.LATENCY_STAT, o);
      });
    }, 1e3), "addTrack" in t ? t.ontrack = (e) => {
      e.streams.length > 0 && e.streams[0].active && (this.audioView.srcObject = e.streams[0]);
    } : t.onaddstream = (e) => {
      const o = e.stream;
      o.active && (this.audioView.srcObject = o);
    };
  }
  register() {
    this.ua.isConnected() ? this.ua.register() : this.onChangeState(i.ERROR, {
      msg: "websocket尚未连接，请先连接ws服务器."
    });
  }
  unregister() {
    this.ua && this.ua.isConnected() && this.ua.isRegistered() ? this.ua.unregister({ all: !0 }) : this.onChangeState(i.ERROR, { msg: "尚未注册，操作禁止." });
  }
  call(t, e) {
    if (this.checkMic && this.micCheck(), this.ua && this.ua.isRegistered()) {
      let n = {
        eventHandlers: {
          peerconnection: (l) => {
            this.handleAudio(l.peerconnection);
          }
        },
        mediaConstraints: {
          audio: !0,
          video: e ? {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30, max: 60 }
          } : !1
        },
        pcConfig: {},
        rtcOfferConstraints: {
          offerToReceiveAudio: !0,
          offerToReceiveVideo: e
        }
      };
      const d = `sip:${t}@${this.localIp}:5060`;
      this.outgoingSession = this.ua.call(d, n), this.currentSession = this.outgoingSession;
    } else
      return this.onChangeState(i.ERROR, { msg: "请在注册成功后再发起外呼请求." }), "";
  }
  answer() {
    this.currentSession && this.currentSession.isInProgress() ? this.currentSession.answer({
      mediaConstraints: this.constraints
    }) : this.onChangeState(i.ERROR, {
      msg: "非法操作，通话尚未建立或状态不正确，请勿操作"
    });
  }
  // 挂断
  hangup() {
    this.currentSession && !this.currentSession.isEnded() ? this.currentSession.terminate() : this.onChangeState(i.ERROR, {
      msg: "当前通话不存在，无法执行挂断操作。"
    });
  }
  hold() {
    var o;
    if (console.log("---保持", this.currentSession), !this.currentSession || !this.checkCurrentCallIsActive())
      return;
    let t = {
      useUpdate: !1
    }, e = () => {
    };
    try {
      (o = this.currentSession) == null || o.hold(t, e);
    } catch (n) {
      this.onChangeState(i.ERROR, {
        msg: "保持通话失败: " + n
      });
    }
  }
  //取消保持
  unhold() {
    if (!this.currentSession || !this.checkCurrentCallIsActive() || !this.currentSession.isOnHold())
      return;
    let t = {
      useUpdate: !1
    }, e = () => {
    };
    this.currentSession.unhold(t, e);
  }
  mute() {
    !this.currentSession || !this.checkCurrentCallIsActive() || (this.currentSession.mute(), this.onChangeState(i.MUTE, null));
  }
  //取消静音
  unmute() {
    !this.currentSession || !this.checkCurrentCallIsActive() || (this.currentSession.unmute(), this.onChangeState(i.UNMUTE, null));
  }
  //转接
  transfer(t) {
    !this.currentSession || !this.checkCurrentCallIsActive() || this.currentSession.refer(t);
  }
  // 检查当前通话是否可用
  checkCurrentCallIsActive() {
    return !this.currentSession || !this.currentSession.isEstablished() ? (this.onChangeState(i.ERROR, {
      msg: "当前通话不存在或已销毁，无法执行该操作。"
    }), !1) : !0;
  }
  // 检测麦克风
  micCheck() {
    if (!navigator.mediaDevices) {
      this.onChangeState(i.MIC_ERROR, {
        msg: "麦克风检测异常,请检查麦克风权限是否开启,是否在HTTPS站点"
      });
      return;
    }
    navigator.mediaDevices.getUserMedia(this.constraints).then((t) => {
      console.log("麦克风获取成功"), t.getTracks().forEach((e) => {
        e.stop();
      });
    }).catch(() => {
      this.onChangeState(i.MIC_ERROR, {
        msg: "麦克风检测异常,请检查麦克风"
      });
    });
  }
  // 清除通话数据
  cleanCallingData() {
    this.outgoingSession = void 0, this.incomingSession = void 0, this.currentSession = void 0, this.direction = void 0, this.audioView.srcObject && (this.audioView.srcObject.getTracks().forEach((e) => e.stop()), this.audioView.srcObject = null), clearInterval(this.currentLatencyStatTimer), this.currentLatencyStatTimer = void 0, this.currentStatReport = {
      outboundPacketsSent: 0,
      outboundLost: 0,
      inboundLost: 0,
      inboundPacketsSent: 0
    };
  }
}
export {
  g as CallDirectionEnum,
  i as State,
  v as default
};
