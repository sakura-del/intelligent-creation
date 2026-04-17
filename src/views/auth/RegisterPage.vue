<template>
  <div class="register-page">
    <div class="register-container">
      <div class="register-left">
        <div class="brand">
          <el-icon :size="48" color="#fff">
            <MagicStick />
          </el-icon>
          <h1>加入 AI 创作平台</h1>
          <p>开启您的智能创作之旅</p>
        </div>
        <div class="benefits">
          <h4>注册即享：</h4>
          <ul>
            <li>✓ 每日 100 次 AI 调用额度</li>
            <li>✓ 全部模板免费使用</li>
            <li>✓ 无限次内容导出</li>
            <li>✓ 优先体验新功能</li>
          </ul>
        </div>
      </div>

      <div class="register-right">
        <h2>创建账户</h2>
        <p class="subtitle">填写以下信息完成注册</p>

        <el-form ref="formRef" :model="form" :rules="rules" class="register-form">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item prop="username">
                <el-input v-model="form.username" placeholder="用户名（仅支持字母和数字）" prefix-icon="User" size="large" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item prop="nickname">
                <el-input v-model="form.nickname" placeholder="昵称" size="large" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item prop="email">
            <el-input v-model="form.email" placeholder="邮箱地址" prefix-icon="Message" size="large" />
          </el-form-item>

          <el-form-item prop="password">
            <el-input v-model="form.password" type="password" placeholder="密码（至少6位）" prefix-icon="Lock" size="large"
              show-password />
          </el-form-item>

          <el-form-item prop="confirmPassword">
            <el-input v-model="form.confirmPassword" type="password" placeholder="确认密码" prefix-icon="Lock" size="large"
              show-password />
          </el-form-item>

          <el-form-item prop="agreement">
            <el-checkbox v-model="form.agreement">
              我已阅读并同意
              <el-link type="primary" :underline="false">《服务协议》</el-link>
              和
              <el-link type="primary" :underline="false">《隐私政策》</el-link>
            </el-checkbox>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" size="large" class="register-btn" :loading="loading" @click="handleRegister">
              立即注册
            </el-button>
          </el-form-item>
        </el-form>

        <p class="login-link">
          已有账户？
          <router-link to="/login">立即登录</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/modules/user'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref(null)
const loading = ref(false)

const form = reactive({
  username: '',
  nickname: '',
  email: '',
  password: '',
  confirmPassword: '',
  agreement: false
})

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在3到20个字符', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9]+$/, message: '用户名只能包含字母和数字', trigger: 'blur' }
  ],
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ],
  agreement: [
    {
      validator: (rule, value, callback) => {
        if (!value) {
          callback(new Error('请阅读并同意服务协议'))
        } else {
          callback()
        }
      }, trigger: 'change'
    }
  ]
}

async function handleRegister() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true

  const success = await userStore.register({
    username: form.username,
    nickname: form.nickname,
    email: form.email,
    password: form.password
  })

  loading.value = false

  if (success) {
    router.push('/login')
  }
}
</script>

<style lang="scss" scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.register-container {
  display: grid;
  grid-template-columns: 400px 520px;
  background: var(--bg-white);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 920px;
  width: 100%;
}

.register-left {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 60px 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  color: #fff;

  .brand {
    text-align: center;
    margin-bottom: 40px;

    h1 {
      font-size: 28px;
      margin: 16px 0 8px;
      font-weight: 700;
    }

    p {
      opacity: 0.9;
      font-size: 15px;
    }
  }

  .benefits {
    h4 {
      font-size: 18px;
      margin: 0 0 16px;
      font-weight: 600;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;

      li {
        padding: 10px 0;
        font-size: 15px;
        opacity: 0.95;
      }
    }
  }
}

.register-right {
  padding: 48px 44px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow-y: auto;

  h2 {
    font-size: 28px;
    color: var(--text-primary);
    margin: 0 0 8px;
    text-align: center;
  }

  .subtitle {
    color: var(--text-secondary);
    text-align: center;
    margin-bottom: 32px;
  }

  .register-form {
    .register-btn {
      width: 100%;
      height: 46px;
      font-size: 16px;
    }
  }

  .login-link {
    text-align: center;
    color: var(--text-regular);
    font-size: 14px;
    margin-top: 20px;

    a {
      color: var(--color-primary);
      font-weight: 500;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}
</style>
