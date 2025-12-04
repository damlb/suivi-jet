import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { X, UserPlus, Edit2, Power, RefreshCw } from 'lucide-react'

export default function UserManagementModule({ isOpen, onClose }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    username: '',
    role: 'pilote'
  })

  useEffect(() => {
    if (isOpen) {
      loadUsers()
    }
  }, [isOpen])

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setUsers(data)
    } else {
      console.error('Erreur chargement users:', error)
    }
    setLoading(false)
  }

  const createUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.username) {
      alert('⚠️ Veuillez remplir tous les champs')
      return
    }

    if (newUser.password.length < 6) {
      alert('⚠️ Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    // Créer l'utilisateur dans Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: newUser.email,
      password: newUser.password,
      options: {
        data: {
          username: newUser.username,
          role: newUser.role
        }
      }
    })

    if (authError) {
      alert(`❌ Erreur : ${authError.message}`)
      return
    }

    if (authData.user) {
      // Mettre à jour le profil avec le rôle
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          username: newUser.username,
          role: newUser.role,
          is_active: true
        })
        .eq('id', authData.user.id)

      if (!profileError) {
        alert(`✅ Utilisateur créé avec succès !\n\nEmail : ${newUser.email}\nMot de passe : ${newUser.password}\n\n⚠️ L'utilisateur doit confirmer son email.`)
        setNewUser({ email: '', password: '', username: '', role: 'pilote' })
        setShowCreateUser(false)
        loadUsers()
      } else {
        alert(`❌ Erreur profil : ${profileError.message}`)
      }
    }
  }

  const updateUserRole = async (userId, newRole) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (!error) {
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
      alert(`✅ Rôle modifié avec succès`)
    } else {
      alert(`❌ Erreur : ${error.message}`)
    }
  }

  const toggleUserStatus = async (userId, currentStatus) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !currentStatus })
      .eq('id', userId)

    if (!error) {
      setUsers(users.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u))
      alert(`✅ Statut modifié`)
    } else {
      alert(`❌ Erreur : ${error.message}`)
    }
  }

  const resetPassword = async (userEmail) => {
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: window.location.origin
    })

    if (!error) {
      alert(`✅ Email de réinitialisation envoyé à ${userEmail}`)
    } else {
      alert(`❌ Erreur : ${error.message}`)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold">👥 Gestion des Utilisateurs</CardTitle>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Bouton Créer */}
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => setShowCreateUser(!showCreateUser)}
              className="flex items-center gap-2"
            >
              <UserPlus size={18} />
              Créer un utilisateur
            </Button>
          </div>

          {/* Formulaire création */}
          {showCreateUser && (
            <Card className="mb-6 border-2 border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <h4 className="font-semibold text-lg mb-4">➕ Nouvel utilisateur</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Email *</label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="pilote@example.com"
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Nom d'utilisateur *</label>
                    <input
                      type="text"
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      placeholder="Jean Dupont"
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Mot de passe * (min 6 caractères)</label>
                    <input
                      type="text"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="mot_de_passe_temporaire"
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Rôle *</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value="pilote">Pilote</option>
                      <option value="agent_sol">Agent au sol</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={createUser}>✅ Créer</Button>
                  <Button variant="ghost" onClick={() => {
                    setShowCreateUser(false)
                    setNewUser({ email: '', password: '', username: '', role: 'pilote' })
                  }}>
                    Annuler
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  ℹ️ L'utilisateur recevra un email de confirmation. Communiquez-lui le mot de passe temporaire.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Tableau utilisateurs */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Statut</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Nom</th>
                  <th className="p-3 text-left">Rôle</th>
                  <th className="p-3 text-left">Créé le</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-400">
                      Chargement...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-400">
                      Aucun utilisateur
                    </td>
                  </tr>
                ) : (
                  users.map(user => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          user.is_active 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {user.is_active ? '🟢 Actif' : '🔴 Inactif'}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-xs">{user.email}</td>
                      <td className="p-3 font-semibold">{user.username}</td>
                      <td className="p-3">
                        {editingUser === user.id ? (
                          <select
                            value={user.role}
                            onChange={(e) => {
                              updateUserRole(user.id, e.target.value)
                              setEditingUser(null)
                            }}
                            className="p-1 border rounded text-sm"
                            autoFocus
                            onBlur={() => setEditingUser(null)}
                          >
                            <option value="pilote">Pilote</option>
                            <option value="agent_sol">Agent au sol</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            user.role === 'pilote' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {user.role === 'pilote' ? '✈️ Pilote' : '🛠️ Agent'}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-gray-600">
                        {new Date(user.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => setEditingUser(user.id)}
                            className="p-2 hover:bg-blue-50 rounded transition-colors"
                            title="Modifier le rôle"
                          >
                            <Edit2 size={16} className="text-blue-600" />
                          </button>
                          <button
                            onClick={() => toggleUserStatus(user.id, user.is_active)}
                            className="p-2 hover:bg-gray-100 rounded transition-colors"
                            title={user.is_active ? "Désactiver" : "Activer"}
                          >
                            <Power size={16} className={user.is_active ? 'text-red-600' : 'text-green-600'} />
                          </button>
                          <button
                            onClick={() => resetPassword(user.email)}
                            className="p-2 hover:bg-orange-50 rounded transition-colors"
                            title="Réinitialiser le mot de passe"
                          >
                            <RefreshCw size={16} className="text-orange-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Légende */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h5 className="font-semibold mb-2">📖 Légende des actions :</h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Edit2 size={14} className="text-blue-600" />
                <span>Modifier le rôle</span>
              </div>
              <div className="flex items-center gap-2">
                <Power size={14} className="text-red-600" />
                <span>Activer / Désactiver</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw size={14} className="text-orange-600" />
                <span>Réinitialiser mot de passe</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-blue-50">
              <CardContent className="pt-6">
                <div className="text-sm text-blue-600 mb-1">Total utilisateurs</div>
                <div className="text-3xl font-bold text-blue-900">{users.length}</div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50">
              <CardContent className="pt-6">
                <div className="text-sm text-purple-600 mb-1">Pilotes</div>
                <div className="text-3xl font-bold text-purple-900">
                  {users.filter(u => u.role === 'pilote').length}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-50">
              <CardContent className="pt-6">
                <div className="text-sm text-green-600 mb-1">Comptes actifs</div>
                <div className="text-3xl font-bold text-green-900">
                  {users.filter(u => u.is_active).length}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}