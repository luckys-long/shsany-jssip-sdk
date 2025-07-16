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

## 安装

```bash
npm install shsany-call
# 或  
yarn add shsany-call

### 初始化

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

1. 初始化

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
2. 基础功能


方法	说明	示例

call	发起呼叫	call("1002", false)
answer	接听来电	answer()
hangup	挂断通话	hangup()
hold	保持通话	hold()
transfer	通话转接	transfer("1003")

3. 配置参数
interface InitConfig {
  host: string;    // SIP服务器地址
  port: number;    // SIP端口
  fsHost: string;  // FreeSWITCH地址
  extNo: string;   // 分机号
  extPwd: string;  // 分机密码
  checkMic?: boolean; // 麦克风检测
}

4. 最佳实践
建议在应用初始化时创建单例

所有通话操作需在状态回调中处理

生产环境必须使用 HTTPS