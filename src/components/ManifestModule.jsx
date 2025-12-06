import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { ClipboardCheck, FileText, Download, Plus, Eye, Trash2, CheckCircle, AlertCircle } from 'lucide-react'
import jsPDF from 'jspdf'

export default function ManifestModule({ userId, userRole }) {
  const [manifests, setManifests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [viewingManifest, setViewingManifest] = useState(null)
  
  // Données du formulaire
  const [formData, setFormData] = useState({
    flight_number: '',
    aircraft_registration: '',
    pilot_name: '',
    departure: '',
    destination: '',
    scheduled_departure: '',
    passengers: [],
    weather_check: false,
    fuel_check: false,
    documents_check: false,
    equipment_check: false,
    exterior_check: false,
    interior_check: false,
    notes: ''
  })

  // Passagers temporaires
  const [newPassenger, setNewPassenger] = useState({
    nom: '',
    prenom: '',
    poids: '',
    siege: ''
  })

  useEffect(() => {
    loadManifests()
  }, [])

  const loadManifests = async () => {
    const { data, error } = await supabase
      .from('manifests')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setManifests(data)
    } else {
      console.error('Erreur chargement manifests:', error)
    }
    setLoading(false)
  }

  const resetForm = () => {
    setFormData({
      flight_number: '',
      aircraft_registration: '',
      pilot_name: '',
      departure: '',
      destination: '',
      scheduled_departure: '',
      passengers: [],
      weather_check: false,
      fuel_check: false,
      documents_check: false,
      equipment_check: false,
      exterior_check: false,
      interior_check: false,
      notes: ''
    })
    setNewPassenger({ nom: '', prenom: '', poids: '', siege: '' })
    setShowCreateForm(false)
  }

  const addPassenger = () => {
    if (newPassenger.nom && newPassenger.prenom) {
      setFormData({
        ...formData,
        passengers: [...formData.passengers, { ...newPassenger }]
      })
      setNewPassenger({ nom: '', prenom: '', poids: '', siege: '' })
    } else {
      alert('⚠️ Veuillez remplir au minimum nom et prénom')
    }
  }

  const removePassenger = (index) => {
    setFormData({
      ...formData,
      passengers: formData.passengers.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validation
    if (!formData.flight_number || !formData.aircraft_registration || !formData.pilot_name) {
      alert('⚠️ Veuillez remplir les champs obligatoires (N° vol, immatriculation, pilote)')
      return
    }

    const manifestData = {
      ...formData,
      created_by: userId,
      status: 'draft'
    }

    const { error } = await supabase
      .from('manifests')
      .insert([manifestData])

    if (!error) {
      alert('✅ Manifest créé')
      loadManifests()
      resetForm()
    } else {
      console.error('Erreur création manifest:', error)
      alert('❌ Erreur lors de la création')
    }
  }

  const validateManifest = async (id) => {
    const manifest = manifests.find(m => m.id === id)
    
    // Vérifier que toutes les checklist sont cochées
    const allChecked = manifest.weather_check && 
                      manifest.fuel_check && 
                      manifest.documents_check && 
                      manifest.equipment_check && 
                      manifest.exterior_check && 
                      manifest.interior_check

    if (!allChecked) {
      alert('⚠️ Veuillez compléter toutes les vérifications avant de valider')
      return
    }

    const { error } = await supabase
      .from('manifests')
      .update({ 
        status: 'validated',
        validated_at: new Date().toISOString(),
        validated_by: userId
      })
      .eq('id', id)

    if (!error) {
      alert('✅ Manifest validé')
      loadManifests()
    }
  }

  const deleteManifest = async (id, flightNumber) => {
    if (!confirm(`Supprimer le manifest du vol ${flightNumber} ?`)) return

    const { error } = await supabase
      .from('manifests')
      .delete()
      .eq('id', id)

    if (!error) {
      alert('✅ Manifest supprimé')
      loadManifests()
    }
  }

  const generatePDF = (manifest) => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    
    // En-tête
    doc.setFontSize(20)
    doc.text('MANIFEST DE VOL', pageWidth / 2, 20, { align: 'center' })
    
    doc.setFontSize(10)
    doc.text(`N° Vol: ${manifest.flight_number}`, 20, 35)
    doc.text(`Immatriculation: ${manifest.aircraft_registration}`, 20, 42)
    doc.text(`Pilote: ${manifest.pilot_name}`, 20, 49)
    
    doc.text(`Départ: ${manifest.departure}`, 120, 35)
    doc.text(`Destination: ${manifest.destination}`, 120, 42)
    doc.text(`Heure prévue: ${manifest.scheduled_departure}`, 120, 49)
    
    // Passagers
    doc.setFontSize(14)
    doc.text('PASSAGERS', 20, 65)
    
    doc.setFontSize(10)
    let yPos = 75
    manifest.passengers.forEach((pax, idx) => {
      doc.text(`${idx + 1}. ${pax.prenom} ${pax.nom}`, 25, yPos)
      if (pax.poids) doc.text(`Poids: ${pax.poids} kg`, 100, yPos)
      if (pax.siege) doc.text(`Siège: ${pax.siege}`, 140, yPos)
      yPos += 7
    })
    
    // Checklist
    yPos += 10
    doc.setFontSize(14)
    doc.text('CHECKLIST PRÉ-VOL', 20, yPos)
    
    yPos += 10
    doc.setFontSize(10)
    const checks = [
      { label: 'Météo vérifiée', value: manifest.weather_check },
      { label: 'Carburant vérifié', value: manifest.fuel_check },
      { label: 'Documents vérifiés', value: manifest.documents_check },
      { label: 'Équipements vérifiés', value: manifest.equipment_check },
      { label: 'Inspection extérieure', value: manifest.exterior_check },
      { label: 'Inspection intérieure', value: manifest.interior_check }
    ]
    
    checks.forEach(check => {
      doc.text(`${check.value ? '☑' : '☐'} ${check.label}`, 25, yPos)
      yPos += 7
    })
    
    // Notes
    if (manifest.notes) {
      yPos += 10
      doc.setFontSize(14)
      doc.text('NOTES', 20, yPos)
      yPos += 10
      doc.setFontSize(10)
      const splitNotes = doc.splitTextToSize(manifest.notes, pageWidth - 40)
      doc.text(splitNotes, 20, yPos)
    }
    
    // Pied de page
    const pageHeight = doc.internal.pageSize.getHeight()
    doc.setFontSize(8)
    doc.text(`Créé le ${new Date(manifest.created_at).toLocaleString('fr-FR')}`, 20, pageHeight - 20)
    if (manifest.status === 'validated') {
      doc.text(`Validé le ${new Date(manifest.validated_at).toLocaleString('fr-FR')}`, 20, pageHeight - 15)
    }
    
    // Télécharger
    doc.save(`Manifest_${manifest.flight_number}_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  // Statistiques
  const stats = {
    total: manifests.length,
    draft: manifests.filter(m => m.status === 'draft').length,
    validated: manifests.filter(m => m.status === 'validated').length,
    thisMonth: manifests.filter(m => {
      const created = new Date(m.created_at)
      const now = new Date()
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
    }).length
  }

  // Badge statut
  const getStatusBadge = (status) => {
    if (status === 'validated') {
      return { color: 'bg-green-100 text-green-700', icon: <CheckCircle size={14} />, label: '✓ Validé' }
    }
    return { color: 'bg-orange-100 text-orange-700', icon: <AlertCircle size={14} />, label: '⏳ Brouillon' }
  }

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  return (
    <div className="space-y-2 sm:space-y-4 sm:space-y-3 sm:space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-2 sm:gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-4 sm:pt-3 sm:pt-6 p-3 sm:p-6">
            <div className="text-xs sm:text-sm text-blue-600 mb-1">Total Manifests</div>
            <div className="text-2xl sm:text-3xl font-bold text-blue-900">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="pt-4 sm:pt-3 sm:pt-6 p-3 sm:p-6">
            <div className="text-xs sm:text-sm text-orange-600 mb-1">Brouillons</div>
            <div className="text-2xl sm:text-3xl font-bold text-orange-900">{stats.draft}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-4 sm:pt-3 sm:pt-6 p-3 sm:p-6">
            <div className="text-xs sm:text-sm text-green-600 mb-1">Validés</div>
            <div className="text-2xl sm:text-3xl font-bold text-green-900">{stats.validated}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-4 sm:pt-3 sm:pt-6 p-3 sm:p-6">
            <div className="text-xs sm:text-sm text-purple-600 mb-1">Ce mois</div>
            <div className="text-2xl sm:text-3xl font-bold text-purple-900">{stats.thisMonth}</div>
          </CardContent>
        </Card>
      </div>

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h3 className="text-lg sm:text-xl font-semibold">
          📋 PVE / Manifests de vol
        </h3>
        <Button onClick={() => setShowCreateForm(!showCreateForm)} className="w-full sm:w-auto text-sm">
          <Plus size={18} className="mr-2" />
          Nouveau Manifest
        </Button>
      </div>

      {/* Formulaire de création */}
      {showCreateForm && (
        <Card className="border-2 border-blue-500">
          <CardHeader className="bg-blue-50 p-3 sm:p-6">
            <CardTitle className="text-base sm:text-xl">➕ Créer un nouveau manifest</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-3 sm:pt-6">
            <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-4 sm:space-y-3 sm:space-y-6">
              {/* Infos vol */}
              <div>
                <h4 className="font-semibold mb-3 text-sm sm:text-base">✈️ Informations vol</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-2 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1">N° Vol *</label>
                    <input
                      type="text"
                      value={formData.flight_number}
                      onChange={(e) => setFormData({ ...formData, flight_number: e.target.value })}
                      placeholder="Ex: JSHS001"
                      className="w-full p-2 border rounded-lg text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1">Immatriculation *</label>
                    <input
                      type="text"
                      value={formData.aircraft_registration}
                      onChange={(e) => setFormData({ ...formData, aircraft_registration: e.target.value })}
                      placeholder="Ex: F-HELI"
                      className="w-full p-2 border rounded-lg text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1">Pilote *</label>
                    <input
                      type="text"
                      value={formData.pilot_name}
                      onChange={(e) => setFormData({ ...formData, pilot_name: e.target.value })}
                      placeholder="Nom du pilote"
                      className="w-full p-2 border rounded-lg text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1">Heure prévue</label>
                    <input
                      type="datetime-local"
                      value={formData.scheduled_departure}
                      onChange={(e) => setFormData({ ...formData, scheduled_departure: e.target.value })}
                      className="w-full p-2 border rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1">Départ</label>
                    <input
                      type="text"
                      value={formData.departure}
                      onChange={(e) => setFormData({ ...formData, departure: e.target.value })}
                      placeholder="Ex: Figari"
                      className="w-full p-2 border rounded-lg text-sm"
                    />
                  </div>

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
                </div>
              </div>

              {/* Passagers */}
              <div>
                <h4 className="font-semibold mb-3 text-sm sm:text-base">👥 Passagers ({formData.passengers.length})</h4>
                
                {/* Liste passagers */}
                {formData.passengers.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {formData.passengers.map((pax, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                        <div>
                          <span className="font-semibold">{pax.prenom} {pax.nom}</span>
                          {pax.poids && <span className="text-gray-600 ml-2">({pax.poids} kg)</span>}
                          {pax.siege && <span className="text-gray-600 ml-2">Siège {pax.siege}</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() => removePassenger(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Ajouter passager */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <input
                    type="text"
                    value={newPassenger.nom}
                    onChange={(e) => setNewPassenger({ ...newPassenger, nom: e.target.value })}
                    placeholder="Nom"
                    className="p-2 border rounded text-sm"
                  />
                  <input
                    type="text"
                    value={newPassenger.prenom}
                    onChange={(e) => setNewPassenger({ ...newPassenger, prenom: e.target.value })}
                    placeholder="Prénom"
                    className="p-2 border rounded text-sm"
                  />
                  <input
                    type="number"
                    value={newPassenger.poids}
                    onChange={(e) => setNewPassenger({ ...newPassenger, poids: e.target.value })}
                    placeholder="Poids (kg)"
                    className="p-2 border rounded text-sm"
                  />
                  <input
                    type="text"
                    value={newPassenger.siege}
                    onChange={(e) => setNewPassenger({ ...newPassenger, siege: e.target.value })}
                    placeholder="Siège"
                    className="p-2 border rounded text-sm"
                  />
                  <Button type="button" onClick={addPassenger} size="sm" className="text-xs">
                    + Ajouter
                  </Button>
                </div>
              </div>

              {/* Checklist */}
              <div>
                <h4 className="font-semibold mb-3 text-sm sm:text-base">✅ Checklist pré-vol</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                  {[
                    { key: 'weather_check', label: '🌤️ Météo vérifiée' },
                    { key: 'fuel_check', label: '⛽ Carburant vérifié' },
                    { key: 'documents_check', label: '📄 Documents vérifiés' },
                    { key: 'equipment_check', label: '🎒 Équipements vérifiés' },
                    { key: 'exterior_check', label: '🔍 Inspection extérieure' },
                    { key: 'interior_check', label: '🪑 Inspection intérieure' }
                  ].map(item => (
                    <label key={item.key} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={formData[item.key]}
                        onChange={(e) => setFormData({ ...formData, [item.key]: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">📝 Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Remarques, conditions particulières..."
                  className="w-full p-2 border rounded-lg text-sm"
                  rows="3"
                />
              </div>

              {/* Boutons */}
              <div className="flex gap-2">
                <Button type="submit" className="bg-green-500 hover:bg-green-600 text-sm">
                  ✅ Créer le manifest
                </Button>
                <Button type="button" onClick={resetForm} variant="ghost" className="text-sm">
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Liste des manifests */}
      <div className="space-y-3">
        {manifests.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ClipboardCheck size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">Aucun manifest créé</p>
          </div>
        ) : (
          manifests.map(manifest => (
            <Card key={manifest.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 sm:pt-3 sm:pt-6 p-3 sm:p-6">
                <div className="flex flex-col md:flex-row md:items-start gap-2 sm:gap-4">
                  {/* Infos principales */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-base sm:text-lg">Vol {manifest.flight_number}</h4>
                      <span className={`${getStatusBadge(manifest.status).color} px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1`}>
                        {getStatusBadge(manifest.status).icon}
                        {getStatusBadge(manifest.status).label}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                      <div><span className="font-semibold">Immat:</span> {manifest.aircraft_registration}</div>
                      <div><span className="font-semibold">Pilote:</span> {manifest.pilot_name}</div>
                      <div><span className="font-semibold">Trajet:</span> {manifest.departure || '?'} → {manifest.destination || '?'}</div>
                      <div><span className="font-semibold">Passagers:</span> {manifest.passengers?.length || 0}</div>
                    </div>

                    {manifest.scheduled_departure && (
                      <div className="text-xs sm:text-sm text-gray-600">
                        🕐 {new Date(manifest.scheduled_departure).toLocaleString('fr-FR')}
                      </div>
                    )}

                    <div className="text-xs text-gray-400 pt-2 border-t">
                      Créé le {new Date(manifest.created_at).toLocaleString('fr-FR')}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex md:flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewingManifest(manifest)}
                      className="text-xs whitespace-nowrap"
                    >
                      <Eye size={14} className="mr-1" />
                      Voir
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generatePDF(manifest)}
                      className="text-xs whitespace-nowrap"
                    >
                      <Download size={14} className="mr-1" />
                      PDF
                    </Button>

                    {manifest.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => validateManifest(manifest.id)}
                        className="bg-green-500 hover:bg-green-600 text-xs whitespace-nowrap"
                      >
                        <CheckCircle size={14} className="mr-1" />
                        Valider
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteManifest(manifest.id, manifest.flight_number)}
                      className="text-xs"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de visualisation */}
      {viewingManifest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader className="bg-blue-50 p-3 sm:p-6">
              <CardTitle className="flex justify-between items-center text-base sm:text-xl">
                <span>📋 Manifest Vol {viewingManifest.flight_number}</span>
                <button onClick={() => setViewingManifest(null)} className="text-gray-500 hover:text-gray-700">
                  <X size={20} />
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-3 sm:pt-6 space-y-2 sm:space-y-4">
              {/* Infos vol */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><strong>Immatriculation:</strong> {viewingManifest.aircraft_registration}</div>
                <div><strong>Pilote:</strong> {viewingManifest.pilot_name}</div>
                <div><strong>Départ:</strong> {viewingManifest.departure || '-'}</div>
                <div><strong>Destination:</strong> {viewingManifest.destination || '-'}</div>
              </div>

              {/* Passagers */}
              {viewingManifest.passengers && viewingManifest.passengers.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Passagers:</h4>
                  <div className="space-y-1">
                    {viewingManifest.passengers.map((pax, idx) => (
                      <div key={idx} className="p-2 bg-gray-50 rounded text-sm">
                        {idx + 1}. {pax.prenom} {pax.nom}
                        {pax.poids && ` - ${pax.poids} kg`}
                        {pax.siege && ` - Siège ${pax.siege}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Checklist */}
              <div>
                <h4 className="font-semibold mb-2 text-sm">Checklist:</h4>
                <div className="space-y-1 text-sm">
                  <div>{viewingManifest.weather_check ? '✅' : '❌'} Météo vérifiée</div>
                  <div>{viewingManifest.fuel_check ? '✅' : '❌'} Carburant vérifié</div>
                  <div>{viewingManifest.documents_check ? '✅' : '❌'} Documents vérifiés</div>
                  <div>{viewingManifest.equipment_check ? '✅' : '❌'} Équipements vérifiés</div>
                  <div>{viewingManifest.exterior_check ? '✅' : '❌'} Inspection extérieure</div>
                  <div>{viewingManifest.interior_check ? '✅' : '❌'} Inspection intérieure</div>
                </div>
              </div>

              {/* Notes */}
              {viewingManifest.notes && (
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Notes:</h4>
                  <div className="p-2 bg-gray-50 rounded text-sm">{viewingManifest.notes}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}