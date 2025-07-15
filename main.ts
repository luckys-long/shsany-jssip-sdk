import "./style.css";
// import typescriptLogo from "./typescript.svg";
// import { setupCounter } from "../lib/main";
import { InitConfig } from "./src/index.d";
import ShsanyCall from "./src/index";

const { createApp, ref, markRaw } = Vue;

const App = {
  template: `  
  <div>
  <button type="primary" @click="enter">注册</button>
    <button type="primary" @click="call">外呼</button>
    <button type="primary" @click="out">取消注册</button>
    <button type="primary" v-if="inCall">通话中</button>
    <button type="primary" @click="answer" v-if="isAnswer && !inCall">
      接听
    </button>
    <button type="primary" @click="mute">
      静音
    </button>
    <button type="primary" @click="unMute">
      取消静音
    </button>
    <button type="primary" @click="hold">
      保持
    </button>
    <button type="primary" @click="unHold">
      取消保持
    </button>
    <button type="primary" @click="hangup">挂断</button>
    </div>
    `,
  setup() {
    const sipClient = ref();
    const isAnswer = ref(false);
    const inCall = ref(false);
    const setupListeners = () => {
      const handleOnline = () => {
        console.log("网络已连接");
        // 可以在这里执行重新初始化或其他操作
      };

      const handleOffline = () => {
        console.log("网络已断开");
        // 可以在这里执行清理操作或提示用户
      };
      const handleBeforeUnload = (_event: BeforeUnloadEvent) => {
        // 处理页面关闭或刷新事件
        console.log("页面即将关闭或刷新");
        // 可以在这里执行清理操作
        // event.returnValue = "确定要离开吗？"; // 提示用户确认离开
      };
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      window.addEventListener("beforeunload", handleBeforeUnload);
    };

    setupListeners();

    const stateEventListener = (event: string, data: any) => {
      switch (event) {
        case "CONNECTED":
          console.log("连接成功", data);
          break;
        case "DISCONNECTED":
          console.log("连接失败", data);
          break;
        case "REGISTERED":
          console.log("注册成功", data);
          break;
        case "UNREGISTERED":
          console.log("取消注册", data);
          break;
        case "REGISTER_FAILED":
          console.log("注册失败", data);
          break;
        case "INCOMING_CALL":
          console.log("呼入振铃", data);
          isAnswer.value = true;
          break;
        case "OUTGOING_CALL":
          console.log("外呼中", data);
          break;
        case "IN_CALL":
          console.log("通话中", data);
          inCall.value = true;
          break;
        case "CALL_END":
          console.log("通话结束", data);
          isAnswer.value = false;
          inCall.value = false;
          break;
        case "HOLD":
          console.log("保持", data);
          break;
        case "UNHOLD":
          console.log("取消保持", data);
          break;
        case "MUTE":
          console.log("静音", data);
          break;
        case "UNMUTE":
          console.log("取消静音", data);
          break;
        case "LATENCY_STAT":
          console.log("通话质量统计", {
            下行音频: `${(data.downAudioLevel * 100).toFixed(2)}%`,
            下行丢包率: `${(data.downLossRate * 100).toFixed(2)}%`,
            网络延迟: `${data.latencyTime}ms`,
            上行音频: `${(data.upAudioLevel * 100).toFixed(2)}%`,
            上行丢包率: `${(data.upLossRate * 100).toFixed(2)}%`,
            原始数据: data,
          });
          break;
        case "MIC_ERROR":
          console.log("错误", data);
          break;
      }
    };
    enum StunType {
      STUN = "stun",
      TURN = "turn",
    }
    const init = () => {
      console.log("初始化");
      try {
        const configuration: InitConfig = {
          host: "172.16.2.202",
          port: 5060,
          fsHost: "192.168.0.216",
          extNo: "1005",
          extPwd: "1005",
          checkMic: true,
          stateEventListener,
        };
        sipClient.value = markRaw(new ShsanyCall(configuration));
      } catch (error) {
        console.log("初始化失败", error);
      }
    };
    const enter = () => {
      init();
    };

    const call = () => {
      sipClient.value?.call("1007");
    };
    const out = () => {
      sipClient.value?.unregister();
      sipClient.value?.cleanSdk();
    };
    const answer = () => {
      sipClient.value?.answer();
    };
    const hangup = () => {
      sipClient.value?.hangup();
    };
    const mute = () => {
      sipClient.value?.mute();
    };
    const unMute = () => {
      sipClient.value?.unmute();
    };
    const hold = () => {
      sipClient.value?.hold();
    };
    const unHold = () => {
      sipClient.value?.unhold();
    };
    return {
      enter,
      call,
      out,
      answer,
      hangup,
      mute,
      unMute,
      hold,
      unHold,
      stateEventListener,
      isAnswer,
      inCall,
    };
  },
};

createApp(App).mount("#app");
