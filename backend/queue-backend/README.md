# Smart Queue Backend

باك إند كامل لنظام إدارة الطوابير، مبني بـ NestJS 11 وPostgreSQL وPrisma، ومجهز للربط مع Angular 22 عبر REST API وSocket.IO.

## الموجود في المشروع

- تسجيل وإنشاء الحسابات باستخدام JWT access token وrefresh token آمن داخل HttpOnly cookie.
- صلاحيات `CUSTOMER` و`STAFF` و`MANAGER` و`ADMIN` مع عزل كل مدير وموظف داخل فرعه.
- إدارة الفروع والخدمات والشبابيك وحالة كل شباك.
- حجز دور للزائر أو للمستخدم المسجل، مع idempotency لمنع إنشاء رقمين عند إعادة الطلب.
- دورة التذكرة: `WAITING → CALLED → SERVING → COMPLETED` بالإضافة إلى الإلغاء والتخطي وعدم الحضور.
- إنشاء الأرقام وحجز الدور داخل Serializable transaction لتجنب تكرار الأرقام عند الطلبات المتزامنة.
- حساب عدد المنتظرين والوقت المتوقع، مع دعم أكثر من شباك.
- تحديثات لحظية عبر Socket.IO، وإشعارات داخل التطبيق.
- تقارير المدير: المتوسطات، الحالات، الخدمات، وأوقات الذروة.
- Swagger، validation، rate limiting، Helmet، CORS، Docker، seed، واختبارات لقواعد الطابور.

## التشغيل المحلي

المتطلبات: Node.js 20+ وDocker Desktop.

```bash
cp .env.example .env
docker compose up -d
npm install
npm run prisma:deploy
npm run prisma:seed
npm run start:dev
```

على Windows PowerShell استخدم `Copy-Item .env.example .env` بدل أمر `cp`.

- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/docs`
- WebSocket namespace: `http://localhost:3000/queue`
- Angular origin الافتراضي: `http://localhost:4200`

غيّر أسرار JWT الموجودة في `.env` قبل أي نشر حقيقي.

## الحسابات التجريبية بعد الـseed

| الدور | البريد | كلمة المرور |
|---|---|---|
| Admin | `admin@queue.local` | `Admin123!` |
| Manager | `manager@queue.local` | `Manager123!` |
| Staff | `staff@queue.local` | `Staff123!` |
| Customer | `customer@queue.local` | `Customer123!` |

هذه الحسابات للتطوير فقط ويجب حذفها أو تغيير كلمات مرورها قبل النشر.

## أهم المسارات

### عامة

- `GET /api/v1/branches`
- `GET /api/v1/services?branchId=...`
- `POST /api/v1/queues/public/tickets`
- `GET /api/v1/queues/public/tickets/:publicId`
- `POST /api/v1/queues/public/tickets/:publicId/cancel`
- `GET /api/v1/queues/public/services/:serviceId/snapshot`

### تسجيل الدخول والمستخدم

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `POST /api/v1/queues/tickets`
- `GET /api/v1/queues/tickets/mine`

### الموظف

- `GET /api/v1/counters`
- `PATCH /api/v1/counters/:id/status`
- `GET /api/v1/queues/services/:serviceId/tickets`
- `POST /api/v1/queues/services/:serviceId/call-next`
- `POST /api/v1/queues/tickets/:id/recall`
- `POST /api/v1/queues/tickets/:id/start`
- `POST /api/v1/queues/tickets/:id/complete`
- `POST /api/v1/queues/tickets/:id/skip`
- `POST /api/v1/queues/tickets/:id/no-show`

### المدير والإدارة

- `POST/PATCH /api/v1/services`
- `POST/PATCH /api/v1/counters`
- `GET/POST/PATCH /api/v1/users`
- `GET /api/v1/reports/overview?branchId=...&from=2026-08-01&to=2026-08-31`

كل الطلبات المحمية ترسل access token بهذه الصورة:

```http
Authorization: Bearer ACCESS_TOKEN
```

ويجب أن يستخدم Angular `{ withCredentials: true }` في طلبات login وrefresh وlogout حتى يتعامل المتصفح مع refresh-token cookie.

## الربط اللحظي مع Angular

ثبت العميل:

```bash
npm install socket.io-client
```

مثال مختصر:

```ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/queue', {
  transports: ['websocket'],
});

socket.emit('queue.subscribe', { serviceId });
socket.on('queue.updated', snapshot => console.log(snapshot));
socket.on('ticket.called', ticket => console.log(ticket));

socket.emit('ticket.subscribe', { publicId });
socket.on('ticket.updated', ticket => console.log(ticket));
```

أحداث السيرفر:

- `queue.updated`: لقطة آمنة للطابور بدون بيانات شخصية.
- `ticket.called`: الرقم الذي تم استدعاؤه والشباك الخاص به.
- `ticket.updated`: تحديث التذكرة التي اشترك فيها العميل.

## قواعد مهمة في الواجهة

- احتفظ بـ`accessToken` في الذاكرة، وليس `localStorage`، ثم استخدم `/auth/refresh` عند إعادة فتح التطبيق.
- عند حجز زائر خزّن `publicId` و`manageToken` محليًا؛ رمز الإدارة لا يرجع مرة أخرى إلا إذا استخدمت نفس `idempotencyKey`.
- أنشئ UUID جديدًا لكل محاولة حجز من الواجهة وضعه في `idempotencyKey`، وأعد استخدامه فقط عند retry لنفس العملية.
- اعتمد على `publicId` في صفحة تتبع الدور، وليس رقم التذكرة وحده.

## أوامر التحقق

```bash
npm run build
npm test
npx prisma validate
```

لو عدلت `schema.prisma` أثناء التطوير، أنشئ migration جديدة باستخدام `npm run prisma:migrate -- --name describe_your_change`. وللنشر استخدم `npm run prisma:deploy` ثم `npm run start:prod`.
