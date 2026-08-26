import { NextRequest, NextResponse } from 'next/server'
import { swaggerGateResponse } from '@/utils/swaggerAccess'

export const runtime = 'nodejs'

const SWAGGER_UI_VERSION = '5.18.2'

function swaggerHtml(): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Vitraux API Docs</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui.css" />
  <style>
    body { margin: 0; background: #fafafa; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui-bundle.js" crossorigin></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/api/docs/openapi',
      dom_id: '#swagger-ui',
      deepLinking: true,
      docExpansion: 'list',
      defaultModelsExpandDepth: 1,
      persistAuthorization: false,
      tryItOutEnabled: true
    });
  </script>
</body>
</html>`
}

export async function GET(request: NextRequest) {
	const denied = swaggerGateResponse(request)
	if (denied) {
		return denied
	}

	return new NextResponse(swaggerHtml(), {
		status: 200,
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Cache-Control': 'no-store',
			'X-Robots-Tag': 'noindex, nofollow',
		},
	})
}
