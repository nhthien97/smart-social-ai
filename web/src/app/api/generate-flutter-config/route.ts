import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    // On Vercel the filesystem is read-only except for /tmp.
    // Write there and also attempt to write to public/ for local dev.
    const tmpPath = path.join('/tmp', 'mini_social_config.json')
    fs.writeFileSync(tmpPath, JSON.stringify(body, null, 2), 'utf-8')
    try {
      const publicDir = path.join(process.cwd(), 'public')
      if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true })
      fs.writeFileSync(path.join(publicDir, 'mini_social_config.json'), JSON.stringify(body, null, 2), 'utf-8')
    } catch {
      // Expected to fail in read-only environments like Vercel — /tmp copy is the source of truth
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
