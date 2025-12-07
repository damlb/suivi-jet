import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Users, Plus, Trash2, Phone, Mail, Calendar, X } from 'lucide-react'

export default function ListeAttenteModule() {
  const [clients, setClients] = useState([])
  const [circuits, setCircuits] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showCircuitsManager, setShowCircuitsManager] = useState(false)
  const [editingCircuit, setEditingCircuit] = useState(null)
  const [editingClient, setEditingClient] = useState(null)
  const [showPlacementModal, setShowPlacementModal] = useState(null)
  const [dateVolPrevu, setDateVolPrevu] = useState('')
  const [filter, setFilter] = useState('actifs') // 'actifs' ou 'places'
  
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    nombre_pax: 1,
    circuit_id: '',
    dates_dispo: [],
    place: false,
    notes: ''
  })

  const [circuitFormData, setCircuitFormData] = useState({
    nom: '',
    duree_minutes: '',
    prix: ''
  })

  const [newDate, setNewDate] = useState('')

  const [editClientData, setEditClientData] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    nombre_pax: 1,
    circuit_id: '',
    dates_dispo: [],
    notes: ''
  })

  useEffect(() => {
    loadClients()
    loadCircuits()
  }, [])

  const loadClients = async () => {
    const { data, error } = await supabase
      .from('liste_attente')
      .select(`
        *,
        circuit:circuits(id, nom, duree_minutes, prix)
      `)
      .order('created_at', { ascending: false })

    if (data) {
      setClients(data)
    } else {
      console.error('Erreur chargement clients:', error)
    }
    setLoading(false)
  }

  const loadCircuits = async () => {
    const { data, error } = await supabase
      .from('circuits')
      .select('*')
      .order('nom', { ascending: true })

    if (data) {
      setCircuits(data)
    } else {
      console.error('Erreur chargement circuits:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      nom: '',
      prenom: '',
      telephone: '',
      email: '',
      nombre_pax: 1,
      circuit_id: '',
      dates_dispo: [],
      place: false,
      notes: ''
    })
    setNewDate('')
    setShowAddForm(false)
  }

  const addDate = () => {
    if (newDate && !formData.dates_dispo.includes(newDate)) {
      setFormData({
        ...formData,
        dates_dispo: [...formData.dates_dispo, newDate].sort()
      })
      setNewDate('')
    }
  }

  const removeDate = (dateToRemove) => {
    setFormData({
      ...formData,
      dates_dispo: formData.dates_dispo.filter(d => d !== dateToRemove)
    })
  }

  const addClient = async () => {
    if (!formData.nom || !formData.prenom || !formData.telephone) {
      alert('⚠️ Veuillez remplir au moins le nom, prénom et téléphone')
      return
    }

    const { error } = await supabase
      .from('liste_attente')
      .insert([{
        nom: formData.nom,
        prenom: formData.prenom,
        telephone: formData.telephone,
        email: formData.email,
        nombre_pax: parseInt(formData.nombre_pax),
        circuit_id: formData.circuit_id || null,
        dates_dispo: formData.dates_dispo,
        place: false,
        notes: formData.notes
      }])

    if (!error) {
      loadClients()
      resetForm()
      alert('✅ Client ajouté à la liste d\'attente')
    } else {
      console.error('Erreur ajout client:', error)
      alert('❌ Erreur lors de l\'ajout')
    }
  }

  const deleteClient = async (id) => {
    if (window.confirm('Supprimer ce client de la liste d\'attente ?')) {
      const { error} = await supabase
        .from('liste_attente')
        .delete()
        .eq('id', id)

      if (!error) {
        setClients(clients.filter(c => c.id !== id))
      }
    }
  }

  const openPlacementModal = (client) => {
    setShowPlacementModal(client)
    setDateVolPrevu('')
  }

  const confirmPlacement = async () => {
    if (!showPlacementModal) return
    if (!dateVolPrevu) {
      alert('⚠️ Veuillez saisir la date du vol prévu')
      return
    }

    const updateData = {
      place: true,
      date_placement: new Date().toISOString(),
      date_vol_prevu: dateVolPrevu
    }

    const { error } = await supabase
      .from('liste_attente')
      .update(updateData)
      .eq('id', showPlacementModal.id)

    if (!error) {
      loadClients()
      setShowPlacementModal(null)
      setDateVolPrevu('')
      alert('✅ Client marqué comme placé')
    }
  }

  const unplaceClient = async (id) => {
    const updateData = {
      place: false,
      date_placement: null,
      date_vol_prevu: null
    }

    const { error } = await supabase
      .from('liste_attente')
      .update(updateData)
      .eq('id', id)

    if (!error) {
      loadClients()
    }
  }

  const openEditClient = (client) => {
    setEditingClient(client)
    setEditClientData({
      nom: client.nom,
      prenom: client.prenom,
      telephone: client.telephone,
      email: client.email || '',
      nombre_pax: client.nombre_pax,
      circuit_id: client.circuit_id || '',
      dates_dispo: client.dates_dispo || [],
      notes: client.notes || ''
    })
  }

  const updateClient = async () => {
    if (!editingClient) return
    if (!editClientData.nom || !editClientData.prenom || !editClientData.telephone) {
      alert('⚠️ Veuillez remplir au moins le nom, prénom et téléphone')
      return
    }

    const { error } = await supabase
      .from('liste_attente')
      .update({
        nom: editClientData.nom,
        prenom: editClientData.prenom,
        telephone: editClientData.telephone,
        email: editClientData.email,
        nombre_pax: parseInt(editClientData.nombre_pax),
        circuit_id: editClientData.circuit_id || null,
        dates_dispo: editClientData.dates_dispo,
        notes: editClientData.notes
      })
      .eq('id', editingClient.id)

    if (!error) {
      loadClients()
      setEditingClient(null)
      alert('✅ Client modifié')
    } else {
      console.error('Erreur modification client:', error)
      alert('❌ Erreur lors de la modification')
    }
  }

  const addDateToEdit = () => {
    if (newDate && !editClientData.dates_dispo.includes(newDate)) {
      setEditClientData({
        ...editClientData,
        dates_dispo: [...editClientData.dates_dispo, newDate].sort()
      })
      setNewDate('')
    }
  }

  const removeDateFromEdit = (dateToRemove) => {
    setEditClientData({
      ...editClientData,
      dates_dispo: editClientData.dates_dispo.filter(d => d !== dateToRemove)
    })
  }

  // Gestion des circuits
  const addCircuit = async () => {
    if (!circuitFormData.nom || !circuitFormData.duree_minutes) {
      alert('⚠️ Veuillez remplir au moins le nom et la durée')
      return
    }

    const dataToInsert = {
      nom: circuitFormData.nom,
      duree_minutes: parseInt(circuitFormData.duree_minutes),
      prix: circuitFormData.prix ? parseFloat(circuitFormData.prix) : null
    }

    const { error } = await supabase
      .from('circuits')
      .insert([dataToInsert])

    if (!error) {
      loadCircuits()
      setCircuitFormData({ nom: '', duree_minutes: '', prix: '' })
      alert('✅ Circuit ajouté')
    } else {
      console.error('Erreur ajout circuit:', error)
      alert('❌ Erreur lors de l\'ajout')
    }
  }

  const updateCircuit = async () => {
    if (!editingCircuit) return

    const dataToUpdate = {
      nom: circuitFormData.nom,
      duree_minutes: parseInt(circuitFormData.duree_minutes),
      prix: circuitFormData.prix ? parseFloat(circuitFormData.prix) : null
    }

    const { error } = await supabase
      .from('circuits')
      .update(dataToUpdate)
      .eq('id', editingCircuit.id)

    if (!error) {
      loadCircuits()
      setEditingCircuit(null)
      setCircuitFormData({ nom: '', duree_minutes: '', prix: '' })
      alert('✅ Circuit modifié')
    } else {
      console.error('Erreur modification circuit:', error)
      alert('❌ Erreur lors de la modification')
    }
  }

  const deleteCircuit = async (id) => {
    if (window.confirm('⚠️ Supprimer ce circuit ? Les clients liés perdront cette référence.')) {
      const { error } = await supabase
        .from('circuits')
        .delete()
        .eq('id', id)

      if (!error) {
        loadCircuits()
        alert('✅ Circuit supprimé')
      } else {
        console.error('Erreur suppression circuit:', error)
        alert('❌ Erreur lors de la suppression')
      }
    }
  }

  const openEditCircuit = (circuit) => {
    setEditingCircuit(circuit)
    setCircuitFormData({
      nom: circuit.nom,
      duree_minutes: circuit.duree_minutes,
      prix: circuit.prix || ''
    })
  }

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  const filteredClients = clients.filter(client => {
    if (filter === 'actifs') return !client.place
    if (filter === 'places') return client.place
    return true
  })

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users size={24} />
            Liste d'attente
          </h2>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            onClick={() => setShowCircuitsManager(!showCircuitsManager)}
            variant="outline"
            className="flex-1 sm:flex-initial text-sm"
          >
            ⚙️ Gérer les circuits
          </Button>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex-1 sm:flex-initial text-sm"
          >
            <Plus size={16} className="mr-1" />
            Nouveau client
          </Button>
        </div>
      </div>

      {/* Gestion des circuits */}
      {showCircuitsManager && (
        <Card className="border-2 border-purple-200 bg-purple-50">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-3 sm:p-6">
            <CardTitle className="text-base sm:text-xl">⚙️ Gestion des circuits</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Formulaire ajout/modification circuit */}
            <div className="bg-white p-3 rounded-lg border">
              <h4 className="font-semibold mb-3 text-sm">
                {editingCircuit ? '✏️ Modifier le circuit' : '➕ Ajouter un circuit'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Nom du circuit *</label>
                  <input
                    type="text"
                    value={circuitFormData.nom}
                    onChange={(e) => setCircuitFormData({ ...circuitFormData, nom: e.target.value })}
                    placeholder="Ex: Circuit Bavella"
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Durée (minutes) *</label>
                  <input
                    type="number"
                    value={circuitFormData.duree_minutes}
                    onChange={(e) => setCircuitFormData({ ...circuitFormData, duree_minutes: e.target.value })}
                    placeholder="30"
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Prix (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={circuitFormData.prix}
                    onChange={(e) => setCircuitFormData({ ...circuitFormData, prix: e.target.value })}
                    placeholder="250"
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {editingCircuit ? (
                  <>
                    <Button onClick={updateCircuit} size="sm" className="bg-blue-500 hover:bg-blue-600">
                      💾 Enregistrer
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingCircuit(null)
                        setCircuitFormData({ nom: '', duree_minutes: '', prix: '' })
                      }}
                      variant="ghost"
                      size="sm"
                    >
                      Annuler
                    </Button>
                  </>
                ) : (
                  <Button onClick={addCircuit} size="sm" className="bg-green-500 hover:bg-green-600">
                    ➕ Ajouter le circuit
                  </Button>
                )}
              </div>
            </div>

            {/* Liste des circuits */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">📋 Circuits existants ({circuits.length})</h4>
              {circuits.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Aucun circuit créé</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {circuits.map(circuit => (
                    <div key={circuit.id} className="bg-white p-3 rounded-lg border hover:border-purple-300 transition-colors">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <h5 className="font-semibold text-sm">{circuit.nom}</h5>
                          <div className="text-xs text-gray-600 space-y-1 mt-1">
                            <div>⏱️ {circuit.duree_minutes} min</div>
                            {circuit.prix && <div>💰 {circuit.prix}€</div>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEditCircuit(circuit)}
                            className="text-blue-500 hover:text-blue-700 p-1"
                            title="Modifier"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteCircuit(circuit.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Supprimer"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulaire ajout client */}
      {showAddForm && (
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-3 sm:p-6">
            <CardTitle className="text-base sm:text-xl">➕ Nouveau client</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Nom */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Nom *</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  placeholder="Dupont"
                  className="w-full p-2 border rounded-lg text-sm"
                />
              </div>

              {/* Prénom */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Prénom *</label>
                <input
                  type="text"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  placeholder="Jean"
                  className="w-full p-2 border rounded-lg text-sm"
                />
              </div>

              {/* Téléphone */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Téléphone *</label>
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  placeholder="06 12 34 56 78"
                  className="w-full p-2 border rounded-lg text-sm"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="jean.dupont@email.com"
                  className="w-full p-2 border rounded-lg text-sm"
                />
              </div>

              {/* Nombre de passagers */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Nombre de passagers</label>
                <input
                  type="number"
                  min="1"
                  value={formData.nombre_pax}
                  onChange={(e) => setFormData({ ...formData, nombre_pax: e.target.value })}
                  className="w-full p-2 border rounded-lg text-sm"
                />
              </div>

              {/* Circuit */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Circuit vol panoramique</label>
                <select
                  value={formData.circuit_id}
                  onChange={(e) => setFormData({ ...formData, circuit_id: e.target.value })}
                  className="w-full p-2 border rounded-lg text-sm"
                >
                  <option value="">-- Sélectionner un circuit --</option>
                  {circuits.map(circuit => (
                    <option key={circuit.id} value={circuit.id}>
                      {circuit.nom} ({circuit.duree_minutes}min{circuit.prix ? ` - ${circuit.prix}€` : ''})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dates de disponibilité */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2">
                📅 Dates de disponibilité
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="flex-1 p-2 border rounded-lg text-sm"
                />
                <Button onClick={addDate} size="sm" disabled={!newDate}>
                  + Ajouter
                </Button>
              </div>
              {formData.dates_dispo.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.dates_dispo.map(date => (
                    <div
                      key={date}
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs flex items-center gap-2"
                    >
                      <Calendar size={12} />
                      {new Date(date).toLocaleDateString('fr-FR')}
                      <button
                        onClick={() => removeDate(date)}
                        className="hover:text-red-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Remarques particulières..."
                className="w-full p-2 border rounded-lg text-sm"
                rows="3"
              />
            </div>

            {/* Boutons */}
            <div className="flex gap-2 pt-2">
              <Button onClick={addClient} className="flex-1 bg-green-500 hover:bg-green-600">
                ✅ Ajouter à la liste
              </Button>
              <Button onClick={resetForm} variant="outline" className="flex-1">
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtres */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { value: 'actifs', label: '🔵 Actifs', count: clients.filter(c => !c.place).length },
          { value: 'places', label: '✅ Placés', count: clients.filter(c => c.place).length }
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 sm:px-6 py-2 rounded-lg font-medium transition-all text-sm sm:text-base whitespace-nowrap ${
              filter === f.value
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Liste des clients */}
      <div className="space-y-2 sm:space-y-3">
        {filteredClients.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-400">
              <Users size={48} className="mx-auto mb-3 opacity-50" />
              <p>Aucun client dans cette catégorie</p>
            </CardContent>
          </Card>
        ) : (
          filteredClients.map(client => (
            <Card 
              key={client.id} 
              className="hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  <div 
                    className="flex-1 cursor-pointer hover:bg-gray-50 p-2 -m-2 rounded transition-colors"
                    onClick={() => openEditClient(client)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-base sm:text-lg text-blue-600 hover:text-blue-800">
                        ✏️ {client.prenom} {client.nom}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteClient(client.id)
                        }}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="space-y-1 text-xs sm:text-sm text-gray-600">
                      {client.telephone && (
                        <div className="flex items-center gap-2">
                          <Phone size={14} />
                          <span>{client.telephone}</span>
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={14} />
                          <span>{client.email}</span>
                        </div>
                      )}
                      {client.nombre_pax && (
                        <div className="flex items-center gap-2">
                          <Users size={14} />
                          <span>{client.nombre_pax} passager{client.nombre_pax > 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {client.circuit && (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">Circuit:</span>
                          <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">
                            {client.circuit.nom} ({client.circuit.duree_minutes}min)
                          </span>
                        </div>
                      )}
                      {client.dates_dispo && client.dates_dispo.length > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2 mb-1">
                            <Calendar size={14} />
                            <span className="font-semibold">Disponibilités:</span>
                          </div>
                          <div className="flex flex-wrap gap-1 ml-5">
                            {client.dates_dispo.map((date, idx) => (
                              <span key={idx} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                                {new Date(date).toLocaleDateString('fr-FR')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {client.date_vol_prevu && (
                        <div className="mt-2 p-2 bg-green-50 rounded text-xs border border-green-200">
                          <span className="font-semibold">📅 Vol prévu le:</span>{' '}
                          <span className="text-green-700 font-bold">
                            {new Date(client.date_vol_prevu).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      )}
                      {client.notes && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                          <span className="font-semibold">Notes:</span> {client.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bouton Placé / Actif */}
                  <div className="sm:ml-4 flex items-start">
                    {!client.place ? (
                      <Button
                        onClick={() => openPlacementModal(client)}
                        className="bg-blue-500 hover:bg-blue-600 text-white text-xs sm:text-sm font-medium whitespace-nowrap"
                      >
                        🔵 Marquer placé
                      </Button>
                    ) : (
                      <div className="text-center">
                        <Button
                          onClick={() => unplaceClient(client.id)}
                          className="bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm font-medium whitespace-nowrap"
                        >
                          ✅ Placé
                        </Button>
                        {client.date_placement && (
                          <p className="text-xs text-gray-500 mt-1">
                            Placé le {new Date(client.date_placement).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* MODAL PLACEMENT - Demander la date du vol */}
      {showPlacementModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPlacementModal(null)}
        >
          <Card 
            className="w-full max-w-md bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4">
              <CardTitle className="text-lg">
                ✅ Marquer comme placé
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <p className="text-sm">
                Client : <span className="font-bold">{showPlacementModal.prenom} {showPlacementModal.nom}</span>
              </p>
              <div>
                <label className="block text-sm font-medium mb-2">
                  📅 Date du vol prévu *
                </label>
                <input
                  type="date"
                  value={dateVolPrevu}
                  onChange={(e) => setDateVolPrevu(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={confirmPlacement}
                  className="flex-1 bg-green-500 hover:bg-green-600"
                >
                  ✅ Confirmer
                </Button>
                <Button
                  onClick={() => setShowPlacementModal(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL ÉDITION CLIENT */}
      {editingClient && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setEditingClient(null)}
        >
          <Card 
            className="w-full max-w-2xl bg-white my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-4">
              <CardTitle className="text-lg">
                ✏️ Modifier le client
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Nom */}
                <div>
                  <label className="block text-xs font-medium mb-1">Nom *</label>
                  <input
                    type="text"
                    value={editClientData.nom}
                    onChange={(e) => setEditClientData({ ...editClientData, nom: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>

                {/* Prénom */}
                <div>
                  <label className="block text-xs font-medium mb-1">Prénom *</label>
                  <input
                    type="text"
                    value={editClientData.prenom}
                    onChange={(e) => setEditClientData({ ...editClientData, prenom: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>

                {/* Téléphone */}
                <div>
                  <label className="block text-xs font-medium mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    value={editClientData.telephone}
                    onChange={(e) => setEditClientData({ ...editClientData, telephone: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={editClientData.email}
                    onChange={(e) => setEditClientData({ ...editClientData, email: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>

                {/* Nombre de passagers */}
                <div>
                  <label className="block text-xs font-medium mb-1">Nombre de passagers</label>
                  <input
                    type="number"
                    min="1"
                    value={editClientData.nombre_pax}
                    onChange={(e) => setEditClientData({ ...editClientData, nombre_pax: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>

                {/* Circuit */}
                <div>
                  <label className="block text-xs font-medium mb-1">Circuit</label>
                  <select
                    value={editClientData.circuit_id}
                    onChange={(e) => setEditClientData({ ...editClientData, circuit_id: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm"
                  >
                    <option value="">-- Sélectionner --</option>
                    {circuits.map(circuit => (
                      <option key={circuit.id} value={circuit.id}>
                        {circuit.nom} ({circuit.duree_minutes}min{circuit.prix ? ` - ${circuit.prix}€` : ''})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dates de disponibilité */}
              <div>
                <label className="block text-xs font-medium mb-2">
                  📅 Dates de disponibilité
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="flex-1 p-2 border rounded-lg text-sm"
                  />
                  <Button onClick={addDateToEdit} size="sm" disabled={!newDate}>
                    + Ajouter
                  </Button>
                </div>
                {editClientData.dates_dispo.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {editClientData.dates_dispo.map(date => (
                      <div
                        key={date}
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs flex items-center gap-2"
                      >
                        <Calendar size={12} />
                        {new Date(date).toLocaleDateString('fr-FR')}
                        <button
                          onClick={() => removeDateFromEdit(date)}
                          className="hover:text-red-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium mb-1">Notes</label>
                <textarea
                  value={editClientData.notes}
                  onChange={(e) => setEditClientData({ ...editClientData, notes: e.target.value })}
                  className="w-full p-2 border rounded-lg text-sm"
                  rows="3"
                />
              </div>

              {/* Boutons */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={updateClient}
                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                >
                  💾 Enregistrer
                </Button>
                <Button
                  onClick={() => {
                    if (window.confirm('⚠️ Supprimer ce client ?')) {
                      deleteClient(editingClient.id)
                      setEditingClient(null)
                    }
                  }}
                  className="flex-1 bg-red-500 hover:bg-red-600"
                >
                  🗑️ Supprimer
                </Button>
                <Button
                  onClick={() => setEditingClient(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}