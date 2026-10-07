import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, RefreshCw, Send, Trash2 } from 'lucide-react';

const suggestions = ['Is Dhaka getting warmer?', 'Compare the full record with 2001–2024.', 'What does statistical significance mean here?'];
const toolLabels = { get_temperature_trend: 'Temperature trend', compare_periods: 'Period comparison', get_data_source: 'NASA source and methodology' };

export default function LiveChat({ period }) {
  const [status, setStatus] = useState('checking');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [check, setCheck] = useState(0);
  const request = useRef(null);

  useEffect(() => {
    const abort = new AbortController();
    const timeout = setTimeout(() => { setStatus('offline'); abort.abort(); }, 5000);
    setStatus('checking');
    fetch('/api/agent/status', { signal: abort.signal }).then(async response => {
      if (!response.ok) throw new Error('Server unavailable');
      return response.json();
    }).then(result => { clearTimeout(timeout); setStatus(result.configured ? 'configured' : 'unconfigured'); })
      .catch(() => { if (!abort.signal.aborted) setStatus('offline'); });
    return () => { clearTimeout(timeout); abort.abort(); };
  }, [check]);
  useEffect(() => () => request.current?.abort(), []);

  async function send(event) {
    event.preventDefault();
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true); setError('');
    const abort = new AbortController();
    request.current = abort;
    const history = messages.slice(-8).map(({ role, content }) => ({ role, content: content.slice(0, 4000) }));
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, period, history }), signal: abort.signal });
      let result;
      try { result = await response.json(); } catch { throw new Error('The AI server is unavailable. Guided explanations above still work.'); }
      if (!response.ok) throw new Error(result.error || 'Unable to get an AI answer.');
      setMessages(previous => [...previous, { role: 'user', content: text },
        { role: 'assistant', content: result.answer, tools: result.toolsUsed, source: result.source, period: result.period }].slice(-20));
      setQuestion('');
    } catch (failure) {
      if (!abort.signal.aborted) setError(failure.message);
    } finally { if (!abort.signal.aborted) setBusy(false); }
  }

  const statusText = { checking: 'Checking connection…', configured: 'Live AI configured', unconfigured: 'API key needed', offline: 'AI server offline' }[status];
  return <section className="panel live-chat" aria-label="Live TerraAgent chat">
    <div className="live-chat-heading"><div><h2><MessageSquare size={20}/>Ask TerraAgent</h2><p>Explore the NASA evidence in your own words.</p></div><span className={`agent-status ${status}`}>{statusText}</span></div>
    <div className="chat-context"><span>Dhaka · 2-meter air temperature · {period.replace('-', '–')}</span><button className="text-button" onClick={() => setCheck(value => value + 1)} disabled={busy}><RefreshCw size={13}/>Check connection</button></div>
    {status === 'unconfigured' && <p className="agent-notice">Live answers need an API key configured locally. You can still use the guided explanations above.</p>}
    {status === 'offline' && <p className="agent-notice">The AI service is not connected. Guided explanations above remain available.</p>}
    <div className="chat-messages" role="log" aria-label="Conversation" aria-live="polite" aria-busy={busy}>
      {!messages.length && <p className="chat-empty">Ask about a trend, compare periods, or explore uncertainty. Live answers use the saved NASA record for 1981–2024.</p>}
      {messages.map((item, index) => <article className={`chat-message ${item.role}`} key={index}>
        <span className="chat-speaker">{item.role === 'user' ? 'You' : `TerraAgent · Live AI · ${item.period.replace('-', '–')}`}</span><p>{item.content}</p>
        {item.tools?.length > 0 && <div className="tool-evidence"><span>Evidence tools used:</span>{[...new Set(item.tools.map(tool => tool.name))].map(name => <span className="tool-badge" key={name}>{toolLabels[name] || name}</span>)}</div>}
        {item.source && <a href={item.source.url} target="_blank" rel="noreferrer">{item.source.name}</a>}
      </article>)}
      {busy && <p className="chat-thinking">Checking the evidence and preparing an answer…</p>}
    </div>
    <div className="chat-suggestions">{suggestions.map(text => <button key={text} disabled={busy} onClick={() => setQuestion(text)}>{text}</button>)}</div>
    <form className="chat-form" onSubmit={send}><label htmlFor="terra-question">Your question</label><div className="chat-input-row"><textarea id="terra-question" value={question} onChange={event => setQuestion(event.target.value)} placeholder="Ask about Dhaka’s temperature trends…" maxLength={2000} rows={2} disabled={busy}/><button className="button" type="submit" disabled={busy || !question.trim()}><Send size={16}/>{busy ? 'Working…' : 'Ask'}</button></div></form>
    {error && <p className="chat-error" role="alert">{error}</p>}
    <div className="chat-bottom"><p>When live AI is configured, your question, recent chat, and NASA evidence are sent to OpenAI. AI answers can contain mistakes; verify them against the chart and methodology.</p>{messages.length > 0 && <button className="text-button" disabled={busy} onClick={() => {setMessages([]); setError('');}}><Trash2 size={13}/>Clear chat</button>}</div>
  </section>;
}
