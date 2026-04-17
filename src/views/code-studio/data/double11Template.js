export const double11Template = {
  id: 'promo-11-11',
  name: '双11狂欢促销页',
  description: '专为双11购物节设计的高转化率促销页面，包含倒计时、优惠券领取、商品展示等模块',
  category: 'promo_11_11',
  thumbnail: '🎉',
  difficulty: 'beginner',
  targetAudience: 'marketer',
  tags: ['双11', '促销', '电商', '倒计时', '优惠券'],
  features: ['animation', 'responsive', 'form'],
  customizableFields: [
    { key: 'brand_name', label: '品牌名称', type: 'text', default: '我的店铺' },
    {
      key: 'discount_rate',
      label: '折扣力度',
      type: 'select',
      options: ['5折起', '满减', '秒杀'],
      default: '5折起',
    },
    { key: 'end_date', label: '活动截止日期', type: 'date', default: '2026-11-11' },
    { key: 'primary_color', label: '主色调', type: 'color', default: '#FF0036' },
    { key: 'secondary_color', label: '辅助色', type: 'color', default: '#FFA500' },
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
  <title>{{brand_name}} - 双11狂欢节</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <!-- Hero Section -->
  <section class="hero">
    <div class="hero-content">
      <h1 class="hero-title">{{brand_name}}</h1>
      <p class="hero-subtitle">双11狂欢节 {{discount_rate}}</p>
      <div class="countdown" id="countdown">
        <div class="time-unit"><span id="days">00</span><label>天</label></div>
        <div class="time-unit"><span id="hours">00</span><label>时</label></div>
        <div class="time-unit"><span id="minutes">00</span><label>分</label></div>
        <div class="time-unit"><span id="seconds">00</span><label>秒</label></div>
      </div>
      <a href="#products" class="cta-button">立即抢购 →</a>
    </div>
  </section>

  <!-- Products Grid -->
  <section class="products" id="products">
    <h2>🔥 热销爆款</h2>
    <div class="product-grid">
      <div class="product-card">
        <img src="https://picsum.photos/300/300?random=1" alt="产品1" loading="lazy">
        <div class="product-info">
          <h3>爆款商品 A</h3>
          <p class="original-price">¥999</p>
          <p class="sale-price">¥499 <span class="tag">{{discount_rate}}</span></p>
          <button class="buy-btn">立即购买</button>
        </div>
      </div>

      <div class="product-card">
        <img src="https://picsum.photos/300/300?random=2" alt="产品2" loading="lazy">
        <div class="product-info">
          <h3>爆款商品 B</h3>
          <p class="original-price">¥1299</p>
          <p class="sale-price">¥649 <span class="tag">{{discount_rate}}</span></p>
          <button class="buy-btn">立即购买</button>
        </div>
      </div>

      <div class="product-card">
        <img src="https://picsum.photos/300/300?random=3" alt="产品3" loading="lazy">
        <div class="product-info">
          <h3>爆款商品 C</h3>
          <p class="original-price">¥799</p>
          <p class="sale-price">¥399 <span class="tag">{{discount_rate}}</span></p>
          <button class="buy-btn">立即购买</button>
        </div>
      </div>
    </div>
  </section>

  <!-- Coupon Section -->
  <section class="coupons">
    <h2>🎫 领券中心</h2>
    <div class="coupon-list">
      <div class="coupon-item">
        <div class="coupon-value">¥50</div>
        <div class="coupon-condition">满299可用</div>
        <button class="coupon-btn">立即领取</button>
      </div>
      <div class="coupon-item">
        <div class="coupon-value">¥100</div>
        <div class="coupon-condition">满599可用</div>
        <button class="coupon-btn">立即领取</button>
      </div>
      <div class="coupon-item">
        <div class="coupon-value">¥200</div>
        <div class="coupon-condition">满999可用</div>
        <button class="coupon-btn">立即领取</button>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="page-footer">
    <p>&copy; 2026 {{brand_name}} All Rights Reserved.</p>
    <p class="disclaimer">活动最终解释权归{{brand_name}}所有</p>
  </footer>

  <script src="script.js"></script>
</body>
</html>`,
    },

    {
      name: 'style.css',
      language: 'css',
      content: `/* 双11促销页样式 */
:root {
  --primary: #FF0036;
  --secondary: #FFA500;
  --bg-gradient: linear-gradient(135deg, #FF0036, #FF4D4D, #FFA500);
  --text-light: #ffffff;
  --text-dark: #333333;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;
  line-height: 1.6;
  color: var(--text-dark);
  overflow-x: hidden;
}

/* Hero Section */
.hero {
  background: var(--bg-gradient);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--text-light);
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  animation: pulse-bg 4s ease-in-out infinite;
}

@keyframes pulse-bg {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-title {
  font-size: clamp(2rem, 8vw, 5rem);
  font-weight: 900;
  text-shadow: 0 4px 20px rgba(0,0,0,0.3);
  margin-bottom: 1rem;
  animation: fadeInUp 1s ease-out;
}

.hero-subtitle {
  font-size: clamp(1.2rem, 3vw, 2rem);
  margin-bottom: 2rem;
  animation: fadeInUp 1s ease-out 0.2s both;
}

/* Countdown Timer */
.countdown {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;
  animation: fadeInUp 1s ease-out 0.4s both;
}

.time-unit {
  background: rgba(255,255,255,0.2);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  min-width: 80px;
}

.time-unit span {
  display: block;
  font-size: 2.5rem;
  font-weight: bold;
  line-height: 1;
}

.time-unit label {
  font-size: 0.875rem;
  opacity: 0.8;
}

/* CTA Button */
.cta-button {
  display: inline-block;
  background: var(--text-light);
  color: var(--primary);
  padding: 1rem 3rem;
  border-radius: 50px;
  font-size: 1.25rem;
  font-weight: bold;
  text-decoration: none;
  transition: all 0.3s ease;
  animation: fadeInUp 1s ease-out 0.6s both;
  border: none;
  cursor: pointer;
}

.cta-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

/* Products Section */
.products {
  max-width: 1200px;
  margin: 0 auto;
  padding: 4rem 20px;
}

.products h2 {
  text-align: center;
  font-size: 2rem;
  margin-bottom: 3rem;
  color: var(--text-dark);
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
}

.product-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.product-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.15);
}

.product-card img {
  width: 100%;
  height: 280px;
  object-fit: cover;
}

.product-info {
  padding: 1.5rem;
}

.product-info h3 {
  font-size: 1.125rem;
  margin-bottom: 0.5rem;
}

.original-price {
  text-decoration: line-through;
  color: #999;
  font-size: 0.875rem;
}

.sale-price {
  color: var(--primary);
  font-size: 1.5rem;
  font-weight: bold;
  margin-top: 0.25rem;
}

.tag {
  background: var(--primary);
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  margin-left: 0.5rem;
}

.buy-btn {
  width: 100%;
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  margin-top: 1rem;
  transition: all 0.2s;
}

.buy-btn:hover {
  background: #cc002b;
  transform: scale(1.02);
}

/* Coupons Section */
.coupons {
  background: linear-gradient(to bottom, #fff5f5, #fff);
  padding: 4rem 20px;
}

.coupons h2 {
  text-align: center;
  margin-bottom: 2rem;
  color: var(--text-dark);
}

.coupon-list {
  max-width: 800px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
}

.coupon-item {
  background: white;
  border: 2px dashed var(--primary);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: all 0.3s;
}

.coupon-item:hover {
  border-style: solid;
  background: #fffafa;
  transform: translateY(-2px);
}

.coupon-value {
  font-size: 2rem;
  font-weight: bold;
  color: var(--primary);
  min-width: 60px;
}

.coupon-condition {
  flex: 1;
  color: #666;
  font-size: 0.875rem;
}

.coupon-btn {
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: opacity 0.2s;
}

.coupon-btn:hover {
  opacity: 0.9;
}

.coupon-btn.disabled {
  background: #52c41a;
  cursor: not-allowed;
}

/* Footer */
.page-footer {
  background: #222;
  color: #999;
  text-align: center;
  padding: 2rem 20px;
  font-size: 0.875rem;
}

.page-footer .disclaimer {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #666;
}

/* Animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .hero-title { font-size: 2rem; }
  .hero-subtitle { font-size: 1.2rem; }

  .countdown { gap: 0.5rem; }
  .time-unit { padding: 0.75rem 1rem; min-width: 60px; }
  .time-unit span { font-size: 1.75rem; }

  .product-grid { grid-template-columns: 1fr; }
  .coupon-list { grid-template-columns: 1fr; }

  .coupon-item { flex-direction: column; text-align: center; }
}`,
    },

    {
      name: 'script.js',
      language: 'javascript',
      content: `// 双11促销页交互逻辑

document.addEventListener('DOMContentLoaded', function() {
  initCountdown();
  initCouponButtons();
  initBuyButtons();
  initScrollAnimations();
});

// 倒计时功能
function initCountdown() {
  const endDate = new Date('2026-11-11T23:59:59').getTime();

  function updateCountdown() {
    const now = new Date().getTime();
    const distance = endDate - now;

    if (distance < 0) {
      document.getElementById('countdown').innerHTML = '<p style="font-size: 1.5rem;">🎉 活动已开始！</p>';
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

// 优惠券领取
function initCouponButtons() {
  document.querySelectorAll('.coupon-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      if (this.classList.contains('disabled')) return;

      const couponItem = this.closest('.coupon-item');
      const value = couponItem.querySelector('.coupon-value').textContent;

      this.textContent = '已领取 ✓';
      this.classList.add('disabled');
      this.disabled = true;

      couponItem.style.borderColor = '#52c41a';
      couponItem.style.borderStyle = 'solid';

      showToast(\`成功领取 \${value} 优惠券！\`);
    });
  });
}

// 购买按钮
function initBuyButtons() {
  document.querySelectorAll('.buy-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const card = this.closest('.product-card');
      const productName = card.querySelector('h3').textContent;

      showToast(\`即将跳转到 \${productName} 购买页面...\`);

      setTimeout(() => {
        alert(\`模拟：正在前往 \${productName} 购买页面\`);
      }, 1500);
    });
  });
}

// Toast提示
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;
  toast.style.cssText = \`
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(-100px);
    background: rgba(0,0,0,0.85);
    color: white;
    padding: 14px 28px;
    border-radius: 10px;
    z-index: 9999;
    font-size: 15px;
    backdrop-filter: blur(10px);
    transition: transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
  \`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(-100px)';
    setTimeout(() => toast.remove(), 400);
  }, 2500);
}

// 滚动动画
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.product-card, .coupon-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
}`,
    },
  ],
}
