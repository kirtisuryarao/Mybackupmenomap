import { NextRequest } from 'next/server'
import { createServer, type Server , IncomingMessage } from 'node:http'


type RouteDefinition = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  handler: (request: NextRequest) => Promise<Response>
}

async function readRequestBody(req: IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export function createRouteTestServer(routes: RouteDefinition[]): Server {
  return createServer(async (req, res) => {
    if (!req.method || !req.url) {
      res.statusCode = 400
      res.end('Bad request')
      return
    }

    const parsedUrl = new URL(req.url, 'http://127.0.0.1')
    const route = routes.find((candidate) => candidate.method === req.method && candidate.path === parsedUrl.pathname)

    if (!route) {
      res.statusCode = 404
      res.end('Not found')
      return
    }

    const body = await readRequestBody(req)
    const headers = new Headers()

    Object.entries(req.headers).forEach(([key, value]) => {
      if (!value) return
      if (Array.isArray(value)) {
        value.forEach((entry) => headers.append(key, entry))
      } else {
        headers.set(key, value)
      }
    })

    const init: RequestInit = {
      method: req.method,
      headers,
    }

    if (req.method !== 'GET' && req.method !== 'HEAD' && body.length > 0) {
      init.body = body
    }

    const nextRequest = new NextRequest(
      new Request(`http://127.0.0.1${parsedUrl.pathname}${parsedUrl.search}`, init)
    )

    const response = await route.handler(nextRequest)

    res.statusCode = response.status
    response.headers.forEach((value, key) => {
      res.setHeader(key, value)
    })

    const payload = Buffer.from(await response.arrayBuffer())
    res.end(payload)
  })
}
