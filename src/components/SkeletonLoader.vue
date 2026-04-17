<template>
  <div class="skeleton-wrapper" :class="{ animate: animate }" role="status" :aria-label="$t('common.loading')">
    <span class="sr-only">{{ $t('common.loading') }}</span>
    <template v-if="variant === 'card'">
      <div class="skeleton skeleton-card">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text" style="width: 80%"></div>
        <div class="skeleton skeleton-text" style="width: 60%"></div>
      </div>
    </template>
    <template v-else-if="variant === 'list'">
      <div v-for="i in rows" :key="i" class="skeleton-list-item">
        <div class="skeleton skeleton-avatar"></div>
        <div class="skeleton-list-content">
          <div class="skeleton skeleton-text" style="width: 40%"></div>
          <div class="skeleton skeleton-text" style="width: 80%"></div>
        </div>
      </div>
    </template>
    <template v-else-if="variant === 'table'">
      <div class="skeleton-table-header">
        <div v-for="i in columns" :key="i" class="skeleton skeleton-text" style="height: 20px"></div>
      </div>
      <div v-for="i in rows" :key="i" class="skeleton-table-row">
        <div v-for="j in columns" :key="j" class="skeleton skeleton-text" style="height: 16px"></div>
      </div>
    </template>
    <template v-else-if="variant === 'image'">
      <div class="skeleton skeleton-image"></div>
    </template>
    <template v-else-if="variant === 'detail'">
      <div class="skeleton skeleton-title" style="width: 50%"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text" style="width: 75%"></div>
      <div class="skeleton skeleton-title" style="width: 40%; margin-top: 24px"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text" style="width: 60%"></div>
    </template>
    <template v-else>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text" style="width: 80%"></div>
      <div class="skeleton skeleton-text" style="width: 60%"></div>
    </template>
  </div>
</template>

<script setup>
defineProps({
  variant: {
    type: String,
    default: 'text',
    validator: (v) => ['text', 'card', 'list', 'table', 'image', 'detail'].includes(v),
  },
  rows: {
    type: Number,
    default: 3,
  },
  columns: {
    type: Number,
    default: 4,
  },
  animate: {
    type: Boolean,
    default: true,
  },
})
</script>

<style lang="scss" scoped>
.skeleton-wrapper {
  width: 100%;

  &.animate .skeleton {
    animation: skeleton-loading 1.4s ease infinite;
  }
}

.skeleton {
  background: linear-gradient(90deg, var(--fill-light) 25%, var(--fill-base) 37%, var(--fill-light) 63%);
  background-size: 400% 100%;
  border-radius: var(--border-radius-base);
}

@keyframes skeleton-loading {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}

.skeleton-text {
  height: 16px;
  margin-bottom: 12px;
  width: 100%;
}

.skeleton-title {
  height: 24px;
  margin-bottom: 16px;
  width: 60%;
}

.skeleton-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
}

.skeleton-image {
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--border-radius-lg);
}

.skeleton-card {
  padding: 20px;
  background: var(--bg-white);
  border-radius: var(--border-radius-xl);
  box-shadow: var(--shadow-light);
}

.skeleton-list-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 16px;
}

.skeleton-list-content {
  flex: 1;
}

.skeleton-table-header {
  display: grid;
  gap: 16px;
  padding: 12px 16px;
  background: var(--fill-light);
  border-radius: var(--border-radius-base) var(--border-radius-base) 0 0;
  margin-bottom: 1px;
}

.skeleton-table-row {
  display: grid;
  gap: 16px;
  padding: 12px 16px;
  background: var(--bg-white);
  border-bottom: 1px solid var(--border-lighter);
}

.skeleton-table-header,
.skeleton-table-row {
  grid-template-columns: repeat(v-bind(columns), 1fr);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
