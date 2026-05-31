import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Textarea } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { useAdminBrand } from '../../context/AdminBrandContext'
import { supabase } from '../../../lib/supabase'

interface MessageRow {
  id: string
  thread_id: string
  user_id: string | null
  sender: 'user' | 'agent' | 'system'
  body: string
  created_at: string
}

interface Thread {
  threadId: string
  userId: string | null
  lastMessage: MessageRow
  count: number
}

export default function SupportInboxPage() {
  const { brand } = useAdminBrand()
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const { data, error: dbErr } = await supabase
      .from('support_messages')
      .select('*')
      .eq('brand', brand)
      .order('created_at', { ascending: false })
      .limit(500)
    if (dbErr) setError(dbErr.message)
    setMessages((data ?? []) as MessageRow[])
    setLoading(false)
  }

  useEffect(() => { void load() }, [brand])

  const threads = useMemo<Thread[]>(() => {
    const map = new Map<string, Thread>()
    for (const m of messages) {
      const existing = map.get(m.thread_id)
      if (!existing) {
        map.set(m.thread_id, { threadId: m.thread_id, userId: m.user_id, lastMessage: m, count: 1 })
      } else {
        existing.count += 1
        if (new Date(m.created_at) > new Date(existing.lastMessage.created_at)) {
          existing.lastMessage = m
        }
      }
    }
    return [...map.values()].sort((a, b) =>
      new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
    )
  }, [messages])

  const activeMessages = useMemo(() =>
    [...messages.filter(m => m.thread_id === active)].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ),
  [messages, active])

  const sendReply = async () => {
    if (!active || !reply.trim()) return
    setSending(true)
    setError(null)
    const thread = threads.find(t => t.threadId === active)
    const { error: dbErr } = await supabase.from('support_messages').insert({
      brand,
      thread_id: active,
      user_id: thread?.userId ?? null,
      sender: 'agent',
      body: reply.trim(),
    })
    setSending(false)
    if (dbErr) { setError(dbErr.message); return }
    setReply('')
    await load()
  }

  return (
    <>
      <PageHeader title="Support inbox" description="Customer support threads. Replies sent here appear in the member's chat in real time." />
      {error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--color-admin-danger)]">{error}</div> : null}
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit">
          <CardHeader title={loading ? 'Loading…' : `${threads.length} threads`} />
          <CardBody className="p-0">
            <ul className="divide-y divide-[var(--color-admin-border)]">
              {threads.map(t => (
                <li key={t.threadId}>
                  <button
                    onClick={() => setActive(t.threadId)}
                    className={`w-full px-4 py-3 text-left text-sm hover:bg-slate-50 ${active === t.threadId ? 'bg-slate-100' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-[var(--color-admin-muted)]">{t.threadId.slice(0, 8)}…</span>
                      <span className="text-xs text-[var(--color-admin-muted)]">{new Date(t.lastMessage.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="mt-1 truncate text-[var(--color-admin-text)]">
                      <strong className="mr-1 text-xs uppercase text-[var(--color-admin-muted)]">{t.lastMessage.sender}:</strong>
                      {t.lastMessage.body}
                    </div>
                  </button>
                </li>
              ))}
              {threads.length === 0 && !loading ? (
                <li className="px-4 py-6 text-sm text-[var(--color-admin-muted)]">No support threads yet.</li>
              ) : null}
            </ul>
          </CardBody>
        </Card>

        <Card>
          {active ? (
            <>
              <CardHeader title={`Thread ${active.slice(0, 8)}…`} description="Customer messages on the left of the timeline; agent / system on the right." />
              <CardBody className="space-y-3">
                {activeMessages.map(m => (
                  <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-md rounded-lg px-3 py-2 text-sm ${
                      m.sender === 'user'
                        ? 'bg-slate-100'
                        : m.sender === 'agent'
                        ? 'bg-[var(--color-admin-primary)] text-white'
                        : 'bg-amber-50 text-amber-900'
                    }`}>
                      <div className="text-xs opacity-70">{m.sender} · {new Date(m.created_at).toLocaleString()}</div>
                      <div className="mt-1 whitespace-pre-wrap">{m.body}</div>
                    </div>
                  </div>
                ))}
                <div className="border-t border-[var(--color-admin-border)] pt-4">
                  <Textarea
                    rows={3}
                    placeholder="Reply as agent…"
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                  />
                  <div className="mt-2 flex justify-end">
                    <Button onClick={sendReply} disabled={sending || !reply.trim()}>{sending ? 'Sending…' : 'Send reply'}</Button>
                  </div>
                </div>
              </CardBody>
            </>
          ) : (
            <CardBody className="text-sm text-[var(--color-admin-muted)]">Pick a thread on the left to view and reply.</CardBody>
          )}
        </Card>
      </div>

    </>
  )
}
