const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// Biến lưu kết quả mới nhất
let latestResult = {
  id: "binhtool90",
  sid: null,
  ket_qua: "",
  md5: "",
  du_doan: "",
  pattern: "",
  sid_tiep_theo: null,
  md5_tiep_theo: null
};

app.get("/", (req, res) => res.send("binhtool90 đang chạy"));

// Trả JSON tại /taixiu
app.get("/taixiu", (req, res) => {
  res.json(latestResult);
});

app.listen(PORT, () => {
  console.log("Server HTTP sống tại cổng", PORT);
});

const WebSocket = require("ws");

const WS_URL = "wss://minybordergs.weskb5gams.net/websocket";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
  "Origin": "https://i.b52.club",
  "Host": "minybordergs.weskb5gams.net",
  "Pragma": "no-cache",
  "Cache-Control": "no-cache",
  "Sec-WebSocket-Version": "13"
};

const ACCESS_PAYLOAD = [
  1,
  "MiniGame",
  "",
  "",
  {
    agentId: "1",
    accessToken: "13-bbaf03bc699cff44f9c0955522375acd",
    reconnect: false
  }
];

const START_CMDS = [
  [6, "MiniGame", "taixiuPlugin", { cmd: 1005 }],
  [6, "MiniGame", "taixiuKCBPlugin", { cmd: 2000 }],
  [6, "MiniGame", "lobbyPlugin", { cmd: 10001 }]
];

let counter = 1;
let patternHistory = [];

function predictFromMD5(md5) {
  let sum = 0;
  for (let i = 0; i < md5.length; i++) {
    const char = md5.charAt(i);
    if (!isNaN(parseInt(char))) sum += parseInt(char);
    else sum += char.charCodeAt(0);
  }
  return sum % 2 === 0 ? "Tài" : "Xỉu";
}

function updatePattern(kq) {
  const p = kq >= 11 ? "t" : "x";
  patternHistory.push(p);
  if (patternHistory.length > 10) patternHistory.shift();
  return patternHistory.join("");
}

function connect() {
  const ws = new WebSocket(WS_URL, { headers: HEADERS });

  ws.on("open", () => {
    console.log("[✅] WebSocket kết nối — ID: binhtool90");
    ws.send(JSON.stringify(ACCESS_PAYLOAD));
    setTimeout(() => {
      for (const cmd of START_CMDS) {
        ws.send(JSON.stringify(cmd));
      }
    }, 500);

    setInterval(() => {
      const keepAlive = ["7", "MiniGame", "1", counter++];
      ws.send(JSON.stringify(keepAlive));
    }, 3000);
  });

  ws.on("message", (data) => {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && typeof parsed[1] === "object") {
        const d = parsed[1];

        if (d.cmd === 2005) {
          // Lưu phiên mới & MD5 tiếp theo
          latestResult.sid_tiep_theo = d.sid;
          latestResult.md5_tiep_theo = d.md5;
          latestResult.du_doan = predictFromMD5(d.md5);
          console.log(`[🟢] Phiên kế: ${d.sid} | MD5: ${d.md5} | Dự đoán: ${latestResult.du_doan}`);
        }

        if (d.cmd === 2006) {
          const sid = d.sid;
          const md5 = d.md5;
          const d1 = d.d1, d2 = d.d2, d3 = d.d3;
          const sum = d1 + d2 + d3;
          const kq = sum >= 11 ? "Tài" : "Xỉu";
          const pattern = updatePattern(sum);

          // Cập nhật kết quả hiện tại
          latestResult.sid = sid;
          latestResult.ket_qua = `${d1}-${d2}-${d3} = ${sum} (${kq})`;
          latestResult.md5 = md5;
          latestResult.pattern = pattern;

          console.log(`[🎯] Phiên: ${sid} | Kết quả: ${d1}-${d2}-${d3} = ${sum} (${kq})`);
          console.log(`       ID: binhtool90 | Pattern: ${pattern}`);
        }
      }
    } catch (e) {}
  });

  ws.on("close", () => {
    console.log("[❌] Mất kết nối — reconnect sau 3s...");
    setTimeout(connect, 3000);
  });

  ws.on("error", () => {});
}

connect();
