import { useEffect, useRef } from 'react'

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded px-3 py-2 text-xs leading-relaxed chat-msg
          ${isUser
            ? 'bg-col-blue/20 border border-col-blue/40 text-text-hi'
            : 'bg-raised border border-border text-text-hi'
          }`}
      >
        {!isUser && (
          <div className="text-col-green font-bold text-xs mb-1 tracking-wider">AI COMMANDER</div>
        )}
        <div className="whitespace-pre-wrap">{msg.content}</div>
      </div>
    </div>
  )
}

export default function ChatPanel({ messages, input, loading, onInputChange, onSend, onClear }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-col-green" />
          <span className="text-xs font-bold tracking-wider uppercase text-text-hi">AI Assistant</span>
        </div>
        <button
          onClick={onClear}
          className="text-xs text-text-dim hover:text-text-lo transition-colors px-2 py-0.5 rounded hover:bg-raised"
        >
          Clear
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2 text-xs text-text-dim">
            <p className="font-semibold text-text-lo">Base Commander AI — Ask anything:</p>
            <ul className="space-y-1 list-none">
              {[
                '"Which aircraft for the next DCA sortie?"',
                '"What\'s our readiness for 48h?"',
                '"GE05 failed BIT — radar fault. Impact?"',
                '"Should I cannibalize GE03 for the radar?"',
              ].map((q, i) => (
                <li
                  key={i}
                  className="cursor-pointer hover:text-text-hi transition-colors px-2 py-1 rounded hover:bg-raised border border-transparent hover:border-border"
                  onClick={() => onInputChange(q.replace(/"/g, ''))}
                >
                  {q}
                </li>
              ))}
            </ul>
          </div>
        )}
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-raised border border-border rounded px-3 py-2">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 bg-text-dim rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border p-2">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask the AI commander..."
            rows={2}
            className="flex-1 bg-raised border border-border rounded px-2 py-1.5 text-xs text-text-hi
              placeholder-text-dim resize-none focus:outline-none focus:border-col-blue transition-colors"
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || loading}
            className="px-3 py-1 bg-col-blue text-white text-xs font-bold rounded
              hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors self-end"
          >
            Send
          </button>
        </div>
        <div className="text-xs text-text-dim mt-1 px-0.5">Enter to send · Shift+Enter for newline</div>
      </div>
    </div>
  )
}
