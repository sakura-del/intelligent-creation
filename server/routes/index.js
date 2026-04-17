import { Router } from 'express'
import userRouter from './user.js'
import aiRouter from './ai.js'
import appRouter from './app.js'
import promptsRouter from './prompts.js'
import galleryRouter from './gallery.js'
import uploadRoutes from './upload.js'
import monitoringRouter from './monitoring.js'
import codeProjectsRouter from './codeProjects.js'
import analyticsRouter from './analytics.js'

const router = Router()

router.use('/user', userRouter)
router.use('/ai', aiRouter)
router.use('/app', appRouter)
router.use('/prompts', promptsRouter)
router.use('/gallery', galleryRouter)
router.use('/upload', uploadRoutes)
router.use('/', monitoringRouter)
router.use('/projects', codeProjectsRouter)
router.use('/analytics', analyticsRouter)

export default router
