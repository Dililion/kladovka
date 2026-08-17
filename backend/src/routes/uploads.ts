import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Создать директорию для загрузок если не существует
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Конфигурация multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

const fileFilter = (req: any, file: any, cb: any) => {
  // Разрешенные типы файлов
  const allowedTypes = /jpeg|jpg|png|gif|webp|svg|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|md|csv|zip|rar/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  // Проверяем MIME типы
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
  ];

  if (extname && allowedMimeTypes.includes(file.mimetype)) {
    return cb(null, true);
  } else {
    cb(new Error('Недопустимый тип файла. Разрешены: изображения, PDF, Office документы, текстовые файлы, архивы'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB для больших документов
  },
  fileFilter,
});

// Загрузка одного файла
router.post('/', authMiddleware, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Файл не предоставлен' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    res.json({
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: fileUrl,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Ошибка загрузки файла' });
  }
});

// Загрузка нескольких файлов
router.post('/multiple', authMiddleware, upload.array('files', 10), (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'Файлы не предоставлены' });
    }

    const uploadedFiles = files.map((file) => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      url: `/uploads/${file.filename}`,
    }));

    res.json({ files: uploadedFiles });
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({ message: 'Ошибка загрузки файлов' });
  }
});

// Удаление файла (только для авторизованных пользователей)
router.delete('/:filename', authMiddleware, (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadDir, filename);

    // Проверка безопасности - файл должен быть внутри uploadDir
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadDir = path.resolve(uploadDir);

    if (!resolvedPath.startsWith(resolvedUploadDir)) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Файл не найден' });
    }

    fs.unlinkSync(filePath);

    res.json({ message: 'Файл удален' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'Ошибка удаления файла' });
  }
});

export default router;
