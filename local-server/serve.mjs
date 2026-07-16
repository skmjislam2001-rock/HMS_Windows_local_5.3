#!/usr/bin/env node
/*
 * MediCore HMS — Local Server + Cloudflare Tunnel + Email Link
 *
 * Run:  node local-server/serve.mjs
 *
 * What it does:
 *   1. Serves the built webapp (../dist) on a local port (default 8787).
 *   2. Starts a Cloudflare quick tunnel (no account needed) -> public https link.
 *   3. Emails that link to you so you can open the app from any device.
 *   4. Stays running; Ctrl+C stops the tunnel + server cleanly.
 *
 * Config via environment variables or ./config.json (see config.example.json):
 *   HMS_EMAIL_TO        — address to send the link to (REQUIRED)
 *   HMS_EMAIL_FROM      — sender address
 *   HMS_EMAIL_USER      — SMTP username
 *   HMS_EMAIL_PASS      — SMTP password / app password
 *   HMS_EMAIL_HOST      — SMTP host (default smtp.gmail.com)
 *   HMS_EMAIL_PORT      — SMTP port (default 465)
 *   HMS_PORT            — local port (default 8787)
 *   HMS_NO_TUNNEL       — "1" to skip the tunnel (LAN only)
 *   HMS_NO_EMAIL        — "1" to skip emailing
 */

import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, extname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DIST = join(ROOT, 'dist')

// ---------- config ----------
function loadConfig() {
  let file = {}
  const cfgPath = join(__dirname, 'config.json')
  if (existsSync(cfgPath)) {
    try { file = JSON.parse(readFileSync(cfgPath, 'utf8')) } catch {}
  }
  const env = process.env
  return {
    emailTo:   env.HMS_EMAIL_TO   || file.emailTo   || '',
    emailFrom: env.HMS_EMAIL_FROM || file.emailFrom || file.emailTo || '',
    emailUser: env.HMS_EMAIL_USER || file.emailUser || '',
    emailPass: env.HMS_EMAIL_PASS || file.emailPass || '',
    emailHost: env.HMS_EMAIL_HOST || file.emailHost || 'smtp.gmail.com',
    emailPort: Number(env.HMS_EMAIL_PORT || file.emailPort || 465),
    port:      Number(env.HMS_PORT || file.port || 8787),
    noTunnel:  env.HMS_NO_TUNNEL === '1' || file.noTunnel || false,
    noEmail:   env.HMS_NO_EMAIL  === '1' || file.noEmail  || false,
  }
}
const CFG = loadConfig()

// ---------- static server ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.map':  'application/json',
}

async function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url?.split('?')[0] || '/')
  let filePath = normalize(join(DIST, urlPath))
  if (!filePath.startsWith(DIST)) { res.writeHead(403); return res.end('Forbidden') }

  if (!existsSync(filePath) || (await stat(filePath).catch(() => null))?.isDirectory()) {
    filePath = join(DIST, 'index.html')
  }
  if (!existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/html' })
    return res.end('<h1>Build not found</h1><p>Run: <code>npm run build</code></p>')
  }
  const body = await readFile(filePath)
  res.writeHead(200, {
    'Content-Type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=3600',
  })
  res.end(body)
}

const server = http.createServer(serveStatic)
server.listen(CFG.port, '0.0.0.0', () => {
  const lan = getLanIp()
  console.log(`\n  MediCore HMS running locally`)
  console.log(`  • This computer:  http://localhost:${CFG.port}`)
  if (lan) console.log(`  • Same Wi-Fi/LAN: http://${lan}:${CFG.port}`)
  if (CFG.noTunnel) {
    console.log(`  • Tunnel: disabled (HMS_NO_TUNNEL=1)\n`)
  } else {
    startTunnel()
  }
})

// ---------- LAN IP ----------
function getLanIp() {
  try {
    const nets = require('node:os').networkInterfaces()
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) return net.address
      }
    }
  } catch {}
  return ''
}

// ---------- Cloudflare Tunnel ----------
let tunnelProc = null
let tunnelUrl = ''

function findCloudflared() {
  const isWin = process.platform === 'win32'
  const local = isWin
    ? join(ROOT, 'cloudflared.exe')
    : join(ROOT, 'cloudflared')
  if (existsSync(local)) return local
  // try PATH
  try { require('node:child_process').execSync('cloudflared --version', { stdio: 'ignore' }); return 'cloudflared' } catch {}
  return null
}

function startTunnel() {
  const bin = findCloudflared()
  if (!bin) {
    console.log('  • Tunnel: cloudflared not found — skipping.')
    console.log('    Download from https://github.com/cloudflare/cloudflared/releases/latest')
    console.log('    and place next to this script (or add to PATH), then restart.\n')
    return
  }
  console.log('  • Starting Cloudflare quick tunnel…')
  const args = ['tunnel', '--url', `http://localhost:${CFG.port}`]
  tunnelProc = spawn(bin, args, { cwd: ROOT })

  let captured = ''
  const urlRe = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i

  tunnelProc.stdout?.on('data', (d) => {
    const s = d.toString()
    captured += s
    if (!tunnelUrl) {
      const m = s.match(urlRe)
      if (m) {
        tunnelUrl = m[0]
        onTunnelReady(tunnelUrl)
      }
    }
  })
  tunnelProc.stderr?.on('data', (d) => {
    const s = d.toString()
    captured += s
    if (!tunnelUrl) {
      const m = s.match(urlRe)
      if (m) {
        tunnelUrl = m[0]
        onTunnelReady(tunnelUrl)
      }
    }
  })
  tunnelProc.on('error', () => {
    console.log('  • Tunnel failed to start — serving locally only.\n')
  })
  tunnelProc.on('exit', () => {
    if (!tunnelUrl) console.log('  • Tunnel exited before producing a link.\n')
  })

  // fallback: parse buffered output after a few seconds
  setTimeout(() => {
    if (!tunnelUrl) {
      const m = captured.match(urlRe)
      if (m) { tunnelUrl = m[0]; onTunnelReady(tunnelUrl) }
    }
  }, 8000)
}

function onTunnelReady(url) {
  console.log(`  • Public link:   ${url}`)
  console.log(`    (unique, works from any device, anywhere)\n`)
  if (CFG.noEmail || !CFG.emailTo) {
    console.log('  • Email: skipped (no recipient configured).\n')
    console.log('  Press Ctrl+C to stop the server & tunnel.\n')
    return
  }
  sendEmail(url)
}

// ---------- Email (using NodeMailer via dynamic import if available, else raw SMTP) ----------
async function sendEmail(url) {
  console.log(`  • Emailing link to ${CFG.emailTo}…`)
  try {
    if (CFG.emailUser && CFG.emailPass) {
      await sendViaNodemailer(url)
    } else {
      await sendViaRawSmtp(url)
    }
    console.log('  • Email sent!\n')
    console.log('  Press Ctrl+C to stop the server & tunnel.\n')
  } catch (e) {
    console.log(`  • Email failed: ${e.message}`)
    console.log(`    Your public link is: ${url}`)
    console.log('    (You can copy it manually for now.)\n')
  }
}

async function sendViaNodemailer(url) {
  let nodemailer
  try {
    nodemailer = await import('nodemailer')
  } catch {
    return sendViaRawSmtp(url)
  }
  const transporter = nodemailer.default.createTransport({
    host: CFG.emailHost,
    port: CFG.emailPort,
    secure: CFG.emailPort === 465,
    auth: { user: CFG.emailUser, pass: CFG.emailPass },
  })
  await transporter.sendMail({
    from: CFG.emailFrom,
    to: CFG.emailTo,
    subject: 'MediCore HMS — Your access link',
    text: `Your MediCore HMS is running.\n\nOpen it from any device:\n${url}\n\nThis link stays active while the app runs on your computer.\nTo stop it, press Ctrl+C on your computer.`,
    html: `<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#0d9488">MediCore HMS is running</h2>
      <p>Open your hospital management system from any device, anywhere:</p>
      <p style="margin:24px 0">
        <a href="${url}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:16px">Open MediCore HMS</a>
      </p>
      <p style="color:#64748b;font-size:14px">Link: <a href="${url}">${url}</a></p>
      <p style="color:#64748b;font-size:13px;margin-top:24px">This link stays active while the app runs on your computer. To stop it, press Ctrl+C.</p>
    </div>`,
  })
}

// Minimal raw SMTP sender (no external deps) — works with Gmail app passwords etc.
function sendViaRawSmtp(url) {
  return new Promise((resolve, reject) => {
    const net = require('node:net')
    const tls = require('node:tls')
    const host = CFG.emailHost
    const port = CFG.emailPort
    const user = CFG.emailUser
    const pass = CFG.emailPass
    const from = CFG.emailFrom
    const to = CFG.emailTo
    if (!user || !pass) return reject(new Error('SMTP credentials not configured (HMS_EMAIL_USER / HMS_EMAIL_PASS)'))

    const sock = (port === 465 ? tls : net).connect({ host, port, servername: host, rejectUnauthorized: false }, () => {})
    let step = 0
    let buf = ''
    const lines = [
      `EHLO localhost`,
      `AUTH LOGIN`,
      Buffer.from(user).toString('base64'),
      Buffer.from(pass).toString('base64'),
      `MAIL FROM:<${from}>`,
      `RCPT TO:<${to}>`,
      `DATA`,
    ]
    const body =
      `From: MediCore HMS <${from}>\r\n` +
      `To: <${to}>\r\n` +
      `Subject: MediCore HMS - Your access link\r\n` +
      `MIME-Version: 1.0\r\n` +
      `Content-Type: text/plain; charset=utf-8\r\n\r\n` +
      `Your MediCore HMS is running.\n\nOpen it from any device:\n${url}\n\nThis link stays active while the app runs on your computer.\nTo stop it, press Ctrl+C.\n\r\n.\r\n`

    function next() {
      if (step < lines.length) {
        sock.write(lines[step] + '\r\n')
        step++
      } else {
        sock.write(body)
        sent = true
      }
    }
    let sent = false
    sock.on('data', (d) => {
      buf += d.toString()
      if (buf.includes('\r\n')) {
        buf = ''
        if (sent) { sock.write('QUIT\r\n'); setTimeout(() => { sock.end(); resolve() }, 500) }
        else next()
      }
    })
    sock.on('error', reject)
    sock.setTimeout(20000, () => reject(new Error('SMTP timeout')))
  })
}

// ---------- cleanup ----------
function shutdown() {
  console.log('\n  Shutting down…')
  if (tunnelProc) { try { tunnelProc.kill('SIGTERM') } catch {} }
  server.close()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
