import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Plane, MapPin, Clock, Calendar } from 'lucide-react'

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
      {/* En-tête avec stats */}
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

      {/* Vol en cours */}
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

      {/* Boutons principaux */}
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
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                  ✅ Sélectionné : <strong>{selectedDZ.name}</strong>
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

      {/* Historique des vols */}
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
                  onClick={() => userRole === 'pilote' && !flight.in_progress && handleEditFlight(flight)}
                  className={`p-4 border rounded-lg ${
                    flight.in_progress 
                      ? 'bg-orange-50 border-orange-200' 
                      : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
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

      {/* Gestion Drop Zones (modal simple) */}
      {dzManagementOpen && (
        <Card className="border-blue-500">
          <CardHeader>
            <CardTitle>📍 Mes Drop Zones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {dropZones.map(dz => (
                <div key={dz.id} className="p-3 border rounded-lg hover:bg-gray-50">
                  <div className="font-semibold">{dz.name}</div>
                  {dz.oaci_code && (
                    <div className="text-xs text-gray-500">{dz.oaci_code}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    📍 {dz.latitude}, {dz.longitude}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center text-sm text-gray-500">
              💡 Fonctionnalité d'ajout de DZ à venir
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal édition d'un vol */}
      {editingFlight && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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