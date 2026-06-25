import React, { useState, useRef, useEffect } from "react";
import { apiFetch } from "../../utils/api";

/* ─── Design tokens ──────────────────────────────────────────────────────────
   Deep dark navy + electric purple accent palette — audio / hi-fi vibe.
   All styles are inline so nothing gets purged by Tailwind's JIT.
────────────────────────────────────────────────────────────────────────────── */
const C = {
  bg:          "#0d0f1a",          // deep navy
  surface:     "#13162a",          // card surface
  surfaceAlt:  "#1a1d35",          // slightly lighter
  border:      "rgba(139,92,246,0.25)",
  accent:      "#8b5cf6",          // electric violet
  accentDark:  "#6d28d9",
  accentGlow:  "rgba(139,92,246,0.35)",
  accentText:  "#c4b5fd",
  userBubble:  "linear-gradient(135deg,#7c3aed,#4f46e5)",
  botBubble:   "#1e2240",
  textPrimary: "#f0edff",
  textMuted:   "#6b7280",
  green:       "#10b981",
};

/* ─── Quick-action prompts ────────────────────────────────────────────────── */
const QUICK_ACTIONS = [
  { label: "🛒 My Cart",      text: "Show me my cart"              },
  { label: "🎧 Products",     text: "What products do you have?"   },
  { label: "📦 My Orders",    text: "Show my recent orders"        },
  { label: "💜 Best Sellers", text: "What are your best sellers?"  },
];

/* ─── Waveform loading indicator ─────────────────────────────────────────── */
function Waveform() {
  const bars = [1, 1.6, 0.8, 1.4, 1, 1.8, 0.7, 1.3];
  return (
    <div style={{ display:"flex", alignItems:"center", gap:3, padding:"10px 14px" }}>
      {bars.map((h, i) => (
        <span
          key={i}
          style={{
            display:      "inline-block",
            width:        3,
            height:       h * 12,
            borderRadius: 4,
            background:   C.accent,
            animation:    `apWave 0.9s ease-in-out ${i * 0.09}s infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes apWave {
          from { transform: scaleY(0.4); opacity:0.5; }
          to   { transform: scaleY(1.4); opacity:1;   }
        }
        @keyframes apFadeIn {
          from { opacity:0; transform:translateY(6px); }
          to   { opacity:1; transform:translateY(0);   }
        }
        @keyframes apPop {
          0%   { transform:scale(0.85); opacity:0; }
          70%  { transform:scale(1.05); }
          100% { transform:scale(1);   opacity:1; }
        }
        @keyframes apPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(139,92,246,0.5); }
          50%     { box-shadow: 0 0 0 10px rgba(139,92,246,0);  }
        }
        @keyframes apSpin {
          to { transform: rotate(360deg); }
        }
        .ap-textarea::-webkit-scrollbar { display: none; }
        .ap-textarea { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

/* ─── Headphone SVG icon ──────────────────────────────────────────────────── */
function HeadphoneIcon({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
    </svg>
  );
}

function SendIcon() {
  return (
    <span style={{ fontSize: 18, lineHeight: 1, color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
      ➤
    </span>
  );
}

function BotAvatar() {
  return (
    <div style={{
      width:36, height:36, borderRadius:"50%", flexShrink:0,
      background: `linear-gradient(135deg, ${C.accent}, #4f46e5)`,
      display:"flex", alignItems:"center", justifyContent:"center",
      boxShadow: `0 0 12px ${C.accentGlow}`,
    }}>
      <HeadphoneIcon size={18} color="#fff" />
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────────── */
export default function ChatWidget() {
  const [open,     setOpen]     = useState(false);
  const [input,    setInput]    = useState("");
  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const listRef  = useRef(null);
  const inputRef = useRef(null);

  /* Auto-scroll */
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open, loading]);

  /* Focus input when chat opens */
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const sendMessage = async (text = input) => {
    const msg = (text || input).trim();
    if (!msg) return;
    setMessages(m => [...m, { sender: "user", text: msg }]);
    setInput("");
    setLoading(true);

    try {
      const data = await apiFetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: msg }),
      });
      const reply =
        data.type === "text" ? data.message :
        data.type === "tool" ? (data.result?.content?.[0]?.text ?? JSON.stringify(data.result, null, 2)) :
        JSON.stringify(data);
      setMessages(m => [...m, { sender: "assistant", text: reply }]);
    } catch (err) {
      setMessages(m => [...m, { sender: "assistant", text: `⚠️ ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  /* ── render ── */
  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:12 }}>

      {/* ── Chat panel ────────────────────────────────────────────────────── */}
      <div style={{
        width:         370,
        maxWidth:      "calc(100vw - 48px)",
        height:        open ? 540 : 0,
        opacity:       open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        transition:    "height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease",
        display:       "flex",
        flexDirection: "column",
        borderRadius:  20,
        overflow:      "hidden",
        border:        `1px solid ${C.border}`,
        background:    C.bg,
        boxShadow:     `0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.1)`,
        animation:     open ? "apPop 0.3s cubic-bezier(0.34,1.56,0.64,1)" : "none",
      }}>

        {/* Header */}
        <div style={{
          background:  `linear-gradient(135deg, #1a1040 0%, #0f172a 100%)`,
          borderBottom:`1px solid ${C.border}`,
          padding:     "14px 18px",
          display:     "flex",
          alignItems:  "center",
          gap:         12,
          flexShrink:  0,
        }}>
          <div style={{
            width:40, height:40, borderRadius:"50%",
            background:`linear-gradient(135deg, ${C.accent}, #4f46e5)`,
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:`0 0 20px ${C.accentGlow}`,
            animation:"apPulse 2.5s infinite",
          }}>
            <HeadphoneIcon size={20} color="#fff" />
          </div>

          <div style={{ flex:1 }}>
            <div style={{ color:C.textPrimary, fontWeight:700, fontSize:15, letterSpacing:0.3 }}>
              AudioPro Assistant
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:C.green, display:"inline-block", boxShadow:`0 0 6px ${C.green}` }} />
              <span style={{ color:C.textMuted, fontSize:11 }}>Online · Always ready to help</span>
            </div>
          </div>

          <button
            onClick={() => setOpen(false)}
            style={{
              background:"transparent", border:"none", cursor:"pointer",
              color:C.textMuted, padding:4, borderRadius:8,
              display:"flex", alignItems:"center", justifyContent:"center",
              transition:"color 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.color = C.textPrimary}
            onMouseLeave={e => e.currentTarget.style.color = C.textMuted}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Message list */}
        <div ref={listRef} style={{
          flex:1, overflowY:"auto", padding:"16px 14px", display:"flex",
          flexDirection:"column", gap:10,
          scrollbarWidth:"thin", scrollbarColor:`${C.accent}30 transparent`,
        }}>

          {/* Welcome state */}
          {messages.length === 0 && (
            <div style={{ animation:"apFadeIn 0.4s ease" }}>
              <div style={{
                background:  C.surfaceAlt,
                border:      `1px solid ${C.border}`,
                borderRadius:16,
                padding:     "16px 18px",
                marginBottom:16,
              }}>
                <div style={{ fontSize:22, marginBottom:6 }}>🎧</div>
                <div style={{ color:C.textPrimary, fontWeight:600, fontSize:14, marginBottom:4 }}>
                  Hey there, audiophile!
                </div>
                <div style={{ color:"#9ca3af", fontSize:13, lineHeight:1.6 }}>
                  I'm your AudioPro shopping assistant. I can help you discover products, manage your cart, and track orders.
                </div>
              </div>

              {/* Quick actions */}
              <div style={{ color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:0.8, textTransform:"uppercase", marginBottom:8 }}>
                Quick Actions
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {QUICK_ACTIONS.map(qa => (
                  <button
                    key={qa.label}
                    onClick={() => sendMessage(qa.text)}
                    style={{
                      background:  C.surfaceAlt,
                      border:      `1px solid ${C.border}`,
                      borderRadius:10,
                      color:       C.accentText,
                      fontSize:    12,
                      fontWeight:  500,
                      padding:     "9px 12px",
                      cursor:      "pointer",
                      textAlign:   "left",
                      transition:  "background 0.2s, border-color 0.2s, transform 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#252952"; e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.transform="scale(1.02)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = C.surfaceAlt; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform="scale(1)"; }}
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                display:"flex",
                flexDirection: m.sender === "user" ? "row-reverse" : "row",
                alignItems:"flex-end",
                gap:8,
                animation:"apFadeIn 0.3s ease",
              }}
            >
              {m.sender === "assistant" && <BotAvatar />}

              <div style={{
                maxWidth:     "75%",
                padding:      "10px 14px",
                borderRadius: m.sender === "user"
                  ? "18px 18px 4px 18px"
                  : "18px 18px 18px 4px",
                background:   m.sender === "user" ? C.userBubble : C.botBubble,
                color:        m.sender === "user" ? "#fff" : C.textPrimary,
                fontSize:     13.5,
                lineHeight:   1.65,
                whiteSpace:   "pre-wrap",
                wordBreak:    "break-word",
                border:       m.sender === "user" ? "none" : `1px solid rgba(139,92,246,0.2)`,
                boxShadow:    m.sender === "user" ? `0 4px 15px rgba(109,40,217,0.4)` : "none",
              }}>
                {m.text}
              </div>

              {m.sender === "user" && (
                <div style={{
                  width:28, height:28, borderRadius:"50%", flexShrink:0,
                  background:"#1e2240",
                  border:`1px solid ${C.border}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:13,
                }}>
                  👤
                </div>
              )}
            </div>
          ))}

          {/* Loading waveform */}
          {loading && (
            <div style={{ display:"flex", alignItems:"flex-end", gap:8, animation:"apFadeIn 0.2s ease" }}>
              <BotAvatar />
              <div style={{
                background:   C.botBubble,
                borderRadius: "18px 18px 18px 4px",
                border:       `1px solid rgba(139,92,246,0.2)`,
              }}>
                <Waveform />
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div style={{
          borderTop:  `1px solid ${C.border}`,
          background: C.surface,
          padding:    "12px 14px",
          flexShrink: 0,
        }}>
          <div style={{
            display:      "flex",
            alignItems:   "flex-end",
            gap:          10,
            background:   C.surfaceAlt,
            border:       `1px solid ${C.border}`,
            borderRadius: 14,
            padding:      "8px 8px 8px 14px",
            transition:   "border-color 0.2s",
          }}
            onFocusCapture={e => e.currentTarget.style.borderColor = C.accent}
            onBlurCapture ={e => e.currentTarget.style.borderColor = C.border}
          >
            <textarea
              ref={inputRef}
              className="ap-textarea"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about headphones, speakers, orders…"
              rows={1}
              style={{
                flex:       1,
                resize:     "none",
                border:     "none",
                outline:    "none",
                background: "transparent",
                color:      C.textPrimary,
                fontSize:   13.5,
                lineHeight: 1.5,
                fontFamily: "inherit",
                maxHeight:  80,
                overflowY:  "hidden",
                paddingTop: 2,
              }}
              onInput={e => {
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 80) + "px";
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                width:      36,
                height:     36,
                borderRadius: 10,
                background:   loading || !input.trim()
                  ? "rgba(139,92,246,0.25)"
                  : `linear-gradient(135deg, ${C.accent}, #4f46e5)`,
                border:     "none",
                cursor:     loading || !input.trim() ? "not-allowed" : "pointer",
                display:    "flex",
                alignItems: "center",
                justifyContent:"center",
                color:      "#fff",
                flexShrink: 0,
                transition: "transform 0.15s, background 0.2s",
                boxShadow:  loading || !input.trim() ? "none" : `0 4px 12px ${C.accentGlow}`,
              }}
              onMouseEnter={e => { if (!loading && input.trim()) e.currentTarget.style.transform="scale(1.08)"; }}
              onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}
            >
              {loading
                ? <span style={{ width:14, height:14, border:`2px solid rgba(255,255,255,0.3)`, borderTopColor:"#fff", borderRadius:"50%", display:"inline-block", animation:"apSpin 0.7s linear infinite" }}/>
                : <SendIcon />
              }
            </button>
          </div>

          <div style={{ textAlign:"center", color:"#374151", fontSize:10.5, marginTop:8, letterSpacing:0.3 }}>
            AudioPro AI · Powered by GPT-4o mini
          </div>
        </div>
      </div>

      {/* ── FAB toggle button ──────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Toggle AudioPro chat assistant"
        style={{
          width:     56,
          height:    56,
          borderRadius: "50%",
          background:   open
            ? `linear-gradient(135deg, #4f46e5, ${C.accentDark})`
            : `linear-gradient(135deg, ${C.accent}, #4f46e5)`,
          border:     "none",
          cursor:     "pointer",
          display:    "flex",
          alignItems: "center",
          justifyContent:"center",
          boxShadow:  `0 8px 25px rgba(109,40,217,0.55), 0 0 0 1px rgba(139,92,246,0.3)`,
          animation:  open ? "none" : "apPulse 2.5s infinite",
          transition: "transform 0.2s, background 0.3s",
          color:      "#fff",
        }}
        onMouseEnter={e => e.currentTarget.style.transform="scale(1.1)"}
        onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}
      >
        {open
          ? <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          : <HeadphoneIcon size={22} color="#fff" />
        }
      </button>
    </div>
  );
}
