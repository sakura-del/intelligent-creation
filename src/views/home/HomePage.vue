<template>
  <div class="home-page">
    <section class="hero-section">
      <div class="hero-content">
        <div class="badge">
          <el-icon>
            <Star />
          </el-icon>
          <span>全新升级 · AI大模型驱动</span>
        </div>
        <h1 class="hero-title">
          智能创作，<span class="highlight">一键完成</span>
        </h1>
        <p class="hero-subtitle">
          融合AI技术与专业模板，轻松生成智能内容和无代码应用，<br />
          让您的创意快速落地
        </p>
        <div class="hero-actions">
          <el-button type="primary" size="large" @click="checkAuthAndNavigate('/ai-content')">
            免费开始使用
            <el-icon>
              <ArrowRight />
            </el-icon>
          </el-button>
          <el-button size="large" plain @click="scrollToFeatures">
            体验AI生成
          </el-button>
        </div>
        <div class="hero-stats">
          <span><strong>1+</strong> 用户</span>
          <span class="divider">|</span>
          <span><strong>5.0分</strong> 好评</span>
          <span class="divider">|</span>
          <span><strong>秒级</strong> 生成速度</span>
        </div>
      </div>
    </section>

    <section id="features" class="features-section">
      <h2 class="section-title">两大核心功能</h2>
      <p class="section-desc">覆盖您的全部创作需求，一个平台解决所有问题</p>

      <div class="features-grid">
        <div class="feature-card" v-for="(feature, index) in features" :key="index">
          <div class="feature-icon" :style="{ background: feature.color }">
            <el-icon :size="28" color="#fff">
              <component :is="feature.icon" />
            </el-icon>
          </div>
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.desc }}</p>
          <ul class="feature-list">
            <li v-for="(item, i) in feature.items" :key="i">{{ item }}</li>
          </ul>
          <el-link type="primary" @click="checkAuthAndNavigate(feature.link)">
            {{ feature.action }} →
          </el-link>
        </div>
      </div>
    </section>

    <section class="stats-section">
      <div class="stats-container">
        <div class="stat-item" v-for="(stat, index) in stats" :key="index">
          <div class="stat-number">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
      </div>
    </section>

    <section class="advantages-section">
      <h2 class="section-title">为什么选择我们</h2>
      <div class="advantages-grid">
        <div class="advantage-card" v-for="(item, index) in advantages" :key="index">
          <div class="advantage-icon">
            <el-icon :size="32" color="#409EFF">
              <component :is="item.icon" />
            </el-icon>
          </div>
          <h4>{{ item.title }}</h4>
          <p>{{ item.desc }}</p>
        </div>
      </div>
    </section>

    <section class="cta-section">
      <h2>立即开始您的AI创作之旅</h2>
      <p>免费试用，每日赠送100次AI调用额度</p>
      <el-button type="primary" size="large" @click="$router.push('/ai-content')">
        免费开始使用
      </el-button>
    </section>

    <footer class="home-footer">
      <p>© 2024 AI创作平台 - 版权所有保留</p>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()

function checkAuthAndNavigate(path) {
  const token = localStorage.getItem('token')
  if (!token) {
    ElMessage.warning('请先登录后再使用此功能')
    router.push({
      name: 'Login',
      query: { redirect: path },
    })
    return
  }
  router.push(path)
}

const features = [
  {
    icon: 'EditPen',
    title: 'AI内容生成',
    desc: '输入一句话，AI为您生成文章、营销文案、产品描述等各类专业内容。',
    items: ['支持20+ 内容类型', '自定义风格和长度', '流式实时输出', '历史记录管理'],
    action: '体验AI创作',
    link: '/ai-content',
    color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
  },
  {
    icon: 'Grid',
    title: '无代码应用搭建',
    desc: '用自然语言描述需求，AI帮您构建完整的应用程序，无需编程基础。',
    items: ['可视化拖拽编辑', 'AI自动生成代码', '一键发布上线', '丰富的模板库'],
    action: '开始搭建应用',
    link: '/app-builder',
    color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
  }
]

const stats = [
  { value: '50万+', label: '注册用户' },
  { value: '200万+', label: '内容生成量' },
  { value: '98%', label: '用户满意度' },
  { value: '0.5s', label: '平均响应时间' }
]

const advantages = [
  {
    icon: 'Lightning',
    title: '极速生成',
    desc: '基于GPT-4大模型，平均0.5秒即可完成高质量内容生成'
  },
  {
    icon: 'Lock',
    title: '数据安全',
    desc: '企业级数据加密，定期备份和安全审计，保障您的隐私'
  },
  {
    icon: 'TrendCharts',
    title: '持续优化',
    desc: 'AI模型持续迭代升级，效果越来越好，功能越来越强'
  },
  {
    icon: 'Service',
    title: '专业客服',
    desc: '7×24小时专业技术支持，解答所有使用问题'
  }
]

function scrollToFeatures() {
  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<style lang="scss" scoped>
.home-page {
  background: var(--bg-white);
  transition: background-color var(--transition-duration) var(--transition-ease);
}

.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 80px 24px;
  text-align: center;
  color: #fff;

  .hero-content {
    max-width: 900px;
    margin: 0 auto;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.2);
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 14px;
    margin-bottom: 24px;
    backdrop-filter: blur(10px);
  }

  .hero-title {
    font-size: 48px;
    font-weight: 700;
    margin: 0 0 20px;
    line-height: 1.2;

    .highlight {
      background: linear-gradient(120deg, #ffd89b 0%, #19547b 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  }

  .hero-subtitle {
    font-size: 18px;
    opacity: 0.95;
    margin-bottom: 36px;
    line-height: 1.6;
  }

  .hero-actions {
    display: flex;
    justify-content: center;
    gap: 16px;
    margin-bottom: 40px;

    .el-button {
      padding: 12px 28px;
      font-size: 16px;
    }

    .el-button--default {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.3);
      color: #fff;

      &:hover {
        background: rgba(255, 255, 255, 0.25);
      }
    }
  }

  .hero-stats {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 24px;
    font-size: 15px;
    opacity: 0.9;

    .divider {
      opacity: 0.5;
    }
  }
}

.features-section {
  padding: 80px 24px;
  max-width: 1200px;
  margin: 0 auto;

  .section-title {
    text-align: center;
    font-size: 36px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 12px;
  }

  .section-desc {
    text-align: center;
    color: var(--text-secondary);
    font-size: 16px;
    margin-bottom: 48px;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 28px;
  }

  .feature-card {
    background: var(--bg-white);
    padding: 32px;
    border-radius: 12px;
    box-shadow: var(--shadow-base);
    transition: transform 0.3s, box-shadow 0.3s, background-color var(--transition-duration) var(--transition-ease);

    &:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-dark);
    }

    .feature-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }

    h3 {
      font-size: 22px;
      color: var(--text-primary);
      margin: 0 0 12px;
    }

    p {
      color: var(--text-regular);
      line-height: 1.6;
      margin-bottom: 16px;
    }

    .feature-list {
      list-style: none;
      padding: 0;
      margin: 0 0 16px;

      li {
        padding: 6px 0;
        color: var(--text-regular);
        font-size: 14px;

        &::before {
          content: '✓';
          color: var(--color-success);
          margin-right: 8px;
          font-weight: bold;
        }
      }
    }
  }
}

.stats-section {
  background: linear-gradient(135deg, #409EFF 0%, #337ecc 100%);
  padding: 60px 24px;

  .stats-container {
    max-width: 1000px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 32px;
  }

  .stat-item {
    text-align: center;
    color: #fff;

    .stat-number {
      font-size: 42px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .stat-label {
      font-size: 15px;
      opacity: 0.9;
    }
  }
}

.advantages-section {
  padding: 80px 24px;
  max-width: 1200px;
  margin: 0 auto;

  .section-title {
    text-align: center;
    font-size: 36px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 48px;
  }

  .advantages-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 32px;
  }

  .advantage-card {
    text-align: center;
    padding: 32px 20px;

    .advantage-icon {
      width: 64px;
      height: 64px;
      background: var(--color-primary-light-9);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }

    h4 {
      font-size: 18px;
      color: var(--text-primary);
      margin: 0 0 10px;
    }

    p {
      color: var(--text-regular);
      font-size: 14px;
      line-height: 1.6;
      margin: 0;
    }
  }
}

.cta-section {
  background: var(--bg-color);
  padding: 80px 24px;
  text-align: center;
  transition: background-color var(--transition-duration) var(--transition-ease);

  h2 {
    font-size: 36px;
    color: var(--text-primary);
    margin: 0 0 12px;
  }

  p {
    color: var(--text-regular);
    font-size: 16px;
    margin-bottom: 28px;
  }

  .el-button {
    padding: 14px 36px;
    font-size: 16px;
  }
}

.home-footer {
  background: var(--text-primary);
  color: #fff;
  text-align: center;
  padding: 24px;
  font-size: 14px;
  opacity: 0.8;
}

@media (max-width: 768px) {
  .hero-section {
    padding: 48px 16px;

    .hero-title {
      font-size: 32px;
    }

    .hero-subtitle {
      font-size: 15px;
    }

    .hero-actions {
      flex-direction: column;
      align-items: center;
    }

    .hero-stats {
      flex-direction: column;
      gap: 8px;

      .divider {
        display: none;
      }
    }
  }

  .features-section {
    padding: 48px 16px;

    .section-title {
      font-size: 28px;
    }

    .features-grid {
      grid-template-columns: 1fr;
    }

    .feature-card {
      padding: 24px;
    }
  }

  .stats-section {
    padding: 40px 16px;

    .stats-container {
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }

    .stat-item .stat-number {
      font-size: 32px;
    }
  }

  .advantages-section {
    padding: 48px 16px;

    .section-title {
      font-size: 28px;
    }
  }

  .cta-section {
    padding: 48px 16px;

    h2 {
      font-size: 28px;
    }
  }
}
</style>
