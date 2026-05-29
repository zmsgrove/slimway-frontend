# Slimway CRM — INSTRUCTIONS.md

> Подробное техническое описание проекта для нового разработчика или ИИ-ассистента.
> Актуально на версию **v1.6.0**.

---

## Содержание

1. [Структура проекта](#1-структура-проекта)
2. [Стек технологий](#2-стек-технологий)
3. [Роли и права доступа](#3-роли-и-права-доступа)
4. [Схема БД](#4-схема-бд)
5. [Бэкенд — архитектура](#5-бэкенд--архитектура)
6. [API — все эндпоинты](#6-api--все-эндпоинты)
7. [Фронтенд — архитектура](#7-фронтенд--архитектура)
8. [Система тем (v1.6.0)](#8-система-тем-v160)
9. [Уведомления и звуки](#9-уведомления-и-звуки)
10. [Мультитенантность](#10-мультитенантность)
11. [Интеграции](#11-интеграции)
12. [Модули — детали](#12-модули--детали)
13. [Известные особенности](#13-известные-особенности)
14. [Дорожная карта](#14-дорожная-карта)

---

## 1. Структура проекта

```
slimwaycrm/
├── CLAUDE.md                      ← архитектурные правила (читать перед любым действием)
├── INSTRUCTIONS.md                ← этот файл
├── slimway-backend/               ← Node.js + Express + TypeScript
│   ├── src/
│   │   ├── index.ts               ← точка входа, регистрация роутов
│   │   ├── config/
│   │   │   ├── env.ts
│   │   │   └── supabase.ts        ← service_role клиент (обходит RLS)
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts ← requireAuth
│   │   │   ├── branch.middleware.ts ← resolveBranch
│   │   │   └── role.middleware.ts ← requireRole
│   │   ├── routes/                ← один файл = один ресурс
│   │   ├── types/index.ts         ← AuthUser, Role, ApiError
│   │   └── utils/
│   │       ├── logAction.ts       ← запись в audit_log
│   │       └── resolveBranchId.ts ← определение branch_id из req.user
│   └── supabase/migrations/       ← SQL миграции (001–006)
└── slimway-frontend/              ← React 18 + Vite + TypeScript
    ├── src/
    │   ├── main.tsx               ← точка входа; вызывает applyTheme до рендера
    │   ├── App.tsx                ← Router + ThemeProvider + AuthGuard
    │   ├── version.ts             ← export const VERSION = '1.6.0'
    │   ├── index.css              ← CSS переменные тем и акцентов
    │   ├── api/                   ← API-клиенты (axios, один файл = один ресурс)
    │   ├── components/layout/
    │   │   └── AppLayout.tsx      ← Sidebar + Header + Outlet
    │   ├── hooks/
    │   │   └── useAuth.ts         ← Supabase Auth → User state
    │   ├── lib/
    │   │   ├── api.ts             ← axios instance + interceptors
    │   │   ├── notify.ts          ← playSound(event)
    │   │   ├── supabase.ts        ← anon клиент
    │   │   ├── theme.ts           ← THEMES, ACCENTS, applyTheme, loadTheme, saveTheme
    │   │   └── ThemeContext.tsx   ← ThemeProvider, useTheme
    │   ├── pages/                 ← страницы по модулям
    │   └── types/index.ts         ← все TypeScript типы
    └── public/sound/              ← MP3 файлы уведомлений
```

---

## 2. Стек технологий

| Слой | Технология |
|---|---|
| Frontend | React 18 + Vite + TypeScript strict |
| UI | Tailwind CSS + lucide-react иконки |
| State | React Context (Auth, Theme) + локальный useState |
| Drag & Drop | @dnd-kit/core (везде touch support) |
| Backend | Node.js + Express 4 + TypeScript |
| БД | Supabase (PostgreSQL + Auth) |
| HTTP-клиент | Axios (с interceptors) |
| Хостинг | Render (backend + frontend) |

**Репозитории:**
- Frontend: `https://github.com/zmsgrove/slimway-frontend`
- Backend: `https://github.com/zmsgrove/slimway-backend`

**Live:**
- Backend: `https://slimway-backend.onrender.com`
- Frontend: `https://slimway-frontend.onrender.com`

---

## 3. Роли и права доступа

```
developer    — разработчик (zmsgrove), полный доступ везде
owner        — владелец сети, видит все свои филиалы
franchisee   — управляет своим филиалом
admin        — менеджер / администратор
trainer      — тренер (ограниченный доступ)
staff        — менеджер (аналог admin)
technical    — технический персонал
```

**Ключевые правила:**
- `developer` автоматически проходит любой `requireRole(...)` — проверяется первым в `role.middleware.ts`
- Роль хранится в `profiles.role` И в `app_metadata.role` в JWT
- `branch_id` хранится в `app_metadata.branch_id` в JWT
- При создании сотрудника (`POST /employees`) происходит маппинг `position → role`:
  - `manager` → `franchisee`
  - `staff` → `admin`
  - `technical` → `technical`

**Доступ к данным по роли:**
- `developer` / `owner`: видят все филиалы, могут передать `?branch_id=` в запросе
- `franchisee` / `admin` / `trainer` / `technical` / `staff`: только свой `branch_id` из JWT

---

## 4. Схема БД

### v1.0.0 — Начальная

**branches** — филиалы
```sql
id uuid PK, name text NOT NULL, city text, owner_id uuid→auth.users,
is_franchise bool DEFAULT false, created_at timestamptz, deleted_at timestamptz
```

**profiles** — пользователи (синк с auth.users)
```sql
id uuid PK→auth.users, branch_id uuid→branches, role text NOT NULL,
full_name text, phone text, theme_preference jsonb, created_at timestamptz
```
> Триггер `handle_new_user` автоматически создаёт профиль при регистрации.
> `role` из `raw_app_meta_data->>'role'` или `'admin'` по умолчанию.

**clients** — клиенты
```sql
id uuid PK, branch_id uuid NOT NULL, full_name text NOT NULL,
phone text, email text, birth_date date, notes text,
status text DEFAULT 'active' CHECK('active','draft'),
is_deleted bool DEFAULT false, created_at timestamptz
```

**memberships** — устаревшие абонементы (deprecated, не использовать)
```sql
id, client_id, branch_id, type('sessions','unlimited','period'),
total_sessions, used_sessions, start_date, end_date, price, status, created_at
```

**schedule** — устаревшее расписание (deprecated)
```sql
id, branch_id, trainer_id, title, starts_at, duration_min, capacity, created_at
```

**bookings** — устаревшие брони (deprecated)
```sql
id, schedule_id, client_id, membership_id, status, created_at
```

### v1.2.0 — Тренажёры и абонементы

**devices** — тренажёры
```sql
id uuid PK, branch_id uuid NOT NULL,
type text NOT NULL CHECK('vacuactiv','rollshape','infrastep','infrashape'),
number text NOT NULL, device_group text CHECK('A','B') DEFAULT 'A',
status text CHECK('active','maintenance','disabled') DEFAULT 'active',
created_at timestamptz
```

**subscriptions** — купленные абонементы
```sql
id uuid PK, client_id uuid NOT NULL, branch_id uuid NOT NULL,
name text NOT NULL,
slot_1_type text NOT NULL, slot_1_duration_min int NOT NULL,
slot_1_sessions_total int NOT NULL, slot_1_sessions_left int NOT NULL,
slot_2_type text NULL, slot_2_duration_min int NULL,
slot_2_sessions_total int NULL, slot_2_sessions_left int NULL,
date_start date NOT NULL, date_end date NULL, price numeric(10,2) NULL,
status text DEFAULT 'active' CHECK('active','frozen','expired','cancelled'),
deleted_at timestamptz NULL, deleted_by uuid NULL,
created_at timestamptz
```

**schedule_slots** — ячейки расписания
```sql
id uuid PK, branch_id uuid NOT NULL, device_id uuid NOT NULL,
date date NOT NULL, time_start time NOT NULL, time_end time NOT NULL,
status text CHECK('free','booked','blocked','maintenance') DEFAULT 'free',
booking_id uuid NULL,  -- заполняется при бронировании (без FK)
created_at timestamptz,
UNIQUE(device_id, date, time_start)
```

**bookings_v2** — брони v1.2
```sql
id uuid PK, client_id uuid NOT NULL, subscription_id uuid NOT NULL,
branch_id uuid NOT NULL, date date NOT NULL,
slot_1_schedule_slot_id uuid NOT NULL,
slot_2_schedule_slot_id uuid NULL,
created_by uuid NOT NULL, created_at timestamptz
```

### v1.2.1 — Шаблоны абонементов

**subscription_templates** — глобальные шаблоны (продукты)
```sql
id uuid PK, branch_id uuid NULL,  -- NULL = глобальный шаблон
name text NOT NULL,
slot_1_type text NOT NULL, slot_1_duration_min int NOT NULL,
slot_1_sessions_total int NOT NULL,
slot_2_type text NULL, slot_2_duration_min int NULL,
slot_2_sessions_total int NULL,
validity_days int NOT NULL DEFAULT 30,
price numeric(10,2) NULL, is_active bool DEFAULT true,
created_at timestamptz
```

**branch_subscription_templates** — связь шаблон ↔ филиал
```sql
id uuid PK, branch_id uuid NOT NULL, template_id uuid NOT NULL,
created_at timestamptz,
UNIQUE(branch_id, template_id)
```

### v1.3.0 — Сотрудники и смены

**employees** — сотрудники
```sql
id uuid PK, branch_id uuid NOT NULL, profile_id uuid NULL→profiles,
full_name text, first_name text, last_name text, middle_name text,
phone text, birth_date date, position text, department text, address text,
created_at timestamptz
```

**shifts** — смены
```sql
id uuid PK, branch_id uuid NOT NULL, employee_id uuid NOT NULL→employees,
date date NOT NULL, time_start time NOT NULL, time_end time NOT NULL,
status text CHECK('scheduled','active','completed') DEFAULT 'scheduled',
created_at timestamptz
```

**shift_checkins** — отметки на смене
```sql
id uuid PK, shift_id uuid NOT NULL, employee_id uuid NOT NULL,
branch_id uuid, checkin_at timestamptz, checkout_at timestamptz,
is_own_shift bool DEFAULT true, location text, created_at timestamptz
```

**departments** — отделы филиала
```sql
id uuid PK, branch_id uuid NOT NULL, name text NOT NULL, created_at timestamptz
```

**positions** — должности филиала
```sql
id uuid PK, branch_id uuid NOT NULL, name text NOT NULL, created_at timestamptz
```

### v1.4.0 — Лиды

**leads** — лиды воронки
```sql
id uuid PK, branch_id uuid NOT NULL, full_name text NOT NULL,
phone text, source text DEFAULT 'manual',
status text CHECK('new','in_work','waiting','success','fail') DEFAULT 'new',
assigned_to uuid NULL→profiles, notes text,
client_id uuid NULL→clients,  -- заполняется при success
created_by uuid NULL→profiles,
archived_at timestamptz NULL, created_at timestamptz, updated_at timestamptz
```

**lead_comments** — комментарии к лидам
```sql
id uuid PK, lead_id uuid NOT NULL→leads (CASCADE),
author_id uuid NULL→profiles, text text NOT NULL, created_at timestamptz
```

**audit_log** — история действий
```sql
id uuid PK, branch_id uuid NULL→branches,
entity_type text NOT NULL, entity_id uuid NOT NULL,
action text NOT NULL, actor_id uuid NULL→auth.users,
actor_name text, details jsonb, created_at timestamptz
```

### v1.5.0 — Задачи, склад, каталог

**tasks** — задачи (канбан)
```sql
id uuid PK, branch_id uuid NOT NULL, title text NOT NULL,
description text NULL, priority text CHECK('low','medium','high','critical') DEFAULT 'medium',
status text CHECK('new','today','week','long','done','closed','pending_close') DEFAULT 'new',
assigned_to uuid NULL,  -- employees.id
observer_ids jsonb DEFAULT '[]',  -- массив profile_id
created_by uuid NULL→profiles, deadline timestamptz NULL,
created_at timestamptz, updated_at timestamptz
```

**task_checklist_groups** — группы чеклиста
```sql
id uuid PK, task_id uuid NOT NULL→tasks (CASCADE),
title text NOT NULL, position int DEFAULT 0, created_at timestamptz
```

**task_checklist_items** — элементы чеклиста
```sql
id uuid PK, task_id uuid NOT NULL→tasks (CASCADE),
group_id uuid NULL→task_checklist_groups (SET NULL),
text text NOT NULL, is_done bool DEFAULT false, created_at timestamptz
```

**task_comments** — комментарии задач
```sql
id uuid PK, task_id uuid NOT NULL→tasks (CASCADE),
author_id uuid NULL→profiles, text text NOT NULL, created_at timestamptz
```

**warehouse_items** — товары склада
```sql
id uuid PK, branch_id uuid NOT NULL,
catalog_item_id uuid NULL,  -- связь с каталогом
name text NOT NULL, sku text NULL,
category text CHECK('merch','nutrition','equipment','other'),
unit text NULL, quantity int DEFAULT 0, min_quantity int NULL,
price numeric(10,2) NULL, deleted_at timestamptz NULL, created_at timestamptz
```

**warehouse_movements** — движения склада
```sql
id uuid PK, item_id uuid NOT NULL→warehouse_items (CASCADE),
branch_id uuid NOT NULL, type text CHECK('in','out','correction'),
quantity int NOT NULL, notes text NULL,
supplier text NULL, created_by uuid NULL→profiles, created_at timestamptz
```

**catalog_items** — глобальный каталог товаров
```sql
id uuid PK, name text NOT NULL, sku text NULL,
category text CHECK('merch','nutrition','equipment','other'),
unit text NULL, description text NULL, price numeric(10,2) NULL,
created_at timestamptz
```

### v1.6.0 — Темы

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme_preference jsonb;
-- Формат: { "theme": "dark", "accent": "teal" }
```

---

## 5. Бэкенд — архитектура

### Точка входа (`src/index.ts`)

```
helmet + cors + morgan + express.json
    ↓
/health                          — публичный health check
/api/tilda-proxy                 — публичный прокси для Tilda форм
/api/wazzup-proxy                — публичный прокси для Wazzup WhatsApp
    ↓
/api/v1/profile  → requireAuth → profileRouter   (БЕЗ resolveBranch)
    ↓
/api/v1/*        → requireAuth → resolveBranch → роутеры
```

> Профиль монтируется **до** глобального `resolveBranch`, потому что профиль не привязан к конкретному филиалу.

### Middleware

**`requireAuth`** (`auth.middleware.ts`)
- Извлекает Bearer-токен из заголовка `Authorization`
- Вызывает `supabase.auth.getUser(token)` через service_role клиент
- Читает `app_metadata.role` и `app_metadata.branch_id`
- Кладёт в `req.user = { id, role, branch_id, email }`

**`resolveBranch`** (`branch.middleware.ts`)
- `developer` / `owner`: берут `branch_id` из `?branch_id=` query (или `null` если не передан)
- Остальные: берут `branch_id` из JWT, возвращают `403` если не назначен

**`requireRole(...roles)`** (`role.middleware.ts`)
- `developer` — проходит всегда
- Остальные — проверяется вхождение в список `roles`

### Утилиты

**`logAction(params)`** (`utils/logAction.ts`)
- Вставляет запись в `audit_log`
- Используется при: отмена брони, перенос брони, удаление абонемента, создание клиента из лида, запрос закрытия задачи
- Параметры: `branch_id, entity_type, entity_id, action, actor_id, actor_name, details?`

**`resolveBranchId(user)`** (`utils/resolveBranchId.ts`)
- Возвращает `branch_id` из `req.user`
- Для `developer/owner` без `branch_id` в JWT — возвращает `null`

---

## 6. API — все эндпоинты

Базовый URL: `/api/v1`

Все роуты (кроме `/profile`) защищены: `requireAuth` + `resolveBranch`.

### `/profile` — без resolveBranch

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/profile` | все | Профиль текущего пользователя (`id, full_name, phone, role, theme_preference`) |
| PATCH | `/profile/theme` | все | Обновить тему `{ theme, accent }` в `profiles.theme_preference` |

### `/clients` — Клиенты

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/clients` | все | Список клиентов филиала; `?search=` — поиск по имени |
| GET | `/clients/:id` | все | Карточка клиента с memberships и bookings |
| POST | `/clients` | owner/franchisee/admin | Создать клиента (`full_name` обязателен) |
| PATCH | `/clients/:id` | owner/franchisee/admin | Обновить поля клиента |
| DELETE | `/clients/:id` | owner/franchisee/admin | Soft delete (`is_deleted = true`) |

### `/subscriptions` — Абонементы

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/subscriptions` | все | Список; `?client_id=`, `?status=` |
| GET | `/subscriptions/:id` | все | Один абонемент |
| POST | `/subscriptions` | owner/franchisee/admin | Создать абонемент (1 или 2 слота) |
| PATCH | `/subscriptions/:id` | owner/franchisee/admin | Обновить статус/даты/остатки сессий |
| DELETE | `/subscriptions/:id` | owner/franchisee | Soft delete + audit log |

**Обязательные поля при создании:**
`client_id, name, slot_1_type, slot_1_duration_min, slot_1_sessions_total, date_start`

### `/subscription-templates` — Шаблоны абонементов

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/subscription-templates` | все | developer/owner — все; franchisee/admin — только подключённые к филиалу |
| POST | `/subscription-templates` | owner | Создать глобальный шаблон (`branch_id = null`) |
| PATCH | `/subscription-templates/:id` | owner | Обновить шаблон |
| DELETE | `/subscription-templates/:id` | owner | Деактивировать (`is_active = false`) |

### `/branch-subscription-templates` — Связь шаблон ↔ филиал

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/branch-subscription-templates` | owner/franchisee | Шаблоны текущего филиала |
| POST | `/branch-subscription-templates` | owner/franchisee | Подключить шаблон к филиалу |
| DELETE | `/branch-subscription-templates/:id` | owner/franchisee | Отключить шаблон от филиала |

### `/schedule-slots` — Ячейки расписания

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/schedule-slots` | все | Ячейки; `?date=YYYY-MM-DD`, `?device_id=` |
| POST | `/schedule-slots` | owner/franchisee/admin | Создать ячейку |
| POST | `/schedule-slots/bulk` | owner/franchisee/admin | Массовое создание (upsert, дубли игнорируются) |
| PATCH | `/schedule-slots/:id` | owner/franchisee/admin | Обновить статус |
| DELETE | `/schedule-slots/:id` | owner/franchisee/admin | Удалить только если `status = 'free'` |

### `/bookings-v2` — Бронирования

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| POST | `/bookings-v2` | owner/franchisee/admin | Создать бронь (автопоиск слота 2) |
| GET | `/bookings-v2/:id` | owner/franchisee/admin | Бронь с клиентом, абонементом, слотами |
| DELETE | `/bookings-v2/:id` | owner/franchisee/admin | Отмена; < 24ч — только owner/franchisee+ |
| PATCH | `/bookings-v2/:id/reschedule` | все auth | Перенос; < 24ч — только owner/franchisee+ |

**Логика бронирования (POST):**
1. Проверить абонемент: `status = active`, `slot_1_sessions_left > 0`
2. Проверить slot_1: `status = free`
3. Если у абонемента есть slot_2 — автоматически найти свободный слот того же типа, начинающийся ровно в `slot_1.time_end`
4. Если slot_2 не найден — вернуть `409 NO_SLOT2` с `next_available`
5. Создать запись в `bookings_v2`, обновить статусы слотов, уменьшить счётчики сессий

**24ч ограничение:** Отмена/перенос менее чем за 24 часа до начала слота — только `developer/owner/franchisee`.

### `/devices` — Тренажёры

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/devices` | все | Список тренажёров филиала |
| POST | `/devices` | owner/franchisee | Добавить тренажёр |
| PATCH | `/devices/:id` | owner/franchisee | Обновить тренажёр |
| DELETE | `/devices/:id` | owner/franchisee | Удалить тренажёр |

**Типы тренажёров:** `vacuactiv` | `rollshape` | `infrastep` | `infrashape`

### `/employees` — Сотрудники

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/employees` | все | Список сотрудников |
| POST | `/employees` | owner/franchisee | Создать сотрудника (атомарно: auth + profile + employee) |
| PATCH | `/employees/:id` | owner/franchisee/admin | Обновить данные |
| DELETE | `/employees/:id` | owner/franchisee | Удалить (также удаляет auth.users) |

**Создание сотрудника — атомарный процесс:**
1. `supabase.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role, branch_id } })`
2. `upsert` в `profiles`
3. `insert` в `employees`
4. При ошибке на шагах 2–3 откатывается удалением auth пользователя

### `/shifts` — Смены

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/shifts` | все | Список; `?week_start=`, `?week_end=`, `?employee_id=` |
| POST | `/shifts` | owner/franchisee/admin | Создать смену |
| POST | `/shifts/bulk` | owner/franchisee/admin | Массовое создание (пропускает дубли по employee+date) |
| PATCH | `/shifts/:id` | owner/franchisee/admin | Обновить время/статус |
| DELETE | `/shifts/:id` | owner/franchisee/admin | Удалить смену |
| POST | `/shifts/:id/checkin` | все | Отметиться на смене (меняет статус на `active`) |
| POST | `/shifts/:id/checkout` | все | Завершить смену (меняет статус на `completed`) |

### `/leads` — Лиды

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/leads` | все | Список; `?status=`, `?archived=true/false` |
| GET | `/leads/:id` | все | Лид с комментариями и профилями авторов |
| POST | `/leads` | все | Создать лид (`full_name` обязателен) |
| PATCH | `/leads/:id` | все | Обновить поля лида |
| PATCH | `/leads/:id/status` | все | Сменить статус |
| DELETE | `/leads/:id` | все | Удалить лид навсегда |
| POST | `/leads/:id/comments` | все | Добавить комментарий |

**Особая логика `PATCH /leads/:id/status`:**
- При переводе в `status = 'success'` и отсутствии `client_id` — автоматически создаётся клиент (`status = 'draft'`) и записывается в `audit_log`
- Ответ включает: `{ lead, client }` (client = null если не создавался)

**Назначение (`assigned_to`):** принимает `employees.id`, резолвится в `employees.profile_id` для хранения в `leads.assigned_to`.

### `/tasks` — Задачи

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/tasks` | все | Задачи; privileged видят все, остальные — только свои |
| GET | `/tasks/:id` | все | Одна задача с чеклистами и комментариями |
| POST | `/tasks` | все | Создать задачу (`title` обязателен) |
| PATCH | `/tasks/:id` | creator/privileged | Обновить задачу |
| DELETE | `/tasks/:id` | все | Удалить задачу |
| PATCH | `/tasks/:id/status` | creator/assignee/privileged | Сменить статус |
| POST | `/tasks/:id/confirm-close` | creator/privileged | Подтвердить закрытие (из `pending_close`) |
| POST | `/tasks/:id/checklists` | все | Добавить пункт чеклиста |
| PATCH | `/tasks/:id/checklists/:item_id` | все | Обновить пункт чеклиста |
| POST | `/tasks/:id/checklist-groups` | все | Создать группу чеклиста |
| POST | `/tasks/:id/checklist-groups/:gid/items` | все | Добавить пункт в группу |
| DELETE | `/tasks/:id/checklist-groups/:gid` | все | Удалить группу чеклиста |
| POST | `/tasks/:id/comments` | все | Добавить комментарий |

**Статусы задач:** `new` | `today` | `week` | `long` | `done` | `closed` | `pending_close`

**Логика закрытия (pending_close):**
- Исполнитель (`assignee`) нажимает "Закрыть" → статус меняется на `pending_close` (не `closed`)
- Создатель или `privileged` подтверждает через `POST /confirm-close`
- Прямо установить `closed` может только `creator` или `privileged`

**Видимость задач для непривилегированных:**
```
created_by = userId OR assigned_to = employee.id OR observer_ids содержит userId
```

**Привилегированные роли в задачах:** `developer` | `owner` | `franchisee`

### `/warehouse` — Склад

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/warehouse` | все | Список товаров; `?branch_ids=id1,id2` для мультифилиала |
| GET | `/warehouse/export` | все | Движения склада; `?from=`, `?to=` |
| GET | `/warehouse/:id` | все | Один товар (с полем `low_stock`) |
| POST | `/warehouse` | owner | Создать товар вручную |
| POST | `/warehouse/intake` | owner/franchisee | Приход из каталога (auto-create warehouse_item) |
| PATCH | `/warehouse/:id` | owner | Обновить товар |
| DELETE | `/warehouse/:id` | owner | Soft delete (`deleted_at`) |
| POST | `/warehouse/:id/movement` | owner/franchisee | Движение `in`/`out` |
| GET | `/warehouse/:id/movements` | все | История движений товара |

**Защита от отрицательного остатка:** при `out` проверяется `quantity - delta >= 0`, иначе `400 INSUFFICIENT_QTY`.

**`low_stock`:** вычисляется на лету: `quantity <= min_quantity` (если `min_quantity` задан).

### `/catalog` — Каталог товаров

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/catalog` | все | Глобальный каталог товаров |
| POST | `/catalog` | owner | Создать товар в каталоге |
| PATCH | `/catalog/:id` | owner | Обновить товар каталога |
| DELETE | `/catalog/:id` | owner | Удалить из каталога |

### `/branches` — Филиалы

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/branches` | все | developer → все; owner/franchisee → свои; остальные → только свой |
| POST | `/branches` | owner | Создать филиал |
| DELETE | `/branches/:id` | developer | Soft delete (требует `{ confirm: true }` в теле) |

### `/departments` и `/positions`

Аналогичный CRUD (`GET /`, `POST /`, `PATCH /:id`, `DELETE /:id`).
Доступ: `owner/franchisee` для создания/изменения/удаления.

### `/analytics`

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/analytics/overview` | все | Сводная статистика; `?branch_ids=id1,id2` или `?branch_id=` |

**Возвращает:**
```json
{
  "clients_total": 0,
  "subscriptions_active": 0,
  "subscriptions_expiring_soon": 0,
  "subscriptions_expiring_30d": 0,
  "slots_today": 0,
  "visits_today": 0,
  "leads_new": 0,
  "active_shifts": 0,
  "low_stock_items": 0,
  "by_branch": []  // только если запрошено несколько филиалов
}
```

### `/audit-log`

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| GET | `/audit-log` | все | История действий; `?entity_id=`, `?entity_type=`, `?limit=` |

---

## 7. Фронтенд — архитектура

### Точка входа (`src/main.tsx`)

```tsx
applyTheme(getStoredTheme())  // применяется ДО рендера React — нет мигания темы
ReactDOM.createRoot(...)
  .render(<App />)
```

### App (`src/App.tsx`)

```
Router
  └── ThemeProvider (userId из useAuth)
       └── routes:
            /login       → LoginPage (публичная)
            /            → AppLayout (protected)
                         → Outlet → страницы
```

### Хуки

**`useAuth()`** (`hooks/useAuth.ts`)
```typescript
{ user: User | null, loading: boolean, signOut: () => void }
```
- Читает `supabase.auth.getSession()` при монтировании
- Подписывается на `onAuthStateChange`
- `user.role` и `user.branchId` из `app_metadata`

### API-клиент (`lib/api.ts`)

```typescript
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL })
```

**Request interceptor:**
1. Добавляет `Authorization: Bearer <token>` из текущей Supabase сессии
2. Добавляет `branch_id` из `localStorage('activeBranchId')` в query params

**Response interceptor:**
- `401` → `supabase.auth.signOut()` + редирект на `/login`

### Страницы

| Путь | Файл | Описание |
|---|---|---|
| `/dashboard` | `pages/dashboard/DashboardPage.tsx` | Аналитика, счётчики |
| `/clients` | `pages/clients/ClientsPage.tsx` | Список клиентов |
| `/subscriptions` | `pages/subscriptions/SubscriptionsPage.tsx` | Абонементы |
| `/sale` | `pages/sale/SalePage.tsx` | Продажа абонемента/мерча |
| `/schedule` | `pages/schedule/SchedulePage.tsx` | Расписание и бронирование |
| `/leads` | `pages/leads/LeadsPage.tsx` | Воронка продаж |
| `/tasks` | `pages/tasks/TasksPage.tsx` | Канбан задач |
| `/chat` | `pages/chat/ChatPage.tsx` | Внутренний чат |
| `/employees` | `pages/employees/EmployeesPage.tsx` | Сотрудники |
| `/schedule-work` | `pages/schedule-work/ScheduleWorkPage.tsx` | График смен |
| `/warehouse` | `pages/warehouse/WarehousePage.tsx` | Склад |
| `/management` | `pages/management/ManagementPage.tsx` | Управление (owner+) |
| `/settings` | `pages/settings/SettingsPage.tsx` | Настройки профиля, темы, уведомлений |

### Layout (`components/layout/AppLayout.tsx`)

- **Сайдбар**: фиксированный, 220px, `var(--bg-sidebar)`, `var(--border)`
- **Хедер**: фиксированный, 56px, кнопка переключения тёмная/светлая тема, имя пользователя
- **BranchSwitcher**: `developer/owner` могут переключать филиалы; перезагружает страницу при смене
- **Управление**: показывается только для `developer/owner/franchisee`

---

## 8. Система тем (v1.6.0)

### Типы

```typescript
type ThemeId =
  | 'black' | 'dark' | 'dark-blue' | 'dark-green' | 'dark-purple' | 'coffee'
  | 'white' | 'cream' | 'light-blue' | 'light-green' | 'lavender' | 'light-gray'

type AccentColor = 'teal' | 'purple' | 'blue' | 'green' | 'orange' | 'pink' | 'gray'

interface ThemePreference { theme: ThemeId; accent: AccentColor }
```

### CSS переменные (`src/index.css`)

Каждый `[data-theme="X"]` блок определяет:
- `--bg` — основной фон страницы
- `--bg-card` — фон карточек/панелей
- `--bg-sidebar` — фон сайдбара
- `--border` — цвет границ
- `--text` — основной текст
- `--text-secondary` — вторичный текст
- `--text-muted` — приглушённый текст

Каждый `[data-accent="X"]` блок определяет:
- `--accent` — основной акцентный цвет
- `--accent-hover` — hover-состояние
- `--accent-muted` — прозрачный фон для бейджей
- `--accent-fg` — цвет текста на акцентном фоне (обычно `#fff`)

**Backward-compat алиасы в `:root`:**
```css
--bg-base: var(--bg);
--bg-surface: var(--bg-card);
--bg-elevated: var(--bg-card);
--glass-bg: var(--bg-sidebar);
--glass-border: var(--border);
--text-primary: var(--text);
```

### `applyTheme(pref)` (`lib/theme.ts`)

```typescript
el.setAttribute('data-theme', pref.theme)   // всегда устанавливается
el.setAttribute('data-accent', pref.accent)  // всегда устанавливается
el.style.colorScheme = isDarkTheme(pref.theme) ? 'dark' : 'light'
localStorage.setItem('slimway_theme', JSON.stringify(pref))
```

### Хранение

1. **localStorage** ключ `slimway_theme`: `{ theme, accent }` — применяется немедленно
2. **Supabase** `profiles.theme_preference jsonb`: `{ theme, accent }` — синхронизируется при изменении

### ThemeContext

```typescript
interface ThemeContextValue {
  pref:      ThemePreference
  setPref:   (p: ThemePreference, userId: string) => Promise<void>
  setTheme:  (theme: ThemeId,    userId: string) => Promise<void>
  setAccent: (accent: AccentColor, userId: string) => Promise<void>
  isDark:    boolean
}
```

- `isDark`: `true` для тем `black|dark|dark-blue|dark-green|dark-purple|coffee`
- Кнопка переключения темы в хедере: `isDark ? 'white' : 'dark'`

### Миграция старого формата

`getStoredTheme()` обрабатывает:
- `{ mode: 'light', accent }` → `{ theme: 'light-gray', accent }`
- `{ mode: 'dark', accent }` → `{ theme: 'dark', accent }`
- Старый ключ `'theme'` в localStorage: `'light'` → `light-gray`, `'dark'` → `dark`

---

## 9. Уведомления и звуки

**`playSound(event)`** (`lib/notify.ts`)

```typescript
const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{}')
// settings: { muted: bool, volume: 0-100, events: { [key]: 'filename.mp3' } }
```

**Файлы звуков:** `/public/sound/` — `OK.mp3`, `2toon.mp3`, `classic.mp3`, `crash.mp3`, `disck.mp3`, `error.mp3`, `hw.mp3`, `old.mp3`, `old2.mp3`, `rim.mp3`, `steam.mp3`, `toon.mp3`

**Ключи событий:**
- `new_lead` — Новый лид
- `new_task` — Новая задача
- `task_assigned` — Назначена задача
- `booking_created` — Бронь создана
- `subscription_sold` — Абонемент продан
- `low_stock` — Низкий остаток

Настройки хранятся в `localStorage('notificationSettings')`. Настраиваются в `Настройки → Уведомления`.

---

## 10. Мультитенантность

**Принцип:** каждая запись в БД содержит `branch_id`. Изоляция реализована на уровне бэкенда.

**Backend:** использует `service_role_key` (обходит RLS), сам фильтрует по `branch_id`.

**Frontend:**
- Активный филиал: `localStorage('activeBranchId')`
- axios interceptor добавляет `?branch_id=` к каждому запросу
- `BranchSwitcher` в сайдбаре: доступен только `developer/owner`
- При смене филиала: `window.location.reload()` с оверлеем загрузки

**`resolveBranch` middleware:**
```
developer/owner → ?branch_id из query (или null — видят всё)
остальные       → branch_id из JWT (или 403 если не назначен)
```

---

## 11. Интеграции

### Supabase
- **Auth**: JWT tokens, `app_metadata.role` и `app_metadata.branch_id`
- **Database**: PostgreSQL, запросы через `@supabase/supabase-js` v2
- **service_role**: только бэкенд, обходит RLS
- **anon key**: фронтенд, только для Auth

### Wazzup (WhatsApp)
- Прокси: `POST /api/wazzup-proxy`
- Находит активный WhatsApp канал через API Wazzup
- Отправляет сообщение через `POST https://api.wazzup24.com/v3/message`
- Ключ: `process.env.WAZZUP_API_KEY`

### Tilda
- Прокси: `POST /api/tilda-proxy`
- Форматирует данные и проксирует в `https://forms.tildaapi.pro/procces/`
- Используется для интеграции с сайтом `slimway.com.kz`

---

## 12. Модули — детали

### Клиенты
- Soft delete (`is_deleted = true`)
- При успешном лиде создаётся клиент со статусом `draft`
- Клиент приобретает абонемент → статус `active`
- Поиск: `ilike('%search%')` по `full_name`

### Абонементы
Два уровня:
1. **Шаблоны** (`subscription_templates`) — продукты, создаёт `owner`; глобальные (`branch_id = null`)
2. **Купленные** (`subscriptions`) — привязаны к клиенту, хранят остатки сессий

Абонемент состоит из **1 или 2 слотов**. Каждый слот: тип тренажёра + длительность + количество сессий.

Подключение шаблонов к филиалу через `branch_subscription_templates`.

### Расписание и бронирование
- Ячейки (`schedule_slots`) создаются вручную или bulk для конкретного тренажёра на дату/время
- Бронь (`bookings_v2`): занимает 2 последовательных слота
- Slot 2 ищется автоматически: тот же день, `time_start = slot_1.time_end`, нужного типа тренажёра
- При отмене: слоты освобождаются, сессии возвращаются

### Сотрудники и смены
- Создание сотрудника — атомарная операция: `auth.users` + `profiles` + `employees`
- Удаление — также удаляет `auth.users`
- Чекин: `POST /shifts/:id/checkin` → статус смены `active`
- Чекаут: `POST /shifts/:id/checkout` → статус `completed`
- Bulk-создание смен пропускает существующие (по `employee_id + date`)

### Лиды
- Статусы: `new → in_work → waiting → success/fail`
- `success` → автоматически создаётся `draft` клиент
- Архивация: `archived_at != null`
- `assigned_to` хранит `profile_id` (не `employee_id`)

### Задачи
- Kanban: колонки по статусу `new/today/week/long/done/closed`
- `pending_close` — промежуточный статус, инициируется исполнителем
- `observer_ids jsonb` — массив `profile_id` наблюдателей
- Чеклисты поддерживают группировку через `task_checklist_groups`

### Склад
- Движения типа `in` (приход) и `out` (расход)
- Нельзя уйти в минус по количеству
- `low_stock` — вычислимое поле: `quantity <= min_quantity`
- Приход из каталога (`/intake`): автоматически создаёт `warehouse_item` если не существует
- Экспорт движений: `GET /warehouse/export?from=&to=`

### Аналитика
- `GET /analytics/overview` возвращает сводку по одному или нескольким филиалам
- `?branch_ids=id1,id2` — мультифилиальный режим (только `developer/owner`)
- Включает `by_branch` разбивку при множественных филиалах

---

## 13. Известные особенности

1. **`resolveBranch` перед профилем**: `/api/v1/profile` монтируется до `resolveBranch`, иначе пользователи без `branch_id` получат 403.

2. **`applyTheme` всегда устанавливает `data-theme`**: если убрать атрибут для тёмной темы, то CSS селекторы `[data-theme="dark"][data-accent="X"]` не сработают.

3. **`assigned_to` в лидах**: принимает `employees.id`, конвертируется в `profile_id` перед сохранением — важно учитывать при фильтрации.

4. **Подписки `slice_2_sessions_left` null**: если абонемент однослотовый, `slot_2_*` поля равны `null`.

5. **RLS выключен для leads/lead_comments**: `ALTER TABLE leads DISABLE ROW LEVEL SECURITY` — доступ контролируется только через бэкенд.

6. **Upsert для schedule_slots**: конфликт по `UNIQUE(device_id, date, time_start)` игнорируется при bulk создании.

7. **`observer_ids` в задачах**: хранится как `jsonb` в PostgreSQL, нужно парсить `parseObserverIds()` при чтении.

8. **Суффикс `_v2` в bookings**: старые таблицы `bookings` и `schedule` deprecated, не используются в новом коде.

9. **`status = 'cancelled'` в subscriptions**: добавлен в код (soft delete), но не в оригинальном SQL CHECK — нужно убедиться, что в продакшне миграция применена.

10. **Версия**: при каждом патче обновлять `slimway-frontend/src/version.ts`.

---

## 14. Дорожная карта

| Версия | Статус | Описание |
|---|---|---|
| v1.0.0 | ✅ | Инфраструктура, деплой |
| v1.1.0 | ✅ | База, авторизация, layout |
| v1.2.0 | ✅ | Оборудование, абонементы, расписание, бронирование |
| v1.3.0 | ✅ | Сотрудники, график смен |
| v1.4.0 | ✅ | Лиды, воронка |
| v1.4.x | ✅ | Мультифилиал, роль developer, audit log |
| v1.5.0 | 🔄 | Задачи канбан, аналитика, склад |
| v1.5.x | 🔄 | Хотфиксы (задачи 500, склад права, звуки, управление/настройки) |
| v1.6.0 | ✅ | 12 тем × 7 акцентов, ThemeContext, Supabase sync |
| v1.7.0 | ⏳ | Чат (внутренний между сотрудниками) |
| v1.8.0 | ⏳ | Автоматизация (WhatsApp бот, повторные касания) |
| v1.9.0 | ⏳ | Мобильное приложение (React Native) |
