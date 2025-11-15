# Инструкция по загрузке на GitHub

## Вариант 1: Через командную строку (Git)

### Шаг 1: Установите Git
1. Скачайте Git: https://git-scm.com/download/win
2. Установите с настройками по умолчанию
3. Перезапустите PowerShell/CMD

### Шаг 2: Настройте Git (первый раз)
```bash
git config --global user.name "Ваше Имя"
git config --global user.email "your.email@example.com"
```

### Шаг 3: Создайте репозиторий на GitHub
1. Зайдите на https://github.com
2. Нажмите "+" в правом верхнем углу → "New repository"
3. Введите название репозитория (например: `MaxBot` или `TrashCash`)
4. **НЕ** ставьте галочки на "Initialize with README" (у нас уже есть README)
5. Нажмите "Create repository"

### Шаг 4: Инициализируйте Git в проекте
```bash
cd C:\Users\amiri\PycharmProjects\MaxBot
git init
```

### Шаг 5: Добавьте все файлы
```bash
git add .
```

### Шаг 6: Сделайте первый коммит
```bash
git commit -m "Initial commit: TrashCash MAX mini-app"
```

### Шаг 7: Подключите удаленный репозиторий
Замените `YOUR_USERNAME` и `REPO_NAME` на ваши данные:
```bash
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
```

### Шаг 8: Загрузите на GitHub
```bash
git branch -M main
git push -u origin main
```

Вам потребуется ввести логин и пароль (или токен доступа) от GitHub.

---

## Вариант 2: Через GitHub Desktop (проще)

### Шаг 1: Установите GitHub Desktop
1. Скачайте: https://desktop.github.com/
2. Установите и войдите в свой GitHub аккаунт

### Шаг 2: Создайте репозиторий на GitHub
1. Зайдите на https://github.com
2. Нажмите "+" → "New repository"
3. Введите название, создайте репозиторий

### Шаг 3: Клонируйте или добавьте проект
1. В GitHub Desktop: File → "Add Local Repository"
2. Выберите папку `C:\Users\amiri\PycharmProjects\MaxBot`
3. Если репозиторий еще не создан, нажмите "Publish repository"
4. Выберите "Keep this code private" если нужно, или оставьте публичным
5. Нажмите "Publish repository"

---

## Вариант 3: Через веб-интерфейс GitHub (если нет Git)

### Шаг 1: Создайте репозиторий на GitHub
1. Зайдите на https://github.com
2. Нажмите "+" → "New repository"
3. Введите название, создайте репозиторий
4. **НЕ** инициализируйте с README

### Шаг 2: Загрузите файлы через браузер
1. На странице репозитория нажмите "uploading an existing file"
2. Перетащите все файлы из папки `MaxBot` (кроме `__pycache__` и `.env`)
3. Введите сообщение коммита: "Initial commit"
4. Нажмите "Commit changes"

**Важно:** Не загружайте файл `.env` с реальными ключами! Он уже в `.gitignore`.

---

## Что будет загружено:

✅ **Будут загружены:**
- app.py
- requirements.txt
- Dockerfile
- docker-compose.yml
- .dockerignore
- README.md
- config.example.env
- static/ (все файлы)
- templates/ (все файлы)
- .gitignore

❌ **НЕ будут загружены** (благодаря .gitignore):
- .env (с вашими секретными ключами)
- __pycache__/
- venv/
- *.log
- .idea/

---

## После загрузки:

1. Скопируйте ссылку на репозиторий (например: `https://github.com/username/TrashCash`)
2. Эта ссылка - ваш ответ на требование "Ссылку на репозиторий на GitHub"

