import React, { useState, useEffect, useRef } from 'react'
import {
  ShoppingCart, Search, X, AlertCircle, Check, Calendar,
  Plus, Minus, User, ArrowLeft, Trash2, Tag, CreditCard, Banknote,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { branchSubscriptionTemplatesApi } from '../../api/branch-subscription-templates.api'
import { warehouseApi } from '../../api/warehouse.api'
import { clientsApi } from '../../api/clients.api'
import { saleApi, promoCodesApi } from '../../api/sale.api'
import type { SubscriptionTemplate, Client, DeviceType, WarehouseItem } from '../../types'
import type { CheckoutResult, PromoValidateResult } from '../../api/sale.api'

// ─── types ────────────────────────────────────────────────────────────────────

type Stage = 'catalog' | 'cart' | 'payment' | 'receipt'
type PaymentMethod = 'cash' | 'card'

interface CartItem {
  id: string
  type: 'subscription' | 'warehouse'
  name: string
  price: number | null
  qty: number
  maxQty?: number
}

interface AppliedPromo {
  code: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  id: string
  description: string
}

// ─── constants ────────────────────────────────────────────────────────────────

const DEVICE_LABELS: Record<DeviceType, string> = {
  vacuactiv: 'VacuActiv', rollshape: 'RollShape', infrastep: 'InfraStep', infrashape: 'InfraShape',
}

const fmt = (n: number) => new Intl.NumberFormat('ru-KZ').format(n)

// ─── styles ───────────────────────────────────────────────────────────────────

const inputSt: React.CSSProperties = {
  height: 40, padding: '0 13px', background: 'var(--bg-card)',
  border: '1px solid var(--border)', borderRadius: 8,
  color: 'var(--text)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
}
const labelSt: React.CSSProperties = { fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }
const cardSt: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)', borderRadius: 16, padding: 21, marginBottom: 13,
}

// ─── PromoModal ───────────────────────────────────────────────────────────────

interface PromoModalProps {
  onClose: () => void
  onApply: (promo: AppliedPromo) => void
}

function PromoModal({ onClose, onApply }: PromoModalProps) {
  const [input,      setInput]      = useState('')
  const [validating, setValidating] = useState(false)
  const [result,     setResult]     = useState<PromoValidateResult | null>(null)
  const [error,      setError]      = useState<string | null>(null)

  const handleValidate = async () => {
    const code = input.trim().toUpperCase()
    if (!code) return
    setValidating(true); setError(null); setResult(null)
    try {
      const data = await promoCodesApi.validate(code)
      setResult(data)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Неверный промокод')
    } finally { setValidating(false) }
  }

  const handleConfirm = () => {
    if (!result) return
    onApply({
      code: input.trim().toUpperCase(),
      discount_type: result.discount_type,
      discount_value: result.discount_value,
      id: result.id,
      description: result.description,
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag size={16} color="var(--accent)" />
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Промокод</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 4 }}><X size={16} /></button>
        </div>

        {/* Input + apply button */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input
            style={{ ...inputSt, flex: 1, letterSpacing: 1 }}
            placeholder="Введите код"
            value={input}
            onChange={e => { setInput(e.target.value.toUpperCase()); setError(null); setResult(null) }}
            onKeyDown={e => { if (e.key === 'Enter') void handleValidate() }}
            autoFocus
          />
          <button
            onClick={() => void handleValidate()}
            disabled={validating || !input.trim()}
            style={{ height: 40, padding: '0 16px', background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: (validating || !input.trim()) ? 'not-allowed' : 'pointer', opacity: (validating || !input.trim()) ? 0.6 : 1, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {validating ? '...' : 'Применить'}
          </button>
        </div>

        {/* Status */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'color-mix(in srgb, var(--color-danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--color-danger) 20%, transparent)', borderRadius: 8, fontSize: 13, color: 'var(--color-danger)', marginBottom: 16 }}>
            <AlertCircle size={13} />{error}
          </div>
        )}
        {result && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'color-mix(in srgb, var(--color-success) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--color-success) 20%, transparent)', borderRadius: 8, fontSize: 13, color: 'var(--color-success)', marginBottom: 16 }}>
            <Check size={13} />{result.description}
          </div>
        )}
        {!error && !result && <div style={{ marginBottom: 16 }} />}

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ height: 38, padding: '0 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
            Закрыть
          </button>
          <button
            onClick={handleConfirm}
            disabled={!result}
            style={{ height: 38, padding: '0 18px', background: result ? 'var(--color-success)' : 'var(--bg-card)', border: `1px solid ${result ? 'var(--color-success)' : 'var(--border)'}`, borderRadius: 8, color: result ? '#fff' : 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: result ? 'pointer' : 'not-allowed', opacity: result ? 1 : 0.5 }}>
            Подтвердить
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ClientSearch ─────────────────────────────────────────────────────────────

interface ClientSearchProps {
  value: Client | null
  onChange: (c: Client | null) => void
  onCreateNew: (name: string) => void
}

function ClientSearch({ value, onChange, onCreateNew }: ClientSearchProps) {
  const [q, setQ]       = useState('')
  const [res, setRes]   = useState<Client[]>([])
  const [open, setOpen] = useState(false)
  const timer           = useRef<ReturnType<typeof setTimeout>>()
  const ref             = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const search = (val: string) => {
    setQ(val); clearTimeout(timer.current)
    if (!val.trim()) { setRes([]); setOpen(false); return }
    timer.current = setTimeout(async () => {
      try { const d = await clientsApi.getAll({ search: val }); setRes(d.slice(0, 8)); setOpen(true) } catch { /* */ }
    }, 300)
  }

  if (value) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 40, padding: '0 13px', background: 'var(--bg-card)', border: '1px solid var(--accent)', borderRadius: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <User size={14} strokeWidth={1.75} color="var(--accent)" />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{value.full_name}</span>
          {value.phone && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{value.phone}</span>}
        </div>
        <button onClick={() => onChange(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 0 }}><X size={13} /></button>
      </div>
    )
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
      <input
        style={{ ...inputSt, paddingLeft: 32 }}
        placeholder="Поиск по имени или телефону..."
        value={q}
        onChange={e => search(e.target.value)}
        onFocus={() => q && setOpen(true)}
      />
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginTop: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
          {res.map(c => (
            <button key={c.id} onClick={() => { onChange(c); setQ(''); setOpen(false) }}
              style={{ display: 'block', width: '100%', padding: '9px 13px', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text)', fontSize: 13 }}>
              {c.full_name}{c.phone && <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 8 }}>{c.phone}</span>}
            </button>
          ))}
          {q.trim() && (
            <button onClick={() => { onCreateNew(q.trim()); setOpen(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '9px 13px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 13 }}>
              <Plus size={13} />Создать клиента «{q.trim()}»
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── CreateClientInline ───────────────────────────────────────────────────────

interface CreateClientInlineProps {
  defaultName: string
  onCreated: (c: Client) => void
  onCancel: () => void
}

function CreateClientInline({ defaultName, onCreated, onCancel }: CreateClientInlineProps) {
  const [fullName, setFullName] = useState(defaultName)
  const [phone,    setPhone]    = useState('')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const handleCreate = async () => {
    if (!fullName.trim()) { setError('Введите имя'); return }
    setSaving(true); setError(null)
    try {
      const c = await clientsApi.create({ full_name: fullName.trim(), phone: phone.trim() || null })
      onCreated(c)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Ошибка при создании клиента')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ padding: 13, background: 'var(--bg-card)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)', borderRadius: 13, marginTop: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 13 }}>Новый клиент</div>
      {error && <div style={{ fontSize: 11, color: 'var(--color-danger)', marginBottom: 8 }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <label style={labelSt}>Имя *</label>
          <input style={{ ...inputSt, height: 36 }} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="ФИО" />
        </div>
        <div>
          <label style={labelSt}>Телефон</label>
          <input style={{ ...inputSt, height: 36 }} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7 700 000 0000" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => void handleCreate()} disabled={saving}
          style={{ flex: 1, height: 32, background: 'var(--accent)', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Создание...' : 'Создать'}
        </button>
        <button onClick={onCancel}
          style={{ height: 32, padding: '0 13px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>
          Отмена
        </button>
      </div>
    </div>
  )
}

// ─── SalePage ─────────────────────────────────────────────────────────────────

export default function SalePage() {
  const navigate = useNavigate()

  // catalog data
  const [templates,       setTemplates]       = useState<SubscriptionTemplate[]>([])
  const [merch,           setMerch]           = useState<WarehouseItem[]>([])
  const [nutrition,       setNutrition]       = useState<WarehouseItem[]>([])
  const [loading,         setLoading]         = useState(true)
  const [searchSubs,      setSearchSubs]      = useState('')
  const [searchWarehouse, setSearchWarehouse] = useState('')

  // cart
  const [cart,        setCart]        = useState<CartItem[]>([])
  const [stage,       setStage]       = useState<Stage>('catalog')

  // cart stage
  const [client,          setClient]        = useState<Client | null>(null)
  const [creatingName,    setCreatingName]  = useState<string | null>(null)
  const [promoModalOpen,  setPromoModalOpen]= useState(false)
  const [appliedPromo,    setAppliedPromo]  = useState<AppliedPromo | null>(null)
  const [dateStart,       setDateStart]     = useState(new Date().toISOString().slice(0, 10))
  const [cartError,       setCartError]     = useState<string | null>(null)

  // payment stage
  const [payMethod,   setPayMethod]   = useState<PaymentMethod>('cash')
  const [paying,      setPaying]      = useState(false)
  const [payError,    setPayError]    = useState<string | null>(null)

  // receipt
  const [receipt,     setReceipt]     = useState<CheckoutResult | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      branchSubscriptionTemplatesApi.getAll(),
      warehouseApi.getAll(),
    ]).then(([bstData, wItems]) => {
      const tpls = bstData.flatMap(bst => bst.subscription_templates ? [bst.subscription_templates] : [])
      setTemplates(tpls)
      setMerch(wItems.filter(i => i.category === 'merch' && i.quantity > 0))
      setNutrition(wItems.filter(i => i.category === 'nutrition' && i.quantity > 0))
    }).catch(() => { /* ignore */ }).finally(() => setLoading(false))
  }, [])

  // ── cart helpers ─────────────────────────────────────────────────────────────

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const idx = prev.findIndex(c => c.id === item.id && c.type === item.type)
      if (idx >= 0) {
        const updated = [...prev]
        const cur = updated[idx]
        const newQty = cur.qty + 1
        if (cur.maxQty !== undefined && newQty > cur.maxQty) return prev
        updated[idx] = { ...cur, qty: newQty }
        return updated
      }
      return [...prev, { ...item, qty: 1 }]
    })
  }

  const removeFromCart = (id: string, type: CartItem['type']) => {
    setCart(prev => prev.filter(c => !(c.id === id && c.type === type)))
  }

  const changeQty = (id: string, type: CartItem['type'], delta: number) => {
    setCart(prev => prev.map(c => {
      if (!(c.id === id && c.type === type)) return c
      const newQty = c.qty + delta
      if (newQty <= 0) return c
      if (c.maxQty !== undefined && newQty > c.maxQty) return c
      return { ...c, qty: newQty }
    }))
  }

  const cartCount = cart.reduce((s, c) => s + c.qty, 0)
  const subtotal  = cart.reduce((s, c) => s + (c.price ?? 0) * c.qty, 0)
  const discount  = appliedPromo
    ? appliedPromo.discount_type === 'percent'
      ? Math.round(subtotal * appliedPromo.discount_value / 100)
      : Math.min(subtotal, appliedPromo.discount_value)
    : 0
  const total = Math.max(0, subtotal - discount)

  // ── checkout ─────────────────────────────────────────────────────────────────

  const handlePay = async () => {
    if (!client) { setPayError('Выберите клиента'); return }
    if (cart.length === 0) { setPayError('Корзина пуста'); return }
    setPaying(true); setPayError(null)
    try {
      const result = await saleApi.checkout({
        client_id: client.id,
        items: cart.map(c => ({
          type: c.type,
          ...(c.type === 'subscription' ? { template_id: c.id } : { item_id: c.id }),
          quantity: c.qty,
        })),
        payment_method: payMethod,
        promo_code: appliedPromo?.code || undefined,
        date_start: dateStart,
      })
      setReceipt(result)
      setStage('receipt')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string; code?: string } } }
      const msg  = err?.response?.data?.error
      const code = err?.response?.data?.code
      if (code && code.startsWith('PROMO_')) {
        setAppliedPromo(null)
        setCartError(msg ?? 'Ошибка промокода — промокод сброшен')
        setStage('cart')
      } else {
        setPayError(msg ?? 'Ошибка при оформлении продажи')
      }
    } finally { setPaying(false) }
  }

  const handleReset = () => {
    setCart([])
    setClient(null)
    setCreatingName(null)
    setAppliedPromo(null)
    setPromoModalOpen(false)
    setDateStart(new Date().toISOString().slice(0, 10))
    setCartError(null)
    setPayMethod('cash')
    setPayError(null)
    setReceipt(null)
    setStage('catalog')
  }

  // ── stage: receipt ────────────────────────────────────────────────────────────

  if (stage === 'receipt' && receipt) {
    const hasSubscription = receipt.items_created.some(i => i.type === 'subscription')
    return (
      <div style={{ maxWidth: 480 }}>
        <div style={{ ...cardSt, textAlign: 'center', padding: 28 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 21px' }}>
            <Check size={28} strokeWidth={2.5} color="var(--accent)" />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Продажа оформлена!</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
            Клиент: <strong style={{ color: 'var(--text)' }}>{receipt.client.full_name}</strong>
          </div>

          <div style={{ background: 'var(--bg-card)', borderRadius: 13, padding: '13px 18px', margin: '18px 0', textAlign: 'left' }}>
            {receipt.items_created.map((item, i) => (
              <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '3px 0' }}>• {item.name}</div>
            ))}
            {receipt.discount > 0 && (
              <div style={{ fontSize: 12, color: 'var(--color-success)', marginTop: 8 }}>
                Скидка: −{fmt(receipt.discount)} ₸
              </div>
            )}
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
              Итого: {fmt(receipt.total)} ₸ · {receipt.payment_method === 'cash' ? 'Наличные' : 'Карта'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
            {hasSubscription && (
              <button onClick={() => navigate('/schedule')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, background: 'var(--accent)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <Calendar size={16} strokeWidth={2} />Записать на тренировку
              </button>
            )}
            <button onClick={handleReset}
              style={{ height: 40, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
              Новая продажа
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── stage: payment ────────────────────────────────────────────────────────────

  if (stage === 'payment') {
    return (
      <div style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 21 }}>
          <button onClick={() => setStage('cart')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', padding: 0 }}>
            <ArrowLeft size={16} />Назад
          </button>
          <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Способ оплаты</h1>
        </div>

        {payError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px', background: 'color-mix(in srgb, var(--color-danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--color-danger) 20%, transparent)', borderRadius: 8, marginBottom: 13, fontSize: 13, color: 'var(--color-danger)' }}>
            <AlertCircle size={14} />{payError}
          </div>
        )}

        <div style={cardSt}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 13 }}>Оплата</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {(['cash', 'card'] as PaymentMethod[]).map(m => (
              <button key={m} onClick={() => setPayMethod(m)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '21px 13px', background: payMethod === m ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'var(--bg-card)', border: `1px solid ${payMethod === m ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 13, cursor: 'pointer', transition: 'background 150ms ease-out, border-color 150ms ease-out, color 150ms ease-out' }}>
                {m === 'cash' ? <Banknote size={24} color={payMethod === m ? 'var(--accent)' : 'var(--text-muted)'} /> : <CreditCard size={24} color={payMethod === m ? 'var(--accent)' : 'var(--text-muted)'} />}
                <span style={{ fontSize: 13, fontWeight: 600, color: payMethod === m ? 'var(--accent)' : 'var(--text)' }}>{m === 'cash' ? 'Наличные' : 'Карта'}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ ...cardSt, padding: '13px 21px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
            <span>Товаров: {cart.reduce((s, c) => s + c.qty, 0)}</span>
            <span>Клиент: {client?.full_name}</span>
          </div>
          {discount > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>
                <span>Без скидки:</span>
                <span>{fmt(subtotal)} ₸</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-success)', marginBottom: 4 }}>
                <span>Скидка ({appliedPromo?.code}):</span>
                <span>−{fmt(discount)} ₸</span>
              </div>
            </>
          )}
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            Итого: {fmt(total)} ₸
          </div>
        </div>

        <button onClick={() => void handlePay()} disabled={paying}
          style={{ width: '100%', height: 48, background: 'var(--accent)', border: 'none', borderRadius: 13, color: '#fff', fontSize: 15, fontWeight: 700, cursor: paying ? 'not-allowed' : 'pointer', opacity: paying ? 0.7 : 1 }}>
          {paying ? 'Оформление...' : `Подтвердить оплату · ${fmt(total)} ₸`}
        </button>
      </div>
    )
  }

  // ── stage: cart ───────────────────────────────────────────────────────────────

  if (stage === 'cart') {
    const canProceed = cart.length > 0 && client !== null && creatingName === null
    return (
      <div style={{ maxWidth: 640 }}>
        {promoModalOpen && (
          <PromoModal
            onClose={() => setPromoModalOpen(false)}
            onApply={promo => { setAppliedPromo(promo); setPromoModalOpen(false) }}
          />
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 21 }}>
          <button onClick={() => setStage('catalog')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', padding: 0 }}>
            <ArrowLeft size={16} />Каталог
          </button>
          <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Корзина</h1>
        </div>

        {cartError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px', background: 'color-mix(in srgb, var(--color-danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--color-danger) 20%, transparent)', borderRadius: 8, marginBottom: 13, fontSize: 13, color: 'var(--color-danger)' }}>
            <AlertCircle size={14} />{cartError}
          </div>
        )}

        {/* Cart items */}
        <div style={cardSt}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 13 }}>Позиции</div>
          {cart.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '21px 0' }}>Корзина пуста</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Название', 'Кол-во', 'Цена', 'Сумма', ''].map(h => (
                    <th key={h} style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', padding: '0 8px 8px', textAlign: h === 'Название' ? 'left' : 'center' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cart.map(item => (
                  <tr key={`${item.type}-${item.id}`} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 8px', fontSize: 13, color: 'var(--text)' }}>{item.name}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <button onClick={() => changeQty(item.id, item.type, -1)} style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text-muted)' }}><Minus size={10} /></button>
                        <span style={{ fontSize: 13, minWidth: 20, textAlign: 'center', color: 'var(--text)' }}>{item.qty}</span>
                        <button onClick={() => changeQty(item.id, item.type, +1)} style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text-muted)' }}><Plus size={10} /></button>
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px', fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
                      {item.price !== null ? `${fmt(item.price)} ₸` : '—'}
                    </td>
                    <td style={{ padding: '10px 8px', fontSize: 13, fontWeight: 600, color: 'var(--text)', textAlign: 'center' }}>
                      {item.price !== null ? `${fmt(item.price * item.qty)} ₸` : '—'}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <button onClick={() => removeFromCart(item.id, item.type)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {appliedPromo && discount > 0 ? (
                  <>
                    <tr>
                      <td colSpan={3} style={{ padding: '8px 8px 2px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>Без скидки:</td>
                      <td style={{ padding: '8px 8px 2px', fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>{fmt(subtotal)} ₸</td>
                      <td />
                    </tr>
                    <tr>
                      <td colSpan={3} style={{ padding: '2px 8px', fontSize: 12, color: 'var(--color-success)', textAlign: 'right' }}>Скидка ({appliedPromo.code}):</td>
                      <td style={{ padding: '2px 8px', fontSize: 13, fontWeight: 600, color: 'var(--color-success)', textAlign: 'center' }}>−{fmt(discount)} ₸</td>
                      <td />
                    </tr>
                    <tr>
                      <td colSpan={3} style={{ padding: '2px 8px 10px', fontSize: 13, fontWeight: 600, color: 'var(--text)', textAlign: 'right' }}>Итого:</td>
                      <td style={{ padding: '2px 8px 10px', fontSize: 15, fontWeight: 700, color: 'var(--accent)', textAlign: 'center' }}>{fmt(total)} ₸</td>
                      <td />
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan={3} style={{ padding: '10px 8px', fontSize: 13, fontWeight: 600, color: 'var(--text)', textAlign: 'right' }}>Итого:</td>
                    <td style={{ padding: '10px 8px', fontSize: 15, fontWeight: 700, color: 'var(--accent)', textAlign: 'center' }}>{fmt(subtotal)} ₸</td>
                    <td />
                  </tr>
                )}
              </tfoot>
            </table>
          )}
        </div>

        {/* Client */}
        <div style={cardSt}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 13 }}>Клиент</div>
          <ClientSearch value={client} onChange={setClient} onCreateNew={name => setCreatingName(name)} />
          {creatingName !== null && (
            <CreateClientInline defaultName={creatingName} onCreated={c => { setClient(c); setCreatingName(null) }} onCancel={() => setCreatingName(null)} />
          )}
        </div>

        {/* Promo code */}
        <div style={cardSt}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 13 }}>Промокод</div>
          {appliedPromo ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 40, padding: '0 13px', background: 'color-mix(in srgb, var(--color-success) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--color-success) 30%, transparent)', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Check size={14} color="var(--color-success)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-success)', letterSpacing: 0.5 }}>{appliedPromo.code}</span>
                <span style={{ fontSize: 12, color: 'var(--color-success)' }}>· {appliedPromo.description}</span>
              </div>
              <button onClick={() => setAppliedPromo(null)} style={{ background: 'none', border: 'none', color: 'var(--color-success)', cursor: 'pointer', display: 'flex', padding: 0 }}><X size={13} /></button>
            </div>
          ) : (
            <button
              onClick={() => setPromoModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 13px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, width: '100%' }}>
              <Tag size={14} color="var(--text-muted)" />
              Ввести промокод
            </button>
          )}
        </div>

        {/* Date start for subscriptions */}
        {cart.some(c => c.type === 'subscription') && (
          <div style={cardSt}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 13 }}>Дата начала абонемента</div>
            <input type="date" style={inputSt} value={dateStart} onChange={e => setDateStart(e.target.value)} />
          </div>
        )}

        <button
          onClick={() => { if (!client) { setCartError('Выберите клиента'); return }; setCartError(null); setStage('payment') }}
          disabled={!canProceed}
          style={{ width: '100%', height: 48, background: 'var(--accent)', border: 'none', borderRadius: 13, color: '#fff', fontSize: 15, fontWeight: 700, cursor: canProceed ? 'pointer' : 'not-allowed', opacity: canProceed ? 1 : 0.5 }}>
          Перейти к оплате · {fmt(total)} ₸
        </button>
      </div>
    )
  }

  // ── stage: catalog ────────────────────────────────────────────────────────────

  const inCart = (id: string, type: CartItem['type']) => cart.find(c => c.id === id && c.type === type)?.qty ?? 0

  const filteredTemplates = templates.filter(t =>
    !searchSubs || t.name.toLowerCase().includes(searchSubs.toLowerCase())
  )
  const allWarehouse = [...merch, ...nutrition]
  const filteredWarehouse = allWarehouse.filter(item =>
    !searchWarehouse || item.name.toLowerCase().includes(searchWarehouse.toLowerCase())
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text)', margin: 0, marginBottom: 4 }}>Продажа</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Добавьте товары в корзину</p>
        </div>
        <button
          onClick={() => { if (cart.length > 0) setStage('cart') }}
          style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 18px', background: cartCount > 0 ? 'var(--accent)' : 'var(--bg-card)', border: `1px solid ${cartCount > 0 ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 13, color: cartCount > 0 ? 'var(--accent-fg)' : 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: cartCount > 0 ? 'pointer' : 'default', transition: 'background 150ms ease-out, border-color 150ms ease-out, color 150ms ease-out' }}>
          <ShoppingCart size={18} strokeWidth={2} />
          {cartCount > 0 ? `Корзина · ${cartCount}` : 'Корзина пуста'}
        </button>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '34px 0' }}>Загрузка каталога...</div>
      ) : (
        <>
          {/* Subscriptions */}
          {templates.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Абонементы</div>
                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input
                    placeholder="Поиск..."
                    value={searchSubs}
                    onChange={e => setSearchSubs(e.target.value)}
                    style={{ height: 32, paddingLeft: 30, paddingRight: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12, outline: 'none', width: 180 }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {filteredTemplates.map(tpl => {
                  const qty = inCart(tpl.id, 'subscription')
                  return (
                    <div key={tpl.id} style={{ background: qty > 0 ? 'color-mix(in srgb, var(--accent) 6%, var(--bg-card))' : 'var(--bg-card)', border: `1px solid ${qty > 0 ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'var(--border)'}`, borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 8, transition: 'border-color 150ms ease-out, background 150ms ease-out' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8, lineHeight: 1.3 }}>{tpl.name}</div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)' }}>
                            {DEVICE_LABELS[tpl.slot_1_type]} · {tpl.slot_1_sessions_total}
                          </span>
                          {tpl.slot_2_type && tpl.slot_2_sessions_total && (
                            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(38,60,217,0.10)', color: '#263CD9', border: '1px solid rgba(38,60,217,0.2)' }}>
                              {DEVICE_LABELS[tpl.slot_2_type]} · {tpl.slot_2_sessions_total}
                            </span>
                          )}
                          {tpl.slot_3_type && tpl.slot_3_sessions_total && (
                            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(139,92,246,0.10)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.2)' }}>
                              {DEVICE_LABELS[tpl.slot_3_type]} · {tpl.slot_3_sessions_total}
                            </span>
                          )}
                          {tpl.slot_4_type && tpl.slot_4_sessions_total && (
                            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--color-warning-muted)', color: 'var(--color-warning)', border: '1px solid color-mix(in srgb, var(--color-warning) 20%, transparent)' }}>
                              {DEVICE_LABELS[tpl.slot_4_type]} · {tpl.slot_4_sessions_total}
                            </span>
                          )}
                          {tpl.is_trial && (
                            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--color-warning-muted)', color: 'var(--color-warning)', border: '1px solid color-mix(in srgb, var(--color-warning) 30%, transparent)', fontWeight: 600 }}>ТЕСТ</span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                          {tpl.price !== null ? `${fmt(tpl.price)} ₸` : '—'}
                        </span>
                        <button
                          onClick={() => addToCart({ id: tpl.id, type: 'subscription', name: tpl.name, price: tpl.price, qty: 1 })}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 10px', background: qty > 0 ? 'var(--accent)' : 'var(--bg)', border: `1px solid ${qty > 0 ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 7, cursor: 'pointer', color: qty > 0 ? 'var(--accent-fg)' : 'var(--text-muted)', fontSize: 11, fontWeight: 600, transition: 'background 150ms ease-out, border-color 150ms ease-out, color 150ms ease-out', whiteSpace: 'nowrap' }}>
                          <Plus size={11} />{qty > 0 ? `${qty} в корзине` : 'В корзину'}
                        </button>
                      </div>
                    </div>
                  )
                })}
                {filteredTemplates.length === 0 && searchSubs && (
                  <div style={{ gridColumn: '1 / -1', fontSize: 13, color: 'var(--text-muted)', padding: '20px 0' }}>Ничего не найдено</div>
                )}
              </div>
            </div>
          )}

          {/* Warehouse (merch + nutrition) */}
          {allWarehouse.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Товары</div>
                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input
                    placeholder="Поиск..."
                    value={searchWarehouse}
                    onChange={e => setSearchWarehouse(e.target.value)}
                    style={{ height: 32, paddingLeft: 30, paddingRight: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12, outline: 'none', width: 180 }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {filteredWarehouse.map(item => {
                  const qty = inCart(item.id, 'warehouse')
                  const isMerch = merch.some(m => m.id === item.id)
                  const accentColor = isMerch ? '#8b5cf6' : 'var(--color-success)'
                  const outOfStock = item.quantity <= 0
                  return (
                    <div key={item.id} style={{ background: qty > 0 ? `color-mix(in srgb, ${accentColor} 6%, var(--bg-card))` : 'var(--bg-card)', border: `1px solid ${qty > 0 ? `color-mix(in srgb, ${accentColor} 30%, transparent)` : 'var(--border)'}`, borderRadius: 10, padding: '11px 12px', display: 'flex', flexDirection: 'column', gap: 6, opacity: outOfStock ? 0.55 : 1, transition: 'border-color 150ms ease-out, background 150ms ease-out' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', lineHeight: 1.3, marginBottom: 4 }}>{item.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: `color-mix(in srgb, ${accentColor} 10%, transparent)`, color: accentColor, border: `1px solid color-mix(in srgb, ${accentColor} 20%, transparent)`, fontWeight: 600 }}>
                            {isMerch ? 'Мерч' : 'Питание'}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: outOfStock ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                        {outOfStock ? 'Нет на складе' : `Склад: ${item.quantity} ${item.unit ?? 'шт.'}`}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginTop: 'auto' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                          {item.price !== null ? `${fmt(item.price)} ₸` : '—'}
                        </span>
                        <button
                          disabled={outOfStock}
                          onClick={() => addToCart({ id: item.id, type: 'warehouse', name: item.name, price: item.price, qty: 1, maxQty: item.quantity })}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, background: qty > 0 ? accentColor : 'var(--bg)', border: `1px solid ${qty > 0 ? accentColor : 'var(--border)'}`, borderRadius: 6, cursor: outOfStock ? 'not-allowed' : 'pointer', color: qty > 0 ? '#fff' : 'var(--text-muted)', transition: 'background 150ms ease-out, border-color 150ms ease-out' }}>
                          <Plus size={11} />
                        </button>
                      </div>
                    </div>
                  )
                })}
                {filteredWarehouse.length === 0 && searchWarehouse && (
                  <div style={{ gridColumn: '1 / -1', fontSize: 13, color: 'var(--text-muted)', padding: '20px 0' }}>Ничего не найдено</div>
                )}
              </div>
            </div>
          )}

          {templates.length === 0 && merch.length === 0 && nutrition.length === 0 && (
            <div style={{ ...cardSt, textAlign: 'center', padding: 28 }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Нет доступных товаров для продажи</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
