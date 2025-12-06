import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Users, Plus, Trash2, Phone, Mail, Clock, Calendar, CheckCircle } from 'lucide-react'

export default function ListeAttenteModule() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [filter, setFilter] = useState('all') // all, pending, contacted, confirmed, cancelled
  
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    nombre_passagers: 1,
    depart: '',
    destination: '',
    date_souhaitee: '',
    heure_souhaitee: '',
    budget_estime: '',
    notes: '',
    statut: 'pending'
  })

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    const { data, error } = await supabase
      .from('liste_attente')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setClients(data)
    } else {
      console.error('Erreur chargement clients:', error)
    }
    setLoading(false)
  }

  const resetForm = () => {
    setFormData({
      nom: '',
      prenom: '',
      telephone: '',
      email: '',
      nombre_passagers: 1,
      depart: '',
      destination: '',
      date_souhaitee: '',
      heure_souhaitee: '',
      budget_estime: '',
      notes: '',
      statut: 'pending'
    })
    setShowAddForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.nom || !formData.prenom || !formData.telephone) {
      alert('⚠️ Veuillez remplir au minimum nom, prénom et téléphone')
      return
    }

    const { error } = await supabase
      .from('liste_attente')
      .insert([formData])

    if (!error) {
      alert('✅ Client ajouté à la liste d\'attente')
      loadClients()
      resetForm()
    } else {
      console.error('Erreur ajout:', error)
      alert('❌ Erreur lors de l\'ajout')
    }
  }

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase
      .from('liste_attente')
      .update({ 
        statut: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (!error) {
      setClients(clients.map(c => 
        c.id === id ? { ...c, statut: newStatus, updated_at: new Date().toISOString() } : c
      ))
    }
  }

  const deleteClient = async (id, nom) => {
    if (!confirm(`Supprimer ${nom} de la liste d'attente ?`)) return

    const { error } = await supabase
      .from('liste_attente')
      .delete()
      .eq('id', id)

    if (!error) {
      alert('✅ Client supprimé')
      loadClients()
    }
  }

  // Filtrage
  const filteredClients = clients.filter(c => {
    if (filter === 'all') return true
    return c.statut === filter
  })

  // Statistiques
  const stats = {
    total: clients.length,
    pending: clients.filter(c => c.statut === 'pending').length,
    contacted: clients.filter(c => c.statut === 'contacted').length,
    confirmed: clients.filter(c => c.statut === 'confirmed').length,
    cancelled: clients.filter(c => c.statut === 'cancelled').length
  }

  // Badges statuts
  const getStatusBadge = (statut) => {
    const badges = {
      pending: { color: 'bg-orange-100 text-orange-700', label: '⏳ En attente' },
      contacted: { color: 'bg-blue-100 text-blue-700', label: '📞 Contacté' },
      confirmed: { color: 'bg-green-100 text-green-700', label: '✅ Confirmé' },
      cancelled: { color: 'bg-gray-100 text-gray-700', label: '❌ Annulé' }
    }
    return badges[statut] || badges.pending
  }

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  return (
    <div className="space-y-2 sm:space-y-4 sm:space-y-3 sm:space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-2 sm:gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setFilter('all')}>
          <CardContent className="pt-4 sm:pt-3 sm:pt-6 p-3 sm:p-6">
            <div className="text-xs sm:text-sm text-blue-600 mb-1">Total</div>
            <div className="text-2xl sm:text-3xl font-bold text-blue-900">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setFilter('pending')}>
          <CardContent className="pt-4 sm:pt-3 sm:pt-6 p-3 sm:p-6">
            <div className="text-xs sm:text-sm text-orange-600 mb-1">En attente</div>
            <div className="text-2xl sm:text-3xl font-bold text-orange-900">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setFilter('contacted')}>
          <CardContent className="pt-4 sm:pt-3 sm:pt-6 p-3 sm:p-6">
            <div className="text-xs sm:text-sm text-blue-600 mb-1">Contactés</div>
            <div className="text-2xl sm:text-3xl font-bold text-blue-900">{stats.contacted}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setFilter('confirmed')}>
          <CardContent className="pt-4 sm:pt-3 sm:pt-6 p-3 sm:p-6">
            <div className="text-xs sm:text-sm text-green-600 mb-1">Confirmés</div>
            <div className="text-2xl sm:text-3xl font-bold text-green-900">{stats.confirmed}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setFilter('cancelled')}>
          <CardContent className="pt-4 sm:pt-3 sm:pt-6 p-3 sm:p-6">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Annulés</div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.cancelled}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtre actif */}
      {filter !== 'all' && (
        <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
          <span className="text-sm text-blue-700">
            Filtre actif: <strong>{getStatusBadge(filter).label}</strong>
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setFilter('all')}
            className="text-xs"
          >
            Afficher tout
          </Button>
        </div>
      )}

      {/* Bouton Ajouter */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg sm:text-xl font-semibold">
          👥 Liste d'attente ({filteredClients.length})
        </h3>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="text-sm">
          <Plus size={18} className="mr-2" />
          Ajouter
        </Button>
      </div>

      {/* Formulaire d'ajout */}
      {showAddForm && (
        <Card className="border-2 border-blue-500">
          <CardHeader className="bg-blue-50 p-3 sm:p-6">
            <CardTitle className="text-base sm:text-xl">➕ Nouveau client</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-3 sm:pt-6">
            <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-2 sm:gap-4">
                {/* Nom */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Nom *</label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm"
                    required
                  />
                </div>

                {/* Prénom */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Prénom *</label>
                  <input
                    type="text"
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm"
                    required
                  />
                </div>

                {/* Téléphone */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>

                {/* Nombre passagers */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Nombre de passagers</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={formData.nombre_passagers}
                    onChange={(e) => setFormData({ ...formData, nombre_passagers: parseInt(e.target.value) })}
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>

                {/* Budget estimé */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Budget estimé (€)</label>
                  <input
                    type="text"
                    value={formData.budget_estime}
                    onChange={(e) => setFormData({ ...formData, budget_estime: e.target.value })}
                    placeholder="Ex: 800€"
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>

                {/* Départ */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Lieu de départ</label>
                  <input
                    type="text"
                    value={formData.depart}
                    onChange={(e) => setFormData({ ...formData, depart: e.target.value })}
                    placeholder="Ex: Figari"
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>

                {/* Destination */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Destination</label>
                  <input
                    type="text"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    placeholder="Ex: Ajaccio"
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>

                {/* Date souhaitée */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Date souhaitée</label>
                  <input
                    type="date"
                    value={formData.date_souhaitee}
                    onChange={(e) => setFormData({ ...formData, date_souhaitee: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>

                {/* Heure souhaitée */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Heure souhaitée</label>
                  <input
                    type="time"
                    value={formData.heure_souhaitee}
                    onChange={(e) => setFormData({ ...formData, heure_souhaitee: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Informations complémentaires..."
                  className="w-full p-2 border rounded-lg text-sm"
                  rows="2"
                />
              </div>

              {/* Boutons */}
              <div className="flex gap-2">
                <Button type="submit" className="bg-green-500 hover:bg-green-600 text-sm">
                  ✅ Ajouter
                </Button>
                <Button type="button" onClick={resetForm} variant="ghost" className="text-sm">
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Liste des clients */}
      <div className="space-y-3">
        {filteredClients.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Users size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">Aucun client dans la liste d'attente</p>
          </div>
        ) : (
          filteredClients.map(client => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 sm:pt-3 sm:pt-6 p-3 sm:p-6">
                <div className="flex flex-col md:flex-row md:items-start gap-2 sm:gap-4">
                  {/* Infos principales */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-base sm:text-lg">
                        {client.prenom} {client.nom}
                      </h4>
                      <span className={`${getStatusBadge(client.statut).color} px-2 py-1 rounded-full text-xs font-semibold`}>
                        {getStatusBadge(client.statut).label}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-600">
                      {client.telephone && (
                        <div className="flex items-center gap-2">
                          <Phone size={16} className="text-blue-500 flex-shrink-0" />
                          <a href={`tel:${client.telephone}`} className="hover:text-blue-600">
                            {client.telephone}
                          </a>
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-purple-500 flex-shrink-0" />
                          <a href={`mailto:${client.email}`} className="hover:text-purple-600 truncate">
                            {client.email}
                          </a>
                        </div>
                      )}
                      {client.date_souhaitee && (
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-green-500 flex-shrink-0" />
                          <span>
                            {new Date(client.date_souhaitee).toLocaleDateString('fr-FR')}
                            {client.heure_souhaitee && ` à ${client.heure_souhaitee}`}
                          </span>
                        </div>
                      )}
                      {client.nombre_passagers > 1 && (
                        <div className="flex items-center gap-2">
                          <Users size={16} className="text-orange-500 flex-shrink-0" />
                          <span>{client.nombre_passagers} passagers</span>
                        </div>
                      )}
                    </div>

                    {(client.depart || client.destination) && (
                      <div className="text-xs sm:text-sm">
                        <span className="font-semibold">Trajet:</span> {client.depart || '?'} → {client.destination || '?'}
                      </div>
                    )}

                    {client.budget_estime && (
                      <div className="text-xs sm:text-sm">
                        <span className="font-semibold">Budget:</span> {client.budget_estime}
                      </div>
                    )}

                    {client.notes && (
                      <div className="text-xs sm:text-sm bg-gray-50 p-2 rounded">
                        <span className="font-semibold">Notes:</span> {client.notes}
                      </div>
                    )}

                    <div className="text-xs text-gray-400 flex items-center gap-2 pt-2 border-t">
                      <Clock size={14} />
                      Ajouté le {new Date(client.created_at).toLocaleDateString('fr-FR')} à{' '}
                      {new Date(client.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex md:flex-col gap-2">
                    <select
                      value={client.statut}
                      onChange={(e) => updateStatus(client.id, e.target.value)}
                      className="px-2 py-1 border rounded text-xs sm:text-sm"
                    >
                      <option value="pending">⏳ En attente</option>
                      <option value="contacted">📞 Contacté</option>
                      <option value="confirmed">✅ Confirmé</option>
                      <option value="cancelled">❌ Annulé</option>
                    </select>

                    <button
                      onClick={() => deleteClient(client.id, `${client.prenom} ${client.nom}`)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs sm:text-sm whitespace-nowrap"
                    >
                      <Trash2 size={14} className="inline mr-1" />
                      Supprimer
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}