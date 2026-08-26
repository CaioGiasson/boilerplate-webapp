/* eslint-disable no-undef */
/* eslint-disable no-console */

import fs from 'fs'
import path from 'path'

import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const schemaPath = path.join(__dirname, 'schema.prisma')
const modelsDir = path.join(__dirname, 'models')

const baseSchema = `datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

type KeyValueObject {
  key   String
  value Json
}
`

const mergeSchemas = async () => {
	try {
		const files = fs.readdirSync(modelsDir)
		let models = ''

		files.forEach((file) => {
			if (path.extname(file) === '.prisma') {
				const filePath = path.join(modelsDir, file)
				const fileContent = fs.readFileSync(filePath, 'utf-8')
				models += `\n${fileContent}\n`
			}
		})

		const finalSchema = baseSchema + models
		fs.writeFileSync(schemaPath, finalSchema, 'utf-8')

		console.log('Arquivo schema.prisma gerado com sucesso!')
	} catch (error) {
		console.error('Erro ao gerar schema.prisma:', error)
		process.exit(1)
	}
}

mergeSchemas()
