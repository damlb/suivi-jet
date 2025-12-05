import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './Auth'
import NotesModule from './components/NotesModule'
import JetA1Module from './components/JetA1Module'
import CaisseModule from './components/CaisseModule'
import ListeAttenteModule from './components/ListeAttenteModule'
import FlightLogModule from './components/FlightLogModule'
import DropZonesModule from './components/DropZonesModule'
import ManifestModule from './components/ManifestModule'
import { Button } from './components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [userRole, setUserRole] = useState('agent_sol') // 'agent_sol' ou 'pilote'
  const [activeModule, setActiveModule] = useState('notes')

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
      .select('username, role')
      .eq('id', userId)
      .single()

    if (data) {
      setUsername(data.username)
      setUserRole(data.role || 'agent_sol')
      
      // Si pilote, le mettre par défaut sur FlightLog
      if (data.role === 'pilote') {
        setActiveModule('flightlog')
      }
      
      console.log('✅ Profile chargé:', data)
    } else {
      console.error('❌ Erreur chargement profile:', error)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUsername('')
    setUserRole('agent_sol')
  }

  // Fonction pour vérifier si un module est accessible
  const canAccessModule = (module) => {
    if (userRole === 'agent_sol') return true // Agents ont accès à tout
    
    // Pilotes ont accès à FlightLog, Jet A1, DZ et PVE
    if (userRole === 'pilote') {
      return ['flightlog', 'jeta1', 'dropzones', 'manifest'].includes(module)
    }
    
    return false
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
                    {userRole === 'pilote' && (
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                        Pilote
                      </span>
                    )}
                  </p>
                </div>
                <Button onClick={handleSignOut} variant="ghost">
                  Se déconnecter
                </Button>
              </div>

              {/* Navigation par onglets */}
              <div className="flex gap-2 border-t pt-4 overflow-x-auto pb-2">
                {/* PILOTES : FlightLog, Jet A1, DZ en PREMIER */}
                {userRole === 'pilote' && (
                  <>
                    <button
                      onClick={() => setActiveModule('flightlog')}
                      className={`flex-shrink-0 py-3 px-4 sm:px-6 rounded-lg font-semibold transition-all whitespace-nowrap ${
                        activeModule === 'flightlog'
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      ✈️ <span className="hidden sm:inline">FlightLog</span>
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
                      <span className="ml-1 text-xs">🔒</span>
                    </button>

                    <button
                      onClick={() => setActiveModule('dropzones')}
                      className={`flex-shrink-0 py-3 px-4 sm:px-6 rounded-lg font-semibold transition-all whitespace-nowrap ${
                        activeModule === 'dropzones'
                          ? 'bg-purple-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      📍 <span className="hidden sm:inline">DZ</span>
                    </button>

                    <button
                      onClick={() => setActiveModule('manifest')}
                      className={`flex-shrink-0 py-3 px-4 sm:px-6 rounded-lg font-semibold transition-all whitespace-nowrap ${
                        activeModule === 'manifest'
                          ? 'bg-green-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      📄 <span className="hidden sm:inline">PVE</span>
                    </button>
                  </>
                )}

                {/* AGENTS AU SOL : Tous les onglets dans l'ordre */}
                {userRole === 'agent_sol' && (
                  <>
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

                    {/* FlightLog en DERNIER pour agents */}
                    <button
                      onClick={() => setActiveModule('flightlog')}
                      className={`flex-shrink-0 py-3 px-4 sm:px-6 rounded-lg font-semibold transition-all whitespace-nowrap ${
                        activeModule === 'flightlog'
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      ✈️ <span className="hidden sm:inline">FlightLog</span>
                    </button>

                    {/* Drop Zones */}
                    <button
                      onClick={() => setActiveModule('dropzones')}
                      className={`flex-shrink-0 py-3 px-4 sm:px-6 rounded-lg font-semibold transition-all whitespace-nowrap ${
                        activeModule === 'dropzones'
                          ? 'bg-purple-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      📍 <span className="hidden sm:inline">DZ</span>
                    </button>

                    {/* Manifeste de Vol (PVE) */}
                    <button
                      onClick={() => setActiveModule('manifest')}
                      className={`flex-shrink-0 py-3 px-4 sm:px-6 rounded-lg font-semibold transition-all whitespace-nowrap ${
                        activeModule === 'manifest'
                          ? 'bg-green-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      📄 <span className="hidden sm:inline">PVE</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Contenu du module actif */}
        <Card>
          <CardContent className="pt-6">
            {activeModule === 'flightlog' && (
              <FlightLogModule 
                userId={session.user.id} 
                userRole={userRole}
              />
            )}
            {activeModule === 'notes' && <NotesModule currentUser={username || 'Utilisateur'} />}
            {activeModule === 'liste' && <ListeAttenteModule />}
            {activeModule === 'jeta1' && (
              <JetA1Module 
                userRole={userRole}
                userId={session.user.id}
              />
            )}
            {activeModule === 'caisse' && <CaisseModule />}
            {activeModule === 'dropzones' && (
              <DropZonesModule 
                userId={session.user.id}
                userRole={userRole}
              />
            )}
            {activeModule === 'manifest' && (
              <ManifestModule 
                userId={session.user.id}
                userRole={userRole}
                username={username}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App