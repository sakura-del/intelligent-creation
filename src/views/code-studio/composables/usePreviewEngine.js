import { ref, onBeforeUnmount } from 'vue'

export function usePreviewEngine(options = {}) {
  const { autoRefresh = true, refreshDelay = 800, onError = console.error } = options

  const iframeRef = ref(null)
  const previewUrl = ref('')
  const isLoading = ref(false)
  const lastError = ref(null)
  const consoleOutput = ref([])
  const isHotUpdating = ref(false)

  let refreshTimer = null
  let messageHandler = null

  function unescapeContent(content) {
    if (!content || typeof content !== 'string') return content

    let result = content

    const hasLiteralNewlines = /\\n/.test(result)
    const hasLiteralTabs = /\\t/.test(result)

    if (hasLiteralNewlines || hasLiteralTabs) {
      console.warn('[PreviewEngine] 检测到字面量转义字符，正在还原...')

      result = result.replace(/\\n/g, '\n')
      result = result.replace(/\\t/g, '\t')
      result = result.replace(/\\r/g, '\r')
      result = result.replace(/\\"/g, '"')
    }

    return result
  }

  function generateConsoleCaptureScript() {
    return `<script>
(function() {
  const _origConsole = {};
  ['log', 'warn', 'error', 'info', 'debug'].forEach(function(method) {
    _origConsole[method] = console[method];
    console[method] = function() {
      const args = Array.prototype.slice.call(arguments);
      _origConsole[method].apply(console, args);
      try {
        window.parent.postMessage({
          type: 'preview-console',
          method: method,
          args: args.map(function(a) {
            if (a === null) return 'null';
            if (a === undefined) return 'undefined';
            if (typeof a === 'object') {
              try { return JSON.stringify(a, null, 2); }
              catch(e) { return String(a); }
            }
            return String(a);
          }),
          timestamp: Date.now()
        }, '*');
      } catch(e) {}
    };
  });

  window.onerror = function(msg, url, line, col, error) {
    try {
      window.parent.postMessage({
        type: 'preview-console',
        method: 'error',
        args: [msg + ' (line ' + line + ', col ' + col + ')'],
        timestamp: Date.now()
      }, '*');
    } catch(e) {}
    return false;
  };

  window.addEventListener('unhandledrejection', function(event) {
    try {
      window.parent.postMessage({
        type: 'preview-console',
        method: 'error',
        args: ['Unhandled Promise Rejection: ' + (event.reason ? event.reason.message || String(event.reason) : 'Unknown')],
        timestamp: Date.now()
      }, '*');
    } catch(e) {}
  });
})();
</script>`
  }

  function generatePreviewHTML(files) {
    const rawHtmlFile = files.find((f) => f.name.endsWith('.html'))?.content || ''
    const cssFiles = files.filter((f) => f.name.endsWith('.css'))
    const jsFiles = files.filter((f) => f.name.endsWith('.js'))

    if (!rawHtmlFile) {
      onError('未找到HTML文件')
      return '<html><body><p style="color:red;padding:20px;">错误：未找到HTML文件</p></body></html>'
    }

    let finalHtml = unescapeContent(rawHtmlFile)

    const processedCssFiles = cssFiles.map((f) => ({
      ...f,
      content: unescapeContent(f.content),
    }))

    const processedJsFiles = jsFiles.map((f) => ({
      ...f,
      content: unescapeContent(f.content),
    }))

    const cssLinks = processedCssFiles
      .map((f) => `<style>\n/* ========== ${f.name} ========== */\n${f.content}\n</style>`)
      .join('\n')

    const charsetMeta = '<meta charset="UTF-8">'
    const viewportMeta = '<meta name="viewport" content="width=device-width, initial-scale=1.0">'

    const consoleCaptureScript = generateConsoleCaptureScript()

    if (!finalHtml.toLowerCase().includes('<!doctype')) {
      finalHtml = `<!DOCTYPE html>\n<html lang="zh-CN">\n<head>${charsetMeta}\n${viewportMeta}\n<title>Preview</title>${cssLinks}</head>\n<body>\n${finalHtml}\n${consoleCaptureScript}\n</body>\n</html>`
    } else {
      if (!finalHtml.toLowerCase().includes('charset')) {
        finalHtml = finalHtml.replace(/<head[^>]*>/i, `$&\n  ${charsetMeta}`)
        if (!finalHtml.includes(charsetMeta)) {
          finalHtml = finalHtml.replace('<html', `<html>\n<head>${charsetMeta}</head>`)
        }
      }

      if (!finalHtml.toLowerCase().includes('viewport')) {
        finalHtml = finalHtml.replace(/<head[^>]*>/i, `$&\n  ${viewportMeta}`)
        if (!finalHtml.includes(viewportMeta)) {
          finalHtml = finalHtml.replace('</head>', `${viewportMeta}\n</head>`)
        }
      }

      if (finalHtml.includes('</head>')) {
        finalHtml = finalHtml.replace('</head>', `${cssLinks}</head>`)
      } else if (finalHtml.includes('<body>')) {
        finalHtml = finalHtml.replace('<body>', `<head>${cssLinks}</head>\n<body>`)
      } else {
        finalHtml = `<head>${cssLinks}</head>` + finalHtml
      }

      if (finalHtml.includes('<head>')) {
        finalHtml = finalHtml.replace('<head>', `<head>\n${consoleCaptureScript}`)
      }
    }

    const jsScripts = processedJsFiles
      .map((f) => `<script>\n// ========== ${f.name} ==========\n${f.content}\n</script>`)
      .join('\n')

    if (jsScripts && finalHtml.includes('</body>')) {
      finalHtml = finalHtml.replace('</body>', `${jsScripts}\n</body>`)
    } else if (jsScripts) {
      finalHtml += jsScripts
    }

    return finalHtml
  }

  function detectEncodingIssues(content) {
    const issues = []

    /* oxlint-disable-next-line no-control-regex */
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/u.test(content)) {
      issues.push('检测到控制字符（可能导致乱码）')
    }

    if (content.includes('ï¿½') || content.includes('Ã') || content.includes('â')) {
      issues.push('检测到UTF-8编码错误的特征字符（Mojibake）')
    }

    if ((content.match(/\{/g) || []).length !== (content.match(/\}/g) || []).length) {
      issues.push('花括号不匹配（可能是截断的JSON或代码）')
    }

    if (content.length > 100 && !content.includes('<') && !content.includes('{')) {
      issues.push('内容不包含HTML或JSON标记（可能是纯文本或乱码）')
    }

    /* oxlint-disable no-control-regex */
    const nonPrintableRatio =
      (content.match(/[\x00-\x1F\x7F-\x9F]/gu) || []).length / content.length
    if (nonPrintableRatio > 0.1) {
      issues.push(
        `高比例不可打印字符(${(nonPrintableRatio * 100).toFixed(1)}%)，疑似二进制数据或编码错误`,
      )
    }

    return issues
  }

  function setupMessageListener() {
    if (messageHandler) return

    messageHandler = (event) => {
      if (event.data && event.data.type === 'preview-console') {
        const entry = {
          method: event.data.method,
          args: event.data.args,
          timestamp: event.data.timestamp,
        }
        consoleOutput.value = [...consoleOutput.value, entry]

        if (consoleOutput.value.length > 500) {
          consoleOutput.value = consoleOutput.value.slice(-300)
        }
      }
    }

    window.addEventListener('message', messageHandler)
  }

  function removeMessageListener() {
    if (messageHandler) {
      window.removeEventListener('message', messageHandler)
      messageHandler = null
    }
  }

  function clearConsole() {
    consoleOutput.value = []
  }

  function refreshPreview(files) {
    if (!iframeRef.value) return

    isLoading.value = true
    lastError.value = null

    try {
      const htmlContent = generatePreviewHTML(files)

      const encodingIssues = detectEncodingIssues(htmlContent)
      if (encodingIssues.length > 0) {
        console.warn('[PreviewEngine] Encoding issues detected:', encodingIssues)
      }

      const blob = new Blob([htmlContent], { type: 'text/html;charset=UTF-8' })
      const url = URL.createObjectURL(blob)

      if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value)
      }

      previewUrl.value = url
      iframeRef.value.src = url

      setTimeout(() => {
        isLoading.value = false
      }, 300)
    } catch (error) {
      lastError.value = error.message
      onError(error)
      isLoading.value = false
    }
  }

  function hotUpdateCSS(files) {
    if (!iframeRef.value || !iframeRef.value.contentWindow) return false

    try {
      const cssFiles = files.filter((f) => f.name.endsWith('.css'))
      const doc = iframeRef.value.contentDocument

      if (!doc) return false

      const existingStyles = doc.querySelectorAll('style[data-file]')
      existingStyles.forEach((el) => el.remove())

      cssFiles.forEach((cssFile) => {
        const style = doc.createElement('style')
        style.setAttribute('data-file', cssFile.name)
        style.textContent = unescapeContent(cssFile.content)
        doc.head.appendChild(style)
      })

      return true
    } catch {
      return false
    }
  }

  function hotUpdatePreview(files, changedFileName) {
    if (!changedFileName) {
      refreshPreview(files)
      return
    }

    isHotUpdating.value = true

    if (changedFileName.endsWith('.css')) {
      const success = hotUpdateCSS(files)
      if (success) {
        isHotUpdating.value = false
        return
      }
    }

    refreshPreview(files)
    isHotUpdating.value = false
  }

  function debouncedRefresh(files) {
    if (!autoRefresh) return

    clearTimeout(refreshTimer)
    refreshTimer = setTimeout(() => {
      refreshPreview(files)
    }, refreshDelay)
  }

  function debouncedHotUpdate(files, changedFileName) {
    if (!autoRefresh) return

    clearTimeout(refreshTimer)
    refreshTimer = setTimeout(
      () => {
        hotUpdatePreview(files, changedFileName)
      },
      Math.min(refreshDelay, 400),
    )
  }

  function handleIframeLoad() {
    isLoading.value = false
  }

  function handleIframeError(event) {
    lastError.value = '预览加载失败'
    onError(event)
  }

  function forceRefresh(files) {
    clearTimeout(refreshTimer)
    refreshPreview(files)
  }

  async function getMobilePreviewUrl(files) {
    const htmlContent = generatePreviewHTML(files)
    const blob = new Blob([htmlContent], { type: 'text/html;charset=UTF-8' })
    return URL.createObjectURL(blob)
  }

  setupMessageListener()

  onBeforeUnmount(() => {
    clearTimeout(refreshTimer)
    removeMessageListener()
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
    }
  })

  return {
    iframeRef,
    previewUrl,
    isLoading,
    lastError,
    consoleOutput,
    isHotUpdating,
    refreshPreview,
    debouncedRefresh,
    debouncedHotUpdate,
    hotUpdatePreview,
    forceRefresh,
    getMobilePreviewUrl,
    handleIframeLoad,
    handleIframeError,
    clearConsole,
  }
}
