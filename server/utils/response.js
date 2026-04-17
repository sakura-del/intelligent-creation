export const successResponse = (res, data = null, message = '操作成功', code = 200) => {
  return res.status(code).json({
    code,
    message,
    data,
    timestamp: new Date().toISOString(),
  })
}

export const errorResponse = (res, message = '服务器错误', code = 500, errors = null) => {
  return res.status(code).json({
    code,
    message,
    errors,
    timestamp: new Date().toISOString(),
  })
}

export const paginatedResponse = (
  res,
  items,
  total,
  page = 1,
  limit = 10,
  message = '查询成功',
) => {
  return successResponse(
    res,
    {
      items,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    },
    message,
  )
}

export const success = (data = null, message = '操作成功') => ({
  code: 200,
  message,
  data,
  timestamp: new Date().toISOString(),
})

export const error = (message = '服务器错误', code = 500, errors = null) => ({
  code,
  message,
  errors,
  timestamp: new Date().toISOString(),
})
