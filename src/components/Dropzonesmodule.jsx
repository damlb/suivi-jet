import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { MapPin, Plane, Search, Plus, Edit2, Trash2, X } from 'lucide-react'

export default function DropZonesModule({ userId, userRole }) {
  const [dropZones, setDropZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [regionFilter, setRegionFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingDZ, setEditingDZ] = useState(null)
  
  const [formData, setFormData] = useState({
    name: '',
    short_code: '',
    oaci_code: '',
    latitude: '',
    longitude: '',
    type: 'custom',
    region: 'corse',
    notes: ''
  })

  useEffect(() => {
    loadDropZones()
  }, [])

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
    setLoading(false)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      short_code: '',
      oaci_code: '',
      latitude: '',
      longitude: '',
      type: 'custom',
      region: 'corse',
      notes: ''
    })
    setEditingDZ(null)
    setShowAddForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validation
    if (!formData.name || !formData.latitude || !formData.longitude) {
      alert('⚠️ Veuillez remplir au minimum le nom et les coordonnées')
      return
    }

    const dzData = {
      ...formData,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      created_by: userId
    }

    if (editingDZ) {
      // Modification
      const { error } = await supabase
        .from('drop_zones')
        .update(dzData)
        .eq('id', editingDZ.id)

      if (!error) {
        alert('✅ Drop Zone modifiée')
        loadDropZones()
        resetForm()
      } else {
        console.error('Erreur modification:', error)
        alert('❌ Erreur lors de la modification')
      }
    } else {
      // Ajout
      const { error } = await supabase
        .from('drop_zones')
        .insert([dzData])

      if (!error) {
        alert('✅ Drop Zone ajoutée')
        loadDropZones()
        resetForm()
      } else {
        console.error('Erreur ajout:', error)
        alert('❌ Erreur lors de l\'ajout')
      }
    }
  }

  const handleEdit = (dz) => {
    setFormData({
      name: dz.name,
      short_code: dz.short_code || '',
      oaci_code: dz.oaci_code || '',
      latitude: dz.latitude.toString(),
      longitude: dz.longitude.toString(),
      type: dz.type,
      region: dz.region,
      notes: dz.notes || ''
    })
    setEditingDZ(dz)
    setShowAddForm(true)
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Supprimer la Drop Zone "${name}" ?\n\nElle sera désactivée mais pas supprimée définitivement.`)) {
      return
    }

    const { error } = await supabase
      .from('drop_zones')
      .update({ is_active: false })
      .eq('id', id)

    if (!error) {
      alert('✅ Drop Zone désactivée')
      loadDropZones()
    } else {
      console.error('Erreur suppression:', error)
      alert('❌ Erreur lors de la suppression')
    }
  }

  // Filtrage
  const filteredDZ = dropZones.filter(dz => {
    const matchSearch = dz.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       (dz.short_code && dz.short_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
                       (dz.oaci_code && dz.oaci_code.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchRegion = regionFilter === 'all' || dz.region === regionFilter
    const matchType = typeFilter === 'all' || dz.type === typeFilter
    
    return matchSearch && matchRegion && matchType
  })

  // Statistiques
  const stats = {
    total: dropZones.length,
    corse: dropZones.filter(dz => dz.region === 'corse').length,
    france: dropZones.filter(dz => dz.region === 'france').length,
    italie: dropZones.filter(dz => dz.region === 'italie').length,
    sardaigne: dropZones.filter(dz => dz.region === 'sardaigne').length,
    airports: dropZones.filter(dz => dz.type === 'airport').length,
    heliports: dropZones.filter(dz => dz.type === 'heliport').length,
    custom: dropZones.filter(dz => dz.type === 'custom').length
  }

  // Badges régions
  const getRegionBadge = (region) => {
    const badges = {
      corse: 'bg-blue-100 text-blue-700',
      france: 'bg-green-100 text-green-700',
      italie: 'bg-red-100 text-red-700',
      sardaigne: 'bg-yellow-100 text-yellow-700'
    }
    const labels = {
      corse: '🇫🇷 Corse',
      france: '🇫🇷 France',
      italie: '🇮🇹 Italie',
      sardaigne: '🇮🇹 Sardaigne'
    }
    return `${badges[region]} px-2 py-1 rounded-full text-xs font-semibold`
  }

  const getRegionLabel = (region) => {
    const labels = {
      corse: '🇫🇷 Corse',
      france: '🇫🇷 France',
      italie: '🇮🇹 Italie',
      sardaigne: '🇮🇹 Sardaigne'
    }
    return labels[region]
  }

  // Icônes types
  const getTypeIcon = (type) => {
    if (type === 'airport') return '✈️'
    if (type === 'heliport') return '🚁'
    return '📍'
  }

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <div className="text-sm text-blue-600 mb-1">Total Drop Zones</div>
            <div className="text-3xl font-bold text-blue-900">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-6">
            <div className="text-sm text-green-600 mb-1">Aéroports</div>
            <div className="text-3xl font-bold text-green-900">{stats.airports}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="pt-6">
            <div className="text-sm text-orange-600 mb-1">Héliports</div>
            <div className="text-3xl font-bold text-orange-900">{stats.heliports}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-6">
            <div className="text-sm text-purple-600 mb-1">Sites Custom</div>
            <div className="text-3xl font-bold text-purple-900">{stats.custom}</div>
          </CardContent>
        </Card>
      </div>

      {/* Répartition par région */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-3">📊 Répartition par région</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.corse}</div>
              <div className="text-sm text-gray-600">🇫🇷 Corse</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.france}</div>
              <div className="text-sm text-gray-600">🇫🇷 France</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{stats.italie}</div>
              <div className="text-sm text-gray-600">🇮🇹 Italie</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{stats.sardaigne}</div>
              <div className="text-sm text-gray-600">🇮🇹 Sardaigne</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtres et recherche */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Recherche */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher (nom, code OACI, code court)..."
                className="w-full pl-10 pr-3 py-2 border rounded-lg"
              />
            </div>

            {/* Filtre Région */}
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="all">Toutes les régions</option>
              <option value="corse">🇫🇷 Corse</option>
              <option value="france">🇫🇷 France</option>
              <option value="italie">🇮🇹 Italie</option>
              <option value="sardaigne">🇮🇹 Sardaigne</option>
            </select>

            {/* Filtre Type */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="all">Tous les types</option>
              <option value="airport">✈️ Aéroports</option>
              <option value="heliport">🚁 Héliports</option>
              <option value="custom">📍 Sites Custom</option>
            </select>

            {/* Bouton Ajouter */}
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              className="whitespace-nowrap"
            >
              <Plus size={18} className="mr-2" />
              Ajouter DZ
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Formulaire d'ajout/édition */}
      {showAddForm && (
        <Card className="border-2 border-blue-500">
          <CardHeader className="bg-blue-50">
            <CardTitle className="flex justify-between items-center">
              <span>{editingDZ ? '✏️ Modifier Drop Zone' : '➕ Ajouter Drop Zone'}</span>
              <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nom */}
                <div>
                  <label className="block text-sm font-medium mb-1">Nom *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Ajaccio Napoléon Bonaparte"
                    className="w-full p-2 border rounded-lg"
                    required
                  />
                </div>

                {/* Code court */}
                <div>
                  <label className="block text-sm font-medium mb-1">Code court</label>
                  <input
                    type="text"
                    value={formData.short_code}
                    onChange={(e) => setFormData({ ...formData, short_code: e.target.value })}
                    placeholder="Ex: AJA"
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                {/* Code OACI */}
                <div>
                  <label className="block text-sm font-medium mb-1">Code OACI</label>
                  <input
                    type="text"
                    value={formData.oaci_code}
                    onChange={(e) => setFormData({ ...formData, oaci_code: e.target.value })}
                    placeholder="Ex: LFKJ"
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium mb-1">Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    required
                  >
                    <option value="custom">📍 Site Custom</option>
                    <option value="airport">✈️ Aéroport</option>
                    <option value="heliport">🚁 Héliport</option>
                  </select>
                </div>

                {/* Région */}
                <div>
                  <label className="block text-sm font-medium mb-1">Région *</label>
                  <select
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    required
                  >
                    <option value="corse">🇫🇷 Corse</option>
                    <option value="france">🇫🇷 France</option>
                    <option value="italie">🇮🇹 Italie</option>
                    <option value="sardaigne">🇮🇹 Sardaigne</option>
                  </select>
                </div>

                {/* Latitude */}
                <div>
                  <label className="block text-sm font-medium mb-1">Latitude *</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="Ex: 41.9231"
                    className="w-full p-2 border rounded-lg"
                    required
                  />
                </div>

                {/* Longitude */}
                <div>
                  <label className="block text-sm font-medium mb-1">Longitude *</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="Ex: 8.8028"
                    className="w-full p-2 border rounded-lg"
                    required
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Informations complémentaires..."
                  className="w-full p-2 border rounded-lg"
                  rows="2"
                />
              </div>

              {/* Boutons */}
              <div className="flex gap-2">
                <Button type="submit" className="bg-green-500 hover:bg-green-600">
                  {editingDZ ? '✅ Modifier' : '➕ Ajouter'}
                </Button>
                <Button type="button" onClick={resetForm} variant="ghost">
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tableau des Drop Zones */}
      <Card>
        <CardHeader>
          <CardTitle>
            📍 Drop Zones ({filteredDZ.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredDZ.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MapPin size={48} className="mx-auto mb-3 opacity-50" />
              <p>Aucune Drop Zone trouvée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Nom</th>
                    <th className="p-2 text-left">Codes</th>
                    <th className="p-2 text-left">Région</th>
                    <th className="p-2 text-left">Coordonnées</th>
                    <th className="p-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDZ.map(dz => (
                    <tr key={dz.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 text-center text-xl">{getTypeIcon(dz.type)}</td>
                      <td className="p-2 font-semibold">{dz.name}</td>
                      <td className="p-2">
                        <div className="text-xs">
                          {dz.short_code && <div className="font-mono text-blue-600">{dz.short_code}</div>}
                          {dz.oaci_code && <div className="font-mono text-gray-500">{dz.oaci_code}</div>}
                        </div>
                      </td>
                      <td className="p-2">
                        <span className={getRegionBadge(dz.region)}>
                          {getRegionLabel(dz.region)}
                        </span>
                      </td>
                      <td className="p-2 text-xs font-mono text-gray-600">
                        {dz.latitude.toFixed(6)}, {dz.longitude.toFixed(6)}
                      </td>
                      <td className="p-2">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEdit(dz)}
                            className="text-blue-500 hover:text-blue-700"
                            title="Modifier"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(dz.id, dz.name)}
                            className="text-red-500 hover:text-red-700"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}