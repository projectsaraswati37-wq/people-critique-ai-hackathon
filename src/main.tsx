import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// StrictMode is intentionally omitted: it double-invokes effects in development
// which causes the Web Speech API to fire every utterance twice.
createRoot(document.getElementById('root')!).render(<App />)
