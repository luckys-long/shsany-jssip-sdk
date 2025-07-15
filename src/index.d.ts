import * as jssip from "jssip";

import {
  RTCSession,
} from "jssip/lib/RTCSession";

// 状态枚举
export enum State {
  MIC_ERROR = "MIC_ERROR", //麦克风检测异常
  ERROR = "ERROR", //错误操作或非法操作
  CONNECTED = "CONNECTED", //websocket已连接
  DISCONNECTED = "DISCONNECTED", //websocket已断开连接
  REGISTERED = "REGISTERED", //已注册
  UNREGISTERED = "UNREGISTERED", //取消注册
  REGISTER_FAILED = "REGISTER_FAILED", //注册失败
  INCOMING_CALL = "INCOMING_CALL", //呼入振铃
  OUTGOING_CALL = "OUTGOING_CALL", //外呼中
  IN_CALL = "IN_CALL", //通话中
  HOLD = "HOLD", //保持中
  CALL_END = "CALL_END", //通话结束
  MUTE = "MUTE", //静音
  UNMUTE = "UNMUTE", //取消静音
  LATENCY_STAT = "LATENCY_STAT", //网络延迟统计
  MESSAGE_INCOMING = "MESSAGE_INCOMING", //消息接收
  Idle = "Idle", //空闲
}

// 通话方向枚举
export enum CallDirectionEnum {
  OUTBOUND = "outbound",
  INBOUND = "inbound",
}

// 初始化参数
export interface InitConfig {
  host: string; // sip地址
  port: number; // sip端口
  fsHost: string; // freeswitch地址
  fsPort?: string | number; // freeswitch端口
  viaTransport?: string; // 表示在传出请求的 Via 标头字段中使用的 Via 传输的字符串
  extNo: string; //分机号
  extPwd: string; // 分机密码
  stun?: StunConfig; // stun服务器配置
  checkMic: boolean; // 是否检测麦克风
  stateEventListener: Function; // 回调函数
}

// stun服务器配置
type StunType = "turn" | "stun";
export type CallDirection = "outbound" | "inbound";
export interface StunConfig {
  type: StunType;
  host: string;
  username?: string;
  password?: string;
}

// 通话结束事件
export interface CallEndEvent {
  originator: string; //local,remote
  cause: string;
  code: number;
  answered: boolean;
}


export interface StateListenerMessage {
  msg?: string;
  localAgent?: String;
  direction?: CallDirection; //呼叫方向
  otherLegNumber?: String;
  callId?: String;
  isTransfer?: any; //转接状态

  latencyTime?: number | undefined; //网络延迟(ms)
  upLossRate?: number | undefined; //上行-丢包率
  downLossRate?: number | undefined; //下行-丢包率
}

// 网络延迟统计
export interface NetworkLatencyStat {
  roundTripTime?: number; //延迟时间(ms)
  inboundLost?: number; //下行-丢包数量
  inboundPacketsSent?: number; //下行-包的总数
  inboundAudioLevel?: number; //下行-声音大小

  outboundLost?: number; //上行-丢包数量
  outboundPacketsSent?: number; //上行-包的总数
  outboundAudioLevel?: number; //上行-声音大小
}


// 网络延迟统计
export interface LatencyStat {
  latencyTime: number;
  upLossRate: number;
  upAudioLevel: number; //上行-outbound-音量
  downLossRate: number;
  downAudioLevel: number; //下行-inbound-音量
}

interface CallExtraParam {
  outNumber?: string;
  businessId?: String;
}


export default class ShsanyCall {

    private constraints: { audio: boolean; video: boolean };
     
}