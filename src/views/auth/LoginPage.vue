<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-left">
        <div class="brand">
          <el-icon :size="48" color="#fff">
            <MagicStick />
          </el-icon>
          <h1>AI创作平台</h1>
          <p>智能创作，一键完成</p>
        </div>
        <div class="features-list">
          <div class="feature-item">
            <el-icon>
              <Check />
            </el-icon>
            <span>50+ 专业模板库</span>
          </div>
          <div class="feature-item">
            <el-icon>
              <Check />
            </el-icon>
            <span>AI 驱动的内容生成</span>
          </div>
          <div class="feature-item">
            <el-icon>
              <Check />
            </el-icon>
            <span>无代码应用搭建</span>
          </div>
        </div>
      </div>

      <div class="login-right">
        <h2>欢迎回来</h2>
        <p class="subtitle">登录您的账户以继续</p>

        <el-form ref="formRef" :model="form" :rules="rules" class="login-form">
          <el-form-item prop="username">
            <el-input v-model="form.username" placeholder="请输入用户名" prefix-icon="User" size="large" />
          </el-form-item>

          <el-form-item prop="password">
            <el-input v-model="form.password" type="password" placeholder="请输入密码" prefix-icon="Lock" size="large"
              show-password @keyup.enter="handleLogin" />
          </el-form-item>

          <div class="form-options">
            <el-checkbox v-model="rememberMe">记住我</el-checkbox>
            <el-link type="primary" :underline="false">忘记密码？</el-link>
          </div>

          <el-form-item>
            <el-button type="primary" size="large" class="login-btn" :loading="loading" @click="handleLogin">
              登录
            </el-button>
          </el-form-item>
        </el-form>

        <div class="divider">
          <span>或</span>
        </div>

        <div class="social-login">
          <el-button circle size="large" class="social-btn wechat">
            <el-icon :size="20">
              <ChatDotRound />
            </el-icon>
          </el-button>
          <el-button circle size="large" class="social-btn github">
            <el-icon :size="20">
              <Link />
            </el-icon>
          </el-button>
        </div>

        <p class="register-link">
          还没有账户？
          <router-link to="/register">立即注册</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/modules/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const formRef = ref(null)
const loading = ref(false)
const rememberMe = ref(false)

const form = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不少于6位', trigger: 'blur' }
  ]
}

async function handleLogin() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true

  const success = await userStore.login(form)

  loading.value = false

  if (success) {
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-container {
  display: grid;
  grid-template-columns: 420px 480px;
  background: var(--bg-white);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 900px;
  width: 100%;
  transition: background-color var(--transition-duration) var(--transition-ease);
}

.login-left {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 60px 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  color: #fff;

  .brand {
    text-align: center;
    margin-bottom: 48px;

    h1 {
      font-size: 32px;
      margin: 16px 0 8px;
      font-weight: 700;
    }

    p {
      opacity: 0.9;
      font-size: 16px;
    }
  }

  .features-list {
    .feature-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      font-size: 15px;

      .el-icon {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        padding: 4px;
      }
    }
  }
}

.login-right {
  padding: 60px 48px;
  display: flex;
  flex-direction: column;
  justify-content: center;

  h2 {
    font-size: 28px;
    color: var(--text-primary);
    margin: 0 0 8px;
    text-align: center;
  }

  .subtitle {
    color: var(--text-secondary);
    text-align: center;
    margin-bottom: 36px;
  }

  .login-form {
    .form-options {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .login-btn {
      width: 100%;
      height: 46px;
      font-size: 16px;
    }
  }

  .divider {
    text-align: center;
    position: relative;
    margin: 28px 0;

    span {
      background: var(--bg-white);
      padding: 0 16px;
      color: var(--text-secondary);
      position: relative;
      z-index: 1;
    }

    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: var(--border-light);
    }
  }

  .social-login {
    display: flex;
    justify-content: center;
    gap: 16px;
    margin-bottom: 24px;

    .social-btn {
      width: 48px;
      height: 48px;

      &.wechat:hover {
        background: #07C160;
        color: #fff;
        border-color: #07C160;
      }

      &.github:hover {
        background: #24292e;
        color: #fff;
        border-color: #24292e;
      }
    }
  }

  .register-link {
    text-align: center;
    color: var(--text-regular);
    font-size: 14px;

    a {
      color: var(--color-primary);
      font-weight: 500;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}

@media (max-width: 768px) {
  .login-container {
    grid-template-columns: 1fr;
    max-width: 420px;
  }

  .login-left {
    display: none;
  }

  .login-right {
    padding: 40px 24px;
  }
}
</style>
