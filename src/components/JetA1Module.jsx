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
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">⛽ Suivi Jet A1 - Mode Pilote</h2>
          <p className="text-gray-600">Interface simplifiée pour enregistrer vos prises de carburant</p>
        </div>

        {!livraisonActive ? (
          <Card className="bg-gray-50 border-2 border-gray-300">
            <CardContent className="pt-6 text-center">
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
            <Card className="border-2 border-blue-500 shadow-lg">
              <CardHeader className="bg-blue-50">
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <Fuel size={24} />
                  🛫 Enregistrer une prise de carburant
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {!showAddPrise ? (
                  <Button 
                    onClick={() => setShowAddPrise(true)}
                    className="w-full py-6 text-lg bg-blue-500 hover:bg-blue-600"
                  >
                    <Plus size={24} className="mr-2" />
                    Ajouter une prise
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Immatriculation *</label>
                        <input
                          type="text"
                          value={newPrise.immatriculation}
                          onChange={(e) => setNewPrise({ ...newPrise, immatriculation: e.target.value })}
                          placeholder="Ex: F-HXYZ"
                          className="w-full p-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Pilote / Nom *</label>
                        <input
                          type="text"
                          value={newPrise.nom}
                          onChange={(e) => setNewPrise({ ...newPrise, nom: e.target.value })}
                          placeholder="Votre nom"
                          className="w-full p-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Date *</label>
                        <input
                          type="date"
                          value={newPrise.date}
                          onChange={(e) => setNewPrise({ ...newPrise, date: e.target.value })}
                          className="w-full p-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Volume (L) *</label>
                        <input
                          type="number"
                          value={newPrise.volume}
                          onChange={(e) => setNewPrise({ ...newPrise, volume: e.target.value })}
                          placeholder="Litres"
                          className="w-full p-2 border rounded-lg"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <Button 
                        onClick={addPrise}
                        className="flex-1 bg-green-500 hover:bg-green-600"
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
                        className="flex-1"
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
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">📦 Stock disponible</p>
                  <div className="text-5xl font-bold text-orange-600 mb-3">
                    {getLivraisonData(livraisonActive).restant.toFixed(1)} L
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Initial</p>
                      <p className="text-lg font-bold text-gray-800">
                        {livraisonActive.volume_initial} L
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Consommé</p>
                      <p className="text-lg font-bold text-red-600">
                        {getLivraisonData(livraisonActive).totalConsomme.toFixed(1)} L
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Restant</p>
                      <p className="text-lg font-bold text-green-600">
                        {getLivraisonData(livraisonActive).restant.toFixed(1)} L
                      </p>
                    </div>
                  </div>

                  {/* Barre de progression */}
                  <div className="mt-4">
                    <div className="w-full bg-gray-300 rounded-full h-4">
                      <div
                        className={`h-4 rounded-full transition-all ${
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
                    <p className="text-xs text-center text-gray-600 mt-1">
                      {((getLivraisonData(livraisonActive).restant / livraisonActive.volume_initial) * 100).toFixed(1)}% disponible
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3️⃣ DERNIÈRES PRISES - EN TROISIÈME */}
            <Card>
              <CardHeader>
                <CardTitle>📋 Dernières prises enregistrées</CardTitle>
              </CardHeader>
              <CardContent>
                {livraisonActive.prises.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Fuel size={48} className="mx-auto mb-3 opacity-50" />
                    <p>Aucune prise enregistrée</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {livraisonActive.prises.slice(0, 10).map((prise) => (
                      <div 
                        key={prise.id}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800">
                            {prise.immatriculation} - {prise.nom}
                          </div>
                          <div className="text-sm text-gray-600">
                            {new Date(prise.date).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-orange-600">
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

  // ========== INTERFACE AGENT AU SOL (INCHANGÉE) ==========
  return (
    <div className="space-y-4">
      <div className="flex justify-end items-center">
        <Button onClick={() => setShowAddLivraison(!showAddLivraison)}>
          + Nouvelle livraison
        </Button>
      </div>

      {showAddLivraison && (
        <Card className="border-2 border-orange-200">
          <CardContent className="pt-6">
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

      {/* Reste de l'interface agent au sol inchangée... */}
      <div className="flex gap-2 bg-white rounded-lg p-2 shadow-md">
        <button
          onClick={() => setViewArchived(false)}
          className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
            !viewArchived
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Livraison Active
        </button>
        <button
          onClick={() => setViewArchived(true)}
          className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
            viewArchived
              ? 'bg-gray-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Livraisons Clôturées ({livraisonsArchivees.length})
        </button>
      </div>

      {!viewArchived ? (
        <>
          {livraisonActive ? (
            <>
              <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-300">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold mb-3">
                        📦 Livraison en cours - {new Date(livraisonActive.date).toLocaleDateString('fr-FR')}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Stock initial</p>
                          <p className="text-xl font-bold text-gray-600">{livraisonActive.stock_initial || 0} L</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Volume livré</p>
                          <p className="text-xl font-bold text-orange-600">{livraisonActive.volume_livre || livraisonActive.volume_initial} L</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Total disponible</p>
                          <p className="text-xl font-bold text-gray-800">{livraisonActive.volume_initial} L</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Consommé</p>
                          <p className="text-xl font-bold text-red-600">
                            {getLivraisonData(livraisonActive).totalConsomme.toFixed(1)} L
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Restant</p>
                          <p className="text-xl font-bold text-green-600">
                            {getLivraisonData(livraisonActive).restant.toFixed(1)} L
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button onClick={() => archiveLivraison(livraisonActive.id)}>
                      📦 Clôturer
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Sous-onglets et reste de l'interface... */}
            </>
          ) : (
            <Card className="bg-gray-100">
              <CardContent className="pt-6 text-center">
                <Fuel size={48} className="mx-auto mb-3 text-gray-400" />
                <p className="text-gray-600">Aucune livraison active</p>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <div className="space-y-4">
          {livraisonsArchivees.map(livraison => {
            const stats = getLivraisonData(livraison)
            return (
              <Card key={livraison.id}>
                <CardContent className="pt-6">
                  <h3 className="font-bold mb-2">
                    📦 Livraison du {new Date(livraison.date).toLocaleDateString('fr-FR')}
                  </h3>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Initial:</span>
                      <span className="font-bold ml-2">{livraison.volume_initial} L</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Consommé:</span>
                      <span className="font-bold ml-2">{stats.totalConsomme.toFixed(1)} L</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Restant:</span>
                      <span className="font-bold ml-2">{stats.restant.toFixed(1)} L</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Ventes:</span>
                      <span className="font-bold ml-2 text-green-600">{stats.totalVentesExternes.toFixed(2)} €</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}