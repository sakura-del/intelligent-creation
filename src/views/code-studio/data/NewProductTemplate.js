export const newProductTemplate = {
  id: 'new-product-launch',
  name: '新品发布预热页',
  description: '专为新产品发布设计的高转化率预热页面，包含神秘感营造、倒计时、邮件订阅和社交媒体分享模块',
  category: 'product_launch',
  thumbnail: '🚀',
  difficulty: 'beginner',
  targetAudience: 'marketer',
  tags: ['新品发布', '预热', '神秘感', '倒计时', '订阅'],
  features: ['animation', 'responsive', 'form'],
  customizableFields: [
    { key: 'product_name', label: '产品名称', type: 'text', default: '神秘新品' },
    { key: 'brand_name', label: '品牌名称', type: 'text', default: 'TechBrand' },
    { key: 'launch_date', label: '发布日期', type: 'date', default: '2026-05-01' },
    { key: 'primary_color', label: '主色调', type: 'color', default: '#6366F1' },
    { key: 'secondary_color', label: '辅助色', type: 'color', default: '#8B5CF6' },
    { key: 'tagline', label: '宣传语', type: 'text', default: '即将改变一切' },
  ],
  baseFiles: [
    {
      name: 'index.html',
      language: 'html',
      content: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{brand_name}} - {{product_name}}</title>
  <link rel="stylesheet" href="style.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap" rel="stylesheet">
</head>
<body>
  <!-- 粒子背景 -->
  <div class="particles" id="particles"></div>

  <!-- 主容器 -->
  <div class="container">
    <!-- 导航栏 -->
    <nav class="navbar">
      <div class="logo">{{brand_name}}</div>
      <div class="nav-links">
        <a href="#features">特性</a>
        <a href="#countdown">发布时间</a>
        <a href="#subscribe">预约</a>
      </div>
    </nav>

    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-badge">🔥 即将发布</div>
      <h1 class="hero-title">{{tagline}}</h1>
      <h2 class="product-name">{{product_name}}</h2>
      <p class="hero-desc">我们正在重新定义行业标准。敬请期待，这将是颠覆性的创新。</p>

      <div class="cta-group">
        <a href="#subscribe" class="btn-primary">立即预约 →</a>
        <a href="#features" class="btn-secondary">了解更多</a>
      </div>

      <!-- 滚动提示 -->
      <div class="scroll-hint">
        <span>向下滚动探索</span>
        <div class="scroll-arrow">↓</div>
      </div>
    </section>

    <!-- 特性展示 -->
    <section class="features" id="features">
      <h2 class="section-title">为什么值得期待？</h2>
      <div class="feature-grid">
        <div class="feature-card">
          <div class="feature-icon">⚡</div>
          <h3>极速性能</h3>
          <p>采用最新架构，性能提升300%</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🎨</div>
          <h3>极致设计</h3>
          <p>每一个像素都经过精心打磨</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🔒</div>
          <h3>安全可靠</h3>
          <p>企业级安全保障体系</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🌐</div>
          <h3>全球部署</h3>
          <p>毫秒级响应，全球覆盖</p>
        </div>
      </div>
    </section>

    <!-- 倒计时 -->
    <section class="countdown-section" id="countdown">
      <h2 class="section-title light">距离发布还有</h2>
      <div class="countdown-timer">
        <div class="time-box">
          <span id="days" class="time-number">00</span>
          <span class="time-label">天</span>
        </div>
        <div class="time-separator">:</div>
        <div class="time-box">
          <span id="hours" class="time-number">00</span>
          <span class="time-label">时</span>
        </div>
        <div class="time-separator">:</div>
        <div class="time-box">
          <span id="minutes" class="time-number">00</span>
          <span class="time-label">分</span>
        </div>
        <div class="time-separator">:</div>
        <div class="time-box">
          <span id="seconds" class="time-number">00</span>
          <span class="time-label">秒</span>
        </div>
      </div>
    </section>

    <!-- 邮件订阅 -->
    <section class="subscribe-section" id="subscribe">
      <div class="subscribe-container">
        <h2 class="section-title">第一时间获取通知</h2>
        <p class="subscribe-desc">输入邮箱，我们将第一时间通知你产品发布信息</p>
        <form class="subscribe-form" onsubmit="handleSubscribe(event)">
          <input type="email" placeholder="your@email.com" required />
          <button type="submit" class="btn-subscribe">预约通知</button>
        </form>
        <div class="social-share">
          <span>分享给朋友：</span>
          <a href="#" class="share-btn twitter" title="Twitter">𝕏</a>
          <a href="#" class="share-btn facebook" title="Facebook">f</a>
          <a href="#" class="share-btn wechat" title="微信">微</a>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <p>&copy; 2026 {{brand_name}}. All rights reserved.</p>
      <p class="footer-links">
        <a href="#">隐私政策</a> | <a href="#">服务条款</a> | <a href="#">联系我们</a>
      </p>
    </footer>
  </div>

  <script src="script.js"></script>
</body>
</html>`
    },

    {
      name: 'style.css',
      language: 'css',
      content: `/* 新品发布预热页样式 */
:root {
  --primary: #6366F1;
  --secondary: #8B5CF6;
  --accent: #A78BFA;
  --bg-dark: #0F0F1A;
  --bg-card: rgba(255, 255, 255, 0.03);
  --text-primary: #FFFFFF;
  --text-secondary: #94A3B8;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--bg-dark);
  color: var(--text-primary);
  overflow-x: hidden;
  line-height: 1.6;
}

/* 粒子背景 */
.particles {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
  z-index: 0;
}

.particle {
  position: absolute;
  width: 4px; height: 4px;
  background: var(--primary);
  border-radius: 50%;
  opacity: 0.3;
  animation: float 15s infinite ease-in-out;
}

@keyframes float {
  0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
  50% { transform: translateY(-100px) translateX(50px); opacity: 0.6; }
}

.container {
  position: relative;
  z-index: 1;
}

/* 导航栏 */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  background: rgba(15, 15, 26, 0.8);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  position: sticky;
  top: 0;
  z-index: 100;
}

.logo {
  font-size: 24px;
  font-weight: 900;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-links a {
  color: var(--text-secondary);
  text-decoration: none;
  margin-left: 32px;
  transition: color 0.3s;
}

.nav-links a:hover {
  color: var(--text-primary);
}

/* Hero Section */
.hero {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 80px 20px;
  position: relative;
}

.hero-badge {
  display: inline-block;
  padding: 8px 20px;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border-radius: 50px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 32px;
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.4); }
  50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.7); }
}

.hero-title {
  font-size: clamp(2rem, 6vw, 4.5rem);
  font-weight: 900;
  letter-spacing: -0.02em;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #fff 0%, var(--accent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: fadeInUp 1s ease-out;
}

.product-name {
  font-size: clamp(1.5rem, 4vw, 3rem);
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 24px;
  animation: fadeInUp 1s ease-out 0.2s both;
}

.hero-desc {
  max-width: 600px;
  font-size: 18px;
  color: var(--text-secondary);
  margin-bottom: 48px;
  animation: fadeInUp 1s ease-out 0.4s both;
}

.cta-group {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
  animation: fadeInUp 1s ease-out 0.6s both;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 16px 32px;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: white;
  text-decoration: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 16px;
  transition: all 0.3s;
  border: none;
  cursor: pointer;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 40px rgba(99, 102, 241, 0.4);
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 16px 32px;
  background: transparent;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: 12px;
  font-weight: 600;
  font-size: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s;
  cursor: pointer;
}

.btn-secondary:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.scroll-hint {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 14px;
  animation: bounce 2s infinite;
}

.scroll-arrow {
  font-size: 20px;
}

@keyframes bounce {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(10px); }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 特性展示 */
.features {
  padding: 120px 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  font-size: 42px;
  font-weight: 800;
  text-align: center;
  margin-bottom: 64px;
  letter-spacing: -0.02em;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 32px;
}

.feature-card {
  background: var(--bg-card);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 40px 28px;
  text-align: center;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.feature-card:hover {
  transform: translateY(-8px);
  border-color: var(--primary);
  box-shadow: 0 20px 60px rgba(99, 102, 241, 0.15);
}

.feature-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.feature-card h3 {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 12px;
}

.feature-card p {
  color: var(--text-secondary);
  font-size: 15px;
}

/* 倒计时 */
.countdown-section {
  padding: 100px 40px;
  text-align: center;
  background: linear-gradient(180deg, transparent, rgba(99, 102, 241, 0.05));
}

.countdown-section .section-title.light {
  color: var(--text-primary);
}

.countdown-timer {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 48px;
}

.time-box {
  background: var(--bg-card);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px 32px;
  min-width: 110px;
  backdrop-filter: blur(10px);
}

.time-number {
  display: block;
  font-size: 56px;
  font-weight: 900;
  color: var(--primary);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.time-label {
  display: block;
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 8px;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.time-separator {
  font-size: 40px;
  color: var(--primary);
  font-weight: 300;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* 订阅区域 */
.subscribe-section {
  padding: 120px 40px;
}

.subscribe-container {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
}

.subscribe-desc {
  color: var(--text-secondary);
  font-size: 18px;
  margin-bottom: 40px;
}

.subscribe-form {
  display: flex;
  gap: 12px;
  margin-bottom: 32px;
}

.subscribe-form input {
  flex: 1;
  padding: 18px 24px;
  background: var(--bg-card);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
  font-size: 16px;
  outline: none;
  transition: all 0.3s;
}

.subscribe-form input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.subscribe-form input::placeholder {
  color: var(--text-secondary);
}

.btn-subscribe {
  padding: 18px 32px;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
}

.btn-subscribe:hover {
  transform: scale(1.02);
  box-shadow: 0 10px 30px rgba(99, 102, 241, 0.3);
}

.social-share {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text-secondary);
}

.share-btn {
  width: 44px; height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: bold;
  transition: all 0.3s;
}

.share-btn:hover {
  background: var(--primary);
  color: white;
  transform: translateY(-2px);
}

.share-btn.twitter:hover { background: #1DA1F2; }
.share-btn.facebook:hover { background: #4267B2; }
.share-btn.wechat:hover { background: #07C160; }

/* Footer */
.footer {
  padding: 40px;
  text-align: center;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  color: var(--text-secondary);
  font-size: 14px;
}

.footer-links {
  margin-top: 12px;
}

.footer-links a {
  color: var(--text-secondary);
  text-decoration: none;
  margin: 0 12px;
  transition: color 0.3s;
}

.footer-links a:hover {
  color: var(--primary);
}

/* Toast Notification */
.toast-notification {
  position: fixed;
  top: 24px;
  right: 24px;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: white;
  padding: 16px 28px;
  border-radius: 12px;
  font-weight: 500;
  box-shadow: 0 10px 40px rgba(99, 102, 241, 0.3);
  z-index: 9999;
  animation: slideInRight 0.4s ease-out;
}

@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

/* Responsive Design */
@media (max-width: 768px) {
  .navbar {
    padding: 16px 20px;
  }

  .nav-links {
    display: none;
  }

  .hero-title {
    font-size: 2rem;
  }

  .section-title {
    font-size: 28px;
  }

  .countdown-timer {
    flex-wrap: wrap;
  }

  .time-box {
    min-width: 80px;
    padding: 16px 20px;
  }

  .time-number {
    font-size: 36px;
  }

  .subscribe-form {
    flex-direction: column;
  }

  .feature-grid {
    grid-template-columns: 1fr;
  }
}`
    },

    {
      name: 'script.js',
      language: 'javascript',
      content: `// 新品发布预热页交互逻辑

document.addEventListener('DOMContentLoaded', function() {
  initParticles();
  initCountdown();
  initSmoothScroll();
});

// 粒子背景效果
function initParticles() {
  const container = document.getElementById('particles');
  if (!container) return;

  const particleCount = 50;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // 随机位置和大小
    const size = Math.random() * 4 + 2;
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    
    // 随机动画延迟和持续时间
    particle.style.animationDuration = (Math.random() * 20 + 10) + 's';
    particle.style.animationDelay = (Math.random() * 10) + 's';
    
    container.appendChild(particle);
  }
}

// 倒计时功能
function initCountdown() {
  const launchDate = new Date('2026-05-01T00:00:00').getTime();

  function updateCountdown() {
    const now = new Date().getTime();
    const distance = launchDate - now;

    if (distance < 0) {
      document.getElementById('days').textContent = '00';
      document.getElementById('hours').textContent = '00';
      document.getElementById('minutes').textContent = '00';
      document.getElementById('seconds').textContent = '00';
      
      // 发布后显示庆祝消息
      document.querySelector('.countdown-section .section-title').textContent = '🎉 已正式发布！';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById('days').textContent = String(days).padStart(2, '0');
    document.getElementById('hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);
}

// 平滑滚动
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// 订阅表单处理
function handleSubscribe(event) {
  event.preventDefault();
  
  const emailInput = event.target.querySelector('input[type="email"]');
  const email = emailInput.value.trim();
  
  if (!isValidEmail(email)) {
    showToast('请输入有效的邮箱地址', 'error');
    return;
  }

  // 模拟提交
  const btn = event.target.querySelector('.btn-subscribe');
  const originalText = btn.textContent;
  
  btn.textContent = '提交中...';
  btn.disabled = true;
  
  setTimeout(() => {
    showToast('✅ 预约成功！我们会第一时间通知您');
    emailInput.value = '';
    btn.textContent = originalText;
    btn.disabled = false;
  }, 1500);
}

// Toast 提示
function showToast(message, type = 'success') {
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;
  
  if (type === 'error') {
    toast.style.background = 'linear-gradient(135deg, #EF4444, #DC2626)';
  }
  
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.4s ease-in forwards';
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// 邮箱验证
function isValidEmail(email) {
  const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return regex.test(email);
}

// 特性卡片动画（Intersection Observer）
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const featureObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, index) => {
    if (entry.isIntersecting) {
      entry.target.style.animationDelay = (index * 0.1) + 's';
      entry.target.classList.add('visible');
    }
  });
}, observerOptions);

document.querySelectorAll('.feature-card').forEach(card => {
  card.style.opacity = '0';
  card.style.transform = 'translateY(30px)';
  card.style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  featureObserver.observe(card);
});

// 添加可见类时的样式
const style = document.createElement('style');
style.textContent = \`
  .feature-card.visible {
    opacity: 1 !important;
    transform: translateY(0) !important;
  }
  @keyframes slideOutRight {
    to { transform: translateX(100%); opacity: 0; }
  }
\`;
document.head.appendChild(style);`
    },
  ],
}
