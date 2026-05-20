const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const users = [];
const refreshTokens = [];
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    cb(null, true);
  }
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Токен доступа отсутствует' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Недействительный токен' });
    }
    req.user = user;
    next();
  });
};

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Имя пользователя и пароль обязательны' });
    }

    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = {
      id: users.length + 1,
      username,
      email: email || null,
      password: hashedPassword
    };

    users.push(user);

    const accessToken = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id, username: user.username },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    refreshTokens.push(refreshToken);

    res.status(201).json({
      message: 'Пользователь успешно зарегистрирован',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при регистрации' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Имя пользователя и пароль обязательны' });
    }

    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({ error: 'Неверные учетные данные' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Неверные учетные данные' });
    }

    const accessToken = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id, username: user.username },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    refreshTokens.push(refreshToken);

    res.json({
      message: 'Успешный вход',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при входе' });
  }
});

app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh токен отсутствует' });
  }

  if (!refreshTokens.includes(refreshToken)) {
    return res.status(403).json({ error: 'Недействительный refresh токен' });
  }

  jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err, user) => {
    if (err) {
      const index = refreshTokens.indexOf(refreshToken);
      if (index > -1) {
        refreshTokens.splice(index, 1);
      }
      return res.status(403).json({ error: 'Недействительный refresh токен' });
    }

    const accessToken = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({
      accessToken
    });
  });
});

app.post('/api/auth/logout', (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    const index = refreshTokens.indexOf(refreshToken);
    if (index > -1) {
      refreshTokens.splice(index, 1);
    }
  }

  res.json({ message: 'Успешный выход' });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }

  res.json({
    id: user.id,
    username: user.username,
    email: user.email
  });
});

app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не был загружен' });
    }

    res.json({
      message: 'Файл успешно загружен',
      file: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при загрузке файла' });
  }
});

app.post('/api/upload/multiple', authenticateToken, upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Файлы не были загружены' });
    }

    const files = req.files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path
    }));

    res.json({
      message: 'Файлы успешно загружены',
      count: files.length,
      files
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при загрузке файлов' });
  }
});

app.get('/api/mock/simple', authenticateToken, (req, res) => {
  res.json({
    status: 'success',
    message: 'Это простой моковый ответ',
    data: {
      id: 1,
      name: 'Тестовый объект',
      timestamp: new Date().toISOString()
    }
  });
});

app.get('/api/mock/list', authenticateToken, (req, res) => {
  const vacancies = [
    { id: 1, title: 'Senior Frontend Developer', status: 'открыта', candidatesCount: 12, department: 'r&d' },
    { id: 2, title: 'Product Manager', status: 'открыта', candidatesCount: 8, department: 'product' },
    { id: 3, title: 'UX Designer', status: 'пауза', candidatesCount: 5, department: 'design' },
    { id: 4, title: 'Data Analyst', status: 'открыта', candidatesCount: 15, department: 'analytics' },
    { id: 5, title: 'Backend Developer', status: 'закрыта', candidatesCount: 0, department: 'r&d' },
    { id: 6, title: 'UI Designer', status: 'открыта', candidatesCount: 7, department: 'design' },
    { id: 7, title: 'Product Designer', status: 'открыта', candidatesCount: 10, department: 'product' },
    { id: 8, title: 'Business Analyst', status: 'пауза', candidatesCount: 3, department: 'analytics' },
    { id: 9, title: 'Full Stack Developer', status: 'открыта', candidatesCount: 20, department: 'r&d' },
    { id: 10, title: 'Design Lead', status: 'открыта', candidatesCount: 4, department: 'design' }
  ];
  
  res.json({
    status: 'success',
    count: vacancies.length,
    items: vacancies
  });
});

app.get('/api/mock/vacancy/:id/candidates', authenticateToken, (req, res) => {
  const { id } = req.params;
  const vacancyId = parseInt(id);
  
  const candidatesData = {
    1: [
      { id: 1, firstName: 'Иван', lastName: 'Петров', status: 'Интервью', rating: 85 },
      { id: 2, firstName: 'Мария', lastName: 'Сидорова', status: 'офер', rating: 92 },
      { id: 3, firstName: 'Алексей', lastName: 'Иванов', status: 'Интервью', rating: 78 },
      { id: 4, firstName: 'Елена', lastName: 'Козлова', status: 'отказ', rating: 65 },
      { id: 5, firstName: 'Дмитрий', lastName: 'Смирнов', status: 'нанят', rating: 95 },
      { id: 6, firstName: 'Анна', lastName: 'Волкова', status: 'Интервью', rating: 88 },
      { id: 7, firstName: 'Сергей', lastName: 'Лебедев', status: 'офер', rating: 90 },
      { id: 8, firstName: 'Ольга', lastName: 'Новикова', status: 'Интервью', rating: 82 },
      { id: 9, firstName: 'Павел', lastName: 'Морозов', status: 'отказ', rating: 70 },
      { id: 10, firstName: 'Татьяна', lastName: 'Федорова', status: 'Интервью', rating: 87 },
      { id: 11, firstName: 'Николай', lastName: 'Соколов', status: 'офер', rating: 89 },
      { id: 12, firstName: 'Юлия', lastName: 'Попова', status: 'Интервью', rating: 80 }
    ],
    2: [
      { id: 13, firstName: 'Александр', lastName: 'Васильев', status: 'Интервью', rating: 88 },
      { id: 14, firstName: 'Екатерина', lastName: 'Семенова', status: 'офер', rating: 91 },
      { id: 15, firstName: 'Максим', lastName: 'Голубев', status: 'Интервью', rating: 85 },
      { id: 16, firstName: 'Виктория', lastName: 'Виноградова', status: 'отказ', rating: 72 },
      { id: 17, firstName: 'Артем', lastName: 'Белов', status: 'нанят', rating: 94 },
      { id: 18, firstName: 'Наталья', lastName: 'Кузнецова', status: 'Интервью', rating: 83 },
      { id: 19, firstName: 'Роман', lastName: 'Орлов', status: 'офер', rating: 87 },
      { id: 20, firstName: 'Ирина', lastName: 'Соловьева', status: 'Интервью', rating: 79 }
    ],
    3: [
      { id: 21, firstName: 'Андрей', lastName: 'Жуков', status: 'Интервью', rating: 86 },
      { id: 22, firstName: 'Светлана', lastName: 'Воробьева', status: 'офер', rating: 90 },
      { id: 23, firstName: 'Владимир', lastName: 'Щербаков', status: 'отказ', rating: 68 },
      { id: 24, firstName: 'Лариса', lastName: 'Зайцева', status: 'Интервью', rating: 84 },
      { id: 25, firstName: 'Григорий', lastName: 'Ершов', status: 'нанят', rating: 93 }
    ],
    4: [
      { id: 26, firstName: 'Дарья', lastName: 'Титова', status: 'Интервью', rating: 87 },
      { id: 27, firstName: 'Станислав', lastName: 'Максимов', status: 'офер', rating: 89 },
      { id: 28, firstName: 'Валентина', lastName: 'Исаева', status: 'Интервью', rating: 81 },
      { id: 29, firstName: 'Константин', lastName: 'Григорьев', status: 'отказ', rating: 71 },
      { id: 30, firstName: 'Людмила', lastName: 'Романова', status: 'Интервью', rating: 86 },
      { id: 31, firstName: 'Валерий', lastName: 'Комаров', status: 'офер', rating: 88 },
      { id: 32, firstName: 'Галина', lastName: 'Антонова', status: 'Интервью', rating: 83 },
      { id: 33, firstName: 'Борис', lastName: 'Тарасов', status: 'нанят', rating: 96 },
      { id: 34, firstName: 'Зинаида', lastName: 'Беляева', status: 'Интервью', rating: 85 },
      { id: 35, firstName: 'Михаил', lastName: 'Герасимов', status: 'офер', rating: 90 },
      { id: 36, firstName: 'Раиса', lastName: 'Шарова', status: 'Интервью', rating: 82 },
      { id: 37, firstName: 'Федор', lastName: 'Быков', status: 'отказ', rating: 69 },
      { id: 38, firstName: 'Клавдия', lastName: 'Медведева', status: 'Интервью', rating: 88 },
      { id: 39, firstName: 'Степан', lastName: 'Абрамов', status: 'офер', rating: 91 },
      { id: 40, firstName: 'Василиса', lastName: 'Терентьева', status: 'Интервью', rating: 79 }
    ],
    6: [
      { id: 41, firstName: 'Евгений', lastName: 'Сергеев', status: 'Интервью', rating: 84 },
      { id: 42, firstName: 'Инна', lastName: 'Павлова', status: 'офер', rating: 87 },
      { id: 43, firstName: 'Игорь', lastName: 'Козлов', status: 'Интервью', rating: 80 },
      { id: 44, firstName: 'Любовь', lastName: 'Степанова', status: 'отказ', rating: 73 },
      { id: 45, firstName: 'Никита', lastName: 'Николаев', status: 'нанят', rating: 92 },
      { id: 46, firstName: 'Полина', lastName: 'Орлова', status: 'Интервью', rating: 86 },
      { id: 47, firstName: 'Тимур', lastName: 'Андреев', status: 'офер', rating: 89 }
    ],
    7: [
      { id: 48, firstName: 'Алиса', lastName: 'Макарова', status: 'Интервью', rating: 88 },
      { id: 49, firstName: 'Даниил', lastName: 'Новиков', status: 'офер', rating: 91 },
      { id: 50, firstName: 'Кристина', lastName: 'Петрова', status: 'Интервью', rating: 85 },
      { id: 51, firstName: 'Руслан', lastName: 'Волков', status: 'отказ', rating: 70 },
      { id: 52, firstName: 'София', lastName: 'Соколова', status: 'нанят', rating: 94 },
      { id: 53, firstName: 'Тимур', lastName: 'Лебедев', status: 'Интервью', rating: 83 },
      { id: 54, firstName: 'Ульяна', lastName: 'Козлова', status: 'офер', rating: 87 },
      { id: 55, firstName: 'Эдуард', lastName: 'Новиков', status: 'Интервью', rating: 81 },
      { id: 56, firstName: 'Яна', lastName: 'Морозова', status: 'отказ', rating: 74 },
      { id: 57, firstName: 'Арсений', lastName: 'Петров', status: 'Интервью', rating: 86 }
    ],
    9: [
      { id: 58, firstName: 'Богдан', lastName: 'Смирнов', status: 'Интервью', rating: 87 },
      { id: 59, firstName: 'Вероника', lastName: 'Иванова', status: 'офер', rating: 90 },
      { id: 60, firstName: 'Глеб', lastName: 'Кузнецов', status: 'Интервью', rating: 84 },
      { id: 61, firstName: 'Диана', lastName: 'Попова', status: 'отказ', rating: 71 },
      { id: 62, firstName: 'Егор', lastName: 'Соколов', status: 'нанят', rating: 93 },
      { id: 63, firstName: 'Жанна', lastName: 'Лебедева', status: 'Интервью', rating: 85 },
      { id: 64, firstName: 'Захар', lastName: 'Новиков', status: 'офер', rating: 88 },
      { id: 65, firstName: 'Илона', lastName: 'Козлова', status: 'Интервью', rating: 82 },
      { id: 66, firstName: 'Кирилл', lastName: 'Морозов', status: 'отказ', rating: 72 },
      { id: 67, firstName: 'Лера', lastName: 'Петрова', status: 'Интервью', rating: 86 },
      { id: 68, firstName: 'Марк', lastName: 'Волков', status: 'офер', rating: 89 },
      { id: 69, firstName: 'Надежда', lastName: 'Соколова', status: 'Интервью', rating: 83 },
      { id: 70, firstName: 'Олег', lastName: 'Лебедев', status: 'нанят', rating: 95 },
      { id: 71, firstName: 'Петр', lastName: 'Новиков', status: 'Интервью', rating: 87 },
      { id: 72, firstName: 'Регина', lastName: 'Козлова', status: 'офер', rating: 90 },
      { id: 73, firstName: 'Семен', lastName: 'Морозов', status: 'Интервью', rating: 84 },
      { id: 74, firstName: 'Тамара', lastName: 'Петрова', status: 'отказ', rating: 73 },
      { id: 75, firstName: 'Устин', lastName: 'Волков', status: 'Интервью', rating: 88 },
      { id: 76, firstName: 'Фаина', lastName: 'Соколова', status: 'офер', rating: 91 },
      { id: 77, firstName: 'Харитон', lastName: 'Лебедев', status: 'Интервью', rating: 85 }
    ],
    10: [
      { id: 78, firstName: 'Цветана', lastName: 'Новикова', status: 'Интервью', rating: 89 },
      { id: 79, firstName: 'Шамиль', lastName: 'Козлов', status: 'офер', rating: 92 },
      { id: 80, firstName: 'Эмилия', lastName: 'Морозова', status: 'Интервью', rating: 86 },
      { id: 81, firstName: 'Юрий', lastName: 'Петров', status: 'нанят', rating: 94 }
    ]
  };
  
  const candidates = candidatesData[vacancyId] || [];
  const vacancyTitles = {
    1: 'Senior Frontend Developer',
    2: 'Product Manager',
    3: 'UX Designer',
    4: 'Data Analyst',
    6: 'UI Designer',
    7: 'Product Designer',
    9: 'Full Stack Developer',
    10: 'Design Lead'
  };
  
  res.json({
    status: 'success',
    count: candidates.length,
    items: candidates,
    vacancyId: vacancyId,
    vacancyTitle: vacancyTitles[vacancyId] || 'Вакансия'
  });
});

app.get('/api/mock/vacancy/:vacancyId/candidate/:candidateId', authenticateToken, (req, res) => {
  const { vacancyId, candidateId } = req.params;
  const candidateIdNum = parseInt(candidateId);
  
  const candidateDetails = {
    1: {
      1: {
        id: 1,
        firstName: 'Иван',
        lastName: 'Петров',
        position: 'Senior Frontend Developer',
        experience: '7 лет',
        keyCompanies: ['Яндекс', 'Ozon', 'VK'],
        salaryExpectation: '350 000 руб (на руки)',
        workFormat: 'гибрид / удалёнка',
        preferences: 'Продуктовые команды, современный стек',
        motivation: 'Работа над интересными проектами, профессиональный рост',
        description: 'Опытный фронтенд-разработчик с глубокими знаниями React и TypeScript. Участвовал в разработке крупных продуктовых решений, имеет опыт работы с микросервисной архитектурой.',
        tags: ['react', 'typescript', 'frontend', 'leadership'],
        link: 'https://huntflow.ru/12345678912345678912345678912345',
        decision: {
          result: 'Да',
          confidence: 'Высокий',
          pros: [
            'Сильный технический бэкграунд',
            'Опыт работы в продуктовых командах',
            'Хорошие коммуникативные навыки'
          ],
          cons: [
            'Высокие ожидания по ЗП',
            'Ограниченный опыт в backend'
          ],
          summary: 'Кандидат соответствует требованиям позиции. Рекомендуется пригласить на техническое собеседование.',
          recommendedStep: 'Пригласить на техническое собеседование',
          whatToCheck: [
            'Проверить знание архитектурных паттернов',
            'Уточнить опыт работы с командой'
          ]
        },
        summary: {
          strengths: [
            'Глубокие знания React экосистемы',
            'Опыт оптимизации производительности',
            'Умение работать в команде'
          ],
          weaknesses: [
            'Ограниченный опыт в backend',
            'Может быть слишком технически ориентирован'
          ],
          developmentAreas: [
            'Развитие навыков менторства',
            'Углубление знаний в архитектуре'
          ],
          redFlags: [],
          keyAdvantages: [
            'Сильный технический профиль',
            'Опыт в продуктовых командах'
          ]
        },
        softSkills: [
          {
            name: 'Управленческие навыки и лидерство',
            matchLevel: 90,
            confidence: 87,
            weight: 25,
            level: 'Senior',
            indicators: [
              'Руководил командой из 5 разработчиков',
              'Проводил код-ревью и менторинг',
              'Участвовал в планировании спринтов'
            ],
            justification: 'Кандидат демонстрирует зрелость в управлении командой и процессами. Есть опыт менторства и код-ревью.'
          },
          {
            name: 'Коммуникации',
            matchLevel: 95,
            confidence: 76,
            weight: 20,
            level: 'Senior',
            indicators: [
              'Эффективно коммуницировал с дизайнерами',
              'Участвовал в презентациях для стейкхолдеров',
              'Проводил техдоклады'
            ],
            justification: 'Отличные навыки коммуникации с разными командами. Умеет объяснять технические концепции простым языком.'
          },
          {
            name: 'Планирование и организация процессов',
            matchLevel: 84,
            confidence: 64,
            weight: 20,
            level: 'Upper-Middle',
            indicators: [
              'Участвовал в планировании спринтов',
              'Оценивал сложность задач',
              'Работал с Jira и Confluence'
            ],
            justification: 'Кандидат демонстрирует умение структурировать работу команды и планировать задачи.'
          },
          {
            name: 'Командная работа и эмпатия',
            matchLevel: 94,
            confidence: 92,
            weight: 15,
            level: 'Middle / Upper-Middle',
            indicators: [
              'Помогал новым сотрудникам',
              'Участвовал в ретроспективах',
              'Поддерживал позитивную атмосферу в команде'
            ],
            justification: 'Есть готовность поддерживать команду и внимательность к людям. Ценит командную работу.'
          },
          {
            name: 'Решение проблем и критическое мышление',
            matchLevel: 88,
            confidence: 32,
            weight: 10,
            level: 'Upper-Middle',
            indicators: [
              'Решал сложные технические задачи',
              'Оптимизировал производительность приложений',
              'Анализировал причины багов'
            ],
            justification: 'Кандидат демонстрирует системность в анализе и решении проблем.'
          },
          {
            name: 'Адаптивность и устойчивость к стрессам',
            matchLevel: 91,
            confidence: 81,
            weight: 10,
            level: 'Middle',
            indicators: [
              'Работал в условиях сжатых дедлайнов',
              'Адаптировался к изменениям требований',
              'Сохранял качество при высокой нагрузке'
            ],
            justification: 'Хорошая устойчивость к стрессу, не теряет фокус при изменении приоритетов.'
          }
        ],
        starCases: [
          {
            situation: 'Необходимо было оптимизировать производительность главной страницы',
            task: 'Снизить время загрузки с 5 до 2 секунд',
            action: 'Провел анализ производительности, внедрил code splitting, оптимизировал изображения, добавил lazy loading',
            result: 'Время загрузки снизилось до 1.8 секунд, конверсия выросла на 15%'
          },
          {
            situation: 'Команда столкнулась с проблемой масштабирования компонентов',
            task: 'Создать переиспользуемую библиотеку компонентов',
            action: 'Разработал дизайн-систему, создал Storybook, написал документацию',
            result: 'Время разработки новых фич сократилось на 30%, консистентность UI повысилась'
          }
        ],
        overallMatch: 90,
        overallConfidence: 87
      },
      2: {
        id: 2,
        firstName: 'Мария',
        lastName: 'Сидорова',
        position: 'Senior Frontend Developer',
        experience: '8 лет',
        keyCompanies: ['Сбер', 'Тинькофф', 'Альфа-Банк'],
        salaryExpectation: '380 000 руб (на руки)',
        workFormat: 'удалёнка',
        preferences: 'Финтех проекты, сложные задачи',
        motivation: 'Работа над интересными техническими вызовами',
        description: 'Эксперт в области фронтенд-разработки с фокусом на производительность и качество кода. Имеет опыт работы в крупных финтех компаниях.',
        tags: ['react', 'performance', 'fintech', 'typescript'],
        link: 'https://huntflow.ru/98765432198765432198765432198765',
        decision: {
          result: 'Да',
          confidence: 'Высокий',
          pros: [
            'Отличный технический уровень',
            'Опыт в финтехе',
            'Сильные навыки оптимизации'
          ],
          cons: [
            'Очень высокие ожидания по ЗП',
            'Предпочитает только удалёнку'
          ],
          summary: 'Сильный кандидат с отличным техническим бэкграундом. Рекомендуется обсудить условия.',
          recommendedStep: 'Пригласить на техническое собеседование с обсуждением условий',
          whatToCheck: [
            'Уточнить готовность к гибридному формату',
            'Обсудить возможности по ЗП'
          ]
        },
        summary: {
          strengths: [
            'Экспертные знания React',
            'Опыт оптимизации производительности',
            'Работа в финтехе'
          ],
          weaknesses: [
            'Строгие требования к формату работы',
            'Высокие ожидания по компенсации'
          ],
          developmentAreas: [
            'Развитие навыков менторства',
            'Работа в гибридном формате'
          ],
          redFlags: [],
          keyAdvantages: [
            'Высокий технический уровень',
            'Опыт в финтехе'
          ]
        },
        softSkills: [
          {
            name: 'Управленческие навыки и лидерство',
            matchLevel: 85,
            confidence: 82,
            weight: 25,
            level: 'Senior',
            indicators: [
              'Менторила джуниор-разработчиков',
              'Проводила техдоклады',
              'Участвовала в архитектурных решениях'
            ],
            justification: 'Кандидат демонстрирует лидерские качества и готовность делиться знаниями.'
          },
          {
            name: 'Коммуникации',
            matchLevel: 88,
            confidence: 75,
            weight: 20,
            level: 'Senior',
            indicators: [
              'Эффективно работала с backend командой',
              'Участвовала в планировании',
              'Писала техническую документацию'
            ],
            justification: 'Хорошие коммуникативные навыки, умеет работать в команде.'
          },
          {
            name: 'Планирование и организация процессов',
            matchLevel: 82,
            confidence: 70,
            weight: 20,
            level: 'Upper-Middle',
            indicators: [
              'Планировала задачи на спринт',
              'Оценивала сложность',
              'Работала с Agile процессами'
            ],
            justification: 'Умеет планировать и организовывать работу.'
          },
          {
            name: 'Командная работа и эмпатия',
            matchLevel: 90,
            confidence: 88,
            weight: 15,
            level: 'Middle / Upper-Middle',
            indicators: [
              'Помогала коллегам',
              'Участвовала в код-ревью',
              'Поддерживала команду'
            ],
            justification: 'Хорошие навыки командной работы.'
          },
          {
            name: 'Решение проблем и критическое мышление',
            matchLevel: 92,
            confidence: 85,
            weight: 10,
            level: 'Upper-Middle',
            indicators: [
              'Решала сложные технические задачи',
              'Оптимизировала производительность',
              'Анализировала проблемы'
            ],
            justification: 'Сильные навыки решения проблем.'
          },
          {
            name: 'Адаптивность и устойчивость к стрессам',
            matchLevel: 88,
            confidence: 78,
            weight: 10,
            level: 'Middle',
            indicators: [
              'Работала в условиях дедлайнов',
              'Адаптировалась к изменениям',
              'Сохраняла качество'
            ],
            justification: 'Хорошая устойчивость к стрессу.'
          }
        ],
        starCases: [
          {
            situation: 'Приложение работало медленно при большом количестве данных',
            task: 'Оптимизировать рендеринг списков с тысячами элементов',
            action: 'Внедрила виртуализацию, мемоизацию, оптимизировала ре-рендеры',
            result: 'Производительность улучшилась в 10 раз, пользовательский опыт значительно вырос'
          }
        ],
        overallMatch: 88,
        overallConfidence: 82
      }
    },
    2: {
      13: {
        id: 13,
        firstName: 'Александр',
        lastName: 'Васильев',
        position: 'Product Manager',
        experience: '6 лет',
        keyCompanies: ['Яндекс', 'Mail.ru', 'VK'],
        salaryExpectation: '320 000 руб (на руки)',
        workFormat: 'гибрид',
        preferences: 'Продуктовые команды, B2C проекты',
        motivation: 'Создание продуктов, которые меняют жизнь пользователей',
        description: 'Опытный продуктовый менеджер с фокусом на пользовательский опыт и метрики. Имеет успешный опыт запуска и развития продуктов.',
        tags: ['product', 'b2c', 'analytics', 'agile'],
        link: 'https://huntflow.ru/111222333444555666777888999000',
        decision: {
          result: 'Да',
          confidence: 'Высокий',
          pros: [
            'Опыт в продуктовых командах',
            'Сильные аналитические навыки',
            'Ориентация на пользователя'
          ],
          cons: [
            'Ограниченный опыт в B2B',
            'Может быть слишком ориентирован на метрики'
          ],
          summary: 'Кандидат соответствует требованиям позиции. Рекомендуется пригласить на собеседование.',
          recommendedStep: 'Пригласить на собеседование с руководителем продукта',
          whatToCheck: [
            'Уточнить опыт работы с техническими командами',
            'Обсудить подход к приоритизации'
          ]
        },
        summary: {
          strengths: [
            'Опыт запуска продуктов',
            'Сильные аналитические навыки',
            'Ориентация на пользователя'
          ],
          weaknesses: [
            'Ограниченный опыт в B2B',
            'Может быть слишком метрико-ориентирован'
          ],
          developmentAreas: [
            'Развитие стратегического мышления',
            'Работа с B2B продуктами'
          ],
          redFlags: [],
          keyAdvantages: [
            'Опыт в продуктовых командах',
            'Сильные аналитические навыки'
          ]
        },
        softSkills: [
          {
            name: 'Управленческие навыки и лидерство',
            matchLevel: 88,
            confidence: 85,
            weight: 25,
            level: 'Senior',
            indicators: [
              'Руководил продуктовой командой',
              'Координировал работу разработки и дизайна',
              'Проводил стратегические сессии'
            ],
            justification: 'Кандидат демонстрирует зрелость в управлении продуктом и командой.'
          },
          {
            name: 'Коммуникации',
            matchLevel: 92,
            confidence: 88,
            weight: 20,
            level: 'Senior',
            indicators: [
              'Эффективно работал с разными стейкхолдерами',
              'Проводил презентации для руководства',
              'Выстраивал коммуникацию между командами'
            ],
            justification: 'Отличные навыки коммуникации с разными командами и стейкхолдерами.'
          },
          {
            name: 'Планирование и организация процессов',
            matchLevel: 90,
            confidence: 82,
            weight: 20,
            level: 'Upper-Middle',
            indicators: [
              'Планировал релизы продуктов',
              'Организовывал спринты',
              'Выстраивал процессы приоритизации'
            ],
            justification: 'Сильные навыки планирования и организации работы команды.'
          },
          {
            name: 'Командная работа и эмпатия',
            matchLevel: 89,
            confidence: 85,
            weight: 15,
            level: 'Middle / Upper-Middle',
            indicators: [
              'Поддерживал команду в сложные периоды',
              'Учитывал мнение всех участников',
              'Создавал позитивную атмосферу'
            ],
            justification: 'Хорошие навыки командной работы и эмпатии.'
          },
          {
            name: 'Решение проблем и критическое мышление',
            matchLevel: 87,
            confidence: 80,
            weight: 10,
            level: 'Upper-Middle',
            indicators: [
              'Анализировал данные для принятия решений',
              'Решал конфликты приоритетов',
              'Находил нестандартные решения'
            ],
            justification: 'Сильные аналитические навыки и критическое мышление.'
          },
          {
            name: 'Адаптивность и устойчивость к стрессам',
            matchLevel: 85,
            confidence: 78,
            weight: 10,
            level: 'Middle',
            indicators: [
              'Работал в условиях неопределенности',
              'Адаптировался к изменениям требований',
              'Сохранял фокус на цели'
            ],
            justification: 'Хорошая адаптивность и устойчивость к стрессу.'
          }
        ],
        starCases: [
          {
            situation: 'Продукт терял пользователей из-за сложного интерфейса',
            task: 'Улучшить пользовательский опыт и вернуть пользователей',
            action: 'Провел исследование пользователей, переработал ключевые экраны, внедрил A/B тесты',
            result: 'Конверсия выросла на 40%, отток пользователей снизился на 25%'
          },
          {
            situation: 'Команда не успевала выпускать фичи в срок',
            task: 'Оптимизировать процессы разработки и повысить скорость релизов',
            action: 'Внедрил Agile практики, оптимизировал процессы, улучшил коммуникацию между командами',
            result: 'Скорость релизов увеличилась в 2 раза, удовлетворенность команды выросла'
          }
        ],
        overallMatch: 88,
        overallConfidence: 85
      }
    },
    4: {
      26: {
        id: 26,
        firstName: 'Дмитрий',
        lastName: 'Волков',
        position: 'Senior Project Manager (IT, e-commerce)',
        experience: '9 лет',
        keyCompanies: ['Ozon', 'Яндекс', 'стартап в финтехе'],
        salaryExpectation: '280 000 руб (на руки)',
        workFormat: 'гибрид / удалёнка',
        preferences: 'Продуктовые команды, Agile-проекты',
        motivation: 'Рост влияния и ответственности',
        description: 'Сформированный лидер с опытом управления IT-проектами в е-commerce и финтехе. Руководил распределёнными командами до 15 человек, запускал продукты с нуля и развивал существующие. Имеет успешный опыт внедрения Agile-практик, оптимизации процессов и выстраивания взаимодействия между бизнесом и разработкой. Кандидат ищет проект, где сможет совмещать управление продуктом и людьми, развивать культуру прозрачных процессов и брать ответственность за результат.',
        tags: ['agile', 'frontend', 'ecommerce', 'leadership'],
        link: 'https://huntflow.ru/12345678912345678912345678912345',
        decision: {
          result: 'Условно',
          confidence: 'Высокий',
          pros: [
            'Успешные кейсы запуска в крупных компаниях',
            'Развитые коммуникативные навыки, умение убеждать',
            'Опыт работы в продуктовой среде (e-commerce)',
            'Зрелый уровень самоанализа и системного мышления'
          ],
          cons: [
            'Высокие ожидания по ЗП',
            'Небольшой опыт в заказных проектах'
          ],
          summary: 'Кандидат соответствует требованиям позиции. Рекомендуется обсудить условия и формат работы.',
          recommendedStep: 'Пригласить на финальное собеседование с руководителем отдела (с условием уточнения по ЗП и формату работы)',
          whatToCheck: [
            'Подтвердить рекомендации от предыдущих работодателей',
            'Уточнить готовность к офисному формату'
          ]
        },
        summary: {
          strengths: [
            'Исключительные лидерские качества и эмоциональный интеллект',
            'Умеет выстраивать эффективную коммуникацию с разными стейкхолдерами',
            'Стратегическое мышление и клиентоориентированность'
          ],
          weaknesses: [
            'Может быть слишком оптимистичен в оценке сроков'
          ],
          developmentAreas: [
            'Развитие стратегического мышления в долгосрочных продуктах',
            'Усиление практик управления изменениями и коучинга'
          ],
          redFlags: [],
          keyAdvantages: [
            'Лидер и ориентирован на результат',
            'Хорошая структура мышления'
          ]
        },
        softSkills: [
          {
            name: 'Управленческие навыки и лидерство',
            matchLevel: 96,
            confidence: 80,
            weight: 25,
            level: 'Senior',
            indicators: [
              'Управлял параллельно 2-3 проектами по 200-300 часов в месяц',
              'Налаживал отношения с ключевыми заказчиками после неудачного запуска',
              'Планировал обучение тим-лида/тех-тренинга и онбординг для команды',
              'Восстановил проект после неудачного предыдущего'
            ],
            justification: 'Кандидат показал зрелость в управлении людьми и процессами. Есть опыт кризисного менеджмента, построения процессов и коучинга. Демонстрируется инициативность в регламентации.'
          },
          {
            name: 'Коммуникации',
            matchLevel: 95,
            confidence: 76,
            weight: 20,
            level: 'Senior',
            indicators: [
              'Выстраивал прозрачные отчёты для клиентов',
              'Внедрял практики Agile и роли в команде',
              'Оптимизировал процесс онбординга новых сотрудников'
            ],
            justification: 'Отличные навыки переговоров и ведения встреч. Умеет сглаживать конфликты и возвращать лояльность клиентов. Высокий уровень уверенности в презентациях и внешних коммуникациях.'
          },
          {
            name: 'Планирование и организация процессов',
            matchLevel: 84,
            confidence: 64,
            weight: 20,
            level: 'Upper-Middle',
            indicators: [
              'Самостоятельно предлагал и внедрял регламенты',
              'Регулярно организовывал демонстрации для стейкхолдеров',
              'Планировал обучение тим-лида/тех-тренинга и онбординг для команды'
            ],
            justification: 'Кандидат демонстрирует умение структурировать работу команды, описывать процессы и распределять зоны ответственности. Есть задел для достаточной масштабируемости и управляемости внедрений.'
          },
          {
            name: 'Командная работа и эмпатия',
            matchLevel: 94,
            confidence: 92,
            weight: 15,
            level: 'Middle / Upper-Middle',
            indicators: [
              'Всегда оперативно разбирал блокеры команды на еженедельных встречах',
              'Объяснял важность процессов простым языком',
              'Предлагал решения для снижения рисков'
            ],
            justification: 'Есть готовность поддерживать команду и внимательность к людям. Чётко и корректно даёт обратную связь, старается развивать культуру прозрачности. Ценит ответственность и гибкость.'
          },
          {
            name: 'Решение проблем и критическое мышление',
            matchLevel: 88,
            confidence: 32,
            weight: 10,
            level: 'Upper-Middle',
            indicators: [
              'Успешно разбирал причины просрочек после инцидентов',
              'Брал на себя проект в критичный период и завершил успешно',
              'Предлагал решения для снижения рисков'
            ],
            justification: 'Кандидат демонстрирует системность в анализе и причинно-следственных связях, опирается на данные и метрики. Понимает стоимость решения и его влияние на риск.'
          },
          {
            name: 'Адаптивность и устойчивость к стрессам',
            matchLevel: 91,
            confidence: 81,
            weight: 10,
            level: 'Middle',
            indicators: [
              'Эффективно работал даже при высокой нагрузке и дедлайнах',
              'Брал на себя проект в критичный период и завершил успешно'
            ],
            justification: 'Хорошая устойчивость к стрессу, не теряет фокус при изменении приоритетов. Сохраняет качество результата при возрастающей нагрузке.'
          }
        ],
        starCases: [
          {
            situation: 'Падение SLA доставки до 87%',
            task: 'Стабилизировать процесс и вернуть SLA >95%',
            action: 'Анализ данных, пересборка маршрутов, внедрение норм времени',
            result: 'SLA вырос до 96%, снизили издержки на 8%'
          },
          {
            situation: 'Необходим MVP финтех-сервиса',
            task: 'Запустить в срок < 3 месяца',
            action: 'Сбор требований, быстрая архитектура, итеративные релизы',
            result: 'Release через 10 недель, первые 5 корпоративных клиентов'
          }
        ],
        overallMatch: 90,
        overallConfidence: 87
      }
    }
  };
  
  const detail = candidateDetails[vacancyId]?.[candidateIdNum];
  
  if (!detail) {
    return res.status(404).json({ error: 'Детальная информация о кандидате не найдена' });
  }
  
  res.json({
    status: 'success',
    data: detail
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Backend API работает',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        refresh: 'POST /api/auth/refresh',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me'
      },
      upload: {
        single: 'POST /api/upload',
        multiple: 'POST /api/upload/multiple'
      },
      mock: {
        simple: 'GET /api/mock/simple',
        list: 'GET /api/mock/list',
        candidates: 'GET /api/mock/vacancy/:vacancyId/candidates',
        candidateDetail: 'GET /api/mock/vacancy/:vacancyId/candidate/:candidateId'
      }
    }
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Что-то пошло не так!' });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`API доступен по адресу: http://localhost:${PORT}`);
});

