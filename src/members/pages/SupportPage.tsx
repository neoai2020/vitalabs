import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { SUPPORT_ARTICLES } from '../data/memberData'

interface ChatMessage {
  id: string
  sender: 'user' | 'expert'
  text: string
  time: string
}

const EXPERT_RESPONSES: Record<string, string> = {
  dose: "For dosing questions, check your personalised dosing guide in the Protocol tab. If you need adjustments, our medical team can review your case — just describe what you're experiencing.",
  side: "Mild side effects like injection site redness and slight nausea are common in the first week. If symptoms persist beyond 3–5 days or become severe, we recommend pausing and booking a call with our medical team.",
  store: "Store reconstituted vials at 2–8°C (standard fridge). Keep away from light. Do not freeze. Use within 28 days of reconstitution. Unreconstituted vials can be kept at room temperature briefly.",
  result: "Most users notice initial changes at 2–4 weeks. Full protocol results typically come at 8–12 weeks. If you're past week 4 with no changes, let's review your protocol and nutrition together.",
  default: "Thanks for reaching out. I'll look into this and get back to you shortly. In the meantime, check the Knowledge Base below — your answer might be there. For urgent concerns, use the emergency contact button.",
}

function getExpertReply(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('dose') || lower.includes('dosing') || lower.includes('inject')) return EXPERT_RESPONSES.dose
  if (lower.includes('side effect') || lower.includes('nausea') || lower.includes('red') || lower.includes('pain')) return EXPERT_RESPONSES.side
  if (lower.includes('store') || lower.includes('fridge') || lower.includes('temperature')) return EXPERT_RESPONSES.store
  if (lower.includes('result') || lower.includes('working') || lower.includes('change') || lower.includes('progress')) return EXPERT_RESPONSES.result
  return EXPERT_RESPONSES.default
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="m-faq-item">
      <button type="button" className="m-faq-q" onClick={() => setOpen(!open)}>
        <span>{q}</span>
        <span className="m-faq-arrow">{open ? '−' : '+'}</span>
      </button>
      {open && <p className="m-faq-a">{a}</p>}
    </div>
  )
}

export default function SupportPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'chat' | 'knowledge' | 'contact'>('chat')
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'expert', text: `Hey ${user?.firstName}! I'm your dedicated Peptiva support specialist. How can I help you today? You can ask me about your protocol, dosing, side effects, or anything else.`, time: 'Just now' },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [filterCategory, setFilterCategory] = useState<string>('All')

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = () => {
    if (!input.trim()) return
    const userMsg: ChatMessage = {
      id: 'm' + Date.now(),
      sender: 'user',
      text: input.trim(),
      time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages(prev => [...prev, userMsg])
    const reply = getExpertReply(input)
    setInput('')
    setTyping(true)

    setTimeout(() => {
      setTyping(false)
      setMessages(prev => [...prev, {
        id: 'r' + Date.now(),
        sender: 'expert',
        text: reply,
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      }])
    }, 1200 + Math.random() * 800)
  }

  const categories = ['All', ...new Set(SUPPORT_ARTICLES.map(a => a.category))]
  const filteredArticles = filterCategory === 'All' ? SUPPORT_ARTICLES : SUPPORT_ARTICLES.filter(a => a.category === filterCategory)

  return (
    <div className="m-support">
      <div className="m-page-header">
        <h2>Support</h2>
        <p>Get help from our team and access our knowledge base</p>
      </div>

      {/* TABS */}
      <div className="m-plan-tabs">
        <button type="button" className={`m-plan-tab ${activeTab === 'chat' ? 'm-plan-tab--active' : ''}`} onClick={() => setActiveTab('chat')}>💬 Expert Chat</button>
        <button type="button" className={`m-plan-tab ${activeTab === 'knowledge' ? 'm-plan-tab--active' : ''}`} onClick={() => setActiveTab('knowledge')}>📚 Knowledge Base</button>
        <button type="button" className={`m-plan-tab ${activeTab === 'contact' ? 'm-plan-tab--active' : ''}`} onClick={() => setActiveTab('contact')}>📞 Contact</button>
      </div>

      {activeTab === 'chat' && (
        <section className="m-chat">
          <div className="m-chat-header">
            <div className="m-chat-expert">
              <div className="m-chat-avatar">
                <span>DR</span>
                <span className="m-chat-online" />
              </div>
              <div>
                <span className="m-chat-expert-name">Dr. Rachel — Protocol Specialist</span>
                <span className="m-chat-expert-status">Online · Typically replies in &lt;2 hours</span>
              </div>
            </div>
          </div>

          <div className="m-chat-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`m-chat-msg ${msg.sender === 'user' ? 'm-chat-msg--user' : 'm-chat-msg--expert'}`}>
                <div className="m-chat-bubble">
                  <p>{msg.text}</p>
                  <span className="m-chat-time">{msg.time}</span>
                </div>
              </div>
            ))}
            {typing && (
              <div className="m-chat-msg m-chat-msg--expert">
                <div className="m-chat-bubble m-chat-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="m-chat-input-wrap">
            <input
              className="m-chat-input"
              placeholder="Ask about your protocol, dosing, side effects..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button type="button" className="m-chat-send" onClick={sendMessage} disabled={!input.trim()}>
              Send →
            </button>
          </div>

          <div className="m-chat-suggestions">
            <span className="m-chat-sug-label">Quick questions:</span>
            <div className="m-chat-sug-pills">
              {['What are common side effects?', 'How should I store my vials?', 'When will I see results?', 'Can I adjust my dose?'].map(q => (
                <button key={q} type="button" className="m-chat-sug-pill" onClick={() => { setInput(q); }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'knowledge' && (
        <section className="m-knowledge">
          <div className="m-knowledge-filter">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                className={`m-plan-tab ${filterCategory === cat ? 'm-plan-tab--active' : ''}`}
                onClick={() => setFilterCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="m-knowledge-list">
            {filteredArticles.map(article => (
              <FaqItem key={article.id} q={article.title} a={article.body} />
            ))}
          </div>
        </section>
      )}

      {activeTab === 'contact' && (
        <section className="m-contact">
          <div className="m-contact-grid">
            <div className="m-contact-card">
              <span className="m-contact-icon">💬</span>
              <h4>Live Chat</h4>
              <p>Chat with a protocol specialist in real-time. Available Mon–Fri, 9AM–6PM GMT.</p>
              <button type="button" className="m-btn-outline" onClick={() => setActiveTab('chat')}>Open Chat →</button>
            </div>
            <div className="m-contact-card">
              <span className="m-contact-icon">📧</span>
              <h4>Email Support</h4>
              <p>Send a detailed question. We respond within 24 hours, usually much faster.</p>
              <a href="mailto:support@peptivalabs.io" className="m-btn-outline">support@peptivalabs.io</a>
            </div>
            <div className="m-contact-card">
              <span className="m-contact-icon">📞</span>
              <h4>Phone Consultation</h4>
              <p>Book a 15-minute call with our medical team for protocol-specific questions.</p>
              <button type="button" className="m-btn-outline">Book a Call →</button>
            </div>
            <div className="m-contact-card m-contact-card--urgent">
              <span className="m-contact-icon">🚨</span>
              <h4>Urgent Medical</h4>
              <p>Experiencing a severe reaction? Contact emergency services immediately, then notify us.</p>
              <a href="tel:999" className="m-btn-outline m-btn-outline--danger">Call 999</a>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
