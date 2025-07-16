# ShsanyCall - WebRTC SIP 电话 SDK

## 概述

ShsanyCall 是一个基于 WebRTC 的 SIP 电话 SDK，能够在 Web 应用中实现语音通话功能。基于 JsSIP 构建，提供全面的通话功能和易用的 API 接口。

## 功能特点

- 📞 完整的 SIP 协议实现
- 🔊 WebRTC 语音通话  
- 🔔 来电/去电处理
- ⏯️ 通话控制（保持、静音、转接）
- 📊 实时网络质量监控
- 🎤 麦克风权限检测
- 🔄 事件驱动的状态管理
- 🛠️ TypeScript 类型支持

### 安装

```bash
yarn add  git+https://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@github.com/luckys-long/shsany-jssip-sdk.git 
# 或  
# yarn add shsany-call
```

#### 初始化

初始化加载 sdk 的参数说明：

| 参数               | 类型          | 说明                                                          | 是否必填               |
| ------------------ | ------------- | ------------------------------------------------------------- | ---------------------- |
| host               | string        | sip 服务器地址                                                | 必填项                 |
| port               | number        | sip 服务器端口                                                | 必填项                 |
| fsHost             | string        | freeswitch 服务器地址                                         | 必填项                 |
| fsPort             | string/number | freeswitch 服务器端口                                         | 非必填项               |
| viaTransport       | string        | Via 头中显示的协议标识符(ws/wss/tcp/udp/tls),根据具体业务配置 | 非必填项               |
| extNo              | string        | 分机账号                                                      | 必填项                 |
| extPwd             | string        | 分机密码                                                      | 必填项                 |
| checkMic           | boolean       | 麦克风检测                                                    | 必填项                 |
| stateEventListener | Function      | 状态回调函数方法 参照文档下方 stateEventListener 详细说明     | 必填项，需注入状态回调 |

```javascript

import ShsanyCall from "shsany-call";

const callInstance = new ShsanyCall({
  host: "sip.example.com",
  port: 5060,
  fsHost: "fs.example.com",
  extNo: "1001",
  extPwd: "123456",
  checkMic: true,
  stateEventListener: (event, data) => {
    // 处理状态变化
  }
});

callInstance.init();
```
#### 接听
```javascript
callInstance.answer();
```
#### 挂断
```javascript
callInstance.hangup();
```
#### 保持
```javascript
callInstance.hold();
```
#### 转接
```javascript
callInstance.transfer("1003");
```
#### 取消保持
```javascript
callInstance.unhold();
```

#### 退出

```javascript
callInstance.unregister();
callInstance.cleanSdk();
```

## 流程说明

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
npm install git+https://${GITHUB_TOKEN}@github.com/luckys-long/shsany-jssip-sdk.git
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

### 1、初始化

1、检查麦克风权限
2、调用初始化方法
3、收到回调事件「REGISTERED」表示注册成功。错误处理：监听事件，收到「DISCONNECTED」、「REGISTER_FAILED」做出相应提示

## 文档说明
提供如下方法：

| 函数       | 调用方式                  | 说明                                                      |
| ---------- | ------------------------- | --------------------------------------------------------- |
| 初始化     | new ShsanyCall(config)      |                                                           |
| 销毁 SDK   | cleanSDK()                |                                                           |
| 检查麦克风 | micCheck()                | 异步接口，若麦克风异常会回调 MIC_ERROR 事件               |
| 注册       | register()                |                                                           |
| 取消注册   | unregister()              |                                                           |
| 呼叫请求   | call(phone,extraParam={}) | phone 为外呼号码，extraParam 为可选的扩展参数（可以不传） |
| 挂断电话   | hangup()                  |                                                           |
| 应答接听   | answer()                  |                                                           |
| 保持       | hold()                    |                                                           |
| 取消保持   | unhold()                  |                                                           |
| 静音       | mute()                    |                                                           |
| 取消静音   | unmute()                  |                                                           |
| 转接通话   | transfer(phone)           |                                                           |
| 按键       | sendDtmf(tone)            | 按键或二次拨号                                            |

### 状态回调（stateEventListener）

前端注入状态回调函数，通过状态回调 控制页面按钮显示

stateEventListener 回调参数为 event, data

| Event 事件列表              | 返回值                                                                                                                                                             | 状态说明           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| MIC_ERROR                   | {msg: xxxx}                                                                                                                                                        | 麦克风检测异常     |
| ERROR                       | {msg: xxxx}                                                                                                                                                        | 错误异常           |
| CONNECTED                   | {localAgent: '1001'}                                                                                                                                               | 连接成功           |
| DISCONNECTED                | 无返回值                                                                                                                                                           | websocket 连接失败 |
| REGISTERED                  | 无返回值                                                                                                                                                           | 注册成功           |
| UNREGISTERED                | 无返回值                                                                                                                                                           | 取消注册           |
| REGISTER_FAILED             | {msg: xxxx}                                                                                                                                                        | 注册失败           |
| INCOMING_CALL/OUTGOING_CALL | {direction: 'inbound', otherLegNumber: '138xxxxxxxx', 'callId': 'xxxxxxx'} 说明：direction 为呼叫方向：inbound 呼入，outbound 呼出；otherLegNumber：第三方呼叫记录 | 呼入振铃/外呼响铃  |
| IN_CALL                     | 无返回值                                                                                                                                                           | 通话中             |
| HOLD                        | 无返回值                                                                                                                                                           | 保持中             |
| CALL_END                    | CallEndEvent                                                                                                                                                       | 通话结束           |
| MUTE                        | 无返回值                                                                                                                                                           | 静音               |
| UNMUTE                      | 无返回值                                                                                                                                                           | 取消静音           |
| LATENCY_STAT                | LatencyStat                                                                                                                                                        | 网络延迟统计       |
| MESSAGE_INCOMING            | newMessage                                                                                                                                                         | 消息接收           |

### CallEndEvent

| 属性       | 必须 | 类型    | 说明                                              |
| ---------- | ---- | ------- | ------------------------------------------------- |
| answered   | 是   | boolean | 是否接通(以后端为准)                              |
| originator | 是   | string  | 发起方(挂断方):local 本地(自己),remote 远程(对方) |
| cause      | 是   | string  | 挂断原因                                          |
| code       | 否   | number  | 当 originator=remote，且 answered=false 时存在    |