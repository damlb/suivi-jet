import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Users, UserPlus, Shield, Plane, Edit2, Trash2, Save, X } from 'lucide-react'

export default function UserManagementModule() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingUserId, setEditingUserId] = useState(null)
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    prenom: '',
    role: 'pilote'
  })

  const [editData, setEditData] = useState({
    prenom: '',
    role: ''
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setUsers(data)
    } else {
      console.error('Erreur chargement utilisateurs:', error)
    }
    setLoading(false)
  }

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      prenom: '',
      role: 'pilote'
    })
    setShowAddForm(false)
  }

  const handleAddUser = async (e) => {
    e.preventDefault()

    if (!formData.email || !formData.password || !formData.prenom) {
      alert('⚠️ Veuillez remplir tous les champs obligatoires')
      return
    }

    if (formData.password.length < 6) {
      alert('⚠️ Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    // Créer l'utilisateur avec Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          prenom: formData.prenom,
          role: formData.role
        }
      }
    })

    if (authError) {
      console.error('Erreur création utilisateur:', authError)
      alert(`❌ Erreur: ${authError.message}`)
      return
    }

    // Mettre à jour le profil avec le rôle correct
    if (authData.user) {
      const permissions = formData.role === 'agent_sol' 
        ? ['notes', 'jet_a1', 'caisse', 'liste_attente', 'flight_log', 'drop_zones', 'users_management', 'manifest']
        : ['flight_log', 'manifest']

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          prenom: formData.prenom,
          role: formData.role,
          permissions: permissions
        })
        .eq('id', authData.user.id)

      if (profileError) {
        console.error('Erreur mise à jour profil:', profileError)
      }
    }

    alert('✅ Utilisateur créé avec succès')
    loadUsers()
    resetForm()
  }

  const startEdit = (user) => {
    setEditingUserId(user.id)
    setEditData({
      prenom: user.prenom || '',
      role: user.role || 'pilote'
    })
  }

  const cancelEdit = () => {
    setEditingUserId(null)
    setEditData({ prenom: '', role: '' })
  }

  const saveEdit = async (userId) => {
    const permissions = editData.role === 'agent_sol' 
      ? ['notes', 'jet_a1', 'caisse', 'liste_attente', 'flight_log', 'drop_zones', 'users_management', 'manifest']
      : ['flight_log', 'manifest']

    const { error } = await supabase
      .from('profiles')
      .update({
        prenom: editData.prenom,
        role: editData.role,
        permissions: permissions
      })
      .eq('id', userId)

    if (!error) {
      alert('✅ Utilisateur modifié')
      loadUsers()
      cancelEdit()
    } else {
      console.error('Erreur modification:', error)
      alert('❌ Erreur lors de la modification')
    }
  }

  const deleteUser = async (userId, prenom) => {
    if (!confirm(`Supprimer l'utilisateur ${prenom} ?\n\nCette action est irréversible.`)) {
      return
    }

    // Note: La suppression complète d'un utilisateur Auth nécessite des privilèges admin
    // Pour l'instant, on désactive juste le profil
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', userId)

    if (!error) {
      alert('✅ Utilisateur désactivé')
      loadUsers()
    } else {
      console.error('Erreur suppression:', error)
      alert('❌ Erreur lors de la suppression')
    }
  }

  // Statistiques
  const stats = {
    total: users.filter(u => u.is_active !== false).length,
    agents: users.filter(u => u.role === 'agent_sol' && u.is_active !== false).length,
    pilotes: users.filter(u => u.role === 'pilote' && u.is_active !== false).length,
    inactifs: users.filter(u => u.is_active === false).length
  }

  // Badge rôle
  const getRoleBadge = (role) => {
    if (role === 'agent_sol') {
      return { color: 'bg-blue-100 text-blue-700', icon: <Shield size={14} />, label: 'Agent Sol' }
    }
    return { color: 'bg-green-100 text-green-700', icon: <Plane size={14} />, label: 'Pilote' }
  }

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  return (
    <div className="space-y-2 sm:space-y-4 sm:space-y-3 sm:space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-2 sm:gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-4 sm:pt-3 sm:pt-6 p-3 sm:p-6">
            <div className="text-xs sm:text-sm text-purple-600 mb-1">Total Actifs</div>
            <div className="text-2xl sm:text-3xl font-bold text-purple-900">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-4 sm:pt-3 sm:pt-6 p-3 sm:p-6">
            <div className="text-xs sm:text-sm text-blue-600 mb-1">Agents Sol</div>
            <div className="text-2xl sm:text-3xl font-bold text-blue-900">{stats.agents}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-4 sm:pt-3 sm:pt-6 p-3 sm:p-6">
            <div className="text-xs sm:text-sm text-green-600 mb-1">Pilotes</div>
            <div className="text-2xl sm:text-3xl font-bold text-green-900">{stats.pilotes}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 to-gray-100">
          <CardContent className="pt-4 sm:pt-3 sm:pt-6 p-3 sm:p-6">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Inactifs</div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.inactifs}</div>
          </CardContent>
        </Card>
      </div>

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h3 className="text-lg sm:text-xl font-semibold">
          👥 Gestion des utilisateurs ({stats.total})
        </h3>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="w-full sm:w-auto text-sm">
          <UserPlus size={18} className="mr-2" />
          Nouvel utilisateur
        </Button>
      </div>

      {/* Formulaire d'ajout */}
      {showAddForm && (
        <Card className="border-2 border-blue-500">
          <CardHeader className="bg-blue-50 p-3 sm:p-6">
            <CardTitle className="flex justify-between items-center text-base sm:text-xl">
              <span>➕ Créer un nouvel utilisateur</span>
              <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-3 sm:pt-6">
            <form onSubmit={handleAddUser} className="space-y-2 sm:space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-2 sm:gap-4">
                {/* Email */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="exemple@email.com"
                    className="w-full p-2 border rounded-lg text-sm"
                    required
                  />
                </div>

                {/* Mot de passe */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Mot de passe *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min. 6 caractères"
                    className="w-full p-2 border rounded-lg text-sm"
                    required
                    minLength={6}
                  />
                </div>

                {/* Prénom */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Prénom *</label>
                  <input
                    type="text"
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    placeholder="Prénom"
                    className="w-full p-2 border rounded-lg text-sm"
                    required
                  />
                </div>

                {/* Rôle */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Rôle *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm"
                    required
                  >
                    <option value="pilote">🚁 Pilote (accès limité)</option>
                    <option value="agent_sol">🛡️ Agent Sol (accès complet)</option>
                  </select>
                </div>
              </div>

              {/* Info permissions */}
              <div className="bg-blue-50 p-3 rounded-lg text-xs sm:text-sm">
                <p className="font-semibold mb-1">Permissions attribuées :</p>
                {formData.role === 'agent_sol' ? (
                  <ul className="list-disc list-inside text-blue-700">
                    <li>Accès complet à tous les modules</li>
                    <li>Gestion des utilisateurs</li>
                    <li>Modification et suppression</li>
                  </ul>
                ) : (
                  <ul className="list-disc list-inside text-green-700">
                    <li>FlightLog (décollages/atterrissages)</li>
                    <li>PVE/Manifest (checklist pré-vol)</li>
                    <li>Lecture seule sur les autres modules</li>
                  </ul>
                )}
              </div>

              {/* Boutons */}
              <div className="flex gap-2">
                <Button type="submit" className="bg-green-500 hover:bg-green-600 text-sm">
                  ✅ Créer
                </Button>
                <Button type="button" onClick={resetForm} variant="ghost" className="text-sm">
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Liste des utilisateurs */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-xl">📋 Utilisateurs</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="space-y-3">
            {users.filter(u => u.is_active !== false).length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users size={48} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">Aucun utilisateur actif</p>
              </div>
            ) : (
              users.filter(u => u.is_active !== false).map(user => (
                <Card key={user.id} className="border hover:shadow-md transition-shadow">
                  <CardContent className="pt-4 sm:pt-3 sm:pt-6 p-3 sm:p-6">
                    {editingUserId === user.id ? (
                      // Mode édition
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium mb-1">Prénom</label>
                            <input
                              type="text"
                              value={editData.prenom}
                              onChange={(e) => setEditData({ ...editData, prenom: e.target.value })}
                              className="w-full p-2 border rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Rôle</label>
                            <select
                              value={editData.role}
                              onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                              className="w-full p-2 border rounded text-sm"
                            >
                              <option value="pilote">🚁 Pilote</option>
                              <option value="agent_sol">🛡️ Agent Sol</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(user.id)}
                            className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 flex items-center gap-1"
                          >
                            <Save size={14} />
                            Sauvegarder
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400 flex items-center gap-1"
                          >
                            <X size={14} />
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Mode affichage
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-base">{user.prenom || 'Sans nom'}</h4>
                            <span className={`${getRoleBadge(user.role).color} px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1`}>
                              {getRoleBadge(user.role).icon}
                              {getRoleBadge(user.role).label}
                            </span>
                          </div>
                          
                          <div className="text-xs sm:text-sm text-gray-600">
                            📧 {user.email || 'Email non renseigné'}
                          </div>
                          
                          {user.permissions && user.permissions.length > 0 && (
                            <div className="text-xs text-gray-500">
                              <span className="font-semibold">Modules autorisés:</span> {user.permissions.join(', ')}
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-400">
                            Créé le {new Date(user.created_at).toLocaleDateString('fr-FR')}
                          </div>
                        </div>

                        <div className="flex sm:flex-col gap-2">
                          <button
                            onClick={() => startEdit(user)}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs flex items-center gap-1 whitespace-nowrap"
                          >
                            <Edit2 size={14} />
                            Modifier
                          </button>
                          <button
                            onClick={() => deleteUser(user.id, user.prenom)}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs flex items-center gap-1 whitespace-nowrap"
                          >
                            <Trash2 size={14} />
                            Supprimer
                          </button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Utilisateurs inactifs */}
      {stats.inactifs > 0 && (
        <Card className="border-dashed">
          <CardHeader className="p-3 sm:p-6 bg-gray-50">
            <CardTitle className="text-base sm:text-xl text-gray-600">
              🗂️ Utilisateurs inactifs ({stats.inactifs})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="space-y-2">
              {users.filter(u => u.is_active === false).map(user => (
                <div key={user.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                  <div>
                    <span className="font-semibold text-gray-500">{user.prenom || 'Sans nom'}</span>
                    <span className="text-gray-400 ml-2">({user.email})</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {getRoleBadge(user.role).label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}