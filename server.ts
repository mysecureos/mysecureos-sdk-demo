// The trusted-partner API key is a server secret — it never belongs inside
// a phone app bundle (anyone can decompile an APK and read it out). This is
// where it actually lives: a small server, loaded from .env, using
// mysecureos-sdk's MySecureOSPartnerClient. App.tsx only ever talks to the
// two endpoints below — it has no concept of the key at all.
//
// This is a minimal reference — it's the shape a real backend would take,
// not a production one. Real security (rate limiting, SDK-token checking)
// lives in the MySecureOS API itself (apps/api), not duplicated here.
//
// Run with `npm run server` (see package.json). Not part of the Expo/Metro
// app bundle — this is a separate plain-Node process you run alongside it.
import 'dotenv/config'
import { type IncomingMessage, type ServerResponse, createServer } from 'node:http'
import { MySecureOSApiError, MySecureOSPartnerClient } from 'mysecureos-sdk'

const PORT = Number(process.env.PORT ?? 4100)
const baseUrl = process.env.MYSECUREOS_BASE_URL
const apiKey = process.env.MYSECUREOS_API_KEY

if (!baseUrl || !apiKey) {
  console.error(
    'Missing MYSECUREOS_BASE_URL or MYSECUREOS_API_KEY.\n' +
      'Copy .env.example to .env and fill them in (get a key from ' +
      "the tenant dashboard's Settings > API Keys).",
  )
  process.exit(1)
}

const partner = new MySecureOSPartnerClient({ baseUrl, apiKey })

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(body))
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/emergencies/activate') {
      const input = await readJsonBody(req)
      const emergency = await partner.activateEmergency(input)
      sendJson(res, 201, emergency)
      return
    }

    const clearMatch =
      req.method === 'POST' && req.url ? req.url.match(/^\/emergencies\/([^/]+)\/clear$/) : null
    if (clearMatch?.[1]) {
      const { reason } = await readJsonBody(req)
      if (typeof reason !== 'string' || !reason.trim()) {
        sendJson(res, 400, { message: 'A reason is required to clear an emergency' })
        return
      }
      const emergency = await partner.clearEmergency(clearMatch[1], reason.trim())
      sendJson(res, 200, emergency)
      return
    }

    sendJson(res, 404, { message: 'Not found' })
  } catch (err) {
    // The real API's error message (e.g. "Invalid or revoked API key", or the
    // 402 "monthly SDK activation quota reached") passes through as-is, with its
    // status — a real backend would likely log and return something more
    // generic, but surfacing it makes the demo easier to debug. mysecureos-sdk
    // throws MySecureOSApiError (with .status) / MySecureOSPaymentRequiredError.
    const status = err instanceof MySecureOSApiError ? err.status : 502
    sendJson(res, status, { message: err instanceof Error ? err.message : 'Upstream request failed' })
  }
})

server.listen(PORT, () => {
  console.log(`mysecureos-sdk-demo-mobile's proxy listening on http://localhost:${PORT}`)
  console.log(`Forwarding to ${baseUrl} using the API key from .env`)
})
