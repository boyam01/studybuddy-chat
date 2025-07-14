import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

const SOCKET_URL = "http://localhost:4000";
let socket;

export default function Home() {
  const [step, setStep] = useState("find"); // find, waiting, chat
  const [roomId, setRoomId] = useState("");
  const [buddyId, setBuddyId] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [userId] = useState(() => "studybuddy" + Math.floor(Math.random() * 1000));
  const bottomRef = useRef();

  useEffect(() => {
    socket = io(SOCKET_URL);

    socket.on('waitingBuddy', () => setStep("waiting"));

    socket.on('buddyFound', ({ roomId, buddy }) => {
      setRoomId(roomId);
      setBuddyId(buddy);
      setStep("chat");
      // 拿歷史訊息
      axios.get(`${SOCKET_URL}/api/chat/history?roomId=${roomId}`).then(res => {
        setMessages(res.data);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      });
      // 加入 room
      socket.emit('joinRoom', roomId);
    });

    socket.on('newMessage', (msg) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const startPairing = () => {
    socket.emit('findBuddy', userId);
    setStep("waiting");
  };

  const send = async () => {
    if (!input.trim() || !roomId) return;
    await axios.post(`${SOCKET_URL}/api/chat/message`, {
      senderId: userId,
      roomId: roomId,
      content: input
    });
    socket.emit('sendMessage', {
      senderId: userId,
      roomId: roomId,
      content: input
    });
    setInput("");
  };

  // UI
  if (step === "find") {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #fdf6e3 0%, #e0c3a6 100%)"
      }}>
        <div style={{
          background: "#fff", borderRadius: 16, padding: 36,
          boxShadow: "0 8px 24px rgba(120,81,39,0.10)", minWidth: 340, textAlign: "center"
        }}>
          <h2 style={{ color: "#7e5d33", marginBottom: 20 }}>📚 學伴配對</h2>
          <div style={{ fontSize: 16, color: "#7e5d33", marginBottom: 28 }}>
            點下方按鈕，<br />系統會自動為你配對一位學伴共讀！
          </div>
          <button onClick={startPairing} style={{
            background: "linear-gradient(90deg,#edd07b 0,#f6d365 100%)",
            color: "#805b1d",
            fontWeight: 700,
            border: "none",
            borderRadius: 8,
            padding: "12px 36px",
            fontSize: 18,
            cursor: "pointer",
            marginTop: 10,
            boxShadow: "0 1.5px 4px rgba(215,190,140,0.13)"
          }}>
            尋找學伴
          </button>
        </div>
      </div>
    )
  }

  if (step === "waiting") {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #fdf6e3 0%, #e0c3a6 100%)"
      }}>
        <div style={{
          background: "#fff", borderRadius: 16, padding: 36,
          boxShadow: "0 8px 24px rgba(120,81,39,0.10)", minWidth: 340, textAlign: "center"
        }}>
          <h2 style={{ color: "#7e5d33", marginBottom: 14 }}>🕑 等待學伴...</h2>
          <div style={{ fontSize: 15, color: "#805b1d" }}>
            系統正在幫你配對中，請稍候...
          </div>
        </div>
      </div>
    )
  }

  // 聊天室畫面
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #fdf6e3 0%, #e0c3a6 100%)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "'Segoe UI', 'Noto Sans TC', '微軟正黑體', sans-serif"
    }}>
      <div style={{
        background: "rgba(255,255,255,0.97)",
        borderRadius: 18,
        boxShadow: "0 6px 32px rgba(120, 81, 39, 0.11)",
        maxWidth: 480,
        width: "100%",
        padding: 32,
        border: "1.5px solid #efdbb9"
      }}>
        <div style={{
          textAlign: "center",
          color: "#7e5d33",
          fontWeight: 700,
          marginBottom: 12,
          fontSize: 18,
        }}>
          🧑‍🤝‍🧑 學伴聊天室
        </div>
        <div style={{
          fontSize: 14, color: "#ab955c", textAlign: "center", marginBottom: 18
        }}>
          你與 <b>{buddyId}</b> 已配對成功，開始討論吧！
        </div>
        <div style={{
          border: "1.5px solid #f7e4c1",
          borderRadius: 14,
          height: 320,
          overflowY: 'auto',
          marginBottom: 18,
          padding: "14px 10px",
          background: "repeating-linear-gradient(135deg, #fffbe6, #fffbe6 36px, #f4e6c1 36px, #f4e6c1 38px)",
          fontSize: 15.5
        }}>
          {messages.map((msg, i) => (
            <div key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.senderId === userId ? "flex-end" : "flex-start",
                marginBottom: 10
              }}
            >
              <span style={{
                background: msg.senderId === userId ? "#ffeeb3" : "#f1dec9",
                color: "#705a37",
                borderRadius: 7,
                padding: "7px 15px",
                maxWidth: "82%",
                wordBreak: "break-word",
                boxShadow: "0 1px 4px rgba(170,142,73,0.08)",
                fontWeight: 500
              }}>
                <b style={{ fontSize: 13, color: "#c18832" }}>{msg.senderId}：</b> {msg.content}
              </span>
            </div>
          ))}
          <div ref={bottomRef}></div>
        </div>
        <div style={{ display: "flex", gap: 9 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            style={{
              flex: 1,
              padding: "11px 12px",
              border: "1.5px solid #ecd9b2",
              borderRadius: 9,
              fontSize: 15,
              background: "#fffbe6",
              outline: "none"
            }}
            placeholder="輸入你想討論的內容..."
          />
          <button
            onClick={send}
            style={{
              background: "linear-gradient(90deg,#edd07b 0,#f6d365 100%)",
              color: "#805b1d",
              fontWeight: 700,
              border: "none",
              borderRadius: 8,
              padding: "10px 22px",
              fontSize: 15,
              cursor: "pointer",
              boxShadow: "0 1.5px 4px rgba(215,190,140,0.11)"
            }}
          >送出</button>
        </div>
        <div style={{
          textAlign: "right", fontSize: 12, marginTop: 10, color: "#b09b7a"
        }}>
          📝 學伴聊天室 — 共讀．討論．進步
        </div>
      </div>
    </div>
  );
}
