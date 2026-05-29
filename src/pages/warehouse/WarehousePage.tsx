import React, { useState, useEffect, useCallback } from 'react'
import { X, AlertTriangle, Package, ArrowDown, ArrowUp, Trash2, Edit2 } from 'lucide-react'
import { warehouseApi } from '../../api/warehouse.api'
import { catalogApi } from '../../api/catalog.api'
import { branchesApi, type BranchRaw } from '../../api/branches.api'
import { ContextMenu, type ContextMenuEntry } from '../../components/ContextMenu'
import { BranchSelector } from '../../components/ui/BranchSelector'
import { useAuth } from '../../hooks/useAuth'
import { playSound } from '../../lib/notify'
import type { WarehouseItem, WarehouseMovement, WarehouseCategory, CatalogItem } from '../../types'

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

// ─── ItemCardModal ───────────────────────────────────────────────────────────

function ItemCardModal({ item: initialItem, canEdit, onClose, onMovement, onEdit, onDelete }: {
  item: WarehouseItem
  canEdit: boolean
  onClose: () => void
  onMovement: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [movements, setMovements] = useState<WarehouseMovement[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showIn,    setShowIn]    = useState(false)
  const [qty,       setQty]       = useState('')
  const [notes,     setNotes]     = useState('')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const item = initialItem

  useEffect(() => {
    warehouseApi.getMovements(item.id)
      .then(data => setMovements(data.slice(0, 10)))
      .catch(() => { /* ignore */ })
      .finally(() => setLoading(false))
  }, [item.id])

  const stockPct = item.min_quantity && item.min_quantity > 0
    ? Math.min(100, Math.round((item.quantity / item.min_quantity) * 100))
    : null

  const handleIn = async () => {
    const q = parseInt(qty, 10)
    if (!q || q <= 0) { setError('Укажите количество'); return }
    setSaving(true); setError(null)
    try {
      await warehouseApi.addMovement(item.id, { type: 'in', quantity: q, notes: notes.trim() || undefined })
      onMovement()
      onClose()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Ошибка')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 560, maxHeight: '88vh', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '21px 21px 13px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: `${CATEGORY_COLORS[item.category]}18`, color: CATEGORY_COLORS[item.category] }}>
                {CATEGORY_LABELS[item.category]}
              </span>
              {item.sku && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>SKU: {item.sku}</span>}
              {item.unit && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ед: {item.unit}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 21 }}>
          {/* Stock info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13, marginBottom: 21 }}>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 13, padding: 13 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Остаток</div>
              <div style={{ fontSize: 21, fontWeight: 700, color: item.low_stock ? '#ef4444' : 'var(--text-primary)' }}>
                {item.quantity} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>{item.unit || 'шт.'}</span>
              </div>
              {stockPct !== null && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 4, background: 'var(--glass-border)', borderRadius: 2, marginBottom: 4 }}>
                    <div style={{ height: '100%', width: `${stockPct}%`, background: stockPct < 50 ? '#ef4444' : '#10b981', borderRadius: 2, transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Мин: {item.min_quantity} {item.unit || 'шт.'}</div>
                </div>
              )}
            </div>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 13, padding: 13 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Стоимость остатка</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
                {item.price != null ? new Intl.NumberFormat('ru-KZ').format(item.quantity * item.price) + ' ₸' : '—'}
              </div>
              {item.price != null && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {new Intl.NumberFormat('ru-KZ').format(item.price)} ₸ / {item.unit || 'шт.'}
                </div>
              )}
            </div>
          </div>

          {/* Intake form */}
          {showIn ? (
            <div style={{ background: 'var(--bg-surface)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 13, padding: 13, marginBottom: 21 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#10b981', marginBottom: 10 }}>Приход</div>
              {error && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 8 }}>{error}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="number" min={1} style={{ ...inputStyle, width: 100 }} value={qty} onChange={e => setQty(e.target.value)} placeholder="Кол-во" />
                <input style={inputStyle} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Примечание" />
                <button onClick={() => void handleIn()} disabled={saving} style={{ height: 36, padding: '0 13px', background: '#10b981', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
                  {saving ? '...' : 'OK'}
                </button>
                <button onClick={() => { setShowIn(false); setError(null) }} style={{ height: 36, padding: '0 10px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>✕</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, marginBottom: 21 }}>
              <button onClick={() => setShowIn(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, color: '#10b981', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                <ArrowDown size={14} />Приход
              </button>
              {canEdit && (
                <>
                  <button onClick={() => { onEdit(); onClose() }} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 13px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
                    <Edit2 size={13} />Редактировать
                  </button>
                  <button onClick={() => { onDelete(); onClose() }} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 13px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#ef4444', fontSize: 13, cursor: 'pointer' }}>
                    <Trash2 size={13} />Удалить
                  </button>
                </>
              )}
            </div>
          )}

          {/* Movements */}
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Последние движения</div>
          {loading && <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Загрузка...</div>}
          {!loading && movements.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '13px 0' }}>Нет движений</div>}
          {movements.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '8px 0', borderBottom: '1px solid var(--glass-border)' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: m.type === 'in' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', flexShrink: 0 }}>
                {m.type === 'in' ? <ArrowDown size={13} color="#10b981" /> : <ArrowUp size={13} color="#ef4444" />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: m.type === 'in' ? '#10b981' : '#ef4444' }}>{m.type === 'in' ? '+' : '−'}{m.quantity} {item.unit || 'шт.'}</div>
                {m.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.notes}</div>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {new Date(m.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── BulkIntakeModal ─────────────────────────────────────────────────────────

function BulkIntakeModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])
  const [quantities,   setQuantities]   = useState<Record<string, string>>({})
  const [supplier,     setSupplier]     = useState('')
  const [notes,        setNotes]        = useState('')
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  useEffect(() => {
    catalogApi.getAll()
      .then(data => setCatalogItems(data))
      .catch(() => setError('Не удалось загрузить каталог'))
      .finally(() => setLoading(false))
  }, [])

  const toProcess = catalogItems.filter(i => parseInt(quantities[i.id] || '0', 10) > 0)

  const handleSubmit = async () => {
    if (toProcess.length === 0) { setError('Укажите количество хотя бы для одного товара'); return }
    setSaving(true); setError(null)
    try {
      await Promise.all(toProcess.map(item => {
        const qty = parseInt(quantities[item.id], 10)
        return warehouseApi.intake({
          catalog_item_id: item.id,
          quantity: qty,
          supplier: supplier.trim() || undefined,
          notes: notes.trim() || undefined,
        })
      }))
      onDone()
      onClose()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Ошибка')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 560, maxHeight: '88vh', background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, boxShadow: '0 24px 64px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '21px 21px 13px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Приход на склад</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 21 }}>
          {error && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 13 }}>{error}</div>}

          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '21px 0' }}>Загрузка каталога...</div>
          ) : catalogItems.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '21px 0' }}>Каталог пуст. Добавьте товары в разделе Управление → Каталог.</div>
          ) : (
            <div style={{ marginBottom: 21 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--glass-border)', marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Товар</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>Приход</div>
              </div>
              {catalogItems.map(item => (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--glass-border)', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{item.name}</div>
                    {item.sku && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.sku}</div>}
                  </div>
                  <input
                    type="number" min={0}
                    value={quantities[item.id] || ''}
                    onChange={e => setQuantities(prev => ({ ...prev, [item.id]: e.target.value }))}
                    placeholder="0"
                    style={{ ...inputStyle, height: 30, fontSize: 12, textAlign: 'center', padding: '0 6px' }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Supplier + notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Поставщик</label>
              <input style={inputStyle} value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Название поставщика" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Заметки</label>
              <input style={inputStyle} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Необязательно" />
            </div>
          </div>

          {toProcess.length > 0 && (
            <div style={{ marginTop: 13, padding: '8px 13px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, fontSize: 12, color: '#10b981' }}>
              {toProcess.length} позиций будет принято
            </div>
          )}
        </div>

        <div style={{ padding: '13px 21px', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, height: 40, background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Отмена</button>
          <button onClick={() => void handleSubmit()} disabled={saving || loading} style={{ flex: 2, height: 40, background: '#10b981', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: (saving || loading) ? 'not-allowed' : 'pointer', opacity: (saving || loading) ? 0.7 : 1 }}>
            {saving ? 'Оформляем...' : 'Оформить приход'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── EditItemModal ───────────────────────────────────────────────────────────

function EditItemModal({ item, onClose, onSave }: { item: WarehouseItem; onClose: () => void; onSave: (updated: WarehouseItem) => void }) {
  const [name,        setName]        = useState(item.name)
  const [sku,         setSku]         = useState(item.sku || '')
  const [category,    setCategory]    = useState<WarehouseCategory>(item.category)
  const [unit,        setUnit]        = useState(item.unit || '')
  const [minQuantity, setMinQuantity] = useState(item.min_quantity?.toString() || '')
  const [price,       setPrice]       = useState(item.price?.toString() || '')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const handleSave = async () => {
    if (!name.trim()) { setError('Введите название'); return }
    setSaving(true); setError(null)
    try {
      const updated = await warehouseApi.patch(item.id, {
        name:         name.trim(),
        sku:          sku.trim() || null,
        category,
        unit:         unit.trim() || null,
        min_quantity: minQuantity ? parseInt(minQuantity, 10) : null,
        price:        price ? parseFloat(price) : null,
      } as Partial<WarehouseItem>)
      onSave(updated)
      onClose()
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Ошибка')
    } finally { setSaving(false) }
  }

  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 21 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 440, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 21, padding: 34, boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 21 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Редактировать</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>
        {error && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 13 }}>{error}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Название *</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} autoFocus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>SKU</label>
              <input style={inputStyle} value={sku} onChange={e => setSku(e.target.value)} placeholder="Артикул" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Единица</label>
              <input style={inputStyle} value={unit} onChange={e => setUnit(e.target.value)} placeholder="шт., кг, л" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Категория</label>
              <select style={selectStyle} value={category} onChange={e => setCategory(e.target.value as WarehouseCategory)}>
                {(Object.keys(CATEGORY_LABELS) as WarehouseCategory[]).map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Мин. остаток</label>
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
  const [sku,         setSku]         = useState('')
  const [category,    setCategory]    = useState<WarehouseCategory>('merch')
  const [unit,        setUnit]        = useState('')
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
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Ошибка при создании')
    } finally { setSaving(false) }
  }

  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }

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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>SKU</label>
              <input style={inputStyle} value={sku} onChange={e => setSku(e.target.value)} placeholder="Артикул" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Единица</label>
              <input style={inputStyle} value={unit} onChange={e => setUnit(e.target.value)} placeholder="шт., кг" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Категория</label>
              <select style={selectStyle} value={category} onChange={e => setCategory(e.target.value as WarehouseCategory)}>
                {(Object.keys(CATEGORY_LABELS) as WarehouseCategory[]).map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Количество</label>
              <input type="number" min={0} style={inputStyle} value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Мин. (сигнал)</label>
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
  const { user } = useAuth()
  const [items,              setItems]              = useState<WarehouseItem[]>([])
  const [loading,            setLoading]            = useState(true)
  const [showBulk,           setShowBulk]           = useState(false)
  const [cardItem,           setCardItem]           = useState<WarehouseItem | null>(null)
  const [editItem,           setEditItem]           = useState<WarehouseItem | null>(null)
  const [ctxMenu,            setCtxMenu]            = useState<{ item: WarehouseItem; x: number; y: number } | null>(null)
  const [filterCat,          setFilterCat]          = useState<WarehouseCategory | 'all'>('all')
  const [selectedBranchIds,  setSelectedBranchIds]  = useState<string[]>(() => {
    const id = localStorage.getItem('activeBranchId')
    return id ? [id] : []
  })
  const [branches, setBranches] = useState<BranchRaw[]>([])

  const canEdit = user?.role === 'developer' || user?.role === 'owner'
  const canIntake = canEdit || user?.role === 'franchisee'
  const multiBranch = selectedBranchIds.length > 1

  useEffect(() => {
    if (user?.role !== 'developer' && user?.role !== 'owner') return
    branchesApi.getAll().then(setBranches).catch(() => { /* ignore */ })
  }, [user?.role])

  const getBranchName = (branchId: string) => branches.find(b => b.id === branchId)?.name ?? branchId

  const load = useCallback(async () => {
    try {
      const data = await warehouseApi.getAll(selectedBranchIds.length > 0 ? selectedBranchIds : undefined)
      setItems(data)
      if (data.some(i => i.low_stock)) playSound('low_stock')
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [selectedBranchIds])

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
    try { await warehouseApi.delete(id); setItems(prev => prev.filter(i => i.id !== id)) } catch { /* ignore */ }
  }

  const buildCtxItems = (item: WarehouseItem): ContextMenuEntry[] => {
    const entries: ContextMenuEntry[] = [
      { label: 'Открыть',  onClick: () => { setCardItem(item); setCtxMenu(null) } },
    ]
    if (canIntake) {
      entries.push({ label: 'Приход', onClick: () => { setCardItem(item); setCtxMenu(null) } })
    }
    if (canEdit) {
      entries.push({ separator: true })
      entries.push({ label: 'Редактировать', onClick: () => { setEditItem(item); setCtxMenu(null) } })
      entries.push({ label: 'Удалить', danger: true, onClick: () => { void handleDelete(item.id); setCtxMenu(null) } })
    }
    return entries
  }

  return (
    <div>
      {user?.role && (
        <BranchSelector
          role={user.role}
          selectedIds={selectedBranchIds}
          onChange={setSelectedBranchIds}
        />
      )}

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
          {canIntake && (
            <button
              onClick={() => setShowBulk(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, color: '#10b981', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              <ArrowDown size={15} />Приход на склад
            </button>
          )}
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

      {/* Table */}
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
                {[...(multiBranch ? ['Филиал'] : []), 'Название', 'Категория', 'Количество', 'Мин.', 'Цена'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr
                  key={item.id}
                  onClick={() => setCardItem(item)}
                  onContextMenu={e => { e.preventDefault(); setCtxMenu({ item, x: e.clientX, y: e.clientY }) }}
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--glass-border)' : 'none',
                    background: item.low_stock ? 'rgba(239,68,68,0.04)' : 'transparent',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                >
                  {multiBranch && (
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                      {getBranchName(item.branch_id)}
                    </td>
                  )}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {item.low_stock && <AlertTriangle size={13} color="#ef4444" />}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{item.name}</div>
                        {item.sku && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.sku}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: `${CATEGORY_COLORS[item.category]}18`, color: CATEGORY_COLORS[item.category] }}>
                      {CATEGORY_LABELS[item.category]}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: item.low_stock ? '#ef4444' : 'var(--text-primary)' }}>{item.quantity}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>{item.unit || 'шт.'}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                    {item.min_quantity ?? '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-primary)' }}>
                    {item.price != null ? new Intl.NumberFormat('ru-KZ').format(item.price) + ' ₸' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showBulk && <BulkIntakeModal onClose={() => setShowBulk(false)} onDone={() => void load()} />}

      {cardItem && (
        <ItemCardModal
          item={cardItem}
          canEdit={canEdit}
          onClose={() => setCardItem(null)}
          onMovement={() => void load()}
          onEdit={() => setEditItem(cardItem)}
          onDelete={() => { void handleDelete(cardItem.id); setCardItem(null) }}
        />
      )}

      {editItem && (
        <EditItemModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSave={updated => { setItems(prev => prev.map(i => i.id === updated.id ? updated : i)); setEditItem(null) }}
        />
      )}

      {ctxMenu && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={buildCtxItems(ctxMenu.item)} onClose={() => setCtxMenu(null)} />}
    </div>
  )
}
