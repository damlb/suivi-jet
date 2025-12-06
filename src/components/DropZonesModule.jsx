import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { MapPin, Star, Plus, X } from 'lucide-react'

export default function DropZonesModule({ userId, userRole }) {
  const [dropZones, setDropZones] = useState([])
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [regionFilter, setRegionFilter] = useState('all')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [searchTerm, setSearchTerm] = useState('') // Nouveau : recherche
  const [selectedDZ, setSelectedDZ] = useState(null) // Pour la modale
  const [showModal, setShowModal] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    oaci_code: '',
    latitude: '',
    longitude: '',
    notes: '',
    region: 'corse'
  })

  useEffect(() => {
    loadData()
  }, [userId])

  const loadData = async () => {
    // Charger les Drop Zones
    const { data: dzData } = await supabase
      .from('drop_zones')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (dzData) setDropZones(dzData)

    // Charger les favoris (uniquement pour pilotes)
    if (userRole !== 'agent_sol') {
      const { data: favData } = await supabase
        .from('dz_favorites')
        .select('drop_zone_id')
        .eq('user_id', userId)

      if (favData) {
        setFavorites(favData.map(f => f.drop_zone_id))
      }
    }

    setLoading(false)
  }

  const toggleFavorite = async (dzId, e) => {
    e.stopPropagation() // Empêcher l'ouverture de la modale

    const isFavorite = favorites.includes(dzId)

    if (isFavorite) {
      // Retirer des favoris
      const { error } = await supabase
        .from('dz_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('drop_zone_id', dzId)

      if (!error) {
        setFavorites(favorites.filter(id => id !== dzId))
      }
    } else {
      // Ajouter aux favoris
      const { error } = await supabase
        .from('dz_favorites')
        .insert({ user_id: userId, drop_zone_id: dzId })

      if (!error) {
        setFavorites([...favorites, dzId])
      }
    }
  }

  const openModal = (dz = null) => {
    if (dz) {
      // Mode édition
      setSelectedDZ(dz)
      setFormData({
        name: dz.name,
        oaci_code: dz.oaci_code || '',
        latitude: dz.latitude.toString(),
        longitude: dz.longitude.toString(),
        notes: dz.notes || '',
        region: dz.region || 'corse'
      })
    } else {
      // Mode création
      setSelectedDZ(null)
      setFormData({
        name: '',
        oaci_code: '',
        latitude: '',
        longitude: '',
        notes: '',
        region: 'corse'
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedDZ(null)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.latitude || !formData.longitude) {
      alert('⚠️ Veuillez remplir tous les champs obligatoires (nom, latitude, longitude)')
      return
    }

    const lat = parseFloat(formData.latitude)
    const lng = parseFloat(formData.longitude)
    
    if (isNaN(lat) || isNaN(lng)) {
      alert('⚠️ Format de coordonnées invalide. Utilisez des nombres décimaux (ex: 41.36815)')
      return
    }

    const dataToSave = {
      name: formData.name,
      oaci_code: formData.oaci_code || null,
      latitude: lat,
      longitude: lng,
      notes: formData.notes || null,
      region: formData.region,
      type: 'custom',
      is_active: true
    }

    if (selectedDZ) {
      // Mise à jour
      console.log('🔄 Tentative UPDATE DZ:', { id: selectedDZ.id, dataToSave })
      
      const { data, error } = await supabase
        .from('drop_zones')
        .update(dataToSave)
        .eq('id', selectedDZ.id)
        .select()

      console.log('Résultat UPDATE:', { data, error })

      if (!error) {
        alert('✅ Drop Zone mise à jour !')
        loadData()
        closeModal()
      } else {
        console.error('❌ Erreur update complète:', error)
        alert(`❌ Erreur lors de la mise à jour: ${error.message}`)
      }
    } else {
      // Création
      dataToSave.created_by = userId
      
      const { error } = await supabase
        .from('drop_zones')
        .insert([dataToSave])

      if (!error) {
        alert('✅ Drop Zone ajoutée avec succès !')
        loadData()
        closeModal()
      } else {
        console.error('Erreur ajout:', error)
        alert('❌ Erreur lors de l\'ajout')
      }
    }
  }

  const handleDelete = async () => {
    if (!selectedDZ) return

    if (!confirm(`⚠️ Êtes-vous sûr de vouloir supprimer "${selectedDZ.name}" ?\n\nCette action est irréversible.`)) {
      return
    }

    console.log('🗑️ Tentative DELETE DZ:', selectedDZ.id)

    const { data, error } = await supabase
      .from('drop_zones')
      .delete()
      .eq('id', selectedDZ.id)
      .select()

    console.log('Résultat DELETE:', { data, error })

    if (!error) {
      alert('✅ Drop Zone supprimée')
      loadData()
      closeModal()
    } else {
      console.error('❌ Erreur suppression complète:', error)
      alert(`❌ Erreur lors de la suppression: ${error.message}`)
    }
  }

  // Filtrer les DZ
  const filteredDZ = dropZones.filter(dz => {
    // Filtre recherche
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      const matchName = dz.name.toLowerCase().includes(search)
      const matchOACI = dz.oaci_code?.toLowerCase().includes(search)
      const matchNotes = dz.notes?.toLowerCase().includes(search)
      if (!matchName && !matchOACI && !matchNotes) return false
    }
    
    // Filtre région
    if (regionFilter !== 'all' && dz.region !== regionFilter) return false
    
    // Filtre favoris (uniquement pour pilotes)
    if (showFavoritesOnly && !favorites.includes(dz.id)) return false
    
    return true
  })

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Statistiques en haut */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-4 p-3">
            <div className="text-xs sm:text-sm text-blue-600 mb-1">Total Drop Zones</div>
            <div className="text-2xl sm:text-3xl font-bold text-blue-900">{dropZones.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-4 p-3">
            <div className="text-xs sm:text-sm text-green-600 mb-1">Aéroports</div>
            <div className="text-2xl sm:text-3xl font-bold text-green-900">
              {dropZones.filter(dz => dz.type === 'airport').length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="pt-4 p-3">
            <div className="text-xs sm:text-sm text-orange-600 mb-1">Héliports</div>
            <div className="text-2xl sm:text-3xl font-bold text-orange-900">
              {dropZones.filter(dz => dz.type === 'heliport').length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-4 p-3">
            <div className="text-xs sm:text-sm text-purple-600 mb-1">Sites Custom</div>
            <div className="text-2xl sm:text-3xl font-bold text-purple-900">
              {dropZones.filter(dz => dz.type === 'custom').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Répartition par région */}
      <Card>
        <CardContent className="pt-4 p-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold">📊 Répartition par région</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                {dropZones.filter(dz => dz.region === 'corse').length}
              </div>
              <div className="text-xs text-gray-600 mt-1">🇫🇷 Corse</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-green-600">
                {dropZones.filter(dz => dz.region === 'france').length}
              </div>
              <div className="text-xs text-gray-600 mt-1">🇫🇷 France</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-red-600">
                {dropZones.filter(dz => dz.region === 'italie').length}
              </div>
              <div className="text-xs text-gray-600 mt-1">🇮🇹 Italie</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-yellow-600">
                {dropZones.filter(dz => dz.region === 'sardaigne').length}
              </div>
              <div className="text-xs text-gray-600 mt-1">🇮🇹 Sardaigne</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* En-tête avec filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
            <MapPin size={20} />
            Gestion Drop Zones
            <span className="text-xs sm:text-sm font-normal text-gray-500">
              ({filteredDZ.length} zone{filteredDZ.length > 1 ? 's' : ''})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Bouton Ajouter */}
            <Button
              onClick={() => openModal()}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              <Plus size={18} className="mr-2" />
              Ajouter une Drop Zone
            </Button>

            {/* Recherche */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 Rechercher une DZ (nom, code OACI, notes...)"
                className="w-full p-2 pl-3 border rounded-lg bg-white text-sm"
              />
            </div>

            {/* Filtres */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Filtre région */}
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="w-full p-2 border rounded-lg bg-white text-sm"
              >
                <option value="all">🌍 Toutes les régions</option>
                <option value="corse">🇫🇷 Corse</option>
                <option value="france">🇫🇷 France continentale</option>
                <option value="italie">🇮🇹 Italie</option>
                <option value="sardaigne">🇮🇹 Sardaigne</option>
              </select>

              {/* Filtre favoris (uniquement pour pilotes) */}
              {userRole !== 'agent_sol' && (
                <label className="flex items-center gap-2 p-2 border rounded-lg bg-white cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={showFavoritesOnly}
                    onChange={(e) => setShowFavoritesOnly(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <Star size={16} className="text-yellow-500" />
                  <span className="text-sm">Favoris uniquement</span>
                </label>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des Drop Zones */}
      {/* Desktop : Tableau comme sur la capture */}
      <div className="hidden sm:block">
        <Card>
          <CardContent className="pt-3 sm:pt-6 overflow-x-auto">
            {filteredDZ.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucune Drop Zone trouvée
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left p-3 font-semibold text-sm">Type</th>
                    <th className="text-left p-3 font-semibold text-sm">Nom</th>
                    <th className="text-left p-3 font-semibold text-sm">Codes</th>
                    <th className="text-left p-3 font-semibold text-sm">Région</th>
                    <th className="text-left p-3 font-semibold text-sm">Coordonnées</th>
                    <th className="text-center p-3 font-semibold text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDZ.map(dz => (
                    <tr 
                      key={dz.id}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => openModal(dz)}
                    >
                      {/* Type (icône) */}
                      <td className="p-3 text-xl">
                        {dz.type === 'airport' ? '✈️' : '📍'}
                      </td>

                      {/* Nom */}
                      <td className="p-3">
                        <div className="font-medium text-sm">{dz.name}</div>
                        {dz.notes && (
                          <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                            {dz.notes}
                          </div>
                        )}
                      </td>

                      {/* Codes OACI */}
                      <td className="p-3">
                        {dz.oaci_code && (
                          <div className="space-y-1">
                            <div className="text-xs text-blue-600 font-mono">{dz.oaci_code}</div>
                            {dz.short_code && (
                              <div className="text-xs text-gray-500 font-mono">{dz.short_code}</div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Région */}
                      <td className="p-3">
                        {dz.region && (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium inline-block ${
                            dz.region === 'corse' ? 'bg-blue-100 text-blue-700' :
                            dz.region === 'france' ? 'bg-green-100 text-green-700' :
                            dz.region === 'italie' ? 'bg-red-100 text-red-700' :
                            dz.region === 'sardaigne' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {dz.region === 'corse' ? '🇫🇷 Corse' :
                             dz.region === 'france' ? '🇫🇷 France' :
                             dz.region === 'italie' ? '🇮🇹 Italie' :
                             dz.region === 'sardaigne' ? '🇮🇹 Sardaigne' : dz.region}
                          </span>
                        )}
                      </td>

                      {/* Coordonnées */}
                      <td className="p-3">
                        <div 
                          className="text-xs font-mono bg-gray-100 px-2 py-1 rounded inline-block cursor-text select-all"
                          onClick={(e) => e.stopPropagation()}
                          title="Cliquer pour sélectionner et copier"
                        >
                          {dz.latitude}, {dz.longitude}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          {/* Étoile favoris (uniquement pour pilotes) */}
                          {userRole !== 'agent_sol' && (
                            <button
                              onClick={(e) => toggleFavorite(dz.id, e)}
                              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                              title={favorites.includes(dz.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
                            >
                              <Star
                                size={16}
                                className={favorites.includes(dz.id) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}
                              />
                            </button>
                          )}
                          
                          {/* Bouton éditer (icône crayon bleu) */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openModal(dz)
                            }}
                            className="text-blue-500 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded transition-colors"
                            title="Modifier"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>

                          {/* Bouton supprimer (icône poubelle rouge) */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              openModal(dz)
                            }}
                            className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded transition-colors"
                            title="Supprimer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mobile : Blocs optimisés compacts */}
      <div className="sm:hidden space-y-2">
        {filteredDZ.length === 0 ? (
          <Card>
            <CardContent className="pt-3 text-center text-gray-500">
              Aucune Drop Zone trouvée
            </CardContent>
          </Card>
        ) : (
          filteredDZ.map(dz => (
            <Card
              key={dz.id}
              className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-300"
              onClick={() => openModal(dz)}
            >
              <CardContent className="p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Nom + Code OACI */}
                    <div className="flex items-center gap-1 mb-1 flex-wrap">
                      <h3 className="font-bold text-sm">{dz.name}</h3>
                      {dz.oaci_code && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">
                          {dz.oaci_code}
                        </span>
                      )}
                    </div>

                    {/* Coordonnées (facilement copiables) */}
                    <div 
                      className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded inline-block mb-1 cursor-text select-all"
                      onClick={(e) => e.stopPropagation()}
                      title="Cliquer pour sélectionner et copier"
                    >
                      📍 {dz.latitude}, {dz.longitude}
                    </div>

                    {/* Notes */}
                    {dz.notes && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                        💬 {dz.notes}
                      </p>
                    )}
                  </div>

                  {/* Étoile favoris (uniquement pour pilotes) */}
                  {userRole !== 'agent_sol' && (
                    <button
                      onClick={(e) => toggleFavorite(dz.id, e)}
                      className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <Star
                        size={16}
                        className={favorites.includes(dz.id) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                      />
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 🔧 MODALE CRUD */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white sticky top-0 z-10">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base sm:text-xl">
                  {selectedDZ ? '✏️ Modifier Drop Zone' : '➕ Nouvelle Drop Zone'}
                </CardTitle>
                <button
                  onClick={closeModal}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </CardHeader>
            
            <CardContent className="pt-3 sm:pt-6 space-y-3 sm:space-y-4">
              {/* Nom */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Porto-Vecchio Aéroport"
                  className="w-full p-2 border rounded-lg text-sm"
                />
              </div>

              {/* Code OACI */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Code OACI
                </label>
                <input
                  type="text"
                  value={formData.oaci_code}
                  onChange={(e) => setFormData({ ...formData, oaci_code: e.target.value.toUpperCase() })}
                  placeholder="Ex: LFKO"
                  className="w-full p-2 border rounded-lg text-sm font-mono"
                  maxLength={4}
                />
              </div>

              {/* Coordonnées */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Latitude <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="Ex: 41.36815"
                    className="w-full p-2 border rounded-lg text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Longitude <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="Ex: 9.29289"
                    className="w-full p-2 border rounded-lg text-sm font-mono"
                  />
                </div>
              </div>

              {/* Région */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Région
                </label>
                <select
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="w-full p-2 border rounded-lg text-sm"
                >
                  <option value="corse">🇫🇷 Corse</option>
                  <option value="france">🇫🇷 France continentale</option>
                  <option value="italie">🇮🇹 Italie</option>
                  <option value="sardaigne">🇮🇹 Sardaigne</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Informations supplémentaires..."
                  rows={3}
                  className="w-full p-2 border rounded-lg text-sm resize-none"
                />
              </div>

              {/* Boutons d'action */}
              <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t">
                <Button
                  onClick={handleSave}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                >
                  💾 Enregistrer les modifications
                </Button>
                
                {selectedDZ && (
                  <Button
                    onClick={handleDelete}
                    variant="outline"
                    className="flex-1 border-2 border-red-500 text-red-600 hover:bg-red-50"
                  >
                    🗑️ Supprimer
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}