import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
import { authenticate } from '../middleware/auth.js'
import { successResponse, errorResponse } from '../utils/response.js'
import { fileStorage } from '../services/fileStorage.js'
import { logger } from '../utils/logger.js'

const router = Router()

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const imagesDir = path.join(fileStorage.uploadDir, 'images')
    cb(null, imagesDir)
  },
  filename(req, file, cb) {
    const timestamp = Date.now()
    const randomStr = crypto.randomBytes(8).toString('hex')
    const ext = path.extname(file.originalname) || '.png'
    cb(null, `${timestamp}_${randomStr}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
    files: 5,
  },
  fileFilter(req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`不支持的文件类型: ${file.mimetype}`))
    }
  },
})

router.post('/images', authenticate, upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return errorResponse(res, '没有上传文件', 400)
    }

    const results = []

    for (const file of req.files) {
      const relativePath = `images/${file.filename}`
      let thumbnailPath = ''
      let dimensions = {}

      try {
        const sharp = (await import('sharp')).default
        const metadata = await sharp(file.path).metadata()
        dimensions = {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
        }

        const thumbnailFileName = `thumb_${file.filename}`
        const thumbnailFullPath = path.join(fileStorage.uploadDir, 'thumbnails', thumbnailFileName)

        await sharp(file.path)
          .resize(300, 300, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toFile(thumbnailFullPath)

        thumbnailPath = `thumbnails/${thumbnailFileName}`
      } catch (err) {
        logger.warn('Failed to generate thumbnail:', err.message)
      }

      results.push({
        fileName: file.filename,
        originalName: file.originalname,
        filePath: relativePath,
        thumbnailPath,
        fileUrl: `/api/files/${relativePath}`,
        thumbnailUrl: thumbnailPath ? `/api/files/${thumbnailPath}` : '',
        fileSize: file.size,
        mimeType: file.mimetype,
        dimensions,
      })
    }

    logger.info(`User ${req.user.id} uploaded ${results.length} file(s)`)

    return successResponse(res, results, '上传成功')
  } catch (error) {
    logger.error('File upload error:', error)
    return errorResponse(res, error.message || '上传失败', 500)
  }
})

router.post('/image', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, '没有上传文件', 400)
    }

    const file = req.file
    const relativePath = `images/${file.filename}`
    let thumbnailPath = ''
    let dimensions = {}

    try {
      const sharp = (await import('sharp')).default
      const metadata = await sharp(file.path).metadata()
      dimensions = {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
      }

      const thumbnailFileName = `thumb_${file.filename}`
      const thumbnailFullPath = path.join(fileStorage.uploadDir, 'thumbnails', thumbnailFileName)

      await sharp(file.path)
        .resize(300, 300, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toFile(thumbnailFullPath)

      thumbnailPath = `thumbnails/${thumbnailFileName}`
    } catch (err) {
      logger.warn('Failed to generate thumbnail:', err.message)
    }

    const result = {
      fileName: file.filename,
      originalName: file.originalname,
      filePath: relativePath,
      thumbnailPath,
      fileUrl: `/api/files/${relativePath}`,
      thumbnailUrl: thumbnailPath ? `/api/files/${thumbnailPath}` : '',
      fileSize: file.size,
      mimeType: file.mimetype,
      dimensions,
    }

    logger.info(`User ${req.user.id} uploaded file: ${file.filename}`)

    return successResponse(res, result, '上传成功')
  } catch (error) {
    logger.error('File upload error:', error)
    return errorResponse(res, error.message || '上传失败', 500)
  }
})

export default router
