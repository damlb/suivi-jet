import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Plane, Plus, Trash2, Upload } from 'lucide-react'

export default function AircraftModule() {
  const [aircraft, setAircraft] = useState([])
  const [selectedAircraft, setSelectedAircraft] = useState(null)
  const [loadingCases, setLoadingCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showCasesManager, setShowCasesManager] = useState(false)
  const [editingAircraft, setEditingAircraft] = useState(null)
  
  const [formData, setFormData] = useState({
    registration: '',
    model: '',
    configuration: '',
    masse_vide: '',
    masse_max: '',
    notes: ''
  })

  useEffect(() => {
    loadAircraft()
  }, [])

  const loadAircraft = async () => {
    const { data, error } = await supabase
      .from('aircraft')
      .select('*')
      .eq('actif', true)
      .order('registration', { ascending: true })

    if (data) {
      setAircraft(data)
    } else {
      console.error('Erreur chargement appareils:', error)
    }
    setLoading(false)
  }

  const loadLoadingCases = async (aircraftId) => {
    const { data, error } = await supabase
      .from('loading_cases')
      .select('*')
      .eq('aircraft_id', aircraftId)
      .order('case_number', { ascending: true })

    if (data) {
      setLoadingCases(data)
    } else {
      console.error('Erreur chargement cas:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      registration: '',
      model: '',
      configuration: '',
      masse_vide: '',
      masse_max: '',
      notes: ''
    })
    setShowAddForm(false)
    setEditingAircraft(null)
  }

  const addAircraft = async () => {
    if (!formData.registration || !formData.model) {
      alert('⚠️ Veuillez remplir au moins l\'immatriculation et le modèle')
      return
    }

    const dataToInsert = {
      registration: formData.registration.toUpperCase(),
      model: formData.model,
      configuration: formData.configuration,
      masse_vide: formData.masse_vide ? parseInt(formData.masse_vide) : null,
      masse_max: formData.masse_max ? parseInt(formData.masse_max) : null,
      notes: formData.notes,
      actif: true
    }

    const { error } = await supabase
      .from('aircraft')
      .insert([dataToInsert])

    if (!error) {
      loadAircraft()
      resetForm()
      alert('✅ Appareil ajouté')
    } else {
      console.error('Erreur ajout appareil:', error)
      alert('❌ Erreur: ' + error.message)
    }
  }

  const updateAircraft = async () => {
    if (!editingAircraft) return

    const dataToUpdate = {
      registration: formData.registration.toUpperCase(),
      model: formData.model,
      configuration: formData.configuration,
      masse_vide: formData.masse_vide ? parseInt(formData.masse_vide) : null,
      masse_max: formData.masse_max ? parseInt(formData.masse_max) : null,
      notes: formData.notes
    }

    const { error } = await supabase
      .from('aircraft')
      .update(dataToUpdate)
      .eq('id', editingAircraft.id)

    if (!error) {
      loadAircraft()
      resetForm()
      alert('✅ Appareil modifié')
    } else {
      console.error('Erreur modification appareil:', error)
      alert('❌ Erreur: ' + error.message)
    }
  }

  const deleteAircraft = async (id) => {
    if (!window.confirm('⚠️ Supprimer cet appareil ? Tous les cas de chargement associés seront supprimés.')) return

    const { error } = await supabase
      .from('aircraft')
      .delete()
      .eq('id', id)

    if (!error) {
      loadAircraft()
      if (selectedAircraft?.id === id) {
        setSelectedAircraft(null)
        setLoadingCases([])
      }
      alert('✅ Appareil supprimé')
    } else {
      console.error('Erreur suppression appareil:', error)
      alert('❌ Erreur: ' + error.message)
    }
  }

  const openEditAircraft = (ac) => {
    setEditingAircraft(ac)
    setFormData({
      registration: ac.registration,
      model: ac.model,
      configuration: ac.configuration || '',
      masse_vide: ac.masse_vide || '',
      masse_max: ac.masse_max || '',
      notes: ac.notes || ''
    })
    setShowAddForm(true)
  }

  const viewLoadingCases = (ac) => {
    setSelectedAircraft(ac)
    loadLoadingCases(ac.id)
    setShowCasesManager(true)
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
            <Plane size={24} />
            Gestion des Appareils
          </h2>
          <p className="text-sm text-gray-600">{aircraft.length} appareil{aircraft.length > 1 ? 's' : ''} enregistré{aircraft.length > 1 ? 's' : ''}</p>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full sm:w-auto text-sm"
        >
          <Plus size={16} className="mr-1" />
          Nouvel appareil
        </Button>
      </div>

      {/* Formulaire ajout/modification appareil */}
      {showAddForm && (
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-3 sm:p-6">
            <CardTitle className="text-base sm:text-xl">
              {editingAircraft ? '✏️ Modifier l\'appareil' : '➕ Nouvel appareil'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Immatriculation */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">
                  Immatriculation *
                </label>
                <input
                  type="text"
                  value={formData.registration}
                  onChange={(e) => setFormData({ ...formData, registration: e.target.value })}
                  placeholder="F-HAMM"
                  className="w-full p-2 border rounded-lg text-sm uppercase"
                />
              </div>

              {/* Modèle */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">
                  Modèle *
                </label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="EC130 T2"
                  className="w-full p-2 border rounded-lg text-sm"
                />
              </div>

              {/* Configuration */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">
                  Configuration
                </label>
                <input
                  type="text"
                  value={formData.configuration}
                  onChange={(e) => setFormData({ ...formData, configuration: e.target.value })}
                  placeholder="ETE 6 FLOTTA"
                  className="w-full p-2 border rounded-lg text-sm"
                />
              </div>

              {/* Masse à vide */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">
                  Masse à vide (MOE) - Kg
                </label>
                <input
                  type="number"
                  value={formData.masse_vide}
                  onChange={(e) => setFormData({ ...formData, masse_vide: e.target.value })}
                  placeholder="1726"
                  className="w-full p-2 border rounded-lg text-sm"
                />
              </div>

              {/* Masse max */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">
                  Masse maximale - Kg
                </label>
                <input
                  type="number"
                  value={formData.masse_max}
                  onChange={(e) => setFormData({ ...formData, masse_max: e.target.value })}
                  placeholder="2500"
                  className="w-full p-2 border rounded-lg text-sm"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">
                Notes / Équipements
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Configuration: Flotta & canot, Gilets x7..."
                className="w-full p-2 border rounded-lg text-sm"
                rows="3"
              />
            </div>

            {/* Boutons */}
            <div className="flex gap-2 pt-2">
              {editingAircraft ? (
                <>
                  <Button
                    onClick={updateAircraft}
                    className="flex-1 bg-blue-500 hover:bg-blue-600"
                  >
                    💾 Enregistrer
                  </Button>
                  <Button
                    onClick={resetForm}
                    variant="outline"
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={addAircraft}
                    className="flex-1 bg-green-500 hover:bg-green-600"
                  >
                    ✅ Ajouter
                  </Button>
                  <Button
                    onClick={resetForm}
                    variant="outline"
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des appareils */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {aircraft.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="pt-6 text-center text-gray-400">
              <Plane size={48} className="mx-auto mb-3 opacity-50" />
              <p>Aucun appareil enregistré</p>
            </CardContent>
          </Card>
        ) : (
          aircraft.map(ac => (
            <Card key={ac.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-3 sm:p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-blue-600">
                      {ac.registration}
                    </h3>
                    <p className="text-sm text-gray-600">{ac.model}</p>
                    {ac.configuration && (
                      <p className="text-xs text-gray-500 mt-1">{ac.configuration}</p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteAircraft(ac.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="space-y-1 text-xs text-gray-600 mb-3">
                  {ac.masse_vide && (
                    <div>
                      <span className="font-semibold">MOE:</span> {ac.masse_vide} kg
                    </div>
                  )}
                  {ac.masse_max && (
                    <div>
                      <span className="font-semibold">Masse max:</span> {ac.masse_max} kg
                    </div>
                  )}
                  {ac.notes && (
                    <div className="text-xs bg-gray-50 p-2 rounded mt-2">
                      {ac.notes}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => openEditAircraft(ac)}
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                  >
                    ✏️ Modifier
                  </Button>
                  <Button
                    onClick={() => viewLoadingCases(ac)}
                    size="sm"
                    className="flex-1 text-xs bg-purple-500 hover:bg-purple-600"
                  >
                    📊 Cas de vol
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* MODAL - Cas de chargement */}
      {showCasesManager && selectedAircraft && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowCasesManager(false)
            setSelectedAircraft(null)
            setLoadingCases([])
          }}
        >
          <Card 
            className="w-full max-w-6xl bg-white max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    📊 Cas de chargement - {selectedAircraft.registration}
                  </CardTitle>
                  <p className="text-sm opacity-90">{selectedAircraft.model}</p>
                </div>
                <button
                  onClick={() => {
                    setShowCasesManager(false)
                    setSelectedAircraft(null)
                    setLoadingCases([])
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2"
                >
                  ✕
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 overflow-y-auto flex-1">
              {loadingCases.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>Aucun cas de chargement enregistré pour cet appareil</p>
                  <p className="text-sm mt-2">Utilisez le script SQL pour importer les cas</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="p-2 text-left">N° Cas</th>
                          <th className="p-2 text-center">PAX</th>
                          <th className="p-2 text-center">H</th>
                          <th className="p-2 text-center">F</th>
                          <th className="p-2 text-center">E</th>
                          <th className="p-2 text-right">Carburant %</th>
                          <th className="p-2 text-right">Masse totale</th>
                          <th className="p-2 text-right">Masse dispo</th>
                          <th className="p-2 text-center">Centrage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingCases.map(cas => (
                          <tr 
                            key={cas.id} 
                            className={`border-b hover:bg-gray-50 ${
                              cas.carburant_max_pct === 0 ? 'bg-red-50' : ''
                            }`}
                          >
                            <td className="p-2 font-bold">{cas.case_number}</td>
                            <td className="p-2 text-center">{cas.nb_pax}</td>
                            <td className="p-2 text-center">{cas.hommes}</td>
                            <td className="p-2 text-center">{cas.femmes}</td>
                            <td className="p-2 text-center">{cas.enfants}</td>
                            <td className="p-2 text-right">
                              {cas.carburant_max_pct === 0 ? (
                                <span className="text-red-600 font-bold">IMPOSSIBLE</span>
                              ) : (
                                <span className={
                                  cas.carburant_max_pct === 100 ? 'text-green-600 font-bold' :
                                  cas.carburant_max_pct >= 80 ? 'text-blue-600' :
                                  'text-orange-600'
                                }>
                                  {cas.carburant_max_pct}%
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-right">{cas.masse_totale} kg</td>
                            <td className="p-2 text-right">{cas.masse_disponible} kg</td>
                            <td className="p-2 text-center text-xs">
                              {cas.centrage_av && '✓Av '}
                              {cas.centrage_c && '✓C '}
                              {cas.centrage_ar && '✓Ar'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded text-xs">
                    <p className="font-semibold mb-1">📝 Légende :</p>
                    <ul className="space-y-1">
                      <li>• <span className="font-semibold">H</span> = Homme, <span className="font-semibold">F</span> = Femme, <span className="font-semibold">E</span> = Enfant</li>
                      <li>• <span className="text-green-600 font-bold">100%</span> = Carburant maximum possible</li>
                      <li>• <span className="text-red-600 font-bold">IMPOSSIBLE</span> = Configuration non autorisée</li>
                      <li>• Centrage : <span className="font-semibold">Av</span> = Avant, <span className="font-semibold">C</span> = Centre, <span className="font-semibold">Ar</span> = Arrière</li>
                    </ul>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button
                      onClick={() => {
                        setShowCasesManager(false)
                        setSelectedAircraft(null)
                        setLoadingCases([])
                      }}
                      variant="outline"
                    >
                      Fermer
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}