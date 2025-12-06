import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Plane, MapPin, Clock, Calendar, Trash2, Filter, BarChart3 } from 'lucide-react'
import StatsModal from './StatsModal'

export default function FlightLogModule({ userId, userRole }) {
  const [dropZones, setDropZones] = useState([])
  const [flights, setFlights] = useState([])
  const [allFlights, setAllFlights] = useState([]) // Tous les vols pour filtrage
  const [currentFlight, setCurrentFlight] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Modale statistiques
  const [showStatsModal, setShowStatsModal] = useState(false)
  
  // Filtres
  const [pilots, setPilots] = useState([])
  const [selectedPilot, setSelectedPilot] = useState('all')
  const [selectedDate, setSelectedDate] = useState('')
  
  // État pour le formulaire de décollage/atterrissage
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDZ, setSelectedDZ] = useState(null)
  const [showDZList, setShowDZList] = useState(false)
  const [dzManagementOpen, setDzManagementOpen] = useState(false)

  // État pour l'édition d'un vol
  const [editingFlight, setEditingFlight] = useState(null)
  const [editDepartureDZ, setEditDepartureDZ] = useState(null)
  const [editArrivalDZ, setEditArrivalDZ] = useState(null)
  const [editSearchDeparture, setEditSearchDeparture] = useState('')
  const [editSearchArrival, setEditSearchArrival] = useState('')

  // État pour le CRUD Drop Zones
  const [newDropZone, setNewDropZone] = useState({ 
    name: '', 
    latitude: '', 
    longitude: '', 
    notes: '',
    region: 'corse' // Valeur par défaut
  })
  const [editingDropZone, setEditingDropZone] = useState(null)
  const [filterCountry, setFilterCountry] = useState('all') // 'all', 'corse', 'france', 'italie', 'sardaigne'

  useEffect(() => {
    loadData()
  }, [])

  // Filtrer les vols quand les filtres changent
  useEffect(() => {
    filterFlights()
  }, [selectedPilot, selectedDate, allFlights])

  const loadData = async () => {
    await Promise.all([
      loadDropZones(),
      loadFlights(),
      loadCurrentFlight(),
      loadPilots()
    ])
    setLoading(false)
  }

  const loadPilots = async () => {
    if (userRole === 'agent_sol') {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('role', 'pilote')
        .order('username')

      if (data) {
        setPilots(data)
      }
    }
  }

  const loadDropZones = async () => {
    const { data, error } = await supabase
      .from('drop_zones')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (data) {
      setDropZones(data)
    } else {
      console.error('Erreur chargement DZ:', error)
    }
  }

  const loadFlights = async () => {
    let query = supabase
      .from('flight_logs')
      .select(`
        *,
        departure_dz:drop_zones!flight_logs_departure_dz_id_fkey(name),
        arrival_dz:drop_zones!flight_logs_arrival_dz_id_fkey(name),
        pilot:profiles!flight_logs_pilot_id_fkey(username)
      `)
      .order('departure_time', { ascending: false })
      .limit(50)

    // Si pilote, voir uniquement ses vols
    if (userRole === 'pilote') {
      query = query.eq('pilot_id', userId)
    }

    const { data, error } = await query

    if (data) {
      setAllFlights(data)
      setFlights(data)
    } else {
      console.error('Erreur chargement vols:', error)
    }
  }

  const loadCurrentFlight = async () => {
    const { data, error } = await supabase
      .from('flight_logs')
      .select(`
        *,
        departure_dz:drop_zones!flight_logs_departure_dz_id_fkey(name)
      `)
      .eq('pilot_id', userId)
      .eq('in_progress', true)
      .single()

    if (data) {
      setCurrentFlight(data)
    }
  }

  const filterFlights = () => {
    let filtered = [...allFlights]

    // Filtrer par pilote (agents seulement)
    if (userRole === 'agent_sol' && selectedPilot !== 'all') {
      filtered = filtered.filter(f => f.pilot_id === selectedPilot)
    }

    // Filtrer par date
    if (selectedDate) {
      filtered = filtered.filter(f => {
        const flightDate = new Date(f.departure_time).toISOString().split('T')[0]
        return flightDate === selectedDate
      })
    }

    setFlights(filtered)
  }

  const resetFilters = () => {
    setSelectedPilot('all')
    setSelectedDate('')
  }

  const handleTakeoff = async () => {
    const flightData = {
      pilot_id: userId,
      departure_time: new Date().toISOString(),
      in_progress: true
    }

    // Ajouter les données de la DZ si sélectionnée
    if (selectedDZ) {
      flightData.departure_dz_id = selectedDZ.id
      flightData.departure_location = selectedDZ.name
      flightData.departure_lat = selectedDZ.latitude
      flightData.departure_lng = selectedDZ.longitude
    }

    const { data, error } = await supabase
      .from('flight_logs')
      .insert([flightData])
      .select()
      .single()

    if (data) {
      setCurrentFlight(data)
      setSelectedDZ(null)
      setSearchTerm('')
      loadFlights()
      const location = selectedDZ ? `depuis ${selectedDZ.name}` : '(lieu à préciser)'
      alert(`✅ Décollage enregistré ${location}`)
    } else {
      console.error('Erreur décollage:', error)
      alert('❌ Erreur lors de l\'enregistrement du décollage')
    }
  }

  const handleLanding = async () => {
    if (!currentFlight) {
      alert('Aucun vol en cours')
      return
    }

    const updateData = {
      arrival_time: new Date().toISOString(),
      in_progress: false
    }

    // Ajouter les données de la DZ si sélectionnée
    if (selectedDZ) {
      updateData.arrival_dz_id = selectedDZ.id
      updateData.arrival_location = selectedDZ.name
      updateData.arrival_lat = selectedDZ.latitude
      updateData.arrival_lng = selectedDZ.longitude
    }

    const { error } = await supabase
      .from('flight_logs')
      .update(updateData)
      .eq('id', currentFlight.id)

    if (!error) {
      const duration = Math.round((new Date() - new Date(currentFlight.departure_time)) / 60000)
      const location = selectedDZ ? `à ${selectedDZ.name}` : '(lieu à préciser)'
      setCurrentFlight(null)
      setSelectedDZ(null)
      setSearchTerm('')
      loadFlights()
      alert(`✅ Atterrissage enregistré ${location}\nDurée du vol : ${duration} minutes`)
    } else {
      console.error('Erreur atterrissage:', error)
      alert('❌ Erreur lors de l\'enregistrement de l\'atterrissage')
    }
  }

  const filteredDZ = dropZones.filter(dz =>
    dz.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (dz.short_code && dz.short_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (dz.oaci_code && dz.oaci_code.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const formatDuration = (departure, arrival) => {
    if (!arrival) return '-'
    const diff = new Date(arrival) - new Date(departure)
    const minutes = Math.round(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`
  }

  const getPilotInitials = (username) => {
    if (!username) return '?'
    return username
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  const handleResetAllData = async () => {
    // Supprimer tous les vols
    const { error } = await supabase
      .from('flight_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Supprime tout

    if (!error) {
      alert('✅ Toutes les données ont été réinitialisées')
      setShowStatsModal(false)
      loadData()
    } else {
      console.error('Erreur réinitialisation:', error)
      alert('❌ Erreur lors de la réinitialisation')
    }
  }

  const handleEditFlight = (flight) => {
    setEditingFlight(flight)
    setEditDepartureDZ(flight.departure_dz_id ? { 
      id: flight.departure_dz_id, 
      name: flight.departure_dz?.name || flight.departure_location 
    } : null)
    setEditArrivalDZ(flight.arrival_dz_id ? { 
      id: flight.arrival_dz_id, 
      name: flight.arrival_dz?.name || flight.arrival_location 
    } : null)
  }

  const handleSaveEditFlight = async () => {
    if (!editingFlight) return

    const updateData = {}

    if (editDepartureDZ) {
      updateData.departure_dz_id = editDepartureDZ.id
      updateData.departure_location = editDepartureDZ.name
      updateData.departure_lat = editDepartureDZ.latitude
      updateData.departure_lng = editDepartureDZ.longitude
    }

    if (editArrivalDZ) {
      updateData.arrival_dz_id = editArrivalDZ.id
      updateData.arrival_location = editArrivalDZ.name
      updateData.arrival_lat = editArrivalDZ.latitude
      updateData.arrival_lng = editArrivalDZ.longitude
    }

    const { error } = await supabase
      .from('flight_logs')
      .update(updateData)
      .eq('id', editingFlight.id)

    if (!error) {
      setEditingFlight(null)
      setEditDepartureDZ(null)
      setEditArrivalDZ(null)
      setEditSearchDeparture('')
      setEditSearchArrival('')
      loadFlights()
      alert('✅ Vol mis à jour')
    } else {
      console.error('Erreur mise à jour vol:', error)
      alert('❌ Erreur lors de la mise à jour')
    }
  }

  const handleDeleteFlight = async (flight) => {
    const departureLocation = flight.departure_dz?.name || flight.departure_location || 'Départ non précisé'
    const arrivalLocation = flight.arrival_dz?.name || flight.arrival_location || 'Arrivée non précisée'
    const flightDate = new Date(flight.departure_time).toLocaleDateString('fr-FR')
    
    const confirmMessage = `⚠️ Êtes-vous sûr de vouloir supprimer ce vol ?\n\n📍 ${departureLocation} → ${arrivalLocation}\n📅 ${flightDate}\n\nCette action est irréversible.`
    
    if (!confirm(confirmMessage)) return

    const { error } = await supabase
      .from('flight_logs')
      .delete()
      .eq('id', flight.id)

    if (!error) {
      loadFlights()
      // Si c'était le vol en cours, le retirer aussi
      if (currentFlight?.id === flight.id) {
        setCurrentFlight(null)
      }
      alert('✅ Vol supprimé')
    } else {
      console.error('Erreur suppression vol:', error)
      alert('❌ Erreur lors de la suppression')
    }
  }

  // ========== CRUD DROP ZONES ==========
  
  const handleAddDropZone = async () => {
    if (!newDropZone.name || !newDropZone.latitude || !newDropZone.longitude) {
      alert('⚠️ Veuillez remplir tous les champs obligatoires (nom, latitude, longitude)')
      return
    }

    // Validation format coordonnées
    const lat = parseFloat(newDropZone.latitude)
    const lng = parseFloat(newDropZone.longitude)
    
    if (isNaN(lat) || isNaN(lng)) {
      alert('⚠️ Format de coordonnées invalide. Utilisez des nombres décimaux (ex: 41.36815)')
      return
    }

    const { data, error } = await supabase
      .from('drop_zones')
      .insert([{
        name: newDropZone.name,
        latitude: lat,
        longitude: lng,
        notes: newDropZone.notes || null,
        region: newDropZone.region,
        type: 'custom',
        created_by: userId,
        is_active: true
      }])
      .select()

    if (!error && data) {
      setDropZones([...dropZones, data[0]])
      setNewDropZone({ name: '', latitude: '', longitude: '', notes: '', region: 'corse' })
      alert('✅ Drop Zone ajoutée avec succès !')
    } else {
      console.error('Erreur ajout DZ:', error)
      alert('❌ Erreur lors de l\'ajout de la Drop Zone')
    }
  }

  const handleEditDropZone = (dz) => {
    setEditingDropZone({
      id: dz.id,
      name: dz.name,
      latitude: dz.latitude.toString(),
      longitude: dz.longitude.toString(),
      notes: dz.notes || '',
      region: dz.region || 'corse'
    })
  }

  const handleUpdateDropZone = async () => {
    if (!editingDropZone.name || !editingDropZone.latitude || !editingDropZone.longitude) {
      alert('⚠️ Veuillez remplir tous les champs obligatoires')
      return
    }

    const lat = parseFloat(editingDropZone.latitude)
    const lng = parseFloat(editingDropZone.longitude)
    
    if (isNaN(lat) || isNaN(lng)) {
      alert('⚠️ Format de coordonnées invalide')
      return
    }

    const { error } = await supabase
      .from('drop_zones')
      .update({
        name: editingDropZone.name,
        latitude: lat,
        longitude: lng,
        notes: editingDropZone.notes || null,
        region: editingDropZone.region
      })
      .eq('id', editingDropZone.id)

    if (!error) {
      setDropZones(dropZones.map(dz => 
        dz.id === editingDropZone.id 
          ? { ...dz, name: editingDropZone.name, latitude: lat, longitude: lng, notes: editingDropZone.notes, region: editingDropZone.region }
          : dz
      ))
      setEditingDropZone(null)
      setNewDropZone({ name: '', latitude: '', longitude: '', notes: '', region: 'corse' })
      alert('✅ Drop Zone mise à jour !')
    } else {
      console.error('Erreur update DZ:', error)
      alert('❌ Erreur lors de la mise à jour')
    }
  }

  const handleDeleteDropZone = async (id, name) => {
    if (!confirm(`⚠️ Êtes-vous sûr de vouloir supprimer la Drop Zone "${name}" ?\n\nCette action est irréversible.`)) {
      return
    }

    const { error } = await supabase
      .from('drop_zones')
      .delete()
      .eq('id', id)

    if (!error) {
      setDropZones(dropZones.filter(dz => dz.id !== id))
      alert('✅ Drop Zone supprimée')
    } else {
      console.error('Erreur suppression DZ:', error)
      alert('❌ Erreur lors de la suppression')
    }
  }

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  // Interface différente pour agents au sol (stats seulement)
  if (userRole === 'agent_sol') {
    // Calculer les statistiques
    const calculateStats = () => {
      const filtered = flights.filter(f => !f.in_progress && f.arrival_time)
      
      const totalMinutes = filtered.reduce((sum, f) => {
        const diff = new Date(f.arrival_time) - new Date(f.departure_time)
        return sum + Math.round(diff / 60000)
      }, 0)
      
      const totalHours = Math.floor(totalMinutes / 60)
      const remainingMins = totalMinutes % 60
      
      return {
        totalFlights: filtered.length,
        totalMinutes,
        totalHours,
        remainingMins,
        formattedTime: `${totalHours}h ${remainingMins}min`
      }
    }

    const stats = calculateStats()

    return (
      <div className="space-y-6">
        {/* Statistiques globales */}
        {(selectedPilot !== 'all' || selectedDate) && (
          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
                📊 Statistiques
                {selectedPilot !== 'all' && (
                  <span className="text-xs sm:text-sm font-normal">
                    - {pilots.find(p => p.id === selectedPilot)?.username}
                  </span>
                )}
                {selectedDate && (
                  <span className="text-xs sm:text-sm font-normal">
                    - {new Date(selectedDate).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-3 sm:p-4 rounded-lg border border-green-200">
                  <div className="text-xs sm:text-sm text-gray-600 mb-1">Nombre de vols</div>
                  <div className="text-2xl sm:text-3xl font-bold text-green-600">{stats.totalFlights}</div>
                </div>
                <div className="bg-white p-3 sm:p-4 rounded-lg border border-green-200">
                  <div className="text-xs sm:text-sm text-gray-600 mb-1">Temps total</div>
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.formattedTime}</div>
                </div>
                <div className="bg-white p-3 sm:p-4 rounded-lg border border-green-200">
                  <div className="text-xs sm:text-sm text-gray-600 mb-1">Heures de vol</div>
                  <div className="text-2xl sm:text-3xl font-bold text-purple-600">{stats.totalHours}h</div>
                </div>
                <div className="bg-white p-3 sm:p-4 rounded-lg border border-green-200">
                  <div className="text-xs sm:text-sm text-gray-600 mb-1">Minutes totales</div>
                  <div className="text-2xl sm:text-3xl font-bold text-orange-600">{stats.totalMinutes}</div>
                </div>
              </div>
              
              {stats.totalFlights > 0 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-xs sm:text-sm text-gray-600">
                    💡 Moyenne par vol : {Math.round(stats.totalMinutes / stats.totalFlights)} minutes
                  </div>
                  <Button
                    onClick={() => setShowStatsModal(true)}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-sm"
                  >
                    <BarChart3 size={16} className="mr-2" />
                    📊 Voir les graphiques
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Filtres pour agents */}
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter size={20} className="text-blue-600" />
              <h3 className="font-semibold text-base sm:text-lg">Filtres</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-2">Pilote</label>
                <select
                  value={selectedPilot}
                  onChange={(e) => setSelectedPilot(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm"
                >
                  <option value="all">Tous les pilotes</option>
                  {pilots.map(pilot => (
                    <option key={pilot.id} value={pilot.id}>
                      {pilot.username}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-2">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={resetFilters}
                  variant="outline"
                  className="w-full text-sm"
                >
                  Réinitialiser
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bouton permanent pour voir les graphiques */}
        {allFlights.filter(f => !f.in_progress && f.arrival_time).length > 0 && (
          <div className="flex justify-center">
            <Button
              onClick={() => setShowStatsModal(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-base px-8 py-6"
            >
              <BarChart3 size={20} className="mr-2" />
              📊 Voir les statistiques et graphiques détaillés
            </Button>
          </div>
        )}

        {/* Historique complet pour agents */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-xl">
              📋 Tous les vols enregistrés
              <span className="text-xs sm:text-sm font-normal text-gray-500 ml-3">
                ({flights.length} vol{flights.length > 1 ? 's' : ''})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {flights.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                Aucun vol trouvé
              </div>
            ) : (
              <div className="space-y-3">
                {flights.map(flight => (
                  <div
                    key={flight.id}
                    className="p-3 sm:p-4 border rounded-lg bg-white hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {/* Pastille pilote */}
                          <div className="flex items-center gap-2 px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {getPilotInitials(flight.pilot?.username)}
                            </div>
                            <span className="hidden sm:inline">{flight.pilot?.username || 'Pilote inconnu'}</span>
                          </div>
                          {flight.in_progress && (
                            <span className="px-2 sm:px-3 py-1 bg-orange-500 text-white rounded-full text-xs font-semibold">
                              En cours
                            </span>
                          )}
                        </div>
                        <div className="font-semibold text-sm sm:text-lg mb-1">
                          {flight.departure_dz?.name || flight.departure_location || '📍 Départ non précisé'}
                          {flight.arrival_dz?.name ? (
                            <> → {flight.arrival_dz.name}</>
                          ) : flight.arrival_location ? (
                            <> → {flight.arrival_location}</>
                          ) : !flight.in_progress ? (
                            <> → 📍 Arrivée non précisée</>
                          ) : null}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} />
                            {new Date(flight.departure_time).toLocaleDateString('fr-FR')}
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock size={14} />
                            {new Date(flight.departure_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            {flight.arrival_time && (
                              <> → {new Date(flight.arrival_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {!flight.in_progress && (
                          <div className="text-base sm:text-lg font-bold text-green-600">
                            {formatDuration(flight.departure_time, flight.arrival_time)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 📊 MODALE STATISTIQUES */}
        <StatsModal
          isOpen={showStatsModal}
          onClose={() => setShowStatsModal(false)}
          allFlights={allFlights}
          pilots={pilots}
          userRole={userRole}
          onResetData={handleResetAllData}
        />
      </div>
    )
  }

  // Interface pilote (complète avec boutons action)
  return (
    <div className="space-y-6">
      {/* 1️⃣ VOL EN COURS (si actif) */}
      {currentFlight && (
        <Card className="border-orange-500 border-2 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-900 flex items-center gap-2 text-base sm:text-xl">
              <Plane className="animate-bounce" />
              Vol en cours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm sm:text-base">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-orange-600" />
                <span className="font-semibold">Départ :</span>
                <span>{currentFlight.departure_dz?.name || currentFlight.departure_location || '📍 À préciser'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-orange-600" />
                <span className="font-semibold">Heure décollage :</span>
                <span>{new Date(currentFlight.departure_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="text-xs sm:text-sm text-gray-600 mt-3">
                ⏱️ Durée actuelle : {Math.round((new Date() - new Date(currentFlight.departure_time)) / 60000)} minutes
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2️⃣ BOUTONS PRINCIPAUX */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Recherche Drop Zone */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                {currentFlight ? '📍 Drop Zone d\'arrivée (optionnel)' : '📍 Drop Zone de départ (optionnel)'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setShowDZList(e.target.value.length >= 2)
                  }}
                  onFocus={() => searchTerm.length >= 2 && setShowDZList(true)}
                  placeholder="Tapez 2-3 lettres..."
                  className="w-full p-2 sm:p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                />
                
                {/* Liste suggestions */}
                {showDZList && filteredDZ.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredDZ.slice(0, 5).map(dz => (
                      <button
                        key={dz.id}
                        onClick={() => {
                          setSelectedDZ(dz)
                          setSearchTerm(dz.name)
                          setShowDZList(false)
                        }}
                        className="w-full text-left p-2 sm:p-3 hover:bg-blue-50 border-b last:border-b-0"
                      >
                        <div className="font-semibold text-sm sm:text-base">{dz.name}</div>
                        {dz.oaci_code && (
                          <div className="text-xs text-gray-500">{dz.oaci_code}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {selectedDZ && (
                <div className="mt-2 p-2 sm:p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-green-700 font-semibold text-xs sm:text-sm">✅ Sélectionné :</span>
                    <strong className="text-sm sm:text-base">{selectedDZ.name}</strong>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 font-mono bg-white px-2 py-1 rounded border border-green-200 inline-block">
                    📍 {selectedDZ.latitude}, {selectedDZ.longitude}
                  </div>
                </div>
              )}
            </div>

            {/* Boutons action */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!currentFlight ? (
                <Button
                  onClick={handleTakeoff}
                  className="w-full py-6 sm:py-8 text-lg sm:text-xl bg-green-500 hover:bg-green-600"
                >
                  🛫 DÉCOLLAGE
                </Button>
              ) : (
                <Button
                  onClick={handleLanding}
                  className="w-full py-6 sm:py-8 text-lg sm:text-xl bg-red-500 hover:bg-red-600"
                >
                  🛬 ATTERRISSAGE
                </Button>
              )}
              
              <Button
                onClick={() => setDzManagementOpen(!dzManagementOpen)}
                variant="outline"
                className="w-full py-6 sm:py-8 text-lg sm:text-xl"
              >
                📍 Gérer Drop Zones
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3️⃣ HISTORIQUE DES VOLS */}
      
      {/* Filtre par date pour pilotes */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <Filter size={20} className="text-blue-600" />
            <div className="flex-1 w-full">
              <label className="block text-xs sm:text-sm font-medium mb-2">Filtrer par date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm"
              />
            </div>
            {selectedDate && (
              <Button
                onClick={resetFilters}
                variant="outline"
                className="mt-0 sm:mt-6 w-full sm:w-auto text-sm"
              >
                Réinitialiser
              </Button>
            )}
          </div>
          
          {/* Stats du jour si date sélectionnée */}
          {selectedDate && flights.length > 0 && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-3">
                <div className="bg-white p-2 sm:p-3 rounded-lg border border-blue-200">
                  <div className="text-[10px] sm:text-xs text-gray-600 mb-1">Vols</div>
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">
                    {flights.filter(f => !f.in_progress && f.arrival_time).length}
                  </div>
                </div>
                <div className="bg-white p-2 sm:p-3 rounded-lg border border-blue-200">
                  <div className="text-[10px] sm:text-xs text-gray-600 mb-1">Minutes</div>
                  <div className="text-xl sm:text-2xl font-bold text-orange-600">
                    {flights.filter(f => !f.in_progress && f.arrival_time).reduce((sum, f) => {
                      const diff = new Date(f.arrival_time) - new Date(f.departure_time)
                      return sum + Math.round(diff / 60000)
                    }, 0)}
                  </div>
                </div>
                <div className="bg-white p-2 sm:p-3 rounded-lg border border-blue-200">
                  <div className="text-[10px] sm:text-xs text-gray-600 mb-1">Heures</div>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    {Math.floor(flights.filter(f => !f.in_progress && f.arrival_time).reduce((sum, f) => {
                      const diff = new Date(f.arrival_time) - new Date(f.departure_time)
                      return sum + Math.round(diff / 60000)
                    }, 0) / 60)}h
                  </div>
                </div>
              </div>
              <Button
                onClick={() => setShowStatsModal(true)}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-sm"
              >
                <BarChart3 size={16} className="mr-2" />
                📊 Voir les graphiques détaillés
              </Button>
            </div>
          )}
          
          {/* Bouton graphiques si pas de date sélectionnée mais qu'il y a des vols */}
          {!selectedDate && allFlights.filter(f => !f.in_progress && f.arrival_time).length > 0 && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <Button
                onClick={() => setShowStatsModal(true)}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-sm"
              >
                <BarChart3 size={16} className="mr-2" />
                📊 Voir les statistiques et graphiques
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-xl">
            📋 Historique des vols (cliquez pour modifier)
            <span className="text-xs sm:text-sm font-normal text-gray-500 ml-3">
              ({flights.length} vol{flights.length > 1 ? 's' : ''})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {flights.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              Aucun vol enregistré
            </div>
          ) : (
            <div className="space-y-3">
              {flights.map(flight => (
                <div
                  key={flight.id}
                  className={`p-3 sm:p-4 border rounded-lg ${
                    flight.in_progress 
                      ? 'bg-orange-50 border-orange-200' 
                      : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md transition-all'
                  }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => userRole === 'pilote' && !flight.in_progress && handleEditFlight(flight)}
                    >
                      <div className="font-semibold text-sm sm:text-lg mb-1">
                        {flight.departure_dz?.name || flight.departure_location || '📍 Départ à préciser'}
                        {flight.arrival_dz?.name ? (
                          <> → {flight.arrival_dz.name}</>
                        ) : flight.arrival_location ? (
                          <> → {flight.arrival_location}</>
                        ) : !flight.in_progress ? (
                          <> → 📍 Arrivée à préciser</>
                        ) : null}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} />
                          {new Date(flight.departure_time).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={14} />
                          {new Date(flight.departure_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          {flight.arrival_time && (
                            <> → {new Date(flight.arrival_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        {flight.in_progress ? (
                          <span className="px-2 sm:px-3 py-1 bg-orange-500 text-white rounded-full text-xs sm:text-sm font-semibold">
                            En cours
                          </span>
                        ) : (
                          <div className="text-base sm:text-lg font-bold text-green-600">
                            {formatDuration(flight.departure_time, flight.arrival_time)}
                          </div>
                        )}
                      </div>
                      
                      {/* Bouton suppression */}
                      {userRole === 'pilote' && !flight.in_progress && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteFlight(flight)
                          }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors"
                          title="Supprimer ce vol"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4️⃣ STATISTIQUES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-xs sm:text-sm text-blue-600 mb-1">Vols ce mois-ci</div>
            <div className="text-2xl sm:text-3xl font-bold text-blue-900">
              {flights.filter(f => !f.in_progress && new Date(f.departure_time).getMonth() === new Date().getMonth()).length}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-xs sm:text-sm text-green-600 mb-1">Heures de vol</div>
            <div className="text-2xl sm:text-3xl font-bold text-green-900">
              {Math.round(flights.filter(f => !f.in_progress).reduce((sum, f) => {
                if (f.arrival_time) {
                  const diff = new Date(f.arrival_time) - new Date(f.departure_time)
                  return sum + (diff / 3600000)
                }
                return sum
              }, 0))}h
            </div>
          </CardContent>
        </Card>
        
        <Card className={currentFlight ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}>
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Statut</div>
            <div className="text-lg sm:text-xl font-bold">
              {currentFlight ? (
                <span className="text-orange-600">🔴 En vol</span>
              ) : (
                <span className="text-gray-600">⚪ Au sol</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal Gestion Drop Zones */}
      {dzManagementOpen && (
        <div 
          className="fixed inset-0 bg-white/95 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => {
            setDzManagementOpen(false)
            setNewDropZone({ name: '', latitude: '', longitude: '', notes: '', region: 'corse' })
            setEditingDropZone(null)
          }}
        >
          <Card 
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="text-base sm:text-xl">📍 Gestion des Drop Zones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Formulaire d'ajout/édition */}
                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border-2 border-blue-200">
                  <h3 className="font-semibold text-base sm:text-lg mb-3">
                    {editingDropZone ? '✏️ Modifier la Drop Zone' : '➕ Ajouter une Drop Zone'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Nom *
                      </label>
                      <input
                        type="text"
                        value={editingDropZone ? editingDropZone.name : newDropZone.name}
                        onChange={(e) => {
                          if (editingDropZone) {
                            setEditingDropZone({ ...editingDropZone, name: e.target.value })
                          } else {
                            setNewDropZone({ ...newDropZone, name: e.target.value })
                          }
                        }}
                        placeholder="Ex: Aéroport Ajaccio"
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Latitude * (format: 41.36815)
                      </label>
                      <input
                        type="text"
                        value={editingDropZone ? editingDropZone.latitude : newDropZone.latitude}
                        onChange={(e) => {
                          if (editingDropZone) {
                            setEditingDropZone({ ...editingDropZone, latitude: e.target.value })
                          } else {
                            setNewDropZone({ ...newDropZone, latitude: e.target.value })
                          }
                        }}
                        placeholder="Ex: 41.36815"
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Longitude * (format: 9.260047)
                      </label>
                      <input
                        type="text"
                        value={editingDropZone ? editingDropZone.longitude : newDropZone.longitude}
                        onChange={(e) => {
                          if (editingDropZone) {
                            setEditingDropZone({ ...editingDropZone, longitude: e.target.value })
                          } else {
                            setNewDropZone({ ...newDropZone, longitude: e.target.value })
                          }
                        }}
                        placeholder="Ex: 9.260047"
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Région * (pour le tri)
                      </label>
                      <select
                        value={editingDropZone ? editingDropZone.region : newDropZone.region}
                        onChange={(e) => {
                          if (editingDropZone) {
                            setEditingDropZone({ ...editingDropZone, region: e.target.value })
                          } else {
                            setNewDropZone({ ...newDropZone, region: e.target.value })
                          }
                        }}
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                      >
                        <option value="corse">🇫🇷 Corse</option>
                        <option value="france">🇫🇷 France continentale</option>
                        <option value="italie">🇮🇹 Italie</option>
                        <option value="sardaigne">🇮🇹 Sardaigne</option>
                      </select>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Notes (optionnel)
                      </label>
                      <input
                        type="text"
                        value={editingDropZone ? editingDropZone.notes || '' : newDropZone.notes}
                        onChange={(e) => {
                          if (editingDropZone) {
                            setEditingDropZone({ ...editingDropZone, notes: e.target.value })
                          } else {
                            setNewDropZone({ ...newDropZone, notes: e.target.value })
                          }
                        }}
                        placeholder="Ex: Base principale"
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    {editingDropZone ? (
                      <>
                        <Button
                          onClick={handleUpdateDropZone}
                          className="bg-green-500 hover:bg-green-600 text-sm"
                        >
                          ✅ Enregistrer
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingDropZone(null)
                            setNewDropZone({ name: '', latitude: '', longitude: '', notes: '', region: 'corse' })
                          }}
                          variant="outline"
                          className="text-sm"
                        >
                          Annuler
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={handleAddDropZone}
                        className="bg-blue-500 hover:bg-blue-600 text-sm"
                      >
                        ➕ Ajouter
                      </Button>
                    )}
                  </div>
                </div>

                {/* Liste des Drop Zones */}
                <div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                    <h3 className="font-semibold text-base sm:text-lg">
                      📋 Drop Zones existantes ({dropZones.filter(dz => {
                        if (filterCountry === 'all') return true
                        return dz.region === filterCountry
                      }).length})
                    </h3>
                    
                    {/* Filtre par pays */}
                    <select
                      value={filterCountry}
                      onChange={(e) => setFilterCountry(e.target.value)}
                      className="px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 text-sm w-full sm:w-auto"
                    >
                      <option value="all">🌍 Toutes les zones</option>
                      <option value="corse">🇫🇷 Corse</option>
                      <option value="france">🇫🇷 France continentale</option>
                      <option value="italie">🇮🇹 Italie</option>
                      <option value="sardaigne">🇮🇹 Sardaigne</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {dropZones.filter(dz => {
                      if (filterCountry === 'all') return true
                      return dz.region === filterCountry
                    }).length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        Aucune Drop Zone dans cette zone
                      </div>
                    ) : (
                      dropZones.filter(dz => {
                        if (filterCountry === 'all') return true
                        return dz.region === filterCountry
                      }).map(dz => (
                        <div 
                          key={dz.id} 
                          className="p-2 sm:p-3 border rounded-lg hover:bg-gray-50 flex justify-between items-start"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <div className="font-semibold text-sm sm:text-base">{dz.name}</div>
                              {dz.region && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  dz.region === 'corse' ? 'bg-blue-100 text-blue-700' :
                                  dz.region === 'france' ? 'bg-green-100 text-green-700' :
                                  dz.region === 'italie' ? 'bg-red-100 text-red-700' :
                                  dz.region === 'sardaigne' ? 'bg-purple-100 text-purple-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {dz.region === 'corse' ? '🇫🇷 Corse' :
                                   dz.region === 'france' ? '🇫🇷 France' :
                                   dz.region === 'italie' ? '🇮🇹 Italie' :
                                   dz.region === 'sardaigne' ? '🇮🇹 Sardaigne' : dz.region}
                                </span>
                              )}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600 mt-1 flex items-center gap-2">
                              <span className="font-mono bg-gray-100 px-2 py-1 rounded text-[10px] sm:text-xs">
                                📍 {dz.latitude}, {dz.longitude}
                              </span>
                            </div>
                            {dz.notes && (
                              <div className="text-xs text-gray-500 mt-1">
                                💬 {dz.notes}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex gap-2 ml-4 flex-shrink-0">
                            <button
                              onClick={() => handleEditDropZone(dz)}
                              className="text-blue-500 hover:text-blue-700 px-2 py-1 text-sm"
                              title="Modifier"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteDropZone(dz.id, dz.name)}
                              className="text-red-500 hover:text-red-700 px-2 py-1 text-sm"
                              title="Supprimer"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Bouton fermer */}
                <div className="flex justify-end pt-4 border-t">
                  <Button
                    onClick={() => {
                      setDzManagementOpen(false)
                      setNewDropZone({ name: '', latitude: '', longitude: '', notes: '', region: 'corse' })
                      setEditingDropZone(null)
                    }}
                    variant="outline"
                    className="text-sm"
                  >
                    Fermer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal édition d'un vol */}
      {editingFlight && (
        <div 
          className="fixed inset-0 bg-white/95 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => {
            setEditingFlight(null)
            setEditDepartureDZ(null)
            setEditArrivalDZ(null)
            setEditSearchDeparture('')
            setEditSearchArrival('')
          }}
        >
          <Card 
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="text-base sm:text-xl">✏️ Modifier le vol</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Drop Zone de départ */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    📍 Drop Zone de départ
                  </label>
                  <input
                    type="text"
                    value={editSearchDeparture}
                    onChange={(e) => setEditSearchDeparture(e.target.value)}
                    placeholder="Rechercher une DZ..."
                    className="w-full p-2 sm:p-3 border rounded-lg mb-2 text-sm"
                  />
                  {editSearchDeparture && (
                    <div className="border rounded-lg max-h-48 overflow-y-auto">
                      {dropZones
                        .filter(dz => dz.name.toLowerCase().includes(editSearchDeparture.toLowerCase()))
                        .slice(0, 5)
                        .map(dz => (
                          <button
                            key={dz.id}
                            onClick={() => {
                              setEditDepartureDZ(dz)
                              setEditSearchDeparture('')
                            }}
                            className="w-full text-left p-2 sm:p-3 hover:bg-blue-50 border-b text-sm"
                          >
                            {dz.name}
                          </button>
                        ))}
                    </div>
                  )}
                  {editDepartureDZ && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg text-sm">
                      ✅ {editDepartureDZ.name}
                    </div>
                  )}
                </div>

                {/* Drop Zone d'arrivée */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    📍 Drop Zone d'arrivée
                  </label>
                  <input
                    type="text"
                    value={editSearchArrival}
                    onChange={(e) => setEditSearchArrival(e.target.value)}
                    placeholder="Rechercher une DZ..."
                    className="w-full p-2 sm:p-3 border rounded-lg mb-2 text-sm"
                  />
                  {editSearchArrival && (
                    <div className="border rounded-lg max-h-48 overflow-y-auto">
                      {dropZones
                        .filter(dz => dz.name.toLowerCase().includes(editSearchArrival.toLowerCase()))
                        .slice(0, 5)
                        .map(dz => (
                          <button
                            key={dz.id}
                            onClick={() => {
                              setEditArrivalDZ(dz)
                              setEditSearchArrival('')
                            }}
                            className="w-full text-left p-2 sm:p-3 hover:bg-blue-50 border-b text-sm"
                          >
                            {dz.name}
                          </button>
                        ))}
                    </div>
                  )}
                  {editArrivalDZ && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg text-sm">
                      ✅ {editArrivalDZ.name}
                    </div>
                  )}
                </div>

                {/* Boutons */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveEditFlight}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-sm"
                  >
                    ✅ Enregistrer
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingFlight(null)
                      setEditDepartureDZ(null)
                      setEditArrivalDZ(null)
                      setEditSearchDeparture('')
                      setEditSearchArrival('')
                    }}
                    variant="outline"
                    className="flex-1 text-sm"
                  >
                    ✖️ Annuler
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}


      {/* 📊 MODALE STATISTIQUES */}
      <StatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        allFlights={allFlights}
        pilots={pilots}
        userRole={userRole}
        onResetData={handleResetAllData}
      />
    </div>
  )
}