Vue# shsany-jssip-sdk

公司内部使用的 JsSIP 封装 SDK

## 安装

```bash
npm install shsany-jssip-sdk
```

## 使用示例

```javascript
import BestCall from 'shsany-jssip-sdk'

const options = {
  websocket_url: 'wss://your.sip.server.com',
  domain: 'yourdomain.com',
  username: 'your_username',
  password: 'your_password'
}

const client = new BestCall(options)
client.start()

// 拨打电话
const callId = client.call('1001')

// 事件监听
client.on('call:incoming', (session) => {
  console.log('Incoming call from', session.remote_identity.uri.toString())
})
```

## API 文档

### `new BestCall(options)`
创建新的 SIP 客户端实例...

