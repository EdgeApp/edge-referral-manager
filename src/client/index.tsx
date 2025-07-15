import React from 'react'
import { createRoot } from 'react-dom/client'

import { MainScene } from './MainScene'

console.log('Hello from tsx!')

const container = document.getElementById('root')
if (!container) throw new Error('Failed to find the root element')
const root = createRoot(container)
root.render(<MainScene />)
