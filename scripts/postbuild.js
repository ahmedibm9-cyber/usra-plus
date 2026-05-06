const { cpSync, mkdirSync, existsSync } = require('fs')
const { resolve } = require('path')

const root = resolve(process.cwd())
const sourceStatic = resolve(root, '.next/static')
const targetStandalone = resolve(root, '.next/standalone')
const targetStatic = resolve(targetStandalone, '.next/standalone/.next')
const sourcePublic = resolve(root, 'public')
const targetPublic = resolve(targetStandalone, 'public')

if (!existsSync(targetStandalone)) {
  mkdirSync(targetStandalone, { recursive: true })
}
if (!existsSync(targetStatic)) {
  mkdirSync(targetStatic, { recursive: true })
}

cpSync(sourceStatic, targetStatic, { recursive: true })
cpSync(sourcePublic, targetPublic, { recursive: true })
console.log('Standalone assets copied successfully.')
