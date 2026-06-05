import { MessageSquare, Users, Bell, Share2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const features = [
  { icon: MessageSquare, text: 'Личные и групповые чаты между сотрудниками филиала' },
  { icon: Users,         text: 'Создание групп, добавление участников' },
  { icon: Bell,          text: 'Уведомления внутри CRM о новых сообщениях' },
  { icon: Share2,        text: 'Шер лида — ссылка на карточку клиента в чат' },
]

export default function ChatPage() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', minHeight: 400, paddingTop: 40 }}>
      <Card style={{ maxWidth: 480, width: '100%' }}>
        <CardContent style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 24 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MessageSquare size={32} strokeWidth={1.5} color="var(--accent)" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>Внутренний чат</span>
              <span style={{
                background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                color: 'var(--accent)',
                border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              }}>
                Скоро
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.7, maxWidth: 340 }}>
              Мессенджер CRM с личными и групповыми чатами, реакциями и уведомлениями.
            </p>
          </div>

          <div style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, textAlign: 'left' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
              Что будет доступно
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {features.map(({ icon: Icon, text }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: 'color-mix(in srgb, var(--accent) 8%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={12} strokeWidth={2} color="var(--accent)" />
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, paddingTop: 3 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
