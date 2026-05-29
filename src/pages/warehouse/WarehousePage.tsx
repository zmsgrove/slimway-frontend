import React, { useState, useEffect, useCallback } from 'react'
import { Plus, X, AlertTriangle, Package, ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import { warehouseApi } from '../../api/warehouse.api'
import { ContextMenu, type ContextMenuEntry } from '../../components/ContextMenu'
import type { WarehouseItem, WarehouseMovement, WarehouseCategory } from '../../types'

// ─── constants ──────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<WarehouseCategory, string> = {
  merch:     'Мерч',
  nutrition: 'Питание',
  equipment: 'Оборудование',
  other:     'Прочее',
}

const CATEGORY_COLORS: Record<WarehouseCategory, string> = {
  merch:     '#8b5cf6',
  nutrition: '#10b981',
  equipment: '#3b82f6',
  other:     '#71717A',
}

const inputStyle: React.CSSProperties = {
  height: 36, padding: '0 13px', background: 'var(--bg-elevated)',
  border: '1px solid var(--glass-border)', borderRadius: 8,
  color: 'var(--text-primary)', fontSize: 13, outline: 'none',
  width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
}

// ─── MovementsModal ──────────────────────────────────────────────────────────

function MovementsModal({ item, onClose }: { item: WarehouseItem; onClose: () => void }) {
  const [movements, setMovements] = useState<WarehouseMovement[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    warehouseApi.getMovements(item.id)
      .then(setMovements)
      .catch(() => { /* ignore */ })
      .finally(() => setLoading(false))
  }, [item.id])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 520, maxHeight: '80vh', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '21px 21px 13px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>История движений</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 21 }}>
          {loading && <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Загрузка...</div>}
          {!loading && movements.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 21 }}>Нет движений</div>}
          {movements.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '10px 0', borderBottom: '1px solid var(--glass-border)' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: m.type === 'in' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', flexShrink: 0 }}>
                {m.type === 'in'
                  ? <ArrowDown size={14} color="#10b981" />
                  : <ArrowUp   size={14} color="#ef4444" />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: m.type === 'in' ? '#10b981' : '#ef4444' }}>
                  {m.type === 'in' ? '+' : '−'}{m.quantity} шт.
                </div>
                {m.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.notes}</div>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {new Date(m.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── AddMovementModal ────────────────────────────────────────────────────────

function AddMovementModal({ item, onClose, onDone }: { item: WarehouseItem; onClose: () => void; onDone: () => void }) {
  const [type,     setType]     = useState<'in' | 'out'>('in')
  const [qty,      setQty]      = useState('')
  const [notes,    setNotes]    = useState('')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const handleSave = async () => {
    const q = parseInt(qty, 10)
    if (!q || q <= 0) { setError('Укажите количество'); return }
    setSaving(true); setError(null)
    try {
      await warehouseApi.addMovement(item.id, { type, quantity: q, notes: notes.trim() || undefined })
      onDone()
      onClose()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Ошибка при сохранении')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 400, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 34, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 21 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Движение: {item.name}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>
        {error && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 13 }}>{error}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Тип</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['in', 'out'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  style={{ flex: 1, height: 36, borderRadius: 8, border: `1px solid ${type === t ? (t === 'in' ? '#10b981' : '#ef4444') : 'var(--glass-border)'}`, background: type === t ? (t === 'in' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)') : 'transparent', color: type === t ? (t === 'in' ? '#10b981' : '#ef4444') : 'var(--text-secondary)', fontSize: 13, fontWeight: type === t ? 600 : 400, cursor: 'pointer' }}
                >
                  {t === 'in' ? 'Приход ↓' : 'Расход ↑'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Количество</label>
            <input type="number" min={1} style={inputStyle} value={qty} onChange={e => setQty(e.target.value)} placeholder="1" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Примечание</label>
            <input style={inputStyle} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Необязательно" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 21 }}>
          <button onClick={onClose} style={{ flex: 1, height: 40, background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Отмена</button>
          <button onClick={() => void handleSave()} disabled={saving} style={{ flex: 2, height: 40, background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── CreateItemModal ─────────────────────────────────────────────────────────

function CreateItemModal({ onClose, onCreate }: { onClose: () => void; onCreate: (item: WarehouseItem) => void }) {
  const [name,        setName]        = useState('')
  const [category,    setCategory]    = useState<WarehouseCategory>('merch')
  const [quantity,    setQuantity]    = useState('0')
  const [minQuantity, setMinQuantity] = useState('')
  const [price,       setPrice]       = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const handleCreate = async () => {
    if (!name.trim()) { setError('Введите название'); return }
    setSaving(true); setError(null)
    try {
      const item = await warehouseApi.create({
        name:         name.trim(),
        category,
        quantity:     parseInt(quantity, 10) || 0,
        min_quantity: minQuantity ? parseInt(minQuantity, 10) : null,
        price:        price ? parseFloat(price) : null,
      })
      onCreate(item)
      onClose()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg ?? 'Ошибка при создании')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 440, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 34, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 21 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Новая позиция</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>
        {error && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 13 }}>{error}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Название *</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Название позиции" autoFocus />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Категория</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={category} onChange={e => setCategory(e.target.value as WarehouseCategory)}>
              {(Object.keys(CATEGORY_LABELS) as WarehouseCategory[]).map(c => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Количество</label>
              <input type="number" min={0} style={inputStyle} value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Минимум (сигнал)</label>
              <input type="number" min={0} style={inputStyle} value={minQuantity} onChange={e => setMinQuantity(e.target.value)} placeholder="Нет" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Цена (₸)</label>
              <input type="number" min={0} style={inputStyle} value={price} onChange={e => setPrice(e.target.value)} placeholder="Нет" />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 21 }}>
          <button onClick={onClose} style={{ flex: 1, height: 40, background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Отмена</button>
          <button onClick={() => void handleCreate()} disabled={saving} style={{ flex: 2, height: 40, background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Создание...' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function WarehousePage() {
  const [items,     setItems]     = useState<WarehouseItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [moveItem,  setMoveItem]  = useState<WarehouseItem | null>(null)
  const [histItem,  setHistItem]  = useState<WarehouseItem | null>(null)
  const [ctxMenu,   setCtxMenu]   = useState<{ item: WarehouseItem; x: number; y: number } | null>(null)
  const [filterCat, setFilterCat] = useState<WarehouseCategory | 'all'>('all')

  const load = useCallback(async () => {
    try {
      const data = await warehouseApi.getAll()
      setItems(data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    const close = () => setCtxMenu(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  const filtered = filterCat === 'all' ? items : items.filter(i => i.category === filterCat)
  const lowStockCount = items.filter(i => i.low_stock).length

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить позицию?')) return
    try {
      await warehouseApi.delete(id)
      setItems(prev => prev.filter(i => i.id !== id))
    } catch { /* ignore */ }
  }

  const buildCtxItems = (item: WarehouseItem): ContextMenuEntry[] => [
    { label: 'Приход',   onClick: () => { setMoveItem(item); setCtxMenu(null) } },
    { label: 'Расход',   onClick: () => { setMoveItem(item); setCtxMenu(null) } },
    { label: 'История',  onClick: () => { setHistItem(item); setCtxMenu(null) } },
    { separator: true },
    { label: 'Удалить',  danger: true, onClick: () => { void handleDelete(item.id); setCtxMenu(null) } },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 21 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)', margin: 0, marginBottom: 4 }}>Склад</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Учёт товаров и расходников</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {lowStockCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
              <AlertTriangle size={13} color="#ef4444" />
              <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>{lowStockCount} мало</span>
            </div>
          )}
          <button
            onClick={() => setShowCreate(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px', background: '#02BDB6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <Plus size={15} />Позиция
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 13, flexWrap: 'wrap' }}>
        {(['all', ...Object.keys(CATEGORY_LABELS)] as (WarehouseCategory | 'all')[]).map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            style={{
              height: 32, padding: '0 13px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
              background: filterCat === cat ? (cat === 'all' ? '#02BDB6' : CATEGORY_COLORS[cat as WarehouseCategory]) : 'transparent',
              border: `1px solid ${filterCat === cat ? (cat === 'all' ? '#02BDB6' : CATEGORY_COLORS[cat as WarehouseCategory]) : 'var(--glass-border)'}`,
              color: filterCat === cat ? '#fff' : 'var(--text-secondary)',
              fontWeight: filterCat === cat ? 600 : 400,
            }}
          >
            {cat === 'all' ? 'Все' : CATEGORY_LABELS[cat as WarehouseCategory]}
          </button>
        ))}
      </div>

      {/* Items table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 34, color: 'var(--text-muted)', fontSize: 13 }}>Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 55, color: 'var(--text-muted)' }}>
          <Package size={40} strokeWidth={1} style={{ marginBottom: 13, opacity: 0.3 }} />
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Склад пуст</div>
          <div style={{ fontSize: 13 }}>Добавьте первую позицию</div>
        </div>
      ) : (
        <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--glass-border)', borderRadius: 21, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                {['Название', 'Категория', 'Количество', 'Мин.', 'Цена', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr
                  key={item.id}
                  onContextMenu={e => { e.preventDefault(); setCtxMenu({ item, x: e.clientX, y: e.clientY }) }}
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--glass-border)' : 'none', background: item.low_stock ? 'rgba(239,68,68,0.04)' : 'transparent', transition: 'background 0.15s' }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {item.low_stock && <AlertTriangle size={13} color="#ef4444" />}
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{item.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: `${CATEGORY_COLORS[item.category]}18`, color: CATEGORY_COLORS[item.category] }}>
                      {CATEGORY_LABELS[item.category]}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: item.low_stock ? '#ef4444' : 'var(--text-primary)' }}>{item.quantity}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>шт.</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                    {item.min_quantity ?? '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-primary)' }}>
                    {item.price != null ? new Intl.NumberFormat('ru-KZ').format(item.price) + ' ₸' : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setMoveItem(item)}
                        title="Добавить движение"
                        style={{ height: 30, padding: '0 10px', background: 'rgba(2,189,182,0.08)', border: '1px solid rgba(2,189,182,0.2)', borderRadius: 6, color: '#02BDB6', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <ArrowDown size={12} />
                      </button>
                      <button
                        onClick={() => setHistItem(item)}
                        title="История"
                        style={{ height: 30, padding: '0 10px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 6, color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer' }}
                      >
                        История
                      </button>
                      <button
                        onClick={() => void handleDelete(item.id)}
                        title="Удалить"
                        style={{ width: 30, height: 30, background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 6, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateItemModal onClose={() => setShowCreate(false)} onCreate={item => { setItems(prev => [item, ...prev]); setShowCreate(false) }} />}
      {moveItem   && <AddMovementModal item={moveItem} onClose={() => setMoveItem(null)} onDone={() => void load()} />}
      {histItem   && <MovementsModal   item={histItem} onClose={() => setHistItem(null)} />}
      {ctxMenu    && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={buildCtxItems(ctxMenu.item)} onClose={() => setCtxMenu(null)} />}
    </div>
  )
}
