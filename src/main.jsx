import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Enregistrer le Service Worker pour PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker enregistré avec succès:', registration.scope);
      })
      .catch((error) => {
        console.error('❌ Erreur lors de l\'enregistrement du Service Worker:', error);
      });
  });
}

// Demander la permission pour les notifications (optionnel)
if ('Notification' in window && Notification.permission === 'default') {
  // Vous pouvez demander la permission plus tard selon vos besoins
  // Notification.requestPermission();
}