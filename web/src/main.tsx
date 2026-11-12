import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import Dashboard from './pages/Dashboard'
import ShipmentDetail from './pages/ShipmentDetail'
import StyleTile from './pages/StyleTile'
import Gallery from './pages/Gallery'
import { initTheme } from './components/ThemeToggle'
import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/plus-jakarta-sans/800.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import './styles/tokens.css'
import './styles.css'

initTheme()

const router = createBrowserRouter([
  { path: '/', element: <Dashboard /> },
  { path: '/shipments/:id', element: <ShipmentDetail /> },
  { path: '/track', element: <App /> },
  { path: '/style-tile', element: <StyleTile /> },
  { path: '/gallery', element: <Gallery /> },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
