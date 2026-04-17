const { execSync } = require('child_process')

console.log('🚀 AI Resume Platform - Deployment Script')
console.log('=====================================\n')

try {
  console.log('📦 Installing dependencies...')
  execSync('npm install --production', { stdio: 'inherit' })
  
  console.log('\n🗄️ Running database migration...')
  execSync('node database/migrate.js', { stdio: 'inherit' })
  
  console.log('\n✅ Deployment preparation completed!')
  console.log('\nTo start the server:')
  console.log('  npm start     (Production)')
  console.log('  npm run dev   (Development with auto-reload)')
  
} catch (error) {
  console.error('\n❌ Deployment failed:', error.message)
  process.exit(1)
}
