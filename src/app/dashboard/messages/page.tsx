'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Paperclip,
  Send,
  MessageCircle,
  MessagesSquare,
  Mail,
  Smartphone,
  SendHorizonal,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePageView } from '@/hooks/useAnalytics';
import Badge from '@/components/dashboard/Badge';
import DashboardModal from '@/components/dashboard/DashboardModal';
import EmptyState from '@/components/dashboard/EmptyState';
import { Skeleton } from '@/components/dashboard/Skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  fetchMessageConversations,
  fetchMessages,
  sendMessage,
  MessageConversationRecord,
  MessageRecord,
} from '@/lib/dashboard/live-data';

const newMessageSchema = z.object({
  loanApplicationId: z.string().trim().min(1, 'Loan application is required'),
  to: z.string().trim().min(1, 'Recipient is required'),
  channel: z.enum(['WHATSAPP', 'SMS', 'EMAIL']),
  body: z.string().trim().min(1, 'Message body is required'),
});

type ChannelFilter = 'ALL' | 'WHATSAPP' | 'SMS' | 'EMAIL' | 'TELEGRAM';

function channelMeta(channel: string) {
  switch (channel) {
    case 'WHATSAPP':
      return { label: 'WhatsApp', icon: MessageCircle };
    case 'SMS':
      return { label: 'SMS', icon: Smartphone };
    case 'EMAIL':
      return { label: 'Email', icon: Mail };
    default:
      return { label: channel, icon: MessagesSquare };
  }
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function timeLabel(dateString: string): string {
  return new Date(dateString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function ChatBubble({
  message,
}: {
  message: MessageRecord;
}) {
  const inbound = message.status === 'INBOUND';

  return (
    <div className={`flex flex-col gap-1 ${inbound ? 'items-start' : 'items-end'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${
          inbound ? 'border border-zinc-800 bg-zinc-800/90 text-zinc-100' : 'bg-amber-900/30 text-amber-50'
        }`}
      >
        {message.content}
      </div>
      <div className="text-[11px] text-zinc-500">{timeLabel(message.createdAt)}</div>
    </div>
  );
}

export default function MessagesPage() {
  usePageView('/dashboard/messages');
  const [conversations, setConversations] = useState<MessageConversationRecord[]>([]);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<MessageConversationRecord | null>(null);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('ALL');
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const form = useForm<z.infer<typeof newMessageSchema>>({
    resolver: zodResolver(newMessageSchema),
    defaultValues: {
      loanApplicationId: '',
      to: '',
      channel: 'WHATSAPP',
      body: '',
    },
  });

  async function loadConversations() {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMessageConversations();
      setConversations(result ?? []);
      setSelectedConversation((current) => current ?? result?.[0] ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  async function loadThread(conversation: MessageConversationRecord | null) {
    if (!conversation) {
      setMessages([]);
      return;
    }

    setThreadLoading(true);
    setThreadError(null);
    try {
      const result = await fetchMessages({
        loanApplicationId: conversation.loanApplicationId,
        channel: conversation.channel,
      });
      const ordered = (result?.data ?? []).slice().reverse();
      setMessages(ordered);
    } catch (threadError) {
      setThreadError(threadError instanceof Error ? threadError.message : 'Failed to load messages');
    } finally {
      setThreadLoading(false);
    }
  }

  useEffect(() => {
    void loadConversations();
  }, []);

  useEffect(() => {
    void loadThread(selectedConversation);
  }, [selectedConversation?.loanApplicationId, selectedConversation?.channel]);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, threadLoading]);

  const channelCounts = useMemo(() => {
    const base = { WHATSAPP: 0, SMS: 0, EMAIL: 0, TELEGRAM: 0 };
    for (const conversation of conversations) {
      if (conversation.channel in base) {
        base[conversation.channel as keyof typeof base] += conversation.unreadCount;
      }
    }
    return base;
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    if (channelFilter === 'ALL') return conversations;
    return conversations.filter((conversation) => conversation.channel === channelFilter);
  }, [conversations, channelFilter]);

  const loanOptions = useMemo(
    () =>
      Array.from(
        new Map(
          conversations.map((conversation) => [
            conversation.loanApplicationId,
            conversation,
          ])
        ).values()
      ),
    [conversations]
  );

  async function submitMessage(values: z.infer<typeof newMessageSchema>) {
    setSending(true);
    try {
      await sendMessage({
        loanApplicationId: values.loanApplicationId,
        channel: values.channel,
        to: values.to,
        body: values.body,
      });
      setNewMessageOpen(false);
      form.reset();
      void loadConversations();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  async function sendThreadMessage() {
    if (!selectedConversation) return;
    const body = composerRef.current?.value.trim() ?? '';
    if (!body) return;

    setSending(true);
    try {
      await sendMessage({
        channel: selectedConversation.channel as 'WHATSAPP' | 'SMS' | 'EMAIL',
        to: selectedConversation.applicantPhone,
        body,
        loanApplicationId: selectedConversation.loanApplicationId,
      });
      if (composerRef.current) composerRef.current.value = '';
      await loadThread(selectedConversation);
      await loadConversations();
    } catch (sendError) {
        setThreadError(sendError instanceof Error ? sendError.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 xl:grid-cols-[240px_1fr_1.15fr]">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
          <Skeleton width={120} height={14} />
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} width="100%" height={44} />
          ))}
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
          <Skeleton width={160} height={14} />
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} width="100%" height={58} />
          ))}
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
          <Skeleton width={200} height={14} />
          <Skeleton width="100%" height={360} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="size-10 text-amber-500" />
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Failed to load</h2>
          <p className="mt-2 text-sm text-zinc-400">{error}</p>
        </div>
        <Button onClick={() => void loadConversations()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[240px_1fr_1.15fr]">
      <aside className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
        <Button className="mb-4 w-full" onClick={() => setNewMessageOpen(true)}>
          <SendHorizonal className="size-4" /> New Message
        </Button>
        <div className="space-y-2">
          {(['ALL', 'WHATSAPP', 'SMS', 'EMAIL', 'TELEGRAM'] as ChannelFilter[]).map((channel) => {
            const meta = channel === 'ALL' ? { label: 'All Channels', icon: MessagesSquare } : channelMeta(channel);
            const count = channel === 'ALL' ? conversations.length : channelCounts[channel as keyof typeof channelCounts];
            const Icon = meta.icon;
            return (
              <button
                key={channel}
                onClick={() => setChannelFilter(channel)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                  channelFilter === channel
                    ? 'border-amber-500/70 bg-amber-500/10 text-amber-100'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700'
                }`}
              >
                <span className="flex items-center gap-2 text-sm">
                  <Icon className="size-4" />
                  {meta.label}
                </span>
                <Badge variant="outline">{count}</Badge>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Conversations</h2>
            <p className="text-xs text-zinc-500">Active thread highlighted with an amber border</p>
          </div>
        </div>
        <div className="space-y-2">
          {filteredConversations.length === 0 ? (
            <EmptyState title="No messages" description="Messages will appear here once customers respond." />
          ) : (
            filteredConversations.map((conversation) => {
              const active = selectedConversation?.loanApplicationId === conversation.loanApplicationId &&
                selectedConversation.channel === conversation.channel;
              return (
                <button
                  key={`${conversation.loanApplicationId}:${conversation.channel}`}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                    active
                      ? 'border-amber-500/70 bg-amber-500/5'
                      : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                  }`}
                >
                  <div className="avatar">{initials(conversation.applicantName)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-semibold text-zinc-100">
                        {conversation.applicantName}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {new Date(conversation.updatedAt).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div className="mt-1 truncate text-xs text-zinc-500">{conversation.lastMessage.content}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline">{conversation.channel}</Badge>
                    {conversation.unreadCount > 0 ? <Badge variant="red">{conversation.unreadCount}</Badge> : null}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
        {!selectedConversation ? (
          <EmptyState title="Select a conversation" description="Choose a thread to view and reply." />
        ) : (
          <div className="flex h-full min-h-[540px] flex-col">
            <div className="mb-4 flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="avatar">{initials(selectedConversation.applicantName)}</div>
                <div>
                  <div className="text-sm font-semibold text-zinc-100">{selectedConversation.applicantName}</div>
                  <div className="text-xs text-zinc-500">{selectedConversation.applicantPhone}</div>
                </div>
              </div>
              <Badge variant="outline">{selectedConversation.channel}</Badge>
            </div>

            <div
              ref={threadRef}
              className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
            >
              {threadLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} width="75%" height={44} />
                  ))}
                </div>
              ) : threadError ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <div className="text-sm font-semibold text-zinc-100">Failed to load</div>
                  <div className="text-xs text-zinc-500">{threadError}</div>
                  <Button onClick={() => void loadThread(selectedConversation)}>Retry</Button>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-sm text-zinc-500">No messages</div>
                </div>
              ) : (
                messages.map((message) => <ChatBubble key={message.id} message={message} />)
              )}
            </div>

            <div className="mt-4 space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="flex items-start gap-3">
                <Button variant="outline" size="sm" type="button">
                  <Paperclip className="size-4" />
                </Button>
                <select
                  className="h-10 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100"
                  defaultValue={selectedConversation.channel}
                >
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="SMS">SMS</option>
                  <option value="EMAIL">Email</option>
                </select>
                <Textarea
                  ref={composerRef}
                  placeholder="Write a reply..."
                  className="min-h-24 flex-1 resize-none"
                />
              </div>
              <div className="flex items-center justify-end">
                <Button onClick={() => void sendThreadMessage()} disabled={sending}>
                  <Send className="size-4" /> Send
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      <DashboardModal open={newMessageOpen} onClose={() => setNewMessageOpen(false)} title="New Message">
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => {
            void submitMessage(values);
          })}
        >
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.08em] text-zinc-500">
              Loan application
            </label>
            <select
              className="h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100"
              {...form.register('loanApplicationId')}
            >
              <option value="">Select an application</option>
              {loanOptions.map((conversation) => (
                <option key={conversation.loanApplicationId} value={conversation.loanApplicationId}>
                  {conversation.applicantName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.08em] text-zinc-500">To</label>
            <Input {...form.register('to')} placeholder="+234..." />
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.08em] text-zinc-500">Channel</label>
            <select
              className="h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100"
              {...form.register('channel')}
            >
              <option value="WHATSAPP">WhatsApp</option>
              <option value="SMS">SMS</option>
              <option value="EMAIL">Email</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.08em] text-zinc-500">Body</label>
            <Textarea rows={5} {...form.register('body')} />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setNewMessageOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={sending}>
              Send
            </Button>
          </div>
        </form>
      </DashboardModal>
    </div>
  );
}
