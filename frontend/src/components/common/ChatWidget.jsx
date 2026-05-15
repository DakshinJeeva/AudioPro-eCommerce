import React, { useState, useRef, useEffect } from "react";
import { apiFetch } from "../../utils/api";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;

    const userMsg = { sender: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const data = await apiFetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: text }),
      });

      if (data.type === "text") {
        setMessages((m) => [...m, { sender: "assistant", text: data.message }]);
      } else if (data.type === "tool") {
        const resultText = data.result?.content?.[0]?.text ?? JSON.stringify(data.result, null, 2);
        setMessages((m) => [...m, { sender: "assistant", text: resultText }]);
      } else {
        setMessages((m) => [...m, { sender: "assistant", text: JSON.stringify(data) }]);
      }
    } catch (err) {
      setMessages((m) => [...m, { sender: "assistant", text: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat window */}
      <div className={`w-80 max-w-full bg-white shadow-lg rounded-lg overflow-hidden flex flex-col ${open ? "h-96" : "h-0 pointer-events-none opacity-0"} transition-all duration-200`}>
        <div className="bg-indigo-600 text-white px-4 py-2 flex items-center justify-between">
          <div className="font-medium">AudioPro Assistant</div>
          <button onClick={() => setOpen(false)} className="text-white opacity-90 hover:opacity-100">✕</button>
        </div>

        <div ref={listRef} className="flex-1 p-3 overflow-auto bg-gray-50">
          {messages.length === 0 && (
            <div className="text-xs text-gray-500">Ask me about products, orders or help with checkout.</div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`mb-2 flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`${m.sender === "user" ? "bg-indigo-600 text-white" : "bg-white text-gray-800 border"} max-w-[80%] p-2 rounded-md text-sm whitespace-pre-wrap`}> 
                {m.text}
              </div>
            </div>
          ))}

          {loading && <div className="text-sm text-gray-500">Thinking...</div>}
        </div>

        <div className="px-3 py-2 border-t bg-white">
          <div className="flex items-center gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Send a message..."
              className="flex-1 resize-none h-10 p-2 text-sm border rounded-md focus:outline-none"
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className="bg-indigo-600 text-white px-3 py-2 rounded-md text-sm hover:opacity-90 disabled:opacity-60"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Floating icon */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open chat"
        className="mt-2 w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8-1.045 0-2.042-.156-2.951-.444L3 21l1.444-5.051C3.608 14.98 3 13.55 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>
    </div>
  );
}
