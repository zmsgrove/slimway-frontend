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
import type { CheckoutResult } from '../../api/sale.api'

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

// ─── constants ────────────────────────────────────────────────────────────────

const DEVICE_LABELS: Record<DeviceType, string> = {
  vacuactiv: 'VacuActiv', rollshape: 'RollShape', infrastep: 'InfraStep', infrashape: 'InfraShape',
}

const fmt = (n: number) => new Intl.NumberFormat('ru-KZ').format(n)

// ─── styles ───────────────────────────────────────────────────────────────────

const inputSt: React.CSSProperties = {
  height: 40, padding: '0 13px', background: 'var(--bg-elevated)',
  border: '1px solid var(--glass-border)', borderRadius: 8,
  color: 'var(--text-primary)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
}
const labelSt: React.CSSProperties = { fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }
const cardSt: React.CSSProperties = {
  background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid var(--glass-border)', borderRadius: 21, padding: 21, marginBottom: 13,
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 40, padding: '0 13px', background: 'var(--bg-elevated)', border: '1px solid #02BDB6', borderRadius: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <User size={14} strokeWidth={1.75} color="#02BDB6" />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{value.full_name}</span>
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
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 8, overflow: 'hidden', marginTop: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
          {res.map(c => (
            <button key={c.id} onClick={() => { onChange(c); setQ(''); setOpen(false) }}
              style={{ display: 'block', width: '100%', padding: '9px 13px', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid var(--glass-border)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 13 }}>
              {c.full_name}{c.phone && <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 8 }}>{c.phone}</span>}
            </button>
          ))}
          {q.trim() && (
            <button onClick={() => { onCreateNew(q.trim()); setOpen(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '9px 13px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#02BDB6', fontSize: 13 }}>
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
    <div style={{ padding: 13, background: 'var(--bg-elevated)', border: '1px solid rgba(2,189,182,0.25)', borderRadius: 13, marginTop: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#02BDB6', marginBottom: 13 }}>Новый клиент</div>
      {error && <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 8 }}>{error}</div>}
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
          style={{ flex: 1, height: 32, background: '#02BDB6', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Создание...' : 'Создать'}
        </button>
        <button onClick={onCancel}
          style={{ height: 32, padding: '0 13px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 6, color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>
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
  const [templates,   setTemplates]   = useState<SubscriptionTemplate[]>([])
  const [merch,       setMerch]       = useState<WarehouseItem[]>([])
  const [nutrition,   setNutrition]   = useState<WarehouseItem[]>([])
  const [loading,     setLoading]     = useState(true)

  // cart
  const [cart,        setCart]        = useState<CartItem[]>([])
  const [stage,       setStage]       = useState<Stage>('catalog')

  // cart stage
  const [client,        setClient]        = useState<Client | null>(null)
  const [creatingName,  setCreatingName]  = useState<string | null>(null)
  const [promoCode,     setPromoCode]     = useState('')
  const [promoCodeError,setPromoCodeError]= useState<string | null>(null)
  const [validatingPromo,setValidatingPromo]= useState(false)
  const [dateStart,     setDateStart]     = useState(new Date().toISOString().slice(0, 10))
  const [cartError,     setCartError]     = useState<string | null>(null)

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
        promo_code: promoCode.trim() || undefined,
        date_start: dateStart,
      })
      setReceipt(result)
      setStage('receipt')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string; code?: string } } }
      const msg  = err?.response?.data?.error
      const code = err?.response?.data?.code
      if (code && code.startsWith('PROMO_')) {
        setPromoCodeError(msg ?? 'Ошибка промокода')
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
    setPromoCode('')
    setPromoCodeError(null)
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
        <div style={{ ...cardSt, textAlign: 'center', padding: 34 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(2,189,182,0.12)', border: '1px solid rgba(2,189,182,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 21px' }}>
            <Check size={28} strokeWidth={2.5} color="#02BDB6" />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Продажа оформлена!</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
            Клиент: <strong style={{ color: 'var(--text-primary)' }}>{receipt.client.full_name}</strong>
          </div>

          <div style={{ background: 'var(--bg-elevated)', borderRadius: 13, padding: '13px 18px', margin: '18px 0', textAlign: 'left' }}>
            {receipt.items_created.map((item, i) => (
              <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '3px 0' }}>• {item.name}</div>
            ))}
            {receipt.discount > 0 && (
              <div style={{ fontSize: 12, color: '#10b981', marginTop: 8 }}>
                Скидка: −{fmt(receipt.discount)} ₸
              </div>
            )}
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--glass-border)' }}>
              Итого: {fmt(receipt.total)} ₸ · {receipt.payment_method === 'cash' ? 'Наличные' : 'Карта'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
            {hasSubscription && (
              <button onClick={() => navigate('/schedule')}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <Calendar size={16} strokeWidth={2} />Записать на тренировку
              </button>
            )}
            <button onClick={handleReset}
              style={{ height: 40, background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
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
          <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Способ оплаты</h1>
        </div>

        {payError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 13, fontSize: 13, color: '#ef4444' }}>
            <AlertCircle size={14} />{payError}
          </div>
        )}

        <div style={cardSt}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 13 }}>Оплата</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {(['cash', 'card'] as PaymentMethod[]).map(m => (
              <button key={m} onClick={() => setPayMethod(m)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '21px 13px', background: payMethod === m ? 'rgba(2,189,182,0.08)' : 'var(--bg-elevated)', border: `1px solid ${payMethod === m ? '#02BDB6' : 'var(--glass-border)'}`, borderRadius: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
                {m === 'cash' ? <Banknote size={24} color={payMethod === m ? '#02BDB6' : 'var(--text-muted)'} /> : <CreditCard size={24} color={payMethod === m ? '#02BDB6' : 'var(--text-muted)'} />}
                <span style={{ fontSize: 13, fontWeight: 600, color: payMethod === m ? '#02BDB6' : 'var(--text-primary)' }}>{m === 'cash' ? 'Наличные' : 'Карта'}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ ...cardSt, padding: '13px 21px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
            <span>Товаров: {cart.reduce((s, c) => s + c.qty, 0)}</span>
            <span>Клиент: {client?.full_name}</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            Итого: {fmt(subtotal)} ₸
          </div>
        </div>

        <button onClick={() => void handlePay()} disabled={paying}
          style={{ width: '100%', height: 48, background: '#02BDB6', border: 'none', borderRadius: 13, color: '#fff', fontSize: 15, fontWeight: 700, cursor: paying ? 'not-allowed' : 'pointer', opacity: paying ? 0.7 : 1 }}>
          {paying ? 'Оформление...' : `Подтвердить оплату · ${fmt(subtotal)} ₸`}
        </button>
      </div>
    )
  }

  // ── stage: cart ───────────────────────────────────────────────────────────────

  if (stage === 'cart') {
    const canProceed = cart.length > 0 && client !== null && creatingName === null
    return (
      <div style={{ maxWidth: 640 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 21 }}>
          <button onClick={() => setStage('catalog')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', padding: 0 }}>
            <ArrowLeft size={16} />Каталог
          </button>
          <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Корзина</h1>
        </div>

        {cartError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 13, fontSize: 13, color: '#ef4444' }}>
            <AlertCircle size={14} />{cartError}
          </div>
        )}

        {/* Cart items */}
        <div style={cardSt}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 13 }}>Позиции</div>
          {cart.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '21px 0' }}>Корзина пуста</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  {['Название', 'Кол-во', 'Цена', 'Сумма', ''].map(h => (
                    <th key={h} style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', padding: '0 8px 8px', textAlign: h === 'Название' ? 'left' : 'center' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cart.map(item => (
                  <tr key={`${item.type}-${item.id}`} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '10px 8px', fontSize: 13, color: 'var(--text-primary)' }}>{item.name}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <button onClick={() => changeQty(item.id, item.type, -1)} style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text-muted)' }}><Minus size={10} /></button>
                        <span style={{ fontSize: 13, minWidth: 20, textAlign: 'center', color: 'var(--text-primary)' }}>{item.qty}</span>
                        <button onClick={() => changeQty(item.id, item.type, +1)} style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text-muted)' }}><Plus size={10} /></button>
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px', fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
                      {item.price !== null ? `${fmt(item.price)} ₸` : '—'}
                    </td>
                    <td style={{ padding: '10px 8px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center' }}>
                      {item.price !== null ? `${fmt(item.price * item.qty)} ₸` : '—'}
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <button onClick={() => removeFromCart(item.id, item.type)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ padding: '10px 8px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>Итого:</td>
                  <td style={{ padding: '10px 8px', fontSize: 15, fontWeight: 700, color: '#02BDB6', textAlign: 'center' }}>{fmt(subtotal)} ₸</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Client */}
        <div style={cardSt}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 13 }}>Клиент</div>
          <ClientSearch value={client} onChange={setClient} onCreateNew={name => setCreatingName(name)} />
          {creatingName !== null && (
            <CreateClientInline defaultName={creatingName} onCreated={c => { setClient(c); setCreatingName(null) }} onCancel={() => setCreatingName(null)} />
          )}
        </div>

        {/* Promo code */}
        <div style={cardSt}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 13 }}>Промокод (необязательно)</div>
          <div style={{ position: 'relative' }}>
            <Tag size={14} color={promoCodeError ? '#ef4444' : 'var(--text-muted)'} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              style={{ ...inputSt, paddingLeft: 32, borderColor: promoCodeError ? 'rgba(239,68,68,0.5)' : undefined }}
              placeholder="Введите промокод"
              value={promoCode}
              onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoCodeError(null) }}
            />
          </div>
          {promoCodeError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 12, color: '#ef4444' }}>
              <AlertCircle size={12} />{promoCodeError}
            </div>
          )}
        </div>

        {/* Date start for subscriptions */}
        {cart.some(c => c.type === 'subscription') && (
          <div style={cardSt}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 13 }}>Дата начала абонемента</div>
            <input type="date" style={inputSt} value={dateStart} onChange={e => setDateStart(e.target.value)} />
          </div>
        )}

        <button
          onClick={async () => {
            if (!client) { setCartError('Выберите клиента'); return }
            setCartError(null)
            if (promoCode.trim()) {
              setValidatingPromo(true)
              setPromoCodeError(null)
              try {
                await promoCodesApi.validate(promoCode.trim())
              } catch (e: unknown) {
                const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
                setPromoCodeError(msg ?? 'Неверный промокод')
                setValidatingPromo(false)
                return
              }
              setValidatingPromo(false)
            }
            setStage('payment')
          }}
          disabled={!canProceed || validatingPromo}
          style={{ width: '100%', height: 48, background: '#02BDB6', border: 'none', borderRadius: 13, color: '#fff', fontSize: 15, fontWeight: 700, cursor: (canProceed && !validatingPromo) ? 'pointer' : 'not-allowed', opacity: (canProceed && !validatingPromo) ? 1 : 0.5 }}>
          {validatingPromo ? 'Проверка промокода...' : `Перейти к оплате · ${fmt(subtotal)} ₸`}
        </button>
      </div>
    )
  }

  // ── stage: catalog ────────────────────────────────────────────────────────────

  const inCart = (id: string, type: CartItem['type']) => cart.find(c => c.id === id && c.type === type)?.qty ?? 0

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 21 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>Продажа</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Добавьте товары в корзину</p>
        </div>
        <button
          onClick={() => { if (cart.length > 0) setStage('cart') }}
          style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 18px', background: cartCount > 0 ? '#02BDB6' : 'var(--bg-elevated)', border: `1px solid ${cartCount > 0 ? '#02BDB6' : 'var(--glass-border)'}`, borderRadius: 13, color: cartCount > 0 ? '#fff' : 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: cartCount > 0 ? 'pointer' : 'default', transition: 'all 0.15s' }}>
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
            <div style={cardSt}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 13 }}>Абонементы</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {templates.map(tpl => {
                  const qty = inCart(tpl.id, 'subscription')
                  return (
                    <div key={tpl.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 13px', background: qty > 0 ? 'rgba(2,189,182,0.06)' : 'var(--bg-elevated)', border: `1px solid ${qty > 0 ? 'rgba(2,189,182,0.3)' : 'var(--glass-border)'}`, borderRadius: 10, gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>{tpl.name}</div>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: 'rgba(2,189,182,0.10)', color: '#02BDB6', border: '1px solid rgba(2,189,182,0.2)' }}>
                            {DEVICE_LABELS[tpl.slot_1_type]} · {tpl.slot_1_sessions_total} сеансов
                          </span>
                          {tpl.slot_2_type && tpl.slot_2_sessions_total && (
                            <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: 'rgba(38,60,217,0.10)', color: '#263CD9', border: '1px solid rgba(38,60,217,0.2)' }}>
                              {DEVICE_LABELS[tpl.slot_2_type]} · {tpl.slot_2_sessions_total} сеансов
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        {tpl.price !== null && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{fmt(tpl.price)} ₸</span>}
                        <button
                          onClick={() => addToCart({ id: tpl.id, type: 'subscription', name: tpl.name, price: tpl.price, qty: 1 })}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px', background: qty > 0 ? '#02BDB6' : 'var(--bg-elevated)', border: `1px solid ${qty > 0 ? '#02BDB6' : 'var(--glass-border)'}`, borderRadius: 8, cursor: 'pointer', color: qty > 0 ? '#fff' : 'var(--text-secondary)', fontSize: 12, fontWeight: 600, transition: 'all 0.15s' }}>
                          <Plus size={12} />{qty > 0 ? `В корзине (${qty})` : 'В корзину'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Merch */}
          {merch.length > 0 && (
            <div style={cardSt}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 13 }}>Мерч</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {merch.map(item => {
                  const qty = inCart(item.id, 'warehouse')
                  return (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 13px', background: qty > 0 ? 'rgba(139,92,246,0.06)' : 'var(--bg-elevated)', border: `1px solid ${qty > 0 ? 'rgba(139,92,246,0.3)' : 'var(--glass-border)'}`, borderRadius: 10, gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>На складе: {item.quantity} {item.unit ?? 'шт.'}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        {item.price !== null && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{fmt(item.price)} ₸</span>}
                        <button
                          onClick={() => addToCart({ id: item.id, type: 'warehouse', name: item.name, price: item.price, qty: 1, maxQty: item.quantity })}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px', background: qty > 0 ? '#8b5cf6' : 'var(--bg-elevated)', border: `1px solid ${qty > 0 ? '#8b5cf6' : 'var(--glass-border)'}`, borderRadius: 8, cursor: 'pointer', color: qty > 0 ? '#fff' : 'var(--text-secondary)', fontSize: 12, fontWeight: 600, transition: 'all 0.15s' }}>
                          <Plus size={12} />{qty > 0 ? `В корзине (${qty})` : 'В корзину'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Nutrition */}
          {nutrition.length > 0 && (
            <div style={cardSt}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 13 }}>Питание</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {nutrition.map(item => {
                  const qty = inCart(item.id, 'warehouse')
                  return (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 13px', background: qty > 0 ? 'rgba(16,185,129,0.06)' : 'var(--bg-elevated)', border: `1px solid ${qty > 0 ? 'rgba(16,185,129,0.3)' : 'var(--glass-border)'}`, borderRadius: 10, gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>На складе: {item.quantity} {item.unit ?? 'шт.'}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        {item.price !== null && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{fmt(item.price)} ₸</span>}
                        <button
                          onClick={() => addToCart({ id: item.id, type: 'warehouse', name: item.name, price: item.price, qty: 1, maxQty: item.quantity })}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px', background: qty > 0 ? '#10b981' : 'var(--bg-elevated)', border: `1px solid ${qty > 0 ? '#10b981' : 'var(--glass-border)'}`, borderRadius: 8, cursor: 'pointer', color: qty > 0 ? '#fff' : 'var(--text-secondary)', fontSize: 12, fontWeight: 600, transition: 'all 0.15s' }}>
                          <Plus size={12} />{qty > 0 ? `В корзине (${qty})` : 'В корзину'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {templates.length === 0 && merch.length === 0 && nutrition.length === 0 && (
            <div style={{ ...cardSt, textAlign: 'center', padding: 34 }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Нет доступных товаров для продажи</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
