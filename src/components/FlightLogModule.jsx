import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Plane, MapPin, Clock, Calendar, Trash2 } from 'lucide-react'

export default function FlightLogModule({ userId, userRole }) {
  const [dropZones, setDropZones] = useState([])
  const [flights, setFlights] = useState([])
  const [currentFlight, setCurrentFlight] = useState(null)
  const [loading, setLoading] = useState(true)
  
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

  const loadData = async () => {
    await Promise.all([
      loadDropZones(),
      loadFlights(),
      loadCurrentFlight()
    ])
    setLoading(false)
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
        arrival_dz:drop_zones!flight_logs_arrival_dz_id_fkey(name)
      `)
      .order('departure_time', { ascending: false })
      .limit(10)

    // Si pilote, voir uniquement ses vols
    if (userRole === 'pilote') {
      query = query.eq('pilot_id', userId)
    }

    const { data, error } = await query

    if (data) {
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
    return (
      <div className="space-y-6">
        <div className="text-center py-12 bg-blue-50 rounded-lg">
          <h3 className="text-xl font-semibold mb-2">📊 Statistiques FlightLog</h3>
          <p className="text-gray-600">Interface de statistiques en cours de développement</p>
          <p className="text-sm text-gray-500 mt-4">
            Vous pourrez consulter ici les récaps par pilote, par mois, par jour
          </p>
        </div>

        {/* Historique complet pour agents */}
        <Card>
          <CardHeader>
            <CardTitle>📋 Tous les vols enregistrés</CardTitle>
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
                    className="p-4 border rounded-lg bg-white"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold text-lg mb-1">
                          {flight.departure_dz?.name || flight.departure_location || '📍 Départ non précisé'}
                          {flight.arrival_dz?.name ? (
                            <> → {flight.arrival_dz.name}</>
                          ) : flight.arrival_location ? (
                            <> → {flight.arrival_location}</>
                          ) : !flight.in_progress ? (
                            <> → 📍 Arrivée non précisée</>
                          ) : null}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
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
                        {flight.in_progress ? (
                          <span className="px-3 py-1 bg-orange-500 text-white rounded-full text-sm font-semibold">
                            En cours
                          </span>
                        ) : (
                          <div className="text-lg font-bold text-green-600">
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
            <CardTitle className="text-orange-900 flex items-center gap-2">
              <Plane className="animate-bounce" />
              Vol en cours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
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
              <div className="text-sm text-gray-600 mt-3">
                ⏱️ Durée actuelle : {Math.round((new Date() - new Date(currentFlight.departure_time)) / 60000)} minutes
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2️⃣ BOUTONS PRINCIPAUX - EN PREMIER POUR MOBILE */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Recherche Drop Zone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                        className="w-full text-left p-3 hover:bg-blue-50 border-b last:border-b-0"
                      >
                        <div className="font-semibold">{dz.name}</div>
                        {dz.oaci_code && (
                          <div className="text-xs text-gray-500">{dz.oaci_code}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {selectedDZ && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-green-700 font-semibold">✅ Sélectionné :</span>
                    <strong>{selectedDZ.name}</strong>
                  </div>
                  <div className="text-sm text-gray-600 font-mono bg-white px-2 py-1 rounded border border-green-200 inline-block">
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
                  className="w-full py-8 text-xl bg-green-500 hover:bg-green-600"
                >
                  🛫 DÉCOLLAGE
                </Button>
              ) : (
                <Button
                  onClick={handleLanding}
                  className="w-full py-8 text-xl bg-red-500 hover:bg-red-600"
                >
                  🛬 ATTERRISSAGE
                </Button>
              )}
              
              <Button
                onClick={() => setDzManagementOpen(!dzManagementOpen)}
                variant="outline"
                className="w-full py-8 text-xl"
              >
                📍 Gérer Drop Zones
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3️⃣ HISTORIQUE DES VOLS - EN DEUXIÈME POUR MOBILE */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Historique des vols (cliquez pour modifier)</CardTitle>
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
                  className={`p-4 border rounded-lg ${
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
                      <div className="font-semibold text-lg mb-1">
                        {flight.departure_dz?.name || flight.departure_location || '📍 Départ à préciser'}
                        {flight.arrival_dz?.name ? (
                          <> → {flight.arrival_dz.name}</>
                        ) : flight.arrival_location ? (
                          <> → {flight.arrival_location}</>
                        ) : !flight.in_progress ? (
                          <> → 📍 Arrivée à préciser</>
                        ) : null}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
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
                          <span className="px-3 py-1 bg-orange-500 text-white rounded-full text-sm font-semibold">
                            En cours
                          </span>
                        ) : (
                          <div className="text-lg font-bold text-green-600">
                            {formatDuration(flight.departure_time, flight.arrival_time)}
                          </div>
                        )}
                      </div>
                      
                      {/* Bouton suppression (pilotes seulement et vol terminé) */}
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

      {/* 4️⃣ STATISTIQUES - EN DERNIER POUR MOBILE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-sm text-blue-600 mb-1">Vols ce mois-ci</div>
            <div className="text-3xl font-bold text-blue-900">
              {flights.filter(f => !f.in_progress && new Date(f.departure_time).getMonth() === new Date().getMonth()).length}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="text-sm text-green-600 mb-1">Heures de vol</div>
            <div className="text-3xl font-bold text-green-900">
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
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 mb-1">Statut</div>
            <div className="text-xl font-bold">
              {currentFlight ? (
                <span className="text-orange-600">🔴 En vol</span>
              ) : (
                <span className="text-gray-600">⚪ Au sol</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gestion Drop Zones (modal CRUD complet) */}
      {dzManagementOpen && (
        <div 
          className="fixed inset-0 bg-white/95 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => {
            setDzManagementOpen(false)
            setNewDropZone({ name: '', latitude: '', longitude: '', notes: '' })
            setEditingDropZone(null)
          }}
        >
          <Card 
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>📍 Gestion des Drop Zones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Formulaire d'ajout/édition */}
                <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                  <h3 className="font-semibold text-lg mb-3">
                    {editingDropZone ? '✏️ Modifier la Drop Zone' : '➕ Ajouter une Drop Zone'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="corse">🇫🇷 Corse</option>
                        <option value="france">🇫🇷 France continentale</option>
                        <option value="italie">🇮🇹 Italie</option>
                        <option value="sardaigne">🇮🇹 Sardaigne</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    {editingDropZone ? (
                      <>
                        <Button
                          onClick={handleUpdateDropZone}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          ✅ Enregistrer
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingDropZone(null)
                            setNewDropZone({ name: '', latitude: '', longitude: '', notes: '' })
                          }}
                          variant="outline"
                        >
                          Annuler
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={handleAddDropZone}
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        ➕ Ajouter
                      </Button>
                    )}
                  </div>
                </div>

                {/* Liste des Drop Zones */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-lg">
                      📋 Drop Zones existantes ({dropZones.filter(dz => {
                        if (filterCountry === 'all') return true
                        if (filterCountry === 'corse') return dz.name.toLowerCase().includes('corse') || dz.name.toLowerCase().includes('ajaccio') || dz.name.toLowerCase().includes('bastia') || dz.name.toLowerCase().includes('calvi') || dz.name.toLowerCase().includes('figari') || dz.name.toLowerCase().includes('porto-vecchio') || dz.name.toLowerCase().includes('bonifacio')
                        if (filterCountry === 'france') return (dz.name.toLowerCase().includes('france') || dz.name.toLowerCase().includes('marseille') || dz.name.toLowerCase().includes('nice') || dz.name.toLowerCase().includes('cannes') || dz.name.toLowerCase().includes('monaco') || dz.name.toLowerCase().includes('saint-tropez') || dz.name.toLowerCase().includes('toulon') || dz.name.toLowerCase().includes('avignon') || dz.name.toLowerCase().includes('montpellier') || dz.name.toLowerCase().includes('perpignan') || dz.name.toLowerCase().includes('courchevel') || dz.name.toLowerCase().includes('méribel')) && !dz.name.toLowerCase().includes('corse')
                        if (filterCountry === 'italie') return dz.name.toLowerCase().includes('italie') || dz.name.toLowerCase().includes('rome') || dz.name.toLowerCase().includes('milan') || dz.name.toLowerCase().includes('gênes') || dz.name.toLowerCase().includes('venise') || dz.name.toLowerCase().includes('sardaigne') || dz.name.toLowerCase().includes('cagliari') || dz.name.toLowerCase().includes('olbia') || dz.name.toLowerCase().includes('alghero')
                        return true
                      }).length})
                    </h3>
                    
                    {/* Filtre par pays */}
                    <select
                      value={filterCountry}
                      onChange={(e) => setFilterCountry(e.target.value)}
                      className="px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
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
                      <div className="text-center py-8 text-gray-400">
                        Aucune Drop Zone dans cette zone
                      </div>
                    ) : (
                      dropZones.filter(dz => {
                        if (filterCountry === 'all') return true
                        return dz.region === filterCountry
                      }).map(dz => (
                        <div 
                          key={dz.id} 
                          className="p-3 border rounded-lg hover:bg-gray-50 flex justify-between items-start"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-semibold">{dz.name}</div>
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
                            <div className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                              <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                                📍 {dz.latitude}, {dz.longitude}
                              </span>
                            </div>
                            {dz.notes && (
                              <div className="text-xs text-gray-500 mt-1">
                                💬 {dz.notes}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex gap-2 ml-4">
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
                      setNewDropZone({ name: '', latitude: '', longitude: '', notes: '' })
                      setEditingDropZone(null)
                    }}
                    variant="outline"
                  >
                    Fermer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal édition d'un vol - CORRIGÉ */}
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
              <CardTitle>✏️ Modifier le vol</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Drop Zone de départ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📍 Drop Zone de départ
                  </label>
                  <input
                    type="text"
                    value={editSearchDeparture}
                    onChange={(e) => setEditSearchDeparture(e.target.value)}
                    placeholder="Rechercher une DZ..."
                    className="w-full p-3 border rounded-lg mb-2"
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
                            className="w-full text-left p-3 hover:bg-blue-50 border-b"
                          >
                            {dz.name}
                          </button>
                        ))}
                    </div>
                  )}
                  {editDepartureDZ && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                      ✅ {editDepartureDZ.name}
                    </div>
                  )}
                </div>

                {/* Drop Zone d'arrivée */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📍 Drop Zone d'arrivée
                  </label>
                  <input
                    type="text"
                    value={editSearchArrival}
                    onChange={(e) => setEditSearchArrival(e.target.value)}
                    placeholder="Rechercher une DZ..."
                    className="w-full p-3 border rounded-lg mb-2"
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
                            className="w-full text-left p-3 hover:bg-blue-50 border-b"
                          >
                            {dz.name}
                          </button>
                        ))}
                    </div>
                  )}
                  {editArrivalDZ && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                      ✅ {editArrivalDZ.name}
                    </div>
                  )}
                </div>

                {/* Boutons */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveEditFlight}
                    className="flex-1 bg-green-500 hover:bg-green-600"
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
                    className="flex-1"
                  >
                    ✖️ Annuler
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}