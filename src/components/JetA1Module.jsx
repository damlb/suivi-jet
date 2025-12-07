import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Fuel, Plus } from 'lucide-react'

export default function JetA1Module({ userRole, userId }) {
  const [livraisons, setLivraisons] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewArchived, setViewArchived] = useState(false)
  const [showAddLivraison, setShowAddLivraison] = useState(false)
  const [jetA1View, setJetA1View] = useState('interne')
  const [showAddPrise, setShowAddPrise] = useState(false)
  const [editingPrise, setEditingPrise] = useState(null)
  
  const [newLivraison, setNewLivraison] = useState({
    date: new Date().toISOString().split('T')[0],
    volume: '',
    stockInitial: '0'
  })
  
  const [newPrise, setNewPrise] = useState({
    immatriculation: '',
    nom: '',
    date: new Date().toISOString().split('T')[0],
    volume: '',
    prixLitre: '',
    type: 'interne'
  })

  const [editPriseData, setEditPriseData] = useState({
    immatriculation: '',
    nom: '',
    date: '',
    volume: '',
    prixLitre: ''
  })

  useEffect(() => {
    loadLivraisons()
  }, [])

  const loadLivraisons = async () => {
    const { data: livraisonsData, error } = await supabase
      .from('livraisons')
      .select('*')
      .order('date', { ascending: false })

    if (livraisonsData) {
      const livraisonsWithPrises = await Promise.all(
        livraisonsData.map(async (liv) => {
          const { data: prisesData } = await supabase
            .from('prises')
            .select('*')
            .eq('livraison_id', liv.id)
            .order('date', { ascending: false })
          
          return { ...liv, prises: prisesData || [] }
        })
      )
      setLivraisons(livraisonsWithPrises)
    }
    setLoading(false)
  }

  const addLivraison = async () => {
    if (!newLivraison.date || !newLivraison.volume) {
      alert('Veuillez remplir tous les champs')
      return
    }

    const stockInitial = parseFloat(newLivraison.stockInitial) || 0
    const volumeLivre = parseFloat(newLivraison.volume)

    const { data, error } = await supabase
      .from('livraisons')
      .insert([
        {
          date: newLivraison.date,
          stock_initial: stockInitial,
          volume_livre: volumeLivre,
          volume_initial: stockInitial + volumeLivre,
          archivee: false
        }
      ])
      .select()

    if (data) {
      setLivraisons([{ ...data[0], prises: [] }, ...livraisons])
      setNewLivraison({ date: new Date().toISOString().split('T')[0], volume: '', stockInitial: '0' })
      setShowAddLivraison(false)
    }
  }

  const addPrise = async () => {
    const livraisonActive = livraisons.find(l => !l.archivee)
    
    if (!livraisonActive) {
      alert('Aucune livraison active')
      return
    }

    if (!newPrise.immatriculation || !newPrise.nom || !newPrise.date || !newPrise.volume) {
      alert('Veuillez remplir tous les champs')
      return
    }

    if (newPrise.type === 'externe' && !newPrise.prixLitre) {
      alert('Le prix au litre est obligatoire pour une vente externe')
      return
    }

    const { data, error } = await supabase
      .from('prises')
      .insert([
        {
          livraison_id: livraisonActive.id,
          immatriculation: newPrise.immatriculation,
          nom: newPrise.nom,
          date: newPrise.date,
          volume: parseFloat(newPrise.volume),
          prix_litre: newPrise.prixLitre ? parseFloat(newPrise.prixLitre) : null,
          prix_total: newPrise.prixLitre ? parseFloat(newPrise.volume) * parseFloat(newPrise.prixLitre) : null,
          type: newPrise.type
        }
      ])
      .select()

    if (data) {
      setLivraisons(livraisons.map(liv =>
        liv.id === livraisonActive.id
          ? { ...liv, prises: [data[0], ...liv.prises] }
          : liv
      ))
      setNewPrise({
        immatriculation: '',
        nom: '',
        date: new Date().toISOString().split('T')[0],
        volume: '',
        prixLitre: '',
        type: 'interne'
      })
      setShowAddPrise(false)
      alert('✅ Prise enregistrée')
    }
  }

  const archiveLivraison = async (id) => {
    const { error } = await supabase
      .from('livraisons')
      .update({ archivee: true, date_archivage: new Date().toISOString() })
      .eq('id', id)

    if (!error) {
      loadLivraisons()
    }
  }

  const getLivraisonData = (livraison) => {
    if (!livraison) return { totalConsomme: 0, restant: 0, totalVentesExternes: 0, totalInternes: 0, totalExternes: 0 }
    
    const prisesInternes = livraison.prises.filter(p => p.type === 'interne')
    const prisesExternes = livraison.prises.filter(p => p.type === 'externe')
    
    const totalInternes = prisesInternes.reduce((sum, p) => sum + p.volume, 0)
    const totalExternes = prisesExternes.reduce((sum, p) => sum + p.volume, 0)
    const totalConsomme = totalInternes + totalExternes
    const restant = livraison.volume_initial - totalConsomme
    const totalVentesExternes = prisesExternes.reduce((sum, p) => sum + (p.prix_total || 0), 0)
    
    return { totalConsomme, restant, totalVentesExternes, totalInternes, totalExternes }
  }

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  const livraisonActive = livraisons.find(l => !l.archivee)
  const livraisonsArchivees = livraisons.filter(l => l.archivee)

  const prisesInternes = livraisonActive?.prises.filter(p => p.type === 'interne') || []
  const prisesExternes = livraisonActive?.prises.filter(p => p.type === 'externe') || []
  const displayedPrises = jetA1View === 'interne' ? prisesInternes : prisesExternes

  // ========== INTERFACE PILOTE ==========
  if (userRole === 'pilote') {
    return (
      <div className="space-y-3 sm:space-y-6">
        {!livraisonActive ? (
          <Card className="bg-gray-50 border-2 border-gray-300">
            <CardContent className="pt-3 sm:pt-6 text-center">
              <Fuel size={48} className="mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600 font-semibold">Aucune livraison active</p>
              <p className="text-sm text-gray-500 mt-2">
                Contactez un agent au sol pour enregistrer une nouvelle livraison
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 1️⃣ ENREGISTRER UNE PRISE - EN PREMIER */}
            <Card className="border-2 border-blue-500 shadow-lg overflow-hidden">
              <CardHeader className="bg-blue-50 p-3 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-blue-900 text-base sm:text-xl">
                  <Fuel size={20} className="sm:w-6 sm:h-6" />
                  🛫 Enregistrer une prise de carburant
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
                {!showAddPrise ? (
                  <Button 
                    onClick={() => setShowAddPrise(true)}
                    className="w-full py-4 sm:py-6 text-base sm:text-lg bg-blue-500 hover:bg-blue-600"
                  >
                    <Plus size={20} className="mr-2 sm:w-6 sm:h-6" />
                    Ajouter une prise
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium mb-1">Immatriculation *</label>
                        <input
                          type="text"
                          value={newPrise.immatriculation}
                          onChange={(e) => setNewPrise({ ...newPrise, immatriculation: e.target.value })}
                          placeholder="Ex: F-HXYZ"
                          className="w-full p-2 border rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium mb-1">Pilote / Nom *</label>
                        <input
                          type="text"
                          value={newPrise.nom}
                          onChange={(e) => setNewPrise({ ...newPrise, nom: e.target.value })}
                          placeholder="Votre nom"
                          className="w-full p-2 border rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium mb-1">Date *</label>
                        <input
                          type="date"
                          value={newPrise.date}
                          onChange={(e) => setNewPrise({ ...newPrise, date: e.target.value })}
                          className="w-full p-2 border rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium mb-1">Volume (L) *</label>
                        <input
                          type="number"
                          value={newPrise.volume}
                          onChange={(e) => setNewPrise({ ...newPrise, volume: e.target.value })}
                          placeholder="Litres"
                          className="w-full p-2 border rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <Button 
                        onClick={addPrise}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-sm sm:text-base"
                      >
                        ✅ Enregistrer
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setShowAddPrise(false)
                          setNewPrise({
                            immatriculation: '',
                            nom: '',
                            date: new Date().toISOString().split('T')[0],
                            volume: '',
                            prixLitre: '',
                            type: 'interne'
                          })
                        }}
                        className="flex-1 text-sm sm:text-base"
                      >
                        ❌ Annuler
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2️⃣ STOCK ACTUEL - EN DEUXIÈME */}
            <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-300 shadow-lg">
              <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-gray-600 mb-2">📦 Stock disponible</p>
                  <div className="text-3xl sm:text-5xl font-bold text-orange-600 mb-3">
                    {getLivraisonData(livraisonActive).restant.toFixed(1)} L
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 sm:mt-6">
                    <div className="bg-white rounded-lg p-2 sm:p-3">
                      <p className="text-[10px] sm:text-xs text-gray-600 mb-1">Initial</p>
                      <p className="text-sm sm:text-lg font-bold text-gray-800">
                        {livraisonActive.volume_initial} L
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-2 sm:p-3">
                      <p className="text-[10px] sm:text-xs text-gray-600 mb-1">Consommé</p>
                      <p className="text-sm sm:text-lg font-bold text-red-600">
                        {getLivraisonData(livraisonActive).totalConsomme.toFixed(1)} L
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-2 sm:p-3">
                      <p className="text-[10px] sm:text-xs text-gray-600 mb-1">Restant</p>
                      <p className="text-sm sm:text-lg font-bold text-green-600">
                        {getLivraisonData(livraisonActive).restant.toFixed(1)} L
                      </p>
                    </div>
                  </div>

                  {/* Barre de progression */}
                  <div className="mt-4">
                    <div className="w-full bg-gray-300 rounded-full h-3 sm:h-4">
                      <div
                        className={`h-3 sm:h-4 rounded-full transition-all ${
                          (getLivraisonData(livraisonActive).restant / livraisonActive.volume_initial) * 100 > 30
                            ? 'bg-green-500'
                            : (getLivraisonData(livraisonActive).restant / livraisonActive.volume_initial) * 100 > 10
                            ? 'bg-orange-500'
                            : 'bg-red-500'
                        }`}
                        style={{
                          width: `${(getLivraisonData(livraisonActive).restant / livraisonActive.volume_initial) * 100}%`
                        }}
                      />
                    </div>
                    <p className="text-[10px] sm:text-xs text-center text-gray-600 mt-1">
                      {((getLivraisonData(livraisonActive).restant / livraisonActive.volume_initial) * 100).toFixed(1)}% disponible
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3️⃣ DERNIÈRES PRISES - EN TROISIÈME */}
            <Card>
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-base sm:text-xl">📋 Dernières prises enregistrées</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                {livraisonActive.prises.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Fuel size={36} className="mx-auto mb-3 opacity-50 sm:w-12 sm:h-12" />
                    <p className="text-sm">Aucune prise enregistrée</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {livraisonActive.prises.slice(0, 10).map((prise) => (
                      <div 
                        key={prise.id}
                        className="flex justify-between items-center p-2 sm:p-3 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-800 text-sm sm:text-base truncate">
                            {prise.immatriculation} - {prise.nom}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600">
                            {new Date(prise.date).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-base sm:text-lg font-bold text-orange-600">
                            {prise.volume} L
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    )
  }

  // ========== INTERFACE AGENT AU SOL (COMPLÈTE) ==========
  
  const deletePrise = async (priseId, livraisonId) => {
    if (!confirm('Supprimer cette prise ?')) return
    
    const { error } = await supabase
      .from('prises')
      .delete()
      .eq('id', priseId)

    if (!error) {
      setLivraisons(livraisons.map(liv =>
        liv.id === livraisonId
          ? { ...liv, prises: liv.prises.filter(p => p.id !== priseId) }
          : liv
      ))
    }
  }

  const openEditPrise = (prise) => {
    setEditingPrise(prise)
    setEditPriseData({
      immatriculation: prise.immatriculation,
      nom: prise.nom,
      date: prise.date,
      volume: prise.volume,
      prixLitre: prise.prix_litre || ''
    })
  }

  const handleUpdatePrise = async () => {
    if (!editingPrise) return

    const updateData = {
      immatriculation: editPriseData.immatriculation,
      nom: editPriseData.nom,
      date: editPriseData.date,
      volume: parseFloat(editPriseData.volume)
    }

    // Ajouter prix si vente externe
    if (editingPrise.type === 'externe' && editPriseData.prixLitre) {
      updateData.prix_litre = parseFloat(editPriseData.prixLitre)
      updateData.prix_total = parseFloat(editPriseData.volume) * parseFloat(editPriseData.prixLitre)
    }

    const { error } = await supabase
      .from('prises')
      .update(updateData)
      .eq('id', editingPrise.id)

    if (!error) {
      loadLivraisons()
      setEditingPrise(null)
      alert('✅ Prise modifiée')
    } else {
      console.error('Erreur modification prise:', error)
      alert('❌ Erreur lors de la modification')
    }
  }

  const handleDeletePriseFromModal = async () => {
    if (!editingPrise) return
    if (!confirm('⚠️ Êtes-vous sûr de vouloir supprimer cette prise ?')) return

    const { error } = await supabase
      .from('prises')
      .delete()
      .eq('id', editingPrise.id)

    if (!error) {
      loadLivraisons()
      setEditingPrise(null)
      alert('✅ Prise supprimée')
    } else {
      console.error('Erreur suppression prise:', error)
      alert('❌ Erreur lors de la suppression')
    }
  }

  const unarchiveLivraison = async (id) => {
    if (livraisonActive) {
      alert('Il y a déjà une livraison active. Veuillez d\'abord la clôturer.')
      return
    }
    
    const { error } = await supabase
      .from('livraisons')
      .update({ archivee: false, date_archivage: null })
      .eq('id', id)

    if (!error) {
      loadLivraisons()
    }
  }

  return (
    <div className="space-y-4">
      {/* BOUTON BIEN VISIBLE POUR AJOUTER UNE PRISE INTERNE - EN HAUT */}
      {livraisonActive && (
        <Card className="border-2 border-blue-500 shadow-lg overflow-hidden">
          <CardHeader className="bg-blue-50 p-3 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-blue-900 text-base sm:text-xl">
              <Fuel size={20} className="sm:w-6 sm:h-6" />
              🛫 Enregistrer une prise de carburant interne
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {!showAddPrise ? (
              <Button 
                onClick={() => {
                  setJetA1View('interne')
                  setNewPrise({ ...newPrise, type: 'interne' })
                  setShowAddPrise(true)
                }}
                className="w-full py-4 sm:py-6 text-base sm:text-lg bg-blue-500 hover:bg-blue-600"
              >
                + Ajouter une prise
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1">Immatriculation *</label>
                    <input
                      type="text"
                      value={newPrise.immatriculation}
                      onChange={(e) => setNewPrise({ ...newPrise, immatriculation: e.target.value })}
                      placeholder="Ex: F-HXYZ"
                      className="w-full p-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1">Nom / Client *</label>
                    <input
                      type="text"
                      value={newPrise.nom}
                      onChange={(e) => setNewPrise({ ...newPrise, nom: e.target.value })}
                      placeholder="Nom du client"
                      className="w-full p-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1">Date *</label>
                    <input
                      type="date"
                      value={newPrise.date}
                      onChange={(e) => setNewPrise({ ...newPrise, date: e.target.value })}
                      className="w-full p-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-1">Volume (L) *</label>
                    <input
                      type="number"
                      value={newPrise.volume}
                      onChange={(e) => setNewPrise({ ...newPrise, volume: e.target.value })}
                      placeholder="Litres"
                      className="w-full p-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button 
                    onClick={addPrise}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-sm sm:text-base"
                  >
                    ✅ Enregistrer
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowAddPrise(false)
                      setNewPrise({
                        immatriculation: '',
                        nom: '',
                        date: new Date().toISOString().split('T')[0],
                        volume: '',
                        prixLitre: '',
                        type: 'interne'
                      })
                    }}
                    className="flex-1 text-sm sm:text-base"
                  >
                    ❌ Annuler
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end items-center">
        <Button onClick={() => setShowAddLivraison(!showAddLivraison)}>
          + Nouvelle livraison
        </Button>
      </div>

      {showAddLivraison && (
        <Card className="border-2 border-orange-200">
          <CardContent className="pt-3 sm:pt-6">
            <h4 className="font-semibold mb-3">Nouvelle livraison Jet A1</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Date de livraison</label>
                <input
                  type="date"
                  value={newLivraison.date}
                  onChange={(e) => setNewLivraison({ ...newLivraison, date: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Stock initial (L)</label>
                <input
                  type="number"
                  value={newLivraison.stockInitial}
                  onChange={(e) => setNewLivraison({ ...newLivraison, stockInitial: e.target.value })}
                  placeholder="0"
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Volume livré (L)</label>
                <input
                  type="number"
                  value={newLivraison.volume}
                  onChange={(e) => setNewLivraison({ ...newLivraison, volume: e.target.value })}
                  placeholder="Ex: 5000"
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            </div>
            {newLivraison.volume && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm">
                  <span className="font-semibold">Volume total disponible: </span>
                  <span className="text-lg font-bold text-blue-600">
                    {(parseFloat(newLivraison.stockInitial || 0) + parseFloat(newLivraison.volume || 0)).toFixed(1)} L
                  </span>
                </p>
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <Button onClick={addLivraison}>Ajouter</Button>
              <Button variant="ghost" onClick={() => setShowAddLivraison(false)}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Onglets Livraison Active / Clôturées */}
      <div className="flex gap-2 bg-white rounded-lg p-2 shadow-md overflow-x-auto">
        <button
          onClick={() => setViewArchived(false)}
          className={`flex-1 py-2 px-3 sm:px-4 rounded-lg font-semibold transition-all text-sm whitespace-nowrap ${
            !viewArchived
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Livraison Active
        </button>
        <button
          onClick={() => setViewArchived(true)}
          className={`flex-1 py-2 px-3 sm:px-4 rounded-lg font-semibold transition-all text-sm whitespace-nowrap ${
            viewArchived
              ? 'bg-gray-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Clôturées ({livraisonsArchivees.length})
        </button>
      </div>

      {!viewArchived ? (
        <>
          {livraisonActive ? (
            <>
              <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-300">
                <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0 mb-4">
                    <div className="flex-1 w-full">
                      <h4 className="text-base sm:text-lg font-bold mb-3">
                        📦 Livraison en cours - {new Date(livraisonActive.date).toLocaleDateString('fr-FR')}
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4">
                        <div>
                          <p className="text-[10px] sm:text-xs text-gray-600">Stock initial</p>
                          <p className="text-base sm:text-xl font-bold text-gray-600">{livraisonActive.stock_initial} L</p>
                        </div>
                        <div>
                          <p className="text-[10px] sm:text-xs text-gray-600">Volume livré</p>
                          <p className="text-base sm:text-xl font-bold text-orange-600">{livraisonActive.volume_livre} L</p>
                        </div>
                        <div>
                          <p className="text-[10px] sm:text-xs text-gray-600">Total disponible</p>
                          <p className="text-base sm:text-xl font-bold text-gray-800">{livraisonActive.volume_initial} L</p>
                        </div>
                        <div>
                          <p className="text-[10px] sm:text-xs text-gray-600">Consommé</p>
                          <p className="text-base sm:text-xl font-bold text-red-600">
                            {getLivraisonData(livraisonActive).totalConsomme.toFixed(1)} L
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] sm:text-xs text-gray-600">Restant</p>
                          <p className="text-base sm:text-xl font-bold text-green-600">
                            {getLivraisonData(livraisonActive).restant.toFixed(1)} L
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 text-xs sm:text-sm">
                        <span className="font-semibold">Ventes externes: </span>
                        <span className="text-green-700 font-bold">
                          {getLivraisonData(livraisonActive).totalVentesExternes.toFixed(2)} €
                        </span>
                      </div>
                      <div className="mt-3">
                        <div className="w-full bg-gray-300 rounded-full h-3 sm:h-4">
                          <div
                            className={`h-3 sm:h-4 rounded-full transition-all ${
                              (getLivraisonData(livraisonActive).restant / livraisonActive.volume_initial) * 100 > 30
                                ? 'bg-green-500'
                                : (getLivraisonData(livraisonActive).restant / livraisonActive.volume_initial) * 100 > 10
                                ? 'bg-orange-500'
                                : 'bg-red-500'
                            }`}
                            style={{
                              width: `${(getLivraisonData(livraisonActive).restant / livraisonActive.volume_initial) * 100}%`
                            }}
                          />
                        </div>
                        <p className="text-[10px] sm:text-xs text-center text-gray-600 mt-1">
                          {((getLivraisonData(livraisonActive).restant / livraisonActive.volume_initial) * 100).toFixed(1)}% restant
                        </p>
                      </div>
                    </div>
                    <Button onClick={() => archiveLivraison(livraisonActive.id)} variant="ghost" className="text-sm w-full sm:w-auto">
                      📦 Clôturer
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Sous-onglets Interne / Externe */}
              <div className="flex gap-2 border-b-2 border-gray-200 overflow-x-auto">
                <button
                  onClick={() => setJetA1View('interne')}
                  className={`px-4 sm:px-6 py-2 sm:py-3 font-semibold transition-all border-b-4 text-sm whitespace-nowrap ${
                    jetA1View === 'interne'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Usage Interne
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-bold">
                    {prisesInternes.length}
                  </span>
                </button>
                <button
                  onClick={() => setJetA1View('externe')}
                  className={`px-4 sm:px-6 py-2 sm:py-3 font-semibold transition-all border-b-4 text-sm whitespace-nowrap ${
                    jetA1View === 'externe'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Ventes Externes
                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-600 rounded-full text-xs font-bold">
                    {prisesExternes.length}
                  </span>
                </button>
              </div>

              {/* Tableau des prises */}
              <Card>
                <CardContent className="pt-3 sm:pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-base sm:text-lg font-bold">
                      {jetA1View === 'externe' ? 'Ventes Externes' : 'Prises Internes'}
                    </h4>
                    <Button
                      onClick={() => {
                        setNewPrise({ ...newPrise, type: jetA1View })
                        setShowAddPrise(!showAddPrise)
                      }}
                      size="sm"
                      className="text-xs sm:text-sm"
                    >
                      + {jetA1View === 'externe' ? 'Ajouter vente' : 'Ajouter prise'}
                    </Button>
                  </div>

                  {showAddPrise && (
                    <div className="bg-blue-50 p-3 rounded-lg mb-4 border border-blue-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                        <input
                          type="text"
                          value={newPrise.immatriculation}
                          onChange={(e) => setNewPrise({ ...newPrise, immatriculation: e.target.value })}
                          placeholder={jetA1View === 'externe' ? 'Immat/Référence' : 'Immatriculation'}
                          className="p-2 border rounded-lg text-sm"
                        />
                        <input
                          type="text"
                          value={newPrise.nom}
                          onChange={(e) => setNewPrise({ ...newPrise, nom: e.target.value })}
                          placeholder={jetA1View === 'externe' ? 'Client/Compagnie' : 'Nom'}
                          className="p-2 border rounded-lg text-sm"
                        />
                        <input
                          type="date"
                          value={newPrise.date}
                          onChange={(e) => setNewPrise({ ...newPrise, date: e.target.value })}
                          className="p-2 border rounded-lg text-sm"
                        />
                        <input
                          type="number"
                          value={newPrise.volume}
                          onChange={(e) => setNewPrise({ ...newPrise, volume: e.target.value })}
                          placeholder="Volume (L)"
                          className="p-2 border rounded-lg text-sm"
                        />
                        {jetA1View === 'externe' && (
                          <input
                            type="number"
                            step="0.01"
                            value={newPrise.prixLitre}
                            onChange={(e) => setNewPrise({ ...newPrise, prixLitre: e.target.value })}
                            placeholder="Prix/L (€)"
                            className="p-2 border rounded-lg text-sm"
                          />
                        )}
                      </div>
                      {jetA1View === 'externe' && newPrise.volume && newPrise.prixLitre && (
                        <div className="mt-2 text-sm font-semibold text-green-700">
                          Prix total: {(parseFloat(newPrise.volume) * parseFloat(newPrise.prixLitre)).toFixed(2)} €
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        <Button onClick={addPrise} size="sm">Ajouter</Button>
                        <Button onClick={() => setShowAddPrise(false)} variant="ghost" size="sm">
                          Annuler
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <table className="w-full text-xs sm:text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-2 text-left">Immat/Réf</th>
                          <th className="p-2 text-left">Nom/Client</th>
                          <th className="p-2 text-left">Date</th>
                          <th className="p-2 text-right">Volume (L)</th>
                          {jetA1View === 'externe' && (
                            <>
                              <th className="p-2 text-right hidden sm:table-cell">Prix/L (€)</th>
                              <th className="p-2 text-right">Total (€)</th>
                            </>
                          )}
                          <th className="p-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedPrises.length === 0 ? (
                          <tr>
                            <td colSpan={jetA1View === 'externe' ? 7 : 5} className="text-center py-8 text-gray-400">
                              <Fuel size={36} className="mx-auto mb-3 opacity-50 sm:w-12 sm:h-12" />
                              <p className="text-sm">{jetA1View === 'externe' ? 'Aucune vente enregistrée' : 'Aucune prise enregistrée'}</p>
                            </td>
                          </tr>
                        ) : (
                          displayedPrises.map(prise => (
                            <tr 
                              key={prise.id} 
                              onClick={() => openEditPrise(prise)}
                              className="border-b hover:bg-blue-50 cursor-pointer transition-colors"
                            >
                              <td className="p-2">{prise.immatriculation}</td>
                              <td className="p-2">{prise.nom}</td>
                              <td className="p-2">{new Date(prise.date).toLocaleDateString('fr-FR')}</td>
                              <td className="p-2 text-right font-semibold">{prise.volume} L</td>
                              {jetA1View === 'externe' && (
                                <>
                                  <td className="p-2 text-right hidden sm:table-cell">{prise.prix_litre?.toFixed(2)} €</td>
                                  <td className="p-2 text-right font-bold text-green-600">
                                    {prise.prix_total?.toFixed(2)} €
                                  </td>
                                </>
                              )}
                              <td className="p-2 text-center text-gray-400 text-xs">
                                ✏️
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="bg-gray-100 p-8 rounded-lg text-center">
              <Fuel size={36} className="mx-auto mb-3 text-gray-400 sm:w-12 sm:h-12" />
              <p className="text-sm sm:text-base text-gray-600 mb-3">⛽ Aucune livraison active</p>
              <Button onClick={() => setShowAddLivraison(true)} className="text-sm sm:text-base">
                + Créer une livraison
              </Button>
            </div>
          )}
        </>
      ) : (
        /* Livraisons archivées */
        <div className="space-y-4">
          {livraisonsArchivees.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-lg">
              <Fuel size={36} className="mx-auto mb-3 opacity-50 sm:w-12 sm:h-12" />
              <p className="text-sm">Aucune livraison clôturée</p>
            </div>
          ) : (
            livraisonsArchivees.map(livraison => {
              const { totalConsomme, restant, totalVentesExternes, totalInternes, totalExternes } = getLivraisonData(livraison)
              
              return (
                <Card key={livraison.id} className="border border-gray-300">
                  <CardContent className="pt-4 sm:pt-6 p-3 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0 mb-4">
                      <div className="flex-1 w-full">
                        <h4 className="text-base sm:text-lg font-bold mb-2">
                          📦 Livraison du {new Date(livraison.date).toLocaleDateString('fr-FR')}
                          <span className="block sm:inline ml-0 sm:ml-3 text-xs sm:text-sm text-gray-500 font-normal mt-1 sm:mt-0">
                            Clôturée le {new Date(livraison.date_archivage).toLocaleDateString('fr-FR')}
                          </span>
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 sm:gap-4">
                          <div>
                            <p className="text-[10px] sm:text-xs text-gray-600">Stock initial</p>
                            <p className="text-sm sm:text-lg font-bold text-gray-600">{livraison.stock_initial || 0} L</p>
                          </div>
                          <div>
                            <p className="text-[10px] sm:text-xs text-gray-600">Volume livré</p>
                            <p className="text-sm sm:text-lg font-bold text-orange-600">{livraison.volume_livre} L</p>
                          </div>
                          <div>
                            <p className="text-[10px] sm:text-xs text-gray-600">Total disponible</p>
                            <p className="text-sm sm:text-lg font-bold text-gray-800">{livraison.volume_initial} L</p>
                          </div>
                          <div>
                            <p className="text-[10px] sm:text-xs text-gray-600">Usage interne</p>
                            <p className="text-sm sm:text-lg font-bold text-blue-600">{totalInternes.toFixed(1)} L</p>
                          </div>
                          <div>
                            <p className="text-[10px] sm:text-xs text-gray-600">Ventes externes</p>
                            <p className="text-sm sm:text-lg font-bold text-green-600">{totalExternes.toFixed(1)} L</p>
                          </div>
                          <div>
                            <p className="text-[10px] sm:text-xs text-gray-600">Restant</p>
                            <p className="text-sm sm:text-lg font-bold text-gray-600">{restant.toFixed(1)} L</p>
                          </div>
                        </div>
                        <div className="mt-2 text-xs sm:text-sm">
                          <span className="font-semibold">Total ventes: </span>
                          <span className="text-green-700 font-bold">{totalVentesExternes.toFixed(2)} €</span>
                        </div>
                      </div>
                      <Button onClick={() => unarchiveLivraison(livraison.id)} variant="ghost" size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
                        ↩️ Réactiver
                      </Button>
                    </div>
                    
                    {/* Détails des prises */}
                    <details className="mt-4">
                      <summary className="cursor-pointer text-xs sm:text-sm font-semibold text-gray-700 hover:text-gray-900">
                        Voir le détail des prises ({livraison.prises.length})
                      </summary>
                      <div className="mt-3 overflow-x-auto -mx-3 sm:mx-0">
                        <table className="w-full text-[10px] sm:text-xs">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="p-2 text-left">Type</th>
                              <th className="p-2 text-left">Immat/Réf</th>
                              <th className="p-2 text-left">Nom/Client</th>
                              <th className="p-2 text-left">Date</th>
                              <th className="p-2 text-right">Volume</th>
                              <th className="p-2 text-right hidden sm:table-cell">Prix/L</th>
                              <th className="p-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {livraison.prises.map(prise => (
                              <tr key={prise.id} className="border-b">
                                <td className="p-2">
                                  <span className={`px-2 py-1 rounded text-[10px] font-medium ${
                                    prise.type === 'interne' 
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-green-100 text-green-700'
                                  }`}>
                                    {prise.type === 'interne' ? 'Int' : 'Ext'}
                                  </span>
                                </td>
                                <td className="p-2">{prise.immatriculation}</td>
                                <td className="p-2">{prise.nom}</td>
                                <td className="p-2">{new Date(prise.date).toLocaleDateString('fr-FR')}</td>
                                <td className="p-2 text-right font-semibold">{prise.volume} L</td>
                                <td className="p-2 text-right hidden sm:table-cell">
                                  {prise.prix_litre ? `${prise.prix_litre.toFixed(2)} €` : '-'}
                                </td>
                                <td className="p-2 text-right font-bold text-green-600">
                                  {prise.prix_total ? `${prise.prix_total.toFixed(2)} €` : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* MODAL D'ÉDITION D'UNE PRISE */}
      {editingPrise && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setEditingPrise(null)}
        >
          <Card 
            className="w-full max-w-2xl bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
              <CardTitle className="text-base sm:text-xl">
                ✏️ Modifier la prise de carburant
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6 space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Immatriculation / Référence
                  </label>
                  <input
                    type="text"
                    value={editPriseData.immatriculation}
                    onChange={(e) => setEditPriseData({ ...editPriseData, immatriculation: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nom / Client
                  </label>
                  <input
                    type="text"
                    value={editPriseData.nom}
                    onChange={(e) => setEditPriseData({ ...editPriseData, nom: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editPriseData.date}
                    onChange={(e) => setEditPriseData({ ...editPriseData, date: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Volume (L) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={editPriseData.volume}
                    onChange={(e) => setEditPriseData({ ...editPriseData, volume: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              {editingPrise.type === 'externe' && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Prix par litre (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editPriseData.prixLitre}
                    onChange={(e) => setEditPriseData({ ...editPriseData, prixLitre: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                  {editPriseData.volume && editPriseData.prixLitre && (
                    <div className="mt-2 text-sm font-semibold text-green-700">
                      Prix total: {(parseFloat(editPriseData.volume) * parseFloat(editPriseData.prixLitre)).toFixed(2)} €
                    </div>
                  )}
                </div>
              )}

              {/* Boutons */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleUpdatePrise}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-sm"
                >
                  💾 Enregistrer
                </Button>
                <Button
                  onClick={handleDeletePriseFromModal}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-sm"
                >
                  🗑️ Supprimer
                </Button>
                <Button
                  onClick={() => setEditingPrise(null)}
                  variant="outline"
                  className="flex-1 text-sm"
                >
                  ✖️ Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}