# TalentMind

Мобильное приложение для оценки soft skills кандидатов на основе анализа аудио/видео интервью.

## Структура проекта

```
webpraktick-master/
├── backend/                  # Express API сервер
│   ├── server.js             # Основной файл сервера
│   ├── package.json
│   └── uploads/              # Загруженные файлы
│
└── frontend/                 # React Native приложение
    ├── src/
    │   ├── screens/          # Экраны приложения
    │   │   ├── LoginScreen.jsx
    │   │   ├── ReportsScreen.jsx
    │   │   ├── UploadScreen.jsx
    │   │   ├── ReportDetailScreen.jsx
    │   │   └── CandidateDetailScreen.jsx
    │   ├── navigation/       # Навигация
    │   │   └── index.jsx
    │   ├── context/          # React контексты
    │   │   └── AuthContext.jsx
    │   └── services/         # API сервисы
    │       └── api.js
    ├── App.jsx               # Точка входа
    ├── index.js
    └── package.json
```

### Бэкенд

```bash
cd backend
npm install
npm start
```

Сервер будет доступен на `http://localhost:3000`

### Фронтенд

```bash
cd frontend
npm install
npx expo start
```

После запуска:

w — открыть в браузере

a — запуск на Android

i — запуск на iOS

Отсканировать QR-код через Expo Go на телефоне

### Бэкенд
- JWT аутентификация (login, register, refresh, logout)
- Загрузка файлов
- Моковые данные: вакансии, кандидаты, детальные отчёты со soft skills


### Фронтенд
- Авторизация / регистрация с JWT токенами
- Список вакансий с фильтрацией по статусу и отделу
- Список кандидатов по вакансии с фильтрацией и рейтингом
- Детальный отчёт кандидата: soft skills, STAR-кейсы, решение
- Загрузка аудио/видео файлов на сервер

## Технологии

**Бэкенд:**
- Express.js
- JWT (jsonwebtoken)

**Фронтенд:**
- React Native
- Expo
- JavaScript
- React Navigation
- AsyncStorage

## API эндпоинты

| Метод | Путь | Описание |
|-------|------|----------|
| POST | /api/auth/register | Регистрация |
| POST | /api/auth/login | Вход |
| POST | /api/auth/refresh | Обновление токена |
| POST | /api/auth/logout | Выход |
| GET | /api/auth/me | Текущий пользователь |
| POST | /api/upload | Загрузка файла |
| GET | /api/mock/list | Список вакансий |
| GET | /api/mock/vacancy/:id/candidates | Кандидаты по вакансии |
| GET | /api/mock/vacancy/:id/candidate/:cid | Детальный отчёт кандидата |
