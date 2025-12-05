import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { FileText, Plus, Trash2, Download, X } from 'lucide-react'

export default function ManifestModule({ userId, userRole, username }) {
  const [manifests, setManifests] = useState([])
  const [pilots, setPilots] = useState([])
  const [dropZones, setDropZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentManifest, setCurrentManifest] = useState(null)
  const [showNewManifestForm, setShowNewManifestForm] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  
  // Formulaire en-tête PVE
  const [manifestForm, setManifestForm] = useState({
    pilotId: userId,
    pilotName: username,
    aircraftRegistration: '',
    flightDate: new Date().toISOString().split('T')[0]
  })
  
  // Formulaire ajout vol
  const [showAddFlightForm, setShowAddFlightForm] = useState(false)
  const [flightForm, setFlightForm] = useState({
    departureDzId: '',
    departureName: '',
    arrivalDzId: '',
    arrivalName: '',
    estimatedDuration: '',
    flightCase: '',
    notes: '',
    passengers: []
  })
  
  // États pour la recherche DZ
  const [departureSearch, setDepartureSearch] = useState('')
  const [arrivalSearch, setArrivalSearch] = useState('')
  const [showDepartureResults, setShowDepartureResults] = useState(false)
  const [showArrivalResults, setShowArrivalResults] = useState(false)
  
  // État pour les passagers
  const [newPassenger, setNewPassenger] = useState({ name: '', type: 'H' })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    await Promise.all([
      loadManifests(),
      loadPilots(),
      loadDropZones()
    ])
    setLoading(false)
  }

  const loadManifests = async () => {
    let query = supabase
      .from('manifests')
      .select(`
        *,
        manifest_flights (
          *,
          departure_dz:drop_zones!manifest_flights_departure_dz_id_fkey(name),
          arrival_dz:drop_zones!manifest_flights_arrival_dz_id_fkey(name)
        )
      `)
      .eq('is_archived', false)
      .order('flight_date', { ascending: false })

    // Si pilote, voir uniquement ses PVEs
    if (userRole === 'pilote') {
      query = query.eq('pilot_id', userId)
    }

    const { data, error } = await query

    if (data) {
      setManifests(data)
    } else {
      console.error('Erreur chargement PVEs:', error)
    }
  }

  const loadPilots = async () => {
    // Charger uniquement si agent (pour le dropdown)
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
      .select('id, name, short_code, region')
      .eq('is_active', true)
      .order('name')

    if (data) {
      setDropZones(data)
    }
  }

  const createManifest = async () => {
    // Validation
    const errors = {}
    
    if (userRole === 'agent_sol' && !manifestForm.pilotId) {
      errors.pilotId = true
    }
    if (!manifestForm.flightDate) {
      errors.flightDate = true
    }
    if (!manifestForm.aircraftRegistration.trim()) {
      errors.aircraftRegistration = true
    }
    
    // Si erreurs, les afficher et stopper
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      alert('⚠️ Veuillez remplir tous les champs obligatoires (en rouge)')
      return
    }
    
    // Reset des erreurs
    setFormErrors({})

    const manifestData = {
      pilot_id: manifestForm.pilotId,
      pilot_name: manifestForm.pilotName,
      aircraft_registration: manifestForm.aircraftRegistration,
      flight_date: manifestForm.flightDate
    }

    const { data, error } = await supabase
      .from('manifests')
      .insert([manifestData])
      .select()
      .single()

    if (data) {
      setCurrentManifest({ ...data, manifest_flights: [] })
      setShowNewManifestForm(false)
      alert('✅ PVE créé')
      loadManifests()
    } else {
      console.error('Erreur création PVE:', error)
      alert('❌ Erreur lors de la création')
    }
  }

  const addFlight = async () => {
    if (!currentManifest) {
      alert('⚠️ Veuillez d\'abord créer un PVE')
      return
    }

    if (!flightForm.departureDzId || !flightForm.arrivalDzId) {
      alert('⚠️ Veuillez sélectionner un départ et une arrivée')
      return
    }

    const flightData = {
      manifest_id: currentManifest.id,
      departure_dz_id: flightForm.departureDzId,
      departure_name: flightForm.departureName,
      arrival_dz_id: flightForm.arrivalDzId,
      arrival_name: flightForm.arrivalName,
      estimated_duration: flightForm.estimatedDuration ? parseInt(flightForm.estimatedDuration) : null,
      flight_case: flightForm.flightCase || null,
      notes: flightForm.notes || null,
      passengers: flightForm.passengers
    }

    const { data, error } = await supabase
      .from('manifest_flights')
      .insert([flightData])
      .select()
      .single()

    if (data) {
      setCurrentManifest({
        ...currentManifest,
        manifest_flights: [...(currentManifest.manifest_flights || []), data]
      })
      setFlightForm({
        departureDzId: '',
        departureName: '',
        arrivalDzId: '',
        arrivalName: '',
        estimatedDuration: '',
        flightCase: '',
        notes: '',
        passengers: []
      })
      setDepartureSearch('')
      setArrivalSearch('')
      setShowAddFlightForm(false)
      alert('✅ Vol ajouté')
      loadManifests()
    } else {
      console.error('Erreur ajout vol:', error)
      alert('❌ Erreur lors de l\'ajout')
    }
  }

  const deleteFlight = async (flightId) => {
    if (!confirm('Supprimer ce vol du PVE ?')) return

    const { error } = await supabase
      .from('manifest_flights')
      .delete()
      .eq('id', flightId)

    if (!error) {
      setCurrentManifest({
        ...currentManifest,
        manifest_flights: currentManifest.manifest_flights.filter(f => f.id !== flightId)
      })
      alert('✅ Vol supprimé')
      loadManifests()
    } else {
      console.error('Erreur suppression vol:', error)
      alert('❌ Erreur lors de la suppression')
    }
  }

  const deleteManifest = async (manifestId) => {
    // Alerte de confirmation personnalisée
    const confirmation = window.confirm(
      '⚠️ ATTENTION\n\n' +
      'Voulez-vous vraiment archiver ce PVE ?\n\n' +
      '• Le PVE sera masqué de la liste\n' +
      '• Les vols associés seront conservés\n' +
      '• Vous pourrez le restaurer plus tard\n\n' +
      'Confirmer l\'archivage ?'
    )
    
    if (!confirmation) return

    // Soft delete : on passe is_archived à true
    const { error } = await supabase
      .from('manifests')
      .update({ is_archived: true })
      .eq('id', manifestId)

    if (!error) {
      // Retirer de la liste affichée
      setManifests(manifests.filter(m => m.id !== manifestId))
      
      // Si c'est le PVE en cours d'édition, le fermer
      if (currentManifest?.id === manifestId) {
        setCurrentManifest(null)
      }
      
      alert('✅ PVE archivé avec succès\n\nVous pouvez le restaurer depuis l\'onglet "PVE archivés"')
    } else {
      console.error('Erreur archivage PVE:', error)
      alert('❌ Erreur lors de l\'archivage\n\n' + (error.message || 'Erreur inconnue'))
    }
  }

  const generatePDF = () => {
    if (!currentManifest || !currentManifest.manifest_flights?.length) {
      alert('⚠️ Aucun vol dans ce PVE')
      return
    }

    // TODO: Générer le PDF avec jsPDF
    alert('🚧 Génération PDF en cours de développement')
  }

  const handlePilotChange = (pilotId) => {
    const pilot = pilots.find(p => p.id === pilotId)
    setManifestForm({
      ...manifestForm,
      pilotId: pilot.id,
      pilotName: pilot.username
    })
  }
  
  // Ajouter un passager
  const addPassenger = () => {
    if (!newPassenger.name.trim()) {
      alert('⚠️ Veuillez entrer un nom')
      return
    }
    
    if (flightForm.passengers.length >= 6) {
      alert('⚠️ Maximum 6 passagers par vol')
      return
    }
    
    setFlightForm({
      ...flightForm,
      passengers: [...flightForm.passengers, { ...newPassenger }]
    })
    setNewPassenger({ name: '', type: 'H' })
  }
  
  // Supprimer un passager
  const removePassenger = (index) => {
    setFlightForm({
      ...flightForm,
      passengers: flightForm.passengers.filter((_, i) => i !== index)
    })
  }
  
  // Sélectionner une DZ de départ
  const selectDepartureDZ = (dz) => {
    setFlightForm({
      ...flightForm,
      departureDzId: dz.id,
      departureName: dz.name
    })
    setDepartureSearch(dz.name)
    setShowDepartureResults(false)
  }
  
  // Sélectionner une DZ d'arrivée
  const selectArrivalDZ = (dz) => {
    setFlightForm({
      ...flightForm,
      arrivalDzId: dz.id,
      arrivalName: dz.name
    })
    setArrivalSearch(dz.name)
    setShowArrivalResults(false)
  }
  
  // Filtrer les DZ pour la recherche
  const filterDropZones = (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) return []
    
    const term = searchTerm.toLowerCase()
    return dropZones
      .filter(dz => 
        dz.name.toLowerCase().includes(term) ||
        (dz.short_code && dz.short_code.toLowerCase().includes(term)) ||
        (dz.oaci_code && dz.oaci_code.toLowerCase().includes(term))
      )
      .slice(0, 5)
  }

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <div className="text-sm text-blue-600 mb-1">PVE créés</div>
            <div className="text-3xl font-bold text-blue-900">{manifests.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-6">
            <div className="text-sm text-green-600 mb-1">Vols totaux</div>
            <div className="text-3xl font-bold text-green-900">
              {manifests.reduce((sum, m) => sum + (m.manifest_flights?.length || 0), 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-6">
            <div className="text-sm text-purple-600 mb-1">PVE actif</div>
            <div className="text-xl font-bold text-purple-900">
              {currentManifest ? `${currentManifest.manifest_flights?.length || 0} vols` : 'Aucun'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bouton Nouveau PVE */}
      {!currentManifest && (
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={() => setShowNewManifestForm(!showNewManifestForm)}
              className="w-full py-6 text-lg"
            >
              <Plus size={24} className="mr-2" />
              Créer un nouveau PVE
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Formulaire Nouveau PVE */}
      {showNewManifestForm && (
        <Card className="border-2 border-blue-500">
          <CardHeader className="bg-blue-50">
            <CardTitle className="flex justify-between items-center">
              <span>📄 Nouveau PVE</span>
              <button onClick={() => setShowNewManifestForm(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Pilote */}
              <div>
                <label className="block text-sm font-medium mb-1">Pilote *</label>
                {userRole === 'pilote' ? (
                  <input
                    type="text"
                    value={manifestForm.pilotName}
                    disabled
                    className="w-full p-2 border rounded-lg bg-gray-100 text-gray-700"
                  />
                ) : (
                  <select
                    value={manifestForm.pilotId}
                    onChange={(e) => handlePilotChange(e.target.value)}
                    className={`w-full p-2 border-2 rounded-lg ${
                      formErrors.pilotId 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-300'
                    }`}
                    required
                  >
                    <option value="">-- Sélectionner un pilote --</option>
                    {pilots.map(pilot => (
                      <option key={pilot.id} value={pilot.id}>{pilot.username}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium mb-1">Date du vol *</label>
                <input
                  type="date"
                  value={manifestForm.flightDate}
                  onChange={(e) => setManifestForm({ ...manifestForm, flightDate: e.target.value })}
                  className={`w-full p-2 border-2 rounded-lg ${
                    formErrors.flightDate 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                  required
                />
              </div>

              {/* Immatriculation */}
              <div>
                <label className="block text-sm font-medium mb-1">Immatriculation de l'appareil *</label>
                <input
                  type="text"
                  value={manifestForm.aircraftRegistration}
                  onChange={(e) => setManifestForm({ ...manifestForm, aircraftRegistration: e.target.value })}
                  placeholder="Ex: F-XXXX"
                  className={`w-full p-2 border-2 rounded-lg ${
                    formErrors.aircraftRegistration 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                  required
                />
              </div>

              {/* Boutons */}
              <div className="flex gap-2">
                <Button onClick={createManifest} className="flex-1">
                  Créer le PVE
                </Button>
                <Button onClick={() => setShowNewManifestForm(false)} variant="ghost">
                  Annuler
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PVE en cours d'édition */}
      {currentManifest && (
        <Card className="border-2 border-green-500">
          <CardHeader className="bg-green-50">
            <CardTitle className="flex justify-between items-center">
              <div>
                <div className="text-lg">📄 PVE en cours</div>
                <div className="text-sm font-normal text-gray-600 mt-1">
                  {currentManifest.pilot_name} • {new Date(currentManifest.flight_date).toLocaleDateString('fr-FR')} • {currentManifest.aircraft_registration}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={generatePDF} size="sm" className="bg-blue-500 hover:bg-blue-600">
                  <Download size={16} className="mr-2" />
                  PDF
                </Button>
                <Button onClick={() => setCurrentManifest(null)} size="sm" variant="ghost">
                  Fermer
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Bouton Ajouter Vol */}
            <Button
              onClick={() => setShowAddFlightForm(!showAddFlightForm)}
              className="w-full mb-4"
            >
              <Plus size={18} className="mr-2" />
              Ajouter un vol
            </Button>

            {/* Formulaire Ajout Vol */}
            {showAddFlightForm && (
              <Card className="mb-4 border-2 border-blue-200">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Départ */}
                    <div>
                      <label className="block text-sm font-medium mb-1">Départ *</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={departureSearch}
                          onChange={(e) => {
                            setDepartureSearch(e.target.value)
                            setShowDepartureResults(e.target.value.length >= 2)
                          }}
                          onFocus={() => departureSearch.length >= 2 && setShowDepartureResults(true)}
                          placeholder="Tapez 2-3 lettres pour rechercher..."
                          className="w-full p-2 border rounded-lg text-sm"
                        />
                        {showDepartureResults && filterDropZones(departureSearch).length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {filterDropZones(departureSearch).map(dz => (
                              <button
                                key={dz.id}
                                onClick={() => selectDepartureDZ(dz)}
                                className="w-full text-left p-2 hover:bg-blue-50 border-b last:border-b-0 text-sm"
                              >
                                <div className="font-semibold">{dz.name}</div>
                                {dz.short_code && <div className="text-xs text-gray-500">{dz.short_code}</div>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {flightForm.departureDzId && (
                        <div className="mt-1 text-xs text-green-600">✓ {flightForm.departureName}</div>
                      )}
                    </div>

                    {/* Arrivée */}
                    <div>
                      <label className="block text-sm font-medium mb-1">Arrivée *</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={arrivalSearch}
                          onChange={(e) => {
                            setArrivalSearch(e.target.value)
                            setShowArrivalResults(e.target.value.length >= 2)
                          }}
                          onFocus={() => arrivalSearch.length >= 2 && setShowArrivalResults(true)}
                          placeholder="Tapez 2-3 lettres pour rechercher..."
                          className="w-full p-2 border rounded-lg text-sm"
                        />
                        {showArrivalResults && filterDropZones(arrivalSearch).length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {filterDropZones(arrivalSearch).map(dz => (
                              <button
                                key={dz.id}
                                onClick={() => selectArrivalDZ(dz)}
                                className="w-full text-left p-2 hover:bg-blue-50 border-b last:border-b-0 text-sm"
                              >
                                <div className="font-semibold">{dz.name}</div>
                                {dz.short_code && <div className="text-xs text-gray-500">{dz.short_code}</div>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {flightForm.arrivalDzId && (
                        <div className="mt-1 text-xs text-green-600">✓ {flightForm.arrivalName}</div>
                      )}
                    </div>

                    {/* Temps de vol */}
                    <div>
                      <label className="block text-sm font-medium mb-1">Temps estimé (min)</label>
                      <input
                        type="number"
                        value={flightForm.estimatedDuration}
                        onChange={(e) => setFlightForm({ ...flightForm, estimatedDuration: e.target.value })}
                        placeholder="Ex: 45"
                        className="w-full p-2 border rounded-lg text-sm"
                      />
                    </div>

                    {/* Passagers */}
                    <div className="border-t pt-3">
                      <label className="block text-sm font-medium mb-2">
                        Passagers ({flightForm.passengers.length}/6)
                      </label>
                      
                      {/* Liste des passagers */}
                      {flightForm.passengers.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {flightForm.passengers.map((passenger, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                passenger.type === 'H' ? 'bg-blue-100 text-blue-700' :
                                passenger.type === 'F' ? 'bg-pink-100 text-pink-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {passenger.type}
                              </span>
                              <span className="flex-1 text-sm">{passenger.name}</span>
                              <button
                                onClick={() => removePassenger(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Ajouter un passager */}
                      {flightForm.passengers.length < 6 && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newPassenger.name}
                            onChange={(e) => setNewPassenger({ ...newPassenger, name: e.target.value })}
                            placeholder="Nom du passager"
                            className="flex-1 p-2 border rounded-lg text-sm"
                            onKeyPress={(e) => e.key === 'Enter' && addPassenger()}
                          />
                          <select
                            value={newPassenger.type}
                            onChange={(e) => setNewPassenger({ ...newPassenger, type: e.target.value })}
                            className="p-2 border rounded-lg text-sm"
                          >
                            <option value="H">H (Homme)</option>
                            <option value="F">F (Femme)</option>
                            <option value="E">E (Enfant)</option>
                          </select>
                          <Button onClick={addPassenger} size="sm" variant="outline">
                            <Plus size={14} />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium mb-1">Notes</label>
                      <textarea
                        value={flightForm.notes}
                        onChange={(e) => setFlightForm({ ...flightForm, notes: e.target.value })}
                        placeholder="Notes optionnelles..."
                        className="w-full p-2 border rounded-lg text-sm"
                        rows="2"
                      />
                    </div>
                  </div>

                  {/* Boutons */}
                  <div className="flex gap-2 mt-4">
                    <Button onClick={addFlight} size="sm">Ajouter le vol</Button>
                    <Button onClick={() => setShowAddFlightForm(false)} variant="ghost" size="sm">
                      Annuler
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Liste des vols */}
            {currentManifest.manifest_flights?.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <FileText size={48} className="mx-auto mb-3 opacity-50" />
                <p>Aucun vol ajouté</p>
              </div>
            ) : (
              <div className="space-y-2">
                {currentManifest.manifest_flights
                  ?.sort((a, b) => a.display_order - b.display_order)
                  .map((flight, index) => (
                    <Card key={flight.id} className="border-l-4 border-blue-500">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-bold">
                                VOL-{String(flight.flight_number).padStart(3, '0')}
                              </span>
                              {flight.estimated_duration && (
                                <span className="text-sm text-gray-600">
                                  ⏱️ {flight.estimated_duration} min
                                </span>
                              )}
                            </div>
                            <div className="text-lg font-semibold">
                              {flight.departure_name} → {flight.arrival_name}
                            </div>
                            {flight.passengers && flight.passengers.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {flight.passengers.map((passenger, pIndex) => (
                                  <span
                                    key={pIndex}
                                    className={`px-2 py-1 rounded text-xs ${
                                      passenger.type === 'H' ? 'bg-blue-100 text-blue-700' :
                                      passenger.type === 'F' ? 'bg-pink-100 text-pink-700' :
                                      'bg-green-100 text-green-700'
                                    }`}
                                  >
                                    {passenger.type}: {passenger.name}
                                  </span>
                                ))}
                              </div>
                            )}
                            {flight.flight_case && (
                              <div className="text-sm text-gray-600 mt-1">
                                Cas: {flight.flight_case}
                              </div>
                            )}
                            {flight.notes && (
                              <div className="text-sm text-gray-500 mt-1 italic">
                                📝 {flight.notes}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => deleteFlight(flight.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Liste des PVEs précédents */}
      <Card>
        <CardHeader>
          <CardTitle>📋 PVE précédents ({manifests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {manifests.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FileText size={48} className="mx-auto mb-3 opacity-50" />
              <p>Aucun PVE créé</p>
            </div>
          ) : (
            <div className="space-y-2">
              {manifests.map(manifest => (
                <Card 
                  key={manifest.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setCurrentManifest(manifest)}
                >
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-lg">
                          {manifest.pilot_name} • {manifest.aircraft_registration}
                        </div>
                        <div className="text-sm text-gray-600">
                          {new Date(manifest.flight_date).toLocaleDateString('fr-FR')} • {manifest.manifest_flights?.length || 0} vols
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation()
                            setCurrentManifest(manifest)
                            generatePDF()
                          }} 
                          size="sm" 
                          variant="ghost"
                        >
                          <Download size={16} />
                        </Button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteManifest(manifest.id)
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}