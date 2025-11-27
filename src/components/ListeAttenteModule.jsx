import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'

export default function ListeAttenteModule() {
  const [clients, setClients] = useState([])
  const [circuits, setCircuits] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('actifs') // 'actifs' ou 'archives'
  const [showAddClient, setShowAddClient] = useState(false)
  const [showGestionCircuits, setShowGestionCircuits] = useState(false)
  const [filterCircuit, setFilterCircuit] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [confirmDelete, setConfirmDelete] = useState({ show: false, type: '', id: null })
  const [editingClient, setEditingClient] = useState(null)
  
  const [newClient, setNewClient] = useState({
    prenom: '',
    nom: '',
    telephone: '',
    email: '',
    circuit_id: '',
    notes: '',
    dates_dispo: [],
    statut_paiement: 'en_attente',
    nombre_pax: '1'
  })

  const [newCircuit, setNewCircuit] = useState({
    nom: '',
    duree_minutes: ''
  })

  const [newDate, setNewDate] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    // Charger les circuits
    const { data: circuitsData } = await supabase
      .from('circuits')
      .select('*')
      .order('nom')

    if (circuitsData) {
      setCircuits(circuitsData)
    }

    // Charger les clients
    const { data: clientsData } = await supabase
      .from('liste_attente')
      .select('*, circuit:circuits(nom, duree_minutes)')
      .order('created_at', { ascending: false })

    if (clientsData) {
      setClients(clientsData)
    }

    setLoading(false)
  }

  const addClient = async () => {
    if (!newClient.prenom || !newClient.nom || !newClient.telephone || !newClient.circuit_id) {
      alert('Veuillez remplir les champs obligatoires (prénom, nom, téléphone, circuit)')
      return
    }

    const clientData = {
      prenom: newClient.prenom,
      nom: newClient.nom,
      telephone: newClient.telephone,
      email: newClient.email || null,
      circuit_id: parseInt(newClient.circuit_id),
      notes: newClient.notes,
      dates_dispo: newClient.dates_dispo,
      statut_paiement: newClient.statut_paiement,
      nombre_pax: parseInt(newClient.nombre_pax),
      place: false
    }

    const { data, error } = await supabase
      .from('liste_attente')
      .insert([clientData])
      .select('*, circuit:circuits(nom, duree_minutes)')

    if (data) {
      setClients([data[0], ...clients])
      setNewClient({
        prenom: '',
        nom: '',
        telephone: '',
        email: '',
        circuit_id: '',
        notes: '',
        dates_dispo: [],
        statut_paiement: 'en_attente',
        nombre_pax: '1'
      })
      setShowAddClient(false)
    }
  }

  const togglePlace = async (id, currentState) => {
    const { error } = await supabase
      .from('liste_attente')
      .update({ 
        place: !currentState,
        date_placement: !currentState ? new Date().toISOString() : null
      })
      .eq('id', id)

    if (!error) {
      setClients(clients.map(client =>
        client.id === id
          ? { ...client, place: !currentState, date_placement: !currentState ? new Date().toISOString() : null }
          : client
      ))
    }
  }

  const deleteClient = async (id) => {
    setConfirmDelete({ show: true, type: 'client', id })
  }

  const confirmDeleteAction = async () => {
    if (confirmDelete.type === 'client') {
      const { error } = await supabase
        .from('liste_attente')
        .delete()
        .eq('id', confirmDelete.id)

      if (!error) {
        setClients(clients.filter(c => c.id !== confirmDelete.id))
      }
    } else if (confirmDelete.type === 'circuit') {
      const { error } = await supabase
        .from('circuits')
        .delete()
        .eq('id', confirmDelete.id)

      if (!error) {
        setCircuits(circuits.filter(c => c.id !== confirmDelete.id))
      }
    }
    setConfirmDelete({ show: false, type: '', id: null })
  }

  const startEditClient = (client) => {
    setEditingClient({
      ...client,
      circuit_id: client.circuit_id?.toString() || '',
      nombre_pax: client.nombre_pax?.toString() || '1',
      dates_dispo: client.dates_dispo || []
    })
  }

  const saveEditClient = async () => {
    if (!editingClient.prenom || !editingClient.nom || !editingClient.telephone || !editingClient.circuit_id) {
      alert('Veuillez remplir les champs obligatoires (prénom, nom, téléphone, circuit)')
      return
    }

    const { error } = await supabase
      .from('liste_attente')
      .update({
        prenom: editingClient.prenom,
        nom: editingClient.nom,
        telephone: editingClient.telephone,
        email: editingClient.email || null,
        circuit_id: parseInt(editingClient.circuit_id),
        notes: editingClient.notes,
        dates_dispo: editingClient.dates_dispo,
        statut_paiement: editingClient.statut_paiement,
        nombre_pax: parseInt(editingClient.nombre_pax)
      })
      .eq('id', editingClient.id)

    if (!error) {
      // Recharger les données pour avoir le circuit à jour
      await loadData()
      setEditingClient(null)
    }
  }

  const addDateDispoEdit = (date) => {
    if (date && !editingClient.dates_dispo.includes(date)) {
      setEditingClient({
        ...editingClient,
        dates_dispo: [...editingClient.dates_dispo, date].sort()
      })
    }
  }

  const removeDateDispoEdit = (date) => {
    setEditingClient({
      ...editingClient,
      dates_dispo: editingClient.dates_dispo.filter(d => d !== date)
    })
  }

  const addCircuit = async () => {
    if (!newCircuit.nom || !newCircuit.duree_minutes) {
      alert('Veuillez remplir tous les champs')
      return
    }

    const { data, error } = await supabase
      .from('circuits')
      .insert([
        {
          nom: newCircuit.nom,
          duree_minutes: parseInt(newCircuit.duree_minutes)
        }
      ])
      .select()

    if (data) {
      setCircuits([...circuits, data[0]])
      setNewCircuit({ nom: '', duree_minutes: '' })
    }
  }

  const deleteCircuit = async (id) => {
    // Vérifier si des clients utilisent ce circuit
    const clientsWithCircuit = clients.filter(c => c.circuit_id === id)
    if (clientsWithCircuit.length > 0) {
      alert(`Impossible de supprimer ce circuit car ${clientsWithCircuit.length} client(s) l'utilisent`)
      return
    }

    setConfirmDelete({ show: true, type: 'circuit', id })
  }

  const addDateDispo = () => {
    if (newDate && !newClient.dates_dispo.includes(newDate)) {
      setNewClient({
        ...newClient,
        dates_dispo: [...newClient.dates_dispo, newDate].sort()
      })
      setNewDate('')
    }
  }

  const removeDateDispo = (date) => {
    setNewClient({
      ...newClient,
      dates_dispo: newClient.dates_dispo.filter(d => d !== date)
    })
  }

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  // Filtrage
  const clientsActifs = clients.filter(c => !c.place)
  const clientsArchives = clients.filter(c => c.place)
  const displayedClients = view === 'actifs' ? clientsActifs : clientsArchives

  const filteredClients = displayedClients.filter(client => {
    const matchCircuit = !filterCircuit || client.circuit_id === parseInt(filterCircuit)
    const matchDate = !filterDate || (client.dates_dispo && client.dates_dispo.includes(filterDate))
    return matchCircuit && matchDate
  })

  const getStatutLabel = (statut) => {
    switch (statut) {
      case 'billets_achetes': return 'Billets achetés'
      case 'en_attente': return 'En attente achat'
      case 'paiement_sur_place': return 'Paiement sur place'
      default: return statut
    }
  }

  const getStatutColor = (statut) => {
    switch (statut) {
      case 'billets_achetes': return 'bg-green-100 text-green-700'
      case 'en_attente': return 'bg-orange-100 text-orange-700'
      case 'paiement_sur_place': return 'bg-blue-100 text-blue-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-4">
      {/* Popup de confirmation de suppression */}
      {confirmDelete.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">⚠️ Confirmation</h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer ce {confirmDelete.type === 'client' ? 'client' : 'circuit'} ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmDeleteAction}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
              >
                Oui, supprimer
              </button>
              <button
                onClick={() => setConfirmDelete({ show: false, type: '', id: null })}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors font-semibold"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup formulaire d'ajout client */}
      {showAddClient && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => {
            setShowAddClient(false)
            setNewClient({
              prenom: '',
              nom: '',
              telephone: '',
              email: '',
              circuit_id: '',
              notes: '',
              dates_dispo: [],
              statut_paiement: 'en_attente',
              nombre_pax: '1'
            })
          }}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-2xl w-full shadow-2xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-gray-800 mb-4">🚁 Nouveau client en attente</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Prénom *</label>
                  <input
                    type="text"
                    value={newClient.prenom}
                    onChange={(e) => setNewClient({ ...newClient, prenom: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nom *</label>
                  <input
                    type="text"
                    value={newClient.nom}
                    onChange={(e) => setNewClient({ ...newClient, nom: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    value={newClient.telephone}
                    onChange={(e) => setNewClient({ ...newClient, telephone: e.target.value })}
                    placeholder="06 12 34 56 78"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    placeholder="exemple@email.com"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Circuit *</label>
                  <select
                    value={newClient.circuit_id}
                    onChange={(e) => setNewClient({ ...newClient, circuit_id: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Sélectionner un circuit</option>
                    {circuits.map(circuit => (
                      <option key={circuit.id} value={circuit.id}>
                        {circuit.nom} ({circuit.duree_minutes} min)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre de passagers</label>
                  <select
                    value={newClient.nombre_pax}
                    onChange={(e) => setNewClient({ ...newClient, nombre_pax: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="1">1 passager</option>
                    <option value="2">2 passagers</option>
                    <option value="3">3 passagers</option>
                    <option value="4">4 passagers</option>
                    <option value="5">5 passagers</option>
                    <option value="6">6 passagers</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Statut paiement</label>
                  <select
                    value={newClient.statut_paiement}
                    onChange={(e) => setNewClient({ ...newClient, statut_paiement: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="en_attente">En attente achat</option>
                    <option value="billets_achetes">Billets achetés</option>
                    <option value="paiement_sur_place">Paiement sur place</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={newClient.notes}
                  onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                  placeholder="Notes ou informations complémentaires..."
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  rows="2"
                />
              </div>

              {/* Dates de disponibilité */}
              <div>
                <label className="block text-sm font-medium mb-1">Dates de disponibilité</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                  <Button onClick={addDateDispo} variant="ghost">+ Ajouter</Button>
                </div>
                {newClient.dates_dispo.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {newClient.dates_dispo.map(date => (
                      <span
                        key={date}
                        className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-2"
                      >
                        📅 {new Date(date).toLocaleDateString('fr-FR')}
                        <button
                          onClick={() => removeDateDispo(date)}
                          className="text-red-500 hover:text-red-700 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <Button onClick={addClient} className="flex-1">Ajouter le client</Button>
                <Button variant="ghost" onClick={() => {
                  setShowAddClient(false)
                  setNewClient({
                    prenom: '',
                    nom: '',
                    telephone: '',
                    email: '',
                    circuit_id: '',
                    notes: '',
                    dates_dispo: [],
                    statut_paiement: 'en_attente',
                    nombre_pax: '1'
                  })
                }}>
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup d'édition client */}
      {editingClient && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setEditingClient(null)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-2xl w-full shadow-2xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-gray-800 mb-4">✏️ Modifier le client</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Prénom *</label>
                  <input
                    type="text"
                    value={editingClient.prenom}
                    onChange={(e) => setEditingClient({ ...editingClient, prenom: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nom *</label>
                  <input
                    type="text"
                    value={editingClient.nom}
                    onChange={(e) => setEditingClient({ ...editingClient, nom: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Téléphone *</label>
                  <input
                    type="tel"
                    value={editingClient.telephone}
                    onChange={(e) => setEditingClient({ ...editingClient, telephone: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={editingClient.email || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Circuit *</label>
                  <select
                    value={editingClient.circuit_id}
                    onChange={(e) => setEditingClient({ ...editingClient, circuit_id: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Sélectionner</option>
                    {circuits.map(circuit => (
                      <option key={circuit.id} value={circuit.id}>
                        {circuit.nom} ({circuit.duree_minutes} min)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Passagers</label>
                  <select
                    value={editingClient.nombre_pax}
                    onChange={(e) => setEditingClient({ ...editingClient, nombre_pax: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <option key={n} value={n}>{n} passager{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Statut</label>
                  <select
                    value={editingClient.statut_paiement}
                    onChange={(e) => setEditingClient({ ...editingClient, statut_paiement: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="en_attente">En attente</option>
                    <option value="billets_achetes">Billets achetés</option>
                    <option value="paiement_sur_place">Paiement sur place</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={editingClient.notes || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, notes: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  rows="2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Dates de disponibilité</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="date"
                    id="editDateInput"
                    className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                  <Button onClick={() => {
                    const dateInput = document.getElementById('editDateInput')
                    if (dateInput.value) {
                      addDateDispoEdit(dateInput.value)
                      dateInput.value = ''
                    }
                  }} variant="ghost">+ Ajouter</Button>
                </div>
                {editingClient.dates_dispo && editingClient.dates_dispo.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {editingClient.dates_dispo.map(date => (
                      <span
                        key={date}
                        className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-2"
                      >
                        📅 {new Date(date).toLocaleDateString('fr-FR')}
                        <button
                          onClick={() => removeDateDispoEdit(date)}
                          className="text-red-500 hover:text-red-700 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <Button onClick={saveEditClient} className="flex-1">Enregistrer</Button>
                <Button variant="ghost" onClick={() => setEditingClient(null)}>Annuler</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button onClick={() => setShowAddClient(true)}>
            + Créer client
          </Button>
          <Button 
            onClick={() => setShowGestionCircuits(!showGestionCircuits)} 
            variant="ghost"
            className="text-sm"
          >
            ⚙️ Gérer circuits
          </Button>
        </div>
      </div>

      {/* Gestion des circuits */}
      {showGestionCircuits && (
        <Card className="border-2 border-purple-200">
          <CardContent className="pt-6">
            <h4 className="font-semibold mb-3">Gestion des circuits</h4>
            
            {/* Ajouter un circuit */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <input
                type="text"
                value={newCircuit.nom}
                onChange={(e) => setNewCircuit({ ...newCircuit, nom: e.target.value })}
                placeholder="Nom du circuit"
                className="p-2 border rounded-lg"
              />
              <input
                type="number"
                value={newCircuit.duree_minutes}
                onChange={(e) => setNewCircuit({ ...newCircuit, duree_minutes: e.target.value })}
                placeholder="Durée (minutes)"
                className="p-2 border rounded-lg"
              />
              <Button onClick={addCircuit}>+ Ajouter circuit</Button>
            </div>

            {/* Liste des circuits */}
            <div className="space-y-2">
              {circuits.map(circuit => (
                <div key={circuit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-semibold">{circuit.nom}</span>
                    <span className="ml-3 text-sm text-gray-600">({circuit.duree_minutes} min)</span>
                  </div>
                  <button
                    onClick={() => deleteCircuit(circuit.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Onglets Actifs / Archives */}
      <div className="flex gap-2 border-b-2 border-gray-200">
        <button
          onClick={() => setView('actifs')}
          className={`px-6 py-3 font-semibold transition-all border-b-4 ${
            view === 'actifs'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          En attente
          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-bold">
            {clientsActifs.length}
          </span>
        </button>
        <button
          onClick={() => setView('archives')}
          className={`px-6 py-3 font-semibold transition-all border-b-4 ${
            view === 'archives'
              ? 'border-gray-500 text-gray-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Placés
          <span className="ml-2 px-2 py-1 bg-gray-200 text-gray-600 rounded-full text-xs font-bold">
            {clientsArchives.length}
          </span>
        </button>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="min-w-[200px]">
              <select
                value={filterCircuit}
                onChange={(e) => setFilterCircuit(e.target.value)}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">Tous les circuits</option>
                {circuits.map(circuit => (
                  <option key={circuit.id} value={circuit.id}>
                    {circuit.nom}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[200px]">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                placeholder="Filtrer par date dispo"
                className="w-full p-2 border rounded-lg"
              />
            </div>
            {(filterCircuit || filterDate) && (
              <Button
                onClick={() => {
                  setFilterCircuit('')
                  setFilterDate('')
                }}
                variant="ghost"
              >
                Réinitialiser
              </Button>
            )}
          </div>

          {/* Tableau */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-center">
                    {view === 'actifs' ? '✓' : ''}
                  </th>
                  <th className="p-2 text-left">Nom</th>
                  <th className="p-2 text-left">Circuit</th>
                  <th className="p-2 text-center">PAX</th>
                  <th className="p-2 text-left">Statut paiement</th>
                  <th className="p-2 text-left">Dates dispo</th>
                  <th className="p-2 text-left">Notes</th>
                  <th className="p-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-12 text-gray-400">
                      🚁 {view === 'actifs' ? 'Aucun client en attente' : 'Aucun client placé'}
                    </td>
                  </tr>
                ) : (
                  filteredClients.map(client => (
                    <tr 
                      key={client.id} 
                      className={`border-b hover:bg-gray-50 cursor-pointer ${client.place ? 'bg-green-50' : ''}`}
                      onClick={() => startEditClient(client)}
                    >
                      <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={client.place}
                          onChange={() => togglePlace(client.id, client.place)}
                          className="w-5 h-5 cursor-pointer"
                        />
                      </td>
                      <td className="p-2 font-medium">
                        {client.prenom} {client.nom}
                      </td>
                      <td className="p-2">
                        {client.circuit ? (
                          <span className="text-blue-600">
                            {client.circuit.nom}
                            <span className="text-xs text-gray-500 ml-1">
                              ({client.circuit.duree_minutes} min)
                            </span>
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                          👥 {client.nombre_pax || 1}
                        </span>
                      </td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatutColor(client.statut_paiement)}`}>
                          {getStatutLabel(client.statut_paiement)}
                        </span>
                      </td>
                      <td className="p-2">
                        {client.dates_dispo && client.dates_dispo.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {client.dates_dispo.map(date => (
                              <span key={date} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                {new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Aucune date</span>
                        )}
                      </td>
                      <td className="p-2 text-gray-600 text-xs max-w-xs truncate">
                        {client.notes || '-'}
                      </td>
                      <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => deleteClient(client.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}