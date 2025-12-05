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
import UserManagementModule from './components/UserManagementModule'
import { Button } from './components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { LogOut, Users } from 'lucide-react'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [userRole, setUserRole] = useState('agent_sol') // 'agent_sol' ou 'pilote'
  const [userPermissions, setUserPermissions] = useState({})
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
      .select('username, role, permissions')
      .eq('id', userId)
      .single()

    if (data) {
      setUsername(data.username)
      setUserRole(data.role || 'agent_sol')
      setUserPermissions(data.permissions || {})
      
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
    setUserPermissions({})
  }

  // Fonction pour vérifier si un module est accessible
  const canAccessModule = (module) => {
    // Les agents au sol ont accès à tout
    if (userRole === 'agent_sol') return true
    
    // Pour les pilotes, vérifier les permissions JSONB
    if (userRole === 'pilote') {
      return userPermissions[module] === true
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
      <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8">
        {/* Header avec Navigation */}
        <Card className="mb-4 sm:mb-6 shadow-lg">
          <CardHeader className="p-3 sm:p-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex justify-between items-center">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-800 truncate">
                    JSHS
                  </CardTitle>
                  <p className="text-sm sm:text-base text-gray-600 mt-1 truncate">
                    Bonjour {username || 'Utilisateur'}
                    {userRole === 'pilote' && (
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                        Pilote
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                  {canAccessModule('users') && (
                    <Button 
                      onClick={() => setActiveModule('users')}
                      variant={activeModule === 'users' ? 'default' : 'outline'}
                      className="p-2 sm:px-4 sm:py-2"
                      size="sm"
                    >
                      <Users className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Utilisateurs</span>
                    </Button>
                  )}
                  <Button 
                    onClick={handleSignOut} 
                    variant="ghost"
                    className="p-2 sm:px-4 sm:py-2"
                    size="sm"
                  >
                    <LogOut className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Se déconnecter</span>
                  </Button>
                </div>
              </div>

              {/* Navigation par onglets */}
              <div className="flex gap-1 sm:gap-2 border-t pt-3 sm:pt-4 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0">
                {/* PILOTES : FlightLog, Jet A1, DZ en PREMIER */}
                {userRole === 'pilote' && (
                  <>
                    <button
                      onClick={() => setActiveModule('flightlog')}
                      className={`flex-shrink-0 py-2 px-3 sm:py-3 sm:px-6 rounded-lg font-semibold transition-all whitespace-nowrap text-sm ${
                        activeModule === 'flightlog'
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      ✈️ <span className="hidden sm:inline">FlightLog</span>
                    </button>
                    
                    <button
                      onClick={() => setActiveModule('jeta1')}
                      className={`flex-shrink-0 py-2 px-3 sm:py-3 sm:px-6 rounded-lg font-semibold transition-all whitespace-nowrap text-sm ${
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
                      className={`flex-shrink-0 py-2 px-3 sm:py-3 sm:px-6 rounded-lg font-semibold transition-all whitespace-nowrap text-sm ${
                        activeModule === 'dropzones'
                          ? 'bg-purple-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      📍 <span className="hidden sm:inline">DZ</span>
                    </button>

                    <button
                      onClick={() => setActiveModule('manifest')}
                      className={`flex-shrink-0 py-2 px-3 sm:py-3 sm:px-6 rounded-lg font-semibold transition-all whitespace-nowrap text-sm ${
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
                      className={`flex-shrink-0 py-2 px-3 sm:py-3 sm:px-6 rounded-lg font-semibold transition-all whitespace-nowrap text-sm ${
                        activeModule === 'notes'
                          ? 'bg-blue-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      📋 <span className="hidden sm:inline">Notes</span>
                    </button>

                    <button
                      onClick={() => setActiveModule('liste')}
                      className={`flex-shrink-0 py-2 px-3 sm:py-3 sm:px-6 rounded-lg font-semibold transition-all whitespace-nowrap text-sm ${
                        activeModule === 'liste'
                          ? 'bg-purple-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      🚁 <span className="hidden sm:inline">Liste</span>
                    </button>

                    <button
                      onClick={() => setActiveModule('jeta1')}
                      className={`flex-shrink-0 py-2 px-3 sm:py-3 sm:px-6 rounded-lg font-semibold transition-all whitespace-nowrap text-sm ${
                        activeModule === 'jeta1'
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      ⛽ <span className="hidden sm:inline">Jet A1</span>
                    </button>

                    <button
                      onClick={() => setActiveModule('caisse')}
                      className={`flex-shrink-0 py-2 px-3 sm:py-3 sm:px-6 rounded-lg font-semibold transition-all whitespace-nowrap text-sm ${
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
                      className={`flex-shrink-0 py-2 px-3 sm:py-3 sm:px-6 rounded-lg font-semibold transition-all whitespace-nowrap text-sm ${
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
                      className={`flex-shrink-0 py-2 px-3 sm:py-3 sm:px-6 rounded-lg font-semibold transition-all whitespace-nowrap text-sm ${
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
                      className={`flex-shrink-0 py-2 px-3 sm:py-3 sm:px-6 rounded-lg font-semibold transition-all whitespace-nowrap text-sm ${
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
          <CardContent className="pt-4 sm:pt-6">
            {activeModule === 'users' && <UserManagementModule currentUserId={session.user.id} />}
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