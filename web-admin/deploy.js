const { execSync } = require('child_process');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
try {
  execSync('npx vercel --prod --yes', { cwd: __dirname, stdio: 'inherit', env: { ...process.env } });
} catch (e) {
  console.error('Deploy failed:', e.message);
  process.exit(1);
}
