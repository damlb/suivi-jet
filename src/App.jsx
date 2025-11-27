import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './Auth'
import NotesModule from './components/NotesModule'
import JetA1Module from './components/JetA1Module'
import CaisseModule from './components/CaisseModule'
import ListeAttenteModule from './components/ListeAttenteModule'
import { Button } from './components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [activeModule, setActiveModule] = useState('notes') // 'notes', 'jeta1', 'caisse'

  useEffect(() => {
    // Récupérer la session au chargement
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        loadUserProfile(session.user.id)
      }
      setLoading(false)
    })

    // Écouter les changements d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        loadUserProfile(session.user.id)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single()

    if (data) {
      setUsername(data.username)
      console.log('✅ Username chargé:', data.username)
    } else {
      console.error('❌ Erreur chargement username:', error)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUsername('')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">Chargement...</div>
      </div>
    )
  }

  if (!session) {
    return <Auth />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header avec Navigation */}
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-3xl font-bold text-gray-800">
                    Suivi Quotidien
                  </CardTitle>
                  <p className="text-gray-600 mt-1">
                    Bonjour {username || 'Utilisateur'} 👋
                  </p>
                </div>
                <Button onClick={handleSignOut} variant="ghost">
                  Se déconnecter
                </Button>
              </div>

              {/* Navigation par onglets */}
              <div className="flex gap-2 border-t pt-4 overflow-x-auto pb-2">
                <button
                  onClick={() => setActiveModule('notes')}
                  className={`flex-shrink-0 py-3 px-4 sm:px-6 rounded-lg font-semibold transition-all whitespace-nowrap ${
                    activeModule === 'notes'
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📋 <span className="hidden sm:inline">Notes</span>
                </button>
                <button
                  onClick={() => setActiveModule('liste')}
                  className={`flex-shrink-0 py-3 px-4 sm:px-6 rounded-lg font-semibold transition-all whitespace-nowrap ${
                    activeModule === 'liste'
                      ? 'bg-purple-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  🚁 <span className="hidden sm:inline">Liste</span>
                </button>
                <button
                  onClick={() => setActiveModule('jeta1')}
                  className={`flex-shrink-0 py-3 px-4 sm:px-6 rounded-lg font-semibold transition-all whitespace-nowrap ${
                    activeModule === 'jeta1'
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  ⛽ <span className="hidden sm:inline">Jet A1</span>
                </button>
                <button
                  onClick={() => setActiveModule('caisse')}
                  className={`flex-shrink-0 py-3 px-4 sm:px-6 rounded-lg font-semibold transition-all whitespace-nowrap ${
                    activeModule === 'caisse'
                      ? 'bg-green-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  💳 <span className="hidden sm:inline">Caisse</span>
                </button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Contenu du module actif */}
        <Card>
          <CardContent className="pt-6">
            {activeModule === 'notes' && <NotesModule currentUser={username || 'Utilisateur'} />}
            {activeModule === 'liste' && <ListeAttenteModule />}
            {activeModule === 'jeta1' && <JetA1Module />}
            {activeModule === 'caisse' && <CaisseModule />}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App