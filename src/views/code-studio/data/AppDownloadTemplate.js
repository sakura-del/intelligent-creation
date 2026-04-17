export const appDownloadTemplate = {
  id: 'app-download',
  name: 'APP下载引导页',
  description: '专为移动应用设计的精美下载页面，包含功能展示、设备模拟、二维码扫描、用户评价和一键下载功能',
  category: 'app_download',
  thumbnail: '📲',
  difficulty: 'beginner',
  targetAudience: 'marketer',
  tags: ['APP', '下载', '移动端', '二维码', '功能展示'],
  features: ['animation', 'responsive', 'interactive'],
  customizableFields: [
    { key: 'app_name', label: 'APP名称', type: 'text', default: '超级应用' },
    { key: 'company_name', label: '公司名称', type: 'text', default: 'TechCorp' },
    { key: 'slogan', label: '宣传语', type: 'text', default: '让生活更简单' },
    { key: 'primary_color', label: '主色调', type: 'color', default: '#3B82F6' },
    { key: 'secondary_color', label: '辅助色', type: 'color', default: '#06B6D4' },
    { key: 'ios_url', label: 'iOS下载链接', type: 'text', default: '#' },
    { key: 'android_url', label: 'Android下载链接', type: 'text', default: '#' },
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
  <title>{{app_name}} - {{slogan}}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <!-- 导航栏 -->
  <nav class="navbar">
    <div class="nav-brand">{{company_name}}</div>
    <a href="#download" class="nav-download">立即下载</a>
  </nav>

  <!-- Hero Section -->
  <section class="hero">
    <div class="hero-content">
      <div class="hero-text">
        <h1 class="app-name">{{app_name}}</h1>
        <p class="app-slogan">{{slogan}}</p>
        <p class="app-desc">重新定义你的数字体验。简单、强大、优雅。</p>

        <div class="download-buttons">
          <a href="{{ios_url}}" class="btn-download ios">
            <span class="store-icon">🍎</span>
            <div class="store-info">
              <small>Download on the</small>
              <strong>App Store</strong>
            </div>
          </a>
          <a href="{{android_url}}" class="btn-download android">
            <span class="store-icon">🤖</span>
            <div class="store-info">
              <small>GET IT ON</small>
              <strong>Google Play</strong>
            </div>
          </a>
        </div>

        <div class="stats">
          <div class="stat-item">
            <span class="stat-number">100K+</span>
            <span class="stat-label">活跃用户</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">4.9</span>
            <span class="stat-label">用户评分</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">#1</span>
            <span class="stat-label">应用商店</span>
          </div>
        </div>
      </div>

      <div class="hero-phone">
        <div class="phone-mockup">
          <div class="phone-screen">
            <div class="screen-content">
              <div class="mock-app-header"></div>
              <div class="mock-card"></div>
              <div class="mock-card small"></div>
              <div class="mock-card medium"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- 功能特性 -->
  <section class="features" id="features">
    <h2 class="section-title">为什么选择我们？</h2>
    <div class="feature-list">
      <div class="feature-item">
        <div class="feature-icon">⚡</div>
        <div class="feature-content">
          <h3>极速响应</h3>
          <p>毫秒级加载，流畅体验无延迟</p>
        </div>
      </div>
      <div class="feature-item">
        <div class="feature-icon">🔒</div>
        <div class="feature-content">
          <h3>安全可靠</h3>
          <p>端到端加密，保护你的隐私</p>
        </div>
      </div>
      <div class="feature-item">
        <div class="feature-icon">🎯</div>
        <div class="feature-content">
          <h3>智能推荐</h3>
          <p>AI驱动，懂你所需</p>
        </div>
      </div>
      <div class="feature-item">
        <div class="feature-icon">🌙</div>
        <div class="feature-content">
          <h3>深色模式</h3>
          <p>护眼设计，夜间使用更舒适</p>
        </div>
      </div>
    </div>
  </section>

  <!-- 用户评价 -->
  <section class="testimonials">
    <h2 class="section-title">用户怎么说？</h2>
    <div class="testimonial-grid">
      <div class="testimonial-card">
        <div class="stars">★★★★★</div>
        <p>"这是我用过最好的APP，界面简洁功能强大！"</p>
        <div class="author">
          <div class="avatar">张</div>
          <div class="info">
            <strong>张小明</strong>
            <span>产品经理</span>
          </div>
        </div>
      </div>
      <div class="testimonial-card">
        <div class="stars">★★★★★</div>
        <p>"终于找到了一款真正好用的工具类APP！"</p>
        <div class="author">
          <div class="avatar">李</div>
          <div class="info">
            <strong>李华</strong>
            <span>设计师</span>
          </div>
        </div>
      </div>
      <div class="testimonial-card">
        <div class="stars">★★★★★</div>
        <p>"推荐给所有朋友，效率提升300%不是梦。"</p>
        <div class="author">
          <div class="avatar">王</div>
          <div class="info">
            <strong>王芳</strong>
            <span>创业者</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- 下载区域 -->
  <section class="download-section" id="download">
    <div class="download-container">
      <h2>立即下载体验</h2>
      <p>{{app_name}} 已在各大应用商店上线</p>
      
      <div class="download-options">
        <div class="qr-code-box">
          <div class="qr-placeholder" id="qrcode">
            <!-- 二维码将通过JS生成 -->
          </div>
          <span>扫码下载</span>
        </div>
        
        <div class="divider-text">或</div>
        
        <div class="store-buttons">
          <a href="{{ios_url}}" class="store-btn large">
            <span>🍎 App Store</span>
          </a>
          <a href="{{android_url}}" class="store-btn large">
            <span>🤖 Google Play</span>
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <div class="footer-content">
      <div class="footer-brand">
        <h3>{{app_name}}</h3>
        <p>{{slogan}}</p>
      </div>
      <div class="footer-links">
        <a href="#">关于我们</a>
        <a href="#">隐私政策</a>
        <a href="#">服务条款</a>
        <a href="#">联系我们</a>
      </div>
      <div class="footer-social">
        <a href="#" title="Twitter">𝕏</a>
        <a href="#" title="Instagram">📷</a>
        <a href="#" title="GitHub">⌨️</a>
      </div>
    </div>
    <div class="copyright">
      &copy; 2026 {{company_name}}. All rights reserved.
    </div>
  </footer>

  <script src="script.js"></script>
</body>
</html>`
    },

    {
      name: 'style.css',
      language: 'css',
      content: `/* APP下载引导页样式 */
:root {
  --primary: #3B82F6;
  --secondary: #06B6D4;
  --accent: #8B5CF6;
  --bg-light: #F8FAFC;
  --bg-dark: #0F172A;
  --text-primary: #1E293B;
  --text-secondary: #64748B;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: var(--text-primary);
  overflow-x: hidden;
}

/* 导航栏 */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 40px;
  background: white;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.nav-brand {
  font-size: 22px;
  font-weight: 800;
  color: var(--primary);
}

.nav-download {
  padding: 10px 24px;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: white;
  text-decoration: none;
  border-radius: 10px;
  font-weight: 600;
  transition: transform 0.3s;
}

.nav-download:hover {
  transform: scale(1.05);
}

/* Hero Section */
.hero {
  min-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  background: linear-gradient(135deg, #EFF6FF 0%, #F0FDFA 50%, #FAF5FF 100%);
}

.hero-content {
  max-width: 1200px;
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

.hero-text {
  animation: fadeInLeft 1s ease-out;
}

.app-name {
  font-size: clamp(36px, 5vw, 56px);
  font-weight: 900;
  color: var(--text-primary);
  line-height: 1.1;
  margin-bottom: 12px;
}

.app-slogan {
  font-size: 24px;
  color: var(--primary);
  font-weight: 600;
  margin-bottom: 20px;
}

.app-desc {
  font-size: 18px;
  color: var(--text-secondary);
  max-width: 480px;
  margin-bottom: 32px;
  line-height: 1.7;
}

.download-buttons {
  display: flex;
  gap: 16px;
  margin-bottom: 40px;
  flex-wrap: wrap;
}

.btn-download {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 28px;
  border-radius: 14px;
  text-decoration: none;
  transition: all 0.3s;
  border: none;
  cursor: pointer;
}

.btn-download.ios {
  background: #000;
  color: white;
}

.btn-download.android {
  background: linear-gradient(135deg, #34A853, #188038);
  color: white;
}

.btn-download:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
}

.store-icon {
  font-size: 28px;
}

.store-info {
  display: flex;
  flex-direction: column;
}

.store-info small {
  font-size: 11px;
  opacity: 0.8;
}

.store-info strong {
  font-size: 16px;
}

.stats {
  display: flex;
  gap: 40px;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-number {
  font-size: 28px;
  font-weight: 800;
  color: var(--primary);
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
}

/* 手机模型 */
.hero-phone {
  display: flex;
  justify-content: center;
  animation: fadeInRight 1s ease-out;
}

.phone-mockup {
  width: 280px;
  height: 560px;
  background: #1E293B;
  border-radius: 40px;
  padding: 12px;
  box-shadow:
    0 25px 80px rgba(0, 0, 0, 0.15),
    inset 0 0 0 2px rgba(255, 255, 255, 0.1);
  position: relative;
}

.phone-mockup::before {
  content: '';
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 24px;
  background: #0F172A;
  border-radius: 12px;
}

.phone-screen {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  border-radius: 30px;
  overflow: hidden;
  position: relative;
}

.screen-content {
  padding: 50px 16px 16px;
}

.mock-app-header {
  height: 40px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  margin-bottom: 16px;
}

.mock-card {
  height: 120px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 16px;
  margin-bottom: 12px;
  animation: pulse 3s infinite;
}

.mock-card.small {
  height: 80px;
  animation-delay: 0.5s;
}

.mock-card.medium {
  height: 100px;
  animation-delay: 1s;
}

@keyframes pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

@keyframes fadeInLeft {
  from { opacity: 0; transform: translateX(-30px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes fadeInRight {
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
}

/* 功能特性 */
.features {
  padding: 100px 40px;
  max-width: 900px;
  margin: 0 auto;
}

.section-title {
  font-size: 38px;
  font-weight: 800;
  text-align: center;
  margin-bottom: 64px;
  color: var(--text-primary);
}

.feature-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 32px;
}

.feature-item {
  display: flex;
  gap: 20px;
  padding: 24px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  transition: all 0.3s;
}

.feature-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 35px rgba(59, 130, 246, 0.12);
}

.feature-icon {
  font-size: 40px;
  flex-shrink: 0;
}

.feature-content h3 {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.feature-content p {
  color: var(--text-secondary);
  font-size: 15px;
}

/* 用户评价 */
.testimonials {
  padding: 100px 40px;
  background: var(--bg-light);
}

.testimonial-grid {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 28px;
}

.testimonial-card {
  background: white;
  padding: 32px;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  transition: all 0.3s;
}

.testimonial-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 45px rgba(0, 0, 0, 0.08);
}

.stars {
  color: #FBBF24;
  font-size: 18px;
  margin-bottom: 16px;
}

.testimonial-card p {
  font-size: 16px;
  line-height: 1.7;
  color: var(--text-primary);
  margin-bottom: 24px;
  font-style: italic;
}

.author {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 44px; height: 44px;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 16px;
}

.info {
  display: flex;
  flex-direction: column;
}

.info strong {
  font-size: 15px;
  color: var(--text-primary);
}

.info span {
  font-size: 13px;
  color: var(--text-secondary);
}

/* 下载区域 */
.download-section {
  padding: 120px 40px;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: white;
  text-align: center;
}

.download-container h2 {
  font-size: 42px;
  font-weight: 900;
  margin-bottom: 16px;
}

.download-container > p {
  font-size: 18px;
  opacity: 0.9;
  margin-bottom: 48px;
}

.download-options {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 40px;
  flex-wrap: wrap;
}

.qr-code-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.qr-placeholder {
  width: 160px;
  height: 160px;
  background: white;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--text-secondary);
}

.qr-code-box span {
  font-size: 14px;
  opacity: 0.9;
}

.divider-text {
  font-size: 20px;
  opacity: 0.7;
  font-weight: 300;
}

.store-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.store-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 32px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  color: white;
  text-decoration: none;
  border-radius: 14px;
  font-weight: 600;
  font-size: 16px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  transition: all 0.3s;
  min-width: 220px;
}

.store-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.02);
}

/* Footer */
.footer {
  background: var(--bg-dark);
  color: white;
  padding: 60px 40px 30px;
}

.footer-content {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 40px;
  margin-bottom: 40px;
}

.footer-brand h3 {
  font-size: 24px;
  margin-bottom: 8px;
}

.footer-brand p {
  color: #94A3B8;
}

.footer-links,
.footer-social {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.footer-links a,
.footer-social a {
  color: #94A3B8;
  text-decoration: none;
  transition: color 0.3s;
  font-size: 15px;
}

.footer-links a:hover,
.footer-social a:hover {
  color: var(--primary);
}

.copyright {
  text-align: center;
  padding-top: 30px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: #64748B;
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .hero-content {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .hero-text {
    order: 1;
  }

  .hero-phone {
    order: 0;
  }

  .app-desc {
    margin: 0 auto 32px;
  }

  .download-buttons {
    justify-content: center;
  }

  .stats {
    justify-content: center;
  }

  .phone-mockup {
    width: 240px;
    height: 480px;
  }
}

@media (max-width: 768px) {
  .navbar {
    padding: 12px 20px;
  }

  .hero {
    padding: 60px 20px;
  }

  .section-title {
    font-size: 28px;
  }

  .features,
  .testimonials {
    padding: 60px 20px;
  }

  .download-section {
    padding: 80px 20px;
  }

  .download-options {
    flex-direction: column;
  }

  .footer-content {
    grid-template-columns: 1fr;
    text-align: center;
  }
}`
    },

    {
      name: 'script.js',
      language: 'javascript',
      content: `// APP下载引导页交互逻辑

document.addEventListener('DOMContentLoaded', function() {
  initSmoothScroll();
  initScrollAnimations();
});

// 平滑滚动
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// 滚动动画
function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);

  // 为需要动画的元素添加初始状态并观察
  const animatedElements = document.querySelectorAll(
    '.feature-item, .testimonial-card, .stat-item'
  );

  animatedElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    observer.observe(el);
  });

  // 手机浮动动画
  const phoneMockup = document.querySelector('.phone-mockup');
  if (phoneMockup) {
    let floatAnimation = null;
    
    window.addEventListener('scroll', () => {
      const scrolled = window.pageYOffset;
      const rate = scrolled * -0.3;
      
      if (phoneMockup) {
        phoneMockup.style.transform = \`translateY(\${rate}px)\`;
      }
    });
  }
}

// 模拟二维码生成（实际项目中应替换为真实二维码）
document.addEventListener('DOMContentLoaded', function() {
  const qrContainer = document.getElementById('qrcode');
  
  if (qrContainer) {
    // 创建一个简单的二维码占位符图案
    qrContainer.innerHTML = \`
      <svg viewBox="0 0 100 100" style="width:140px;height:140px;">
        <rect fill="#fff" width="100" height="100"/>
        <path fill="#000" d="
          M10,10 h30 v30 h-30 z M15,15 h20 v20 h-20 z M20,20 h10 v10 h-10 z
          M60,10 h30 v30 h-30 z M65,15 h20 v20 h-20 z M70,20 h10 v10 h-10 z
          M10,60 h30 v30 h-30 z M15,65 h20 v20 h-20 z M20,70 h10 v10 h-10 z
          M55,55 h15 v15 h-15 z M75,55 h15 v15 h-15 z M55,75 h15 v15 h-15 z M75,75 h15 v15 h-15 z
          M50,47 h3v6 h-3 z M47,50 h6v3 h-6 z M50,53 h3v6 h-3 z
        "/>
        <text x="50" y="92" text-anchor="middle" font-size="8" fill="#666">扫码下载</text>
      </svg>
    \`;
  }
});

// 下载按钮点击追踪
document.querySelectorAll('.btn-download, .store-btn').forEach(btn => {
  btn.addEventListener('click', function(e) {
    const platform = this.classList.contains('ios') ? 'iOS' : 
                     this.textContent.includes('App Store') ? 'iOS' : 'Android';
    
    // 显示Toast提示
    showToast(\`正在跳转到\${platform}应用商店...\`);
    
    // 实际项目中可以在这里添加分析代码
    console.log(\`Download initiated: \${platform}\`);
  });
});

// Toast 提示函数
function showToast(message) {
  // 移除已有的toast
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = \`
    <span>✅</span>
    <span>\${message}</span>
  \`;

  toast.style.cssText = \`
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(10px);
    color: white;
    padding: 14px 28px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
    font-weight: 500;
    z-index: 9999;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  \`;

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(100px)';
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// 统计数字动画
function animateNumbers() {
  const numbers = document.querySelectorAll('.stat-number');
  
  numbers.forEach(num => {
    const target = num.textContent;
    const isNumeric = !isNaN(parseFloat(target));
    
    if (isNumeric && target !== '#1') {
      const finalValue = parseFloat(target);
      let current = 0;
      const increment = finalValue / 50;
      const suffix = target.includes('K') ? 'K+' : '';
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= finalValue) {
          current = finalValue;
          clearInterval(timer);
        }
        num.textContent = Math.floor(current) + suffix;
      }, 30);
    }
  });
}

// 当统计部分进入视口时触发动画
const statsSection = document.querySelector('.stats');
if (statsSection) {
  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateNumbers();
        statsObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  statsObserver.observe(statsSection);
}

console.log(\`{{app_name}} Download Page Loaded Successfully! 🚀\`);`
    },
  ],
}
