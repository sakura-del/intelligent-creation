import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import sharp from 'sharp'
import { logger } from '../utils/logger.js'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB

class FileStorageService {
  constructor() {
    this.uploadDir = path.resolve(UPLOAD_DIR)
    this.ensureDirectories()
  }

  ensureDirectories() {
    const dirs = [
      this.uploadDir,
      path.join(this.uploadDir, 'images'),
      path.join(this.uploadDir, 'thumbnails'),
    ]

    dirs.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
        logger.info(`Created directory: ${dir}`)
      }
    })
  }

  generateFileName(originalName = '', prefix = '') {
    const timestamp = Date.now()
    const randomStr = crypto.randomBytes(8).toString('hex')
    const ext = originalName ? path.extname(originalName) : '.png'
    return `${prefix}${timestamp}_${randomStr}${ext}`
  }

  async saveImageFromBase64(base64Data, options = {}) {
    const { userId, prefix = '' } = options

    try {
      const buffer = Buffer.from(base64Data, 'base64')
      const fileSize = Buffer.byteLength(buffer)

      if (fileSize > MAX_FILE_SIZE) {
        throw new Error(`File size ${fileSize} exceeds maximum allowed size of ${MAX_FILE_SIZE}`)
      }

      const fileName = this.generateFileName('.png', prefix)
      const relativePath = `images/${fileName}`
      const fullPath = path.join(this.uploadDir, relativePath)

      await fs.promises.writeFile(fullPath, buffer)

      let thumbnailPath = ''
      let dimensions = {}

      try {
        const metadata = await sharp(buffer).metadata()
        dimensions = {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
        }

        const thumbnailFileName = `thumb_${fileName}`
        thumbnailRelativePath = `thumbnails/${thumbnailFileName}`
        const thumbnailFullPath = path.join(this.uploadDir, thumbnailRelativePath)

        await sharp(buffer)
          .resize(300, 300, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toFile(thumbnailFullPath)

        thumbnailPath = thumbnailRelativePath
      } catch (error) {
        logger.warn('Failed to generate thumbnail:', error.message)
      }

      logger.info(`Image saved successfully`, {
        fileName,
        size: fileSize,
        dimensions,
        user: userId,
      })

      return {
        success: true,
        filePath: relativePath,
        thumbnailPath,
        fileUrl: `/api/files/${relativePath}`,
        thumbnailUrl: `/api/files/${thumbnailPath}`,
        fileSize,
        dimensions,
      }
    } catch (error) {
      logger.error('Failed to save image:', error)
      throw error
    }
  }

  async deleteFile(filePath) {
    try {
      const fullPath = path.join(this.uploadDir, filePath)

      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath)
        logger.info(`File deleted: ${filePath}`)
        return true
      }

      logger.warn(`File not found for deletion: ${filePath}`)
      return false
    } catch (error) {
      logger.error(`Failed to delete file ${filePath}:`, error)
      return false
    }
  }

  async deleteWorkFiles(workRecord) {
    const filesToDelete = []

    if (workRecord.file_path) {
      filesToDelete.push(workRecord.file_path)
    }

    if (workRecord.thumbnail_path) {
      filesToDelete.push(workRecord.thumbnail_path)
    }

    const results = await Promise.allSettled(filesToDelete.map((file) => this.deleteFile(file)))

    const deletedCount = results.filter((r) => r.status === 'fulfilled' && r.value).length
    logger.info(`Deleted ${deletedCount}/${filesToDelete.length} files for work`)

    return deletedCount
  }

  getFileStats() {
    let totalSize = 0
    let fileCount = 0

    try {
      const imagesDir = path.join(this.uploadDir, 'images')

      if (fs.existsSync(imagesDir)) {
        const files = fs.readdirSync(imagesDir)

        files.forEach((file) => {
          const filePath = path.join(imagesDir, file)
          const stats = fs.statSync(filePath)
          totalSize += stats.size
          fileCount++
        })
      }
    } catch (error) {
      logger.error('Error calculating file stats:', error)
    }

    return {
      totalSize,
      fileCount,
      humanSize: this.formatFileSize(totalSize),
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  validateBase64(base64String) {
    if (!base64String || typeof base64String !== 'string') {
      return { valid: false, error: 'Invalid base64 string' }
    }

    const base64Pattern = /^[A-Za-z0-9+/=]+$/

    if (!base64Pattern.test(base64String.replace(/^data:image\/\w+;base64,/, ''))) {
      return { valid: false, error: 'Invalid base64 format' }
    }

    const size = Buffer.byteLength(base64String, 'base64')

    if (size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File too large (${this.formatFileSize(size)} > ${this.formatFileSize(MAX_FILE_SIZE)})`,
      }
    }

    return { valid: true, size }
  }
}

export const fileStorage = new FileStorageService()
export default fileStorage
