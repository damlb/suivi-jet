import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { FileText, Plus, Trash2, Eye, Printer, Calendar, Plane } from 'lucide-react'
import { generatePVEPdf } from '../lib/pdfGenerator'

export default function PVEModule({ userId, userRole, username }) {
  const [pves, setPves] = useState([])
  const [aircraft, setAircraft] = useState([])
  const [dropzones, setDropzones] = useState([])
  const [pilots, setPilots] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingPve, setEditingPve] = useState(null)
  const [flights, setFlights] = useState([])
  const [loadingCases, setLoadingCases] = useState([])
  
  // États pour le PVE en cours de création/édition
  const [pveData, setPveData] = useState({
    flight_date: new Date().toISOString().split('T')[0],
    numero_crm: '',
    configuration_aeronef: 'Été 6 pax, Avec flottabilité',
    aircraft_id: '',
    pilot_name: username || ''
  })

  // État pour un nouveau vol
  const [newFlight, setNewFlight] = useState({
    flight_number: 1,
    departure_dz_id: '',
    arrival_dz_id: '',
    estimated_duration: '',
    bagages_kg: 0,
    type_mission: 'TP',
    passengers: [],
    heure_deco: '',
    heure_pose: '',
    temps_vol_reel: '',
    kerosene_deco: '',
    kerosene_pose: '',
    observations: '',
    attente_heslo: '',
    flight_case: '',
    notes: ''
  })

  const [showAddFlightForm, setShowAddFlightForm] = useState(false)
  const [searchDeparture, setSearchDeparture] = useState('')
  const [searchArrival, setSearchArrival] = useState('')
  const [showDepartureResults, setShowDepartureResults] = useState(false)
  const [showArrivalResults, setShowArrivalResults] = useState(false)

  useEffect(() => {
    loadPves()
    loadAircraft()
    loadDropzones()
    loadPilots()
  }, [])

  const loadPves = async () => {
    const { data, error } = await supabase
      .from('manifests')
      .select(`
        *,
        aircraft:aircraft_id(registration, model)
      `)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })

    if (data) {
      setPves(data)
    } else {
      console.error('Erreur chargement PVE:', error)
    }
    setLoading(false)
  }

  const loadAircraft = async () => {
    const { data } = await supabase
      .from('aircraft')
      .select('*')
      .eq('actif', true)
      .order('registration', { ascending: true })

    if (data) setAircraft(data)
  }

  const loadDropzones = async () => {
    const { data, error } = await supabase
      .from('drop_zones')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Erreur chargement DZ:', error)
    } else if (data) {
      console.log('✅ DZ chargées:', data.length, data.slice(0, 3))
      setDropzones(data)
    } else {
      console.log('⚠️ Aucune DZ retournée')
    }
  }

  const loadPilots = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, nom, prenom')
      .eq('role', 'pilote')
      .order('nom', { ascending: true })

    if (data) {
      setPilots(data.map(p => ({
        id: p.id,
        fullName: `${p.prenom} ${p.nom}`
      })))
    }
  }

  const loadFlights = async (pveId) => {
    const { data } = await supabase
      .from('manifest_flights')
      .select('*')
      .eq('manifest_id', pveId)
      .order('flight_number', { ascending: true })

    if (data) {
      // Convertir en format éditable avec les noms de DZ
      const flightsWithNames = data.map(f => ({
        ...f,
        departure_name: dropzones.find(d => d.id === f.departure_dz_id)?.name || '',
        arrival_name: dropzones.find(d => d.id === f.arrival_dz_id)?.name || ''
      }))
      setFlights(flightsWithNames)
    }
  }

  const loadLoadingCasesForAircraft = async (aircraftId) => {
    const { data } = await supabase
      .from('loading_cases')
      .select('*')
      .eq('aircraft_id', aircraftId)
      .order('case_number', { ascending: true })

    if (data) setLoadingCases(data)
  }

  // Calculer le cas de vol selon les passagers
  const calculateLoadingCase = (passengers) => {
    if (passengers.length === 0) return null

    const hommes = passengers.filter(p => p.type === 'H').length
    const femmes = passengers.filter(p => p.type === 'F').length
    const enfants = passengers.filter(p => p.type === 'E').length
    const total = hommes + femmes + enfants

    // Trouver le cas correspondant
    const matchingCase = loadingCases.find(c => 
      c.nb_pax === total &&
      c.hommes === hommes &&
      c.femmes === femmes &&
      c.enfants === enfants
    )

    return matchingCase
  }

  // Calculer le kérosène maximum selon cas + bagages
  const calculateMaxKerosene = (cas, bagagesKg) => {
    if (!cas || cas.carburant_max_pct === 0) return 0
    
    // Réduction de 5% tous les 20kg de bagages
    const baggageReduction = Math.floor(bagagesKg / 20) * 5
    const finalPct = Math.max(0, cas.carburant_max_pct - baggageReduction)
    
    return finalPct
  }

  const resetPveForm = () => {
    setPveData({
      flight_date: new Date().toISOString().split('T')[0],
      numero_crm: '',
      configuration_aeronef: 'Été 6 pax, Avec flottabilité',
      aircraft_id: '',
      pilot_name: username || ''
    })
    setFlights([])
    setEditingPve(null)
    setShowCreateForm(false)
    setShowAddFlightForm(false)
  }

  const resetFlightForm = () => {
    setNewFlight({
      flight_number: flights.length + 1,
      departure_dz_id: '',
      arrival_dz_id: '',
      estimated_duration: '',
      bagages_kg: 0,
      type_mission: 'TP',
      passengers: [],
      heure_deco: '',
      heure_pose: '',
      temps_vol_reel: '',
      kerosene_deco: '',
      kerosene_pose: '',
      observations: '',
      attente_heslo: '',
      flight_case: '',
      notes: ''
    })
    setSearchDeparture('')
    setSearchArrival('')
    setShowDepartureResults(false)
    setShowArrivalResults(false)
    setShowAddFlightForm(false)
  }

  const filteredDepartureDropzones = !searchDeparture 
    ? dropzones 
    : dropzones.filter(dz => {
        const search = searchDeparture.toLowerCase()
        const name = (dz.name || '').toLowerCase()
        const shortCode = (dz.short_code || '').toLowerCase()
        const oaciCode = (dz.oaci_code || '').toLowerCase()
        return name.includes(search) || shortCode.includes(search) || oaciCode.includes(search)
      })

  const filteredArrivalDropzones = !searchArrival 
    ? dropzones 
    : dropzones.filter(dz => {
        const search = searchArrival.toLowerCase()
        const name = (dz.name || '').toLowerCase()
        const shortCode = (dz.short_code || '').toLowerCase()
        const oaciCode = (dz.oaci_code || '').toLowerCase()
        return name.includes(search) || shortCode.includes(search) || oaciCode.includes(search)
      })

  const selectDeparture = (dz) => {
    setNewFlight({ ...newFlight, departure_dz_id: dz.id })
    setSearchDeparture(dz.name)
    setShowDepartureResults(false)
  }

  const selectArrival = (dz) => {
    setNewFlight({ ...newFlight, arrival_dz_id: dz.id })
    setSearchArrival(dz.name)
    setShowArrivalResults(false)
  }

  const startCreatePve = () => {
    setShowCreateForm(true)
    setPveData({
      ...pveData,
      pilot_name: username || ''
    })
  }

  const savePve = async () => {
    if (!pveData.aircraft_id) {
      alert('⚠️ Veuillez sélectionner un appareil')
      return
    }

    const selectedAircraft = aircraft.find(a => a.id === pveData.aircraft_id)

    const pveToSave = {
      flight_date: pveData.flight_date,
      numero_crm: pveData.numero_crm,
      configuration_aeronef: pveData.configuration_aeronef,
      aircraft_id: pveData.aircraft_id,
      aircraft_registration: selectedAircraft?.registration,
      type_aeronef: selectedAircraft?.model,
      pilot_name: pveData.pilot_name,
      is_archived: false
    }

    let pveId = editingPve?.id

    if (editingPve) {
      // Mise à jour
      const { error } = await supabase
        .from('manifests')
        .update(pveToSave)
        .eq('id', editingPve.id)

      if (error) {
        console.error('Erreur mise à jour PVE:', error)
        alert('❌ Erreur lors de la mise à jour')
        return
      }
    } else {
      // Création
      const { data, error } = await supabase
        .from('manifests')
        .insert([pveToSave])
        .select()
        .single()

      if (error) {
        console.error('Erreur création PVE:', error)
        alert('❌ Erreur lors de la création')
        return
      }

      pveId = data.id
      setEditingPve(data)
    }

    // Sauvegarder tous les vols
    if (flights.length > 0) {
      // Supprimer les anciens vols
      await supabase
        .from('manifest_flights')
        .delete()
        .eq('manifest_id', pveId)

      // Insérer les nouveaux
      const flightsToInsert = flights.map((f, idx) => ({
        manifest_id: pveId,
        flight_number: idx + 1,
        departure_dz_id: f.departure_dz_id,
        departure_name: dropzones.find(d => d.id === f.departure_dz_id)?.name || '',
        arrival_dz_id: f.arrival_dz_id,
        arrival_name: dropzones.find(d => d.id === f.arrival_dz_id)?.name || '',
        estimated_duration: f.estimated_duration ? parseInt(f.estimated_duration) : null,
        bagages_kg: f.bagages_kg ? parseInt(f.bagages_kg) : 0,
        type_mission: f.type_mission,
        passengers: f.passengers,
        heure_deco: f.heure_deco || null,
        heure_pose: f.heure_pose || null,
        temps_vol_reel: f.temps_vol_reel ? parseInt(f.temps_vol_reel) : null,
        kerosene_deco: f.kerosene_deco ? parseInt(f.kerosene_deco) : null,
        kerosene_pose: f.kerosene_pose ? parseInt(f.kerosene_pose) : null,
        observations: f.observations || '',
        attente_heslo: f.attente_heslo || '',
        flight_case: f.flight_case || '',
        notes: f.notes || '',
        cas_vol: f.cas_vol || null
      }))

      const { error: flightsError } = await supabase
        .from('manifest_flights')
        .insert(flightsToInsert)

      if (flightsError) {
        console.error('Erreur sauvegarde vols:', flightsError)
        alert('❌ Erreur lors de la sauvegarde des vols')
        return
      }
    }

    alert('✅ PVE enregistré')
    loadPves()
    resetPveForm()
  }

  const addFlightToPve = () => {
    // Calculer le cas de vol
    const cas = calculateLoadingCase(newFlight.passengers)
    const keroseneMax = cas ? calculateMaxKerosene(cas, newFlight.bagages_kg || 0) : 0

    const flightToAdd = {
      ...newFlight,
      flight_number: flights.length + 1,
      cas_vol: cas?.case_number || null,
      kerosene_max_pct: keroseneMax
    }

    setFlights([...flights, flightToAdd])
    resetFlightForm()
  }

  const removeFlightFromPve = (index) => {
    const updatedFlights = flights.filter((_, i) => i !== index)
    setFlights(updatedFlights)
  }

  const addPassengerToFlight = () => {
    if (newFlight.passengers.length >= 6) {
      alert('⚠️ Maximum 6 passagers par vol')
      return
    }

    setNewFlight({
      ...newFlight,
      passengers: [...newFlight.passengers, { name: '', type: 'H' }]
    })
  }

  const updatePassenger = (index, field, value) => {
    const updatedPassengers = [...newFlight.passengers]
    updatedPassengers[index][field] = value
    setNewFlight({ ...newFlight, passengers: updatedPassengers })
  }

  const removePassenger = (index) => {
    const updatedPassengers = newFlight.passengers.filter((_, i) => i !== index)
    setNewFlight({ ...newFlight, passengers: updatedPassengers })
  }

  const deletePve = async (id) => {
    if (!window.confirm('⚠️ Supprimer ce PVE ?')) return

    const { error } = await supabase
      .from('manifests')
      .update({ is_archived: true })
      .eq('id', id)

    if (!error) {
      loadPves()
      alert('✅ PVE supprimé')
    }
  }

  const openEditPve = async (pve) => {
    setEditingPve(pve)
    setPveData({
      flight_date: pve.flight_date,
      numero_crm: pve.numero_crm || '',
      configuration_aeronef: pve.configuration_aeronef || 'Été 6 pax, Avec flottabilité',
      aircraft_id: pve.aircraft_id,
      pilot_name: pve.pilot_name || ''
    })
    
    // Charger les cas de vol pour l'appareil
    if (pve.aircraft_id) {
      await loadLoadingCasesForAircraft(pve.aircraft_id)
    }
    
    // Charger les vols
    await loadFlights(pve.id)
    setShowCreateForm(true)
  }

  const previewPdf = () => {
    generatePVEPdf(pveData, flights, dropzones)
  }

  const previewExistingPvePdf = async (pve) => {
    // Charger les vols du PVE
    const { data: pveFlights } = await supabase
      .from('manifest_flights')
      .select('*')
      .eq('manifest_id', pve.id)
      .order('flight_number', { ascending: true })

    if (pveFlights) {
      const pveDataForPdf = {
        flight_date: pve.flight_date,
        numero_crm: pve.numero_crm,
        configuration_aeronef: pve.configuration_aeronef,
        type_aeronef: pve.type_aeronef,
        aircraft_registration: pve.aircraft_registration,
        pilot_name: pve.pilot_name
      }
      generatePVEPdf(pveDataForPdf, pveFlights, dropzones)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText size={24} />
            PVE Réduit
          </h2>
          <p className="text-sm text-gray-600">{pves.length} PVE enregistré{pves.length > 1 ? 's' : ''}</p>
        </div>
        {!showCreateForm && (
          <Button
            onClick={startCreatePve}
            className="w-full sm:w-auto text-sm bg-green-500 hover:bg-green-600"
          >
            <Plus size={16} className="mr-1" />
            Créer un PVE réduit
          </Button>
        )}
      </div>

      {/* Formulaire création/édition PVE */}
      {showCreateForm && (
        <Card className="border-2 border-green-200">
          <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-3 sm:p-6">
            <CardTitle className="text-base sm:text-xl">
              {editingPve ? '✏️ Modifier le PVE' : '➕ Nouveau PVE réduit'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* EN-TÊTE DU PVE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Date du vol */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">
                  📅 Date du vol
                </label>
                <input
                  type="date"
                  value={pveData.flight_date}
                  onChange={(e) => setPveData({ ...pveData, flight_date: e.target.value })}
                  className="w-full p-2 border rounded-lg text-sm"
                />
              </div>

              {/* Numéro CRM */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">
                  Numéro CRM
                </label>
                <input
                  type="text"
                  value={pveData.numero_crm}
                  onChange={(e) => setPveData({ ...pveData, numero_crm: e.target.value })}
                  placeholder="Ex: CRM-2024-001"
                  className="w-full p-2 border rounded-lg text-sm"
                />
              </div>

              {/* Appareil */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">
                  ✈️ Type aéronef
                </label>
                <select
                  value={pveData.aircraft_id}
                  onChange={async (e) => {
                    setPveData({ ...pveData, aircraft_id: e.target.value })
                    if (e.target.value) {
                      await loadLoadingCasesForAircraft(e.target.value)
                    }
                  }}
                  className="w-full p-2 border rounded-lg text-sm"
                >
                  <option value="">-- Sélectionner un appareil --</option>
                  {aircraft.map(ac => (
                    <option key={ac.id} value={ac.id}>
                      {ac.registration} - {ac.model}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nom CDB */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">
                  👨‍✈️ Nom, Prénom CDB
                </label>
                {userRole === 'agent_sol' ? (
                  <select
                    value={pveData.pilot_name}
                    onChange={(e) => setPveData({ ...pveData, pilot_name: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm"
                  >
                    <option value="">-- Sélectionner un pilote --</option>
                    {pilots.map(p => (
                      <option key={p.id} value={p.fullName}>{p.fullName}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={pveData.pilot_name}
                    readOnly
                    className="w-full p-2 border rounded-lg text-sm bg-gray-50"
                  />
                )}
              </div>
            </div>

            {/* Configuration (read-only pour le moment) */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">
                ⚙️ Configuration aéronef
              </label>
              <input
                type="text"
                value={pveData.configuration_aeronef}
                readOnly
                className="w-full p-2 border rounded-lg text-sm bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Par défaut: Été 6 pax, Avec flottabilité
              </p>
            </div>

            <hr className="my-4" />

            {/* LISTE DES VOLS */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-lg">✈️ Vols ({flights.length})</h3>
                <Button
                  onClick={() => setShowAddFlightForm(!showAddFlightForm)}
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  <Plus size={14} className="mr-1" />
                  Ajouter un vol
                </Button>
              </div>

              {/* Formulaire ajout vol */}
              {showAddFlightForm && (
                <Card className="mb-3 border-2 border-blue-200">
                  <CardContent className="pt-4 space-y-3">
                    <h4 className="font-semibold text-sm">Vol #{flights.length + 1}</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Type mission */}
                      <div>
                        <label className="block text-xs font-medium mb-1">Type mission</label>
                        <select
                          value={newFlight.type_mission}
                          onChange={(e) => setNewFlight({ ...newFlight, type_mission: e.target.value })}
                          className="w-full p-2 border rounded-lg text-sm"
                        >
                          <option value="TP">TP (Transport Passagers)</option>
                          <option value="MEP">MEP (Mise En Place)</option>
                        </select>
                      </div>

                      {/* Masse bagages */}
                      <div>
                        <label className="block text-xs font-medium mb-1">Bagages (kg)</label>
                        <input
                          type="number"
                          value={newFlight.bagages_kg}
                          onChange={(e) => setNewFlight({ ...newFlight, bagages_kg: e.target.value })}
                          className="w-full p-2 border rounded-lg text-sm"
                        />
                      </div>

                      {/* Départ */}
                      <div className="relative">
                        <label className="block text-xs font-medium mb-1">Départ</label>
                        <input
                          type="text"
                          value={searchDeparture}
                          onChange={(e) => setSearchDeparture(e.target.value)}
                          onFocus={() => setShowDepartureResults(true)}
                          onBlur={() => setTimeout(() => setShowDepartureResults(false), 200)}
                          placeholder="Rechercher une DZ..."
                          className="w-full p-2 border rounded-lg text-sm"
                        />
                        {showDepartureResults && (
                          <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {filteredDepartureDropzones.length === 0 ? (
                              <div className="p-2 text-sm text-gray-400">
                                {dropzones.length === 0 ? 'Chargement...' : 'Aucune DZ trouvée'}
                              </div>
                            ) : (
                              filteredDepartureDropzones.slice(0, 10).map(dz => (
                                <button
                                  key={dz.id}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    selectDeparture(dz)
                                  }}
                                  className="w-full text-left p-2 hover:bg-blue-50 text-sm border-b last:border-b-0"
                                >
                                  <span className="font-semibold text-blue-600">{dz.short_code || dz.oaci_code}</span> - {dz.name}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {/* Arrivée */}
                      <div className="relative">
                        <label className="block text-xs font-medium mb-1">Arrivée</label>
                        <input
                          type="text"
                          value={searchArrival}
                          onChange={(e) => setSearchArrival(e.target.value)}
                          onFocus={() => setShowArrivalResults(true)}
                          onBlur={() => setTimeout(() => setShowArrivalResults(false), 200)}
                          placeholder="Rechercher une DZ..."
                          className="w-full p-2 border rounded-lg text-sm"
                        />
                        {showArrivalResults && (
                          <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {filteredArrivalDropzones.length === 0 ? (
                              <div className="p-2 text-sm text-gray-400">
                                {dropzones.length === 0 ? 'Chargement...' : 'Aucune DZ trouvée'}
                              </div>
                            ) : (
                              filteredArrivalDropzones.slice(0, 10).map(dz => (
                                <button
                                  key={dz.id}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    selectArrival(dz)
                                  }}
                                  className="w-full text-left p-2 hover:bg-blue-50 text-sm border-b last:border-b-0"
                                >
                                  <span className="font-semibold text-blue-600">{dz.short_code || dz.oaci_code}</span> - {dz.name}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {/* Temps vol prévu */}
                      <div>
                        <label className="block text-xs font-medium mb-1">Temps vol prévu (min)</label>
                        <input
                          type="number"
                          value={newFlight.estimated_duration}
                          onChange={(e) => setNewFlight({ ...newFlight, estimated_duration: e.target.value })}
                          className="w-full p-2 border rounded-lg text-sm"
                        />
                      </div>
                    </div>

                    {/* Passagers */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-medium">Passagers (max 6)</label>
                        <Button
                          onClick={addPassengerToFlight}
                          size="sm"
                          variant="outline"
                          disabled={newFlight.passengers.length >= 6}
                        >
                          + Ajouter
                        </Button>
                      </div>
                      {newFlight.passengers.map((pax, idx) => (
                        <div key={idx} className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={pax.name}
                            onChange={(e) => updatePassenger(idx, 'name', e.target.value)}
                            placeholder="Nom du passager"
                            className="flex-1 p-2 border rounded-lg text-sm"
                          />
                          <select
                            value={pax.type}
                            onChange={(e) => updatePassenger(idx, 'type', e.target.value)}
                            className="p-2 border rounded-lg text-sm"
                          >
                            <option value="H">H (Homme)</option>
                            <option value="F">F (Femme)</option>
                            <option value="E">E (Enfant)</option>
                          </select>
                          <button
                            onClick={() => removePassenger(idx)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      {newFlight.passengers.length === 0 && (
                        <p className="text-xs text-gray-400 italic">Aucun passager ajouté</p>
                      )}
                    </div>

                    {/* Cas de vol calculé */}
                    {newFlight.passengers.length > 0 && (() => {
                      const cas = calculateLoadingCase(newFlight.passengers)
                      const keroseneMax = cas ? calculateMaxKerosene(cas, newFlight.bagages_kg || 0) : 0
                      return (
                        <div className="p-3 bg-blue-50 rounded border border-blue-200">
                          <p className="text-xs font-semibold">
                            📊 Cas de vol: <span className="text-blue-600">{cas ? `#${cas.case_number}` : 'Non trouvé'}</span>
                          </p>
                          {cas && (
                            <p className="text-xs">
                              ⛽ Kérosène max: <span className={keroseneMax === 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>{keroseneMax}%</span>
                              {keroseneMax === 0 && <span className="ml-2 text-red-600">⚠️ VOL IMPOSSIBLE</span>}
                            </p>
                          )}
                        </div>
                      )
                    })()}

                    {/* Boutons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={addFlightToPve}
                        className="flex-1 bg-green-500 hover:bg-green-600"
                      >
                        ✅ Ajouter ce vol
                      </Button>
                      <Button
                        onClick={resetFlightForm}
                        variant="outline"
                        className="flex-1"
                      >
                        Annuler
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Liste des vols ajoutés */}
              {flights.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-4">
                  Aucun vol ajouté au PVE
                </p>
              ) : (
                <div className="space-y-2">
                  {flights.map((flight, idx) => (
                    <Card key={idx} className="border-l-4 border-blue-500">
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-bold text-sm">
                              Vol #{idx + 1} - {flight.type_mission}
                            </h4>
                            <p className="text-xs text-gray-600">
                              {dropzones.find(d => d.id === flight.departure_dz_id)?.name || 'N/A'} → {dropzones.find(d => d.id === flight.arrival_dz_id)?.name || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-600">
                              {flight.passengers.length} passager{flight.passengers.length > 1 ? 's' : ''} 
                              {flight.bagages_kg > 0 && ` - ${flight.bagages_kg}kg bagages`}
                            </p>
                            {flight.cas_vol && (
                              <p className="text-xs">
                                <span className="font-semibold">Cas:</span> #{flight.cas_vol} - 
                                <span className={flight.kerosene_max_pct === 0 ? 'text-red-600 font-bold' : 'text-green-600'}>
                                  {' '}{flight.kerosene_max_pct}% kérosène
                                </span>
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => removeFlightFromPve(idx)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Boutons d'action PVE */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={previewPdf}
                className="flex-1 bg-purple-500 hover:bg-purple-600"
                disabled={flights.length === 0}
              >
                <Eye size={16} className="mr-1" />
                Prévisualiser PDF
              </Button>
              <Button
                onClick={savePve}
                className="flex-1 bg-green-500 hover:bg-green-600"
              >
                💾 Enregistrer
              </Button>
              <Button
                onClick={resetPveForm}
                variant="outline"
                className="flex-1"
              >
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des PVE */}
      {!showCreateForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {pves.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="pt-6 text-center text-gray-400">
                <FileText size={48} className="mx-auto mb-3 opacity-50" />
                <p>Aucun PVE enregistré</p>
              </CardContent>
            </Card>
          ) : (
            pves.map(pve => (
              <Card key={pve.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-base">
                        {pve.aircraft?.registration || 'N/A'}
                      </h3>
                      <p className="text-xs text-gray-600">{pve.aircraft?.model || ''}</p>
                      <p className="text-xs text-gray-500">
                        📅 {new Date(pve.flight_date).toLocaleDateString('fr-FR')}
                      </p>
                      {pve.pilot_name && (
                        <p className="text-xs text-gray-500">
                          👨‍✈️ {pve.pilot_name}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => deletePve(pve.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={() => openEditPve(pve)}
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                    >
                      ✏️ Modifier
                    </Button>
                    <Button
                      onClick={() => previewExistingPvePdf(pve)}
                      size="sm"
                      className="flex-1 text-xs bg-purple-500 hover:bg-purple-600"
                    >
                      <Eye size={14} className="mr-1" />
                      PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}