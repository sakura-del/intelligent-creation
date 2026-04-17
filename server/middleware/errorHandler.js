import { logger } from '../utils/logger.js'

export const errorHandler = (err, req, res, _next) => {
  logger.error('Unhandled Error:', {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  })

  if (err.name === 'ValidationError') {
    const validationErrors = err.details?.map((detail) => ({
      field: detail.path?.join('.') || detail.context?.key || 'unknown',
      message: detail.message,
      value: detail.context?.value,
    })) || [err.message]

    return res.status(400).json({
      code: 400,
      message: '数据验证失败',
      errors: validationErrors,
      timestamp: new Date().toISOString(),
    })
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      code: 401,
      message: '未授权，请重新登录',
      data: null,
      timestamp: new Date().toISOString(),
    })
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      code: 413,
      message: '文件大小超过限制',
      data: null,
      timestamp: new Date().toISOString(),
    })
  }

  const statusCode = err.statusCode || 500
  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500 ? '服务器内部错误' : err.message

  res.status(statusCode).json({
    code: statusCode,
    message,
    errors: process.env.NODE_ENV === 'development' ? [err.stack] : null,
    timestamp: new Date().toISOString(),
  })
}

export class AppError extends Error {
  constructor(message, statusCode, errors = null) {
    super(message)
    this.statusCode = statusCode
    this.errors = errors
    this.isOperational = true

    Error.captureStackTrace(this, this.constructor)
  }
}
