import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Calendar, ChevronRight, CheckCircle, Loader, Phone } from 'lucide-react'
import { publicBookingApi, clientPortalApi } from '../../api/clientPortal.api'

type Step = 'info' | 'phone' | 'date' | 'slot' | 'confirm' | 'success' | 'error'

const DEVICE_LABELS: Record<string, string> = {
  vacuactiv: 'VacuActiv', rollshape: 'RollShape', infrastep: 'InfraStep', infrashape: 'InfraShape',
}

function toISO(d: Date) { return d.toISOString().slice(0, 10) }

const s = {
  wrap:  { minHeight: '100dvh', background: '#0a0a0a', color: '#f0f0f0', fontFamily: 'system-ui, sans-serif', maxWidth: 430, margin: '0 auto', padding: '24px 16px', boxSizing: 'border-box' as const },
  card:  { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 16 },
  btn:   (active = true): React.CSSProperties => ({ height: 48, padding: '0 20px', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: active ? 'pointer' : 'not-allowed', fontFamily: 'inherit', background: active ? 'var(--accent)' : 'rgba(255,255,255,0.08)', border: 'none', color: active ? '#fff' : '#666', width: '100%', opacity: active ? 1 : 0.5 }),
  input: { height: 48, padding: '0 14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#f0f0f0', fontSize: 15, outline: 'none', width: '100%', boxSizing: 'border-box' as const, fontFamily: 'inherit' },
  label: { fontSize: 12, color: '#888', marginBottom: 6, display: 'block' },
  muted: { color: '#888', fontSize: 13 },
}

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>()
  const [step,      setStep]      = useState<Step>('info')
  const [pageData,  setPageData]  = useState<Record<string, unknown> | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [phone,     setPhone]     = useState('')
  const [token,     setToken]     = useState(localStorage.getItem('client_portal_token'))
  const [selDate,   setSelDate]   = useState(toISO(new Date()))
  const [slots,     setSlots]     = useState<Record<string, unknown>[]>([])
  const [slotsLoad, setSlotsLoad] = useState(false)
  const [selSlot,   setSelSlot]   = useState<Record<string, unknown> | null>(null)
  const [subs,      setSubs]      = useState<Record<string, unknown>[]>([])
  const [selSub,    setSelSub]    = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    publicBookingApi.getPage(slug)
      .then(d => { setPageData(d); setLoading(false) })
      .catch(() => { setStep('error'); setLoading(false) })
  }, [slug])

  useEffect(() => {
    if (token && pageData) {
      clientPortalApi.getSubscriptions(token)
        .then(d => { setSubs(d.filter((s: Record<string, unknown>) => s.status === 'active')); setStep('date') })
        .catch(() => { setToken(null); localStorage.removeItem('client_portal_token') })
    }
  }, [token, pageData])

  const loadSlots = async (d: string) => {
    if (!slug) return
    setSlotsLoad(true); setSlots([])
    try {
      const data = await publicBookingApi.getSlots(slug, d)
      setSlots(data)
    } finally {
      setSlotsLoad(false)
    }
  }

  const handlePhone = async () => {
    if (!phone.trim() || !pageData) return
    setLoading(true); setError(null)
    try {
      const res = await clientPortalApi.auth(phone.trim(), pageData.branch_id as string)
      localStorage.setItem('client_portal_token', res.token)
      setToken(res.token)
      const subsData = await clientPortalApi.getSubscriptions(res.token)
      setSubs(subsData.filter((s: Record<string, unknown>) => s.status === 'active'))
      setStep('date')
    } catch {
      setError('Клиент не найден. Обратитесь к менеджеру.')
    } finally {
      setLoading(false)
    }
  }

  const handleDateNext = () => {
    setStep('slot')
    void loadSlots(selDate)
  }

  const handleBook = async () => {
    if (!selSlot || !selSub || !token || !slug) return
    setSubmitting(true); setError(null)
    try {
      await publicBookingApi.book(slug, token, {
        subscription_id: selSub,
        slot_1_schedule_slot_id: selSlot.id as string,
        date: selDate,
      })
      setStep('success')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Ошибка записи'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const branch = pageData?.branch as Record<string, unknown> | null

  if (loading) {
    return <div style={{ ...s.wrap, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}><Loader size={32} color="var(--accent)" /></div>
  }

  if (step === 'error' || !pageData) {
    return (
      <div style={{ ...s.wrap, textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>😕</div>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Страница не найдена</div>
        <div style={{ color: '#888' }}>Ссылка недействительна или устарела</div>
      </div>
    )
  }

  return (
    <div style={s.wrap}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ width: 56, height: 56, borderRadius: 18, background: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: '2px solid color-mix(in srgb, var(--accent) 30%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 24 }}>💎</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{branch?.name as string ?? 'Slimway'}</div>
        {!!branch?.city && <div style={{ color: '#888', fontSize: 13 }}>{branch.city as string}</div>}
        <div style={{ fontSize: 13, color: 'var(--accent)', marginTop: 4 }}>Онлайн-запись</div>
      </div>

      {/* Phone step */}
      {step === 'info' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ ...s.card }}>
            <div style={{ fontSize: 14, color: '#ccc', lineHeight: 1.6 }}>
              Введите ваш номер телефона, чтобы найти ваш профиль и выбрать удобное время для записи.
            </div>
          </div>
          <div>
            <label style={s.label}>Номер телефона</label>
            <input style={s.input} type="tel" placeholder="+7 777 000 00 00" value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void handlePhone() }} />
          </div>
          {error && <div style={{ fontSize: 13, color: '#f87171', padding: '8px 12px', background: 'var(--color-danger-muted)', borderRadius: 8 }}>{error}</div>}
          <button onClick={() => void handlePhone()} style={s.btn(!!phone.trim())}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Phone size={16} />Продолжить</span>
          </button>
        </div>
      )}

      {/* Date step */}
      {step === 'date' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Выберите дату</div>
          {subs.length === 0 && (
            <div style={{ ...s.card, color: '#f87171', fontSize: 13 }}>У вас нет активного абонемента. Обратитесь к менеджеру.</div>
          )}
          {subs.length > 0 && (
            <>
              <div>
                <label style={s.label}>Абонемент</label>
                <select value={selSub} onChange={e => setSelSub(e.target.value)} style={{ ...s.input, appearance: 'none' }}>
                  <option value="">Выбрать...</option>
                  {subs.map(sub => <option key={sub.id as string} value={sub.id as string}>{sub.name as string} ({sub.slot_1_sessions_left as number} сессий)</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Дата</label>
                <input type="date" style={s.input} value={selDate} min={toISO(new Date())} onChange={e => setSelDate(e.target.value)} />
              </div>
              <button onClick={handleDateNext} style={s.btn(!!selSub)}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>Выбрать время <ChevronRight size={16} /></span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Slot step */}
      {step === 'slot' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <button onClick={() => setStep('date')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, cursor: 'pointer', padding: 0, textAlign: 'left' }}>← Назад</button>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            <Calendar size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            {new Date(selDate + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })}
          </div>
          {slotsLoad ? (
            <div style={{ textAlign: 'center', padding: 32 }}><Loader size={24} color="var(--accent)" /></div>
          ) : slots.length === 0 ? (
            <div style={{ ...s.card, textAlign: 'center', color: '#888', padding: 24 }}>Свободных слотов нет</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {slots.map(slot => {
                const dev = slot.devices as Record<string, unknown> | null
                const active = selSlot?.id === slot.id
                return (
                  <button key={slot.id as string} onClick={() => setSelSlot(slot)}
                    style={{ padding: '10px 16px', borderRadius: 12, border: `1px solid ${active ? 'var(--accent)' : 'rgba(255,255,255,0.12)'}`, background: active ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'rgba(255,255,255,0.04)', color: active ? 'var(--accent)' : '#ccc', cursor: 'pointer', fontFamily: 'inherit' }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{slot.time_start as string}</div>
                    {dev && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{DEVICE_LABELS[dev.type as string] ?? dev.type}</div>}
                  </button>
                )
              })}
            </div>
          )}
          {selSlot && (
            <button onClick={() => setStep('confirm')} style={s.btn(true)}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>Подтвердить время <ChevronRight size={16} /></span>
            </button>
          )}
        </div>
      )}

      {/* Confirm step */}
      {step === 'confirm' && selSlot && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <button onClick={() => setStep('slot')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, cursor: 'pointer', padding: 0, textAlign: 'left' }}>← Назад</button>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Подтверждение записи</div>
          <div style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div><span style={{ ...s.muted }}>Дата:</span> <strong>{new Date(selDate + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</strong></div>
            <div><span style={{ ...s.muted }}>Время:</span> <strong>{selSlot.time_start as string} — {selSlot.time_end as string}</strong></div>
            {!!selSlot.devices && <div><span style={{ ...s.muted }}>Тренажёр:</span> <strong>{DEVICE_LABELS[(selSlot.devices as Record<string, unknown>).type as string]}</strong></div>}
            <div><span style={{ ...s.muted }}>Абонемент:</span> <strong>{subs.find(s => s.id === selSub)?.name as string ?? selSub}</strong></div>
          </div>
          {error && <div style={{ fontSize: 13, color: '#f87171', padding: '8px 12px', background: 'var(--color-danger-muted)', borderRadius: 8 }}>{error}</div>}
          <button onClick={() => void handleBook()} disabled={submitting} style={s.btn(!submitting)}>
            {submitting ? 'Запись...' : 'Записаться'}
          </button>
        </div>
      )}

      {/* Success */}
      {step === 'success' && (
        <div style={{ textAlign: 'center', paddingTop: 40 }}>
          <CheckCircle size={56} color="var(--color-success)" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Записано!</div>
          <div style={{ color: '#888', marginBottom: 24 }}>
            {new Date(selDate + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} в {selSlot?.time_start as string ?? ''}
          </div>
          <button onClick={() => { setStep('date'); setSelSlot(null) }} style={s.btn(true)}>Записаться ещё раз</button>
        </div>
      )}
    </div>
  )
}
