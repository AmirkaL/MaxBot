# ТрешКеш - Мини-приложение для MAX

Мини-приложение для мессенджера MAX, позволяющее пользователям сдавать вторсырье и получать награды за это.

## Описание

ТрешКеш — это экологическое мини-приложение, которое мотивирует пользователей сдавать вторсырье через систему баллов и наград. Пользователи могут находить ближайшие пункты приема на карте, сканировать QR-коды для быстрой фиксации сдачи, загружать чеки и обменивать накопленные баллы на промокоды и награды.

## Основные возможности

- Карта пунктов приема вторсырья с геолокацией
- Сканирование QR-кодов для фиксации сдачи
- Загрузка фотографий чеков
- Система начисления баллов (трешкоинов)
- Каталог наград (промокоды, товары, благотворительность)
- История операций и статистика
- Система уровней и достижений
- Интеграция профиля пользователя из MAX

## Технологии

- Backend: Python 3.10+, Flask
- Frontend: Vanilla JavaScript, HTML5, CSS3
- Карты: Яндекс.Карты API
- Деплой: Gunicorn, Nginx
- Платформа: MAX WebApp API

## Установка

### Требования

- Docker и Docker Compose (для запуска через Docker)
- Или Python 3.10+ (для локального запуска)
- Аккаунт в MAX для бизнеса (верифицированное юрлицо РФ)
- HTTPS-сервер для размещения мини-приложения

### Запуск через Docker (рекомендуется)

#### 1. Подготовка окружения

Создайте файл `.env` на основе `config.example.env`:

```bash
cp config.example.env .env
```

Заполните следующие переменные в `.env`:

- `MAX_SECRET_KEY` — секретный ключ из настроек бота в кабинете MAX для бизнеса
- `BOT_TOKEN` — токен бота для работы с MAX Bot API
- `WEBAPP_URL` — URL мини-приложения (например: `https://yourdomain.com/`)
- `WEBHOOK_URL` — URL для webhook (например: `https://yourdomain.com/webhook`)
- `YANDEX_MAPS_API_KEY` — API ключ Яндекс.Карт (опционально)

#### 2. Сборка Docker-образа

```bash
docker build -t maxbot:latest .
```

#### 3. Запуск контейнера

**Вариант 1: Через docker-compose (рекомендуется)**

```bash
docker-compose up -d
```

**Вариант 2: Через командную строку**

```bash
docker run -d \
  --name maxbot \
  -p 5000:5000 \
  --env-file .env \
  --restart unless-stopped \
  maxbot:latest
```

#### 4. Проверка работы

Приложение будет доступно по адресу `http://localhost:5000`

Проверить статус контейнера:
```bash
docker ps
```

Просмотреть логи:
```bash
docker logs maxbot
```

Остановить контейнер:
```bash
docker stop maxbot
```

Удалить контейнер:
```bash
docker rm maxbot
```

### Локальный запуск (без Docker)

#### 1. Установка зависимостей

```bash
pip install -r requirements.txt
```

#### 2. Настройка окружения

Создайте файл `.env` на основе `config.example.env` и заполните переменные (см. выше).

#### 3. Запуск для разработки

```bash
python app.py
```

Приложение будет доступно по адресу `http://localhost:5000`

#### 4. Запуск на сервере с Gunicorn

1. Создайте виртуальное окружение:
```bash
python3 -m venv venv
source venv/bin/activate
```

2. Установите зависимости:
```bash
pip install -r requirements.txt
```

3. Создайте systemd сервис `/etc/systemd/system/maxbot.service`:
```ini
[Unit]
Description=MAX Bot Gunicorn Application
After=network.target

[Service]
User=root
WorkingDirectory=/path/to/MaxBot
Environment="PATH=/path/to/MaxBot/venv/bin"
ExecStart=/path/to/MaxBot/venv/bin/gunicorn --workers 4 --bind 127.0.0.1:5000 --access-logfile /path/to/MaxBot/access.log --error-logfile /path/to/MaxBot/error.log app:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

4. Запустите сервис:
```bash
sudo systemctl daemon-reload
sudo systemctl start maxbot
sudo systemctl enable maxbot
```

5. Настройте Nginx для проксирования на `127.0.0.1:5000`

## API Endpoints

### Мини-приложение

- `GET /` — главная страница
- `POST /api/validate` — валидация initData пользователя
- `GET /api/user/balance` — получение баланса пользователя
- `GET /api/user/stats` — статистика пользователя

### Пункты приема

- `GET /api/recycling-points` — список пунктов приема (поддерживает параметры `lat` и `lng`)
- `GET /api/recycling-points/<id>` — информация о конкретном пункте

### Сдача мусора

- `POST /api/recycling/submit` — обработка сдачи мусора (QR-код или фото чека)

### Награды

- `GET /api/rewards` — каталог наград
- `POST /api/rewards/<id>/purchase` — покупка награды
- `GET /api/rewards/my` — купленные награды пользователя

### История

- `GET /api/transactions` — история транзакций пользователя

### Бот

- `POST /webhook` — webhook endpoint для обработки обновлений от MAX Bot
- `GET /set-webhook?url=...` — установка webhook
- `GET /test-send?chat_id=...` — тестовая отправка сообщения

### Юридические страницы

- `GET /legal/agreement` — пользовательское соглашение
- `GET /legal/privacy` — политика конфиденциальности

## Структура проекта

```
MaxBot/
├── app.py                      # Backend приложения (Flask)
├── requirements.txt            # Зависимости Python
├── Dockerfile                  # Docker-образ для контейнеризации
├── docker-compose.yml          # Docker Compose конфигурация
├── .dockerignore               # Исключения для Docker
├── config.example.env          # Пример конфигурации
├── templates/                  # HTML шаблоны
│   ├── index.html             # Главная страница
│   └── legal/                 # Юридические страницы
│       ├── agreement.html
│       └── privacy.html
└── static/                     # Статические файлы
    ├── css/
    │   └── style.css          # Стили приложения
    └── js/
        ├── max-bridge.js      # Bridge для интеграции с MAX
        ├── app.js             # Основная логика приложения
        └── yandex-maps-loader.js
```

## Настройка в MAX

1. Войдите в [MAX для бизнеса](https://dev.max.ru/docs/maxbusiness/connection)
2. Создайте или выберите верифицированный профиль организации
3. Создайте чат-бот и пройдите модерацию
4. В настройках бота добавьте мини-приложение с URL вашего сервера
5. Получите токен для API (`BOT_TOKEN`) и секретный ключ для валидации (`MAX_SECRET_KEY`)
6. Настройте webhook, вызвав `/set-webhook?url=...`

## Безопасность

Приложение валидирует `initData` от MAX через HMAC-SHA256. Все запросы проверяют подпись секретным ключом.

**Требования:**
- HTTPS обязателен для мини-приложений MAX
- Валидация initData для всех защищенных endpoints
- Юридические страницы должны быть доступны в интерфейсе

