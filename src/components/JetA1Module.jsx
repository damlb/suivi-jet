import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'

export default function JetA1Module() {
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
      // Charger les prises pour chaque livraison
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

    const volume = parseFloat(newPrise.volume)
    const prixLitre = newPrise.prixLitre ? parseFloat(newPrise.prixLitre) : null
    const prixTotal = prixLitre ? volume * prixLitre : null

    const { data, error } = await supabase
      .from('prises')
      .insert([
        {
          livraison_id: livraisonActive.id,
          type: newPrise.type,
          immatriculation: newPrise.immatriculation,
          nom: newPrise.nom,
          date: newPrise.date,
          volume: volume,
          prix_litre: prixLitre,
          prix_total: prixTotal
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
        type: newPrise.type
      })
      setShowAddPrise(false)
    }
  }

  const deletePrise = async (priseId, livraisonId) => {
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

  const archiveLivraison = async (id) => {
    const { error } = await supabase
      .from('livraisons')
      .update({ archivee: true, date_archivage: new Date().toISOString() })
      .eq('id', id)

    if (!error) {
      setLivraisons(livraisons.map(liv =>
        liv.id === id ? { ...liv, archivee: true, date_archivage: new Date().toISOString() } : liv
      ))
    }
  }

  const unarchiveLivraison = async (id) => {
    const livraisonActive = livraisons.find(l => !l.archivee)
    if (livraisonActive) {
      alert('Il y a déjà une livraison active. Veuillez d\'abord l\'archiver.')
      return
    }

    const { error } = await supabase
      .from('livraisons')
      .update({ archivee: false, date_archivage: null })
      .eq('id', id)

    if (!error) {
      setLivraisons(livraisons.map(liv =>
        liv.id === id ? { ...liv, archivee: false, date_archivage: null } : liv
      ))
    }
  }

  const getLivraisonData = (livraison) => {
    if (!livraison) return { totalConsomme: 0, restant: 0, totalVentesExternes: 0, totalInternes: 0, totalExternes: 0 }
    
    const prisesInternes = livraison.prises.filter(p => p.type === 'interne')
    const prisesExternes = livraison.prises.filter(p => p.type === 'externe')
    
    const totalInternes = prisesInternes.reduce((sum, p) => sum + parseFloat(p.volume), 0)
    const totalExternes = prisesExternes.reduce((sum, p) => sum + parseFloat(p.volume), 0)
    const totalConsomme = totalInternes + totalExternes
    const restant = livraison.volume_initial - totalConsomme
    const totalVentesExternes = prisesExternes.reduce((sum, p) => sum + (parseFloat(p.prix_total) || 0), 0)
    
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

      {/* Onglets Livraison Active / Clôturées */}
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
          {/* Livraison active */}
          {livraisonActive ? (
            <>
              <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-300">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-bold mb-3">
                        📦 Livraison en cours - {new Date(livraisonActive.date).toLocaleDateString('fr-FR')}
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                          <p className="text-xs text-gray-600">Stock initial</p>
                          <p className="text-xl font-bold text-gray-600">{livraisonActive.stock_initial} L</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Volume livré</p>
                          <p className="text-xl font-bold text-orange-600">{livraisonActive.volume_livre} L</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Total disponible</p>
                          <p className="text-xl font-bold text-gray-800">{livraisonActive.volume_initial} L</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Consommé</p>
                          <p className="text-xl font-bold text-red-600">
                            {getLivraisonData(livraisonActive).totalConsomme.toFixed(1)} L
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Restant</p>
                          <p className="text-xl font-bold text-green-600">
                            {getLivraisonData(livraisonActive).restant.toFixed(1)} L
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 text-sm">
                        <span className="font-semibold">Ventes externes: </span>
                        <span className="text-green-700 font-bold">
                          {getLivraisonData(livraisonActive).totalVentesExternes.toFixed(2)} €
                        </span>
                      </div>
                      <div className="mt-3">
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
                          {((getLivraisonData(livraisonActive).restant / livraisonActive.volume_initial) * 100).toFixed(1)}% restant
                        </p>
                      </div>
                    </div>
                    <Button onClick={() => archiveLivraison(livraisonActive.id)} variant="ghost">
                      📦 Clôturer
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Sous-onglets Interne / Externe */}
              <div className="flex gap-2 border-b-2 border-gray-200">
                <button
                  onClick={() => setJetA1View('interne')}
                  className={`px-6 py-3 font-semibold transition-all border-b-4 ${
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
                  className={`px-6 py-3 font-semibold transition-all border-b-4 ${
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
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-bold">
                      {jetA1View === 'externe' ? 'Ventes Externes' : 'Prises Internes'}
                    </h4>
                    <Button
                      onClick={() => {
                        setNewPrise({ ...newPrise, type: jetA1View })
                        setShowAddPrise(!showAddPrise)
                      }}
                      size="sm"
                    >
                      + {jetA1View === 'externe' ? 'Ajouter vente' : 'Ajouter prise'}
                    </Button>
                  </div>

                  {showAddPrise && (
                    <div className="bg-blue-50 p-3 rounded-lg mb-4 border border-blue-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
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

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-2 text-left">Immat/Réf</th>
                          <th className="p-2 text-left">Nom/Client</th>
                          <th className="p-2 text-left">Date</th>
                          <th className="p-2 text-right">Volume (L)</th>
                          {jetA1View === 'externe' && (
                            <>
                              <th className="p-2 text-right">Prix/L (€)</th>
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
                              {jetA1View === 'externe' ? 'Aucune vente enregistrée' : 'Aucune prise enregistrée'}
                            </td>
                          </tr>
                        ) : (
                          displayedPrises.map(prise => (
                            <tr key={prise.id} className="border-b hover:bg-gray-50">
                              <td className="p-2">{prise.immatriculation}</td>
                              <td className="p-2">{prise.nom}</td>
                              <td className="p-2">{new Date(prise.date).toLocaleDateString('fr-FR')}</td>
                              <td className="p-2 text-right font-semibold">{prise.volume} L</td>
                              {jetA1View === 'externe' && (
                                <>
                                  <td className="p-2 text-right">{prise.prix_litre?.toFixed(2)} €</td>
                                  <td className="p-2 text-right font-bold text-green-600">
                                    {prise.prix_total?.toFixed(2)} €
                                  </td>
                                </>
                              )}
                              <td className="p-2 text-center">
                                <button
                                  onClick={() => deletePrise(prise.id, livraisonActive.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  🗑️
                                </button>
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
              <p className="text-gray-600 mb-3">⛽ Aucune livraison active</p>
              <Button onClick={() => setShowAddLivraison(true)}>
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
              <p>Aucune livraison clôturée</p>
            </div>
          ) : (
            livraisonsArchivees.map(livraison => {
              const { totalConsomme, restant, totalVentesExternes, totalInternes, totalExternes } = getLivraisonData(livraison)
              
              return (
                <Card key={livraison.id} className="border border-gray-300">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h4 className="text-lg font-bold mb-2">
                          📦 Livraison du {new Date(livraison.date).toLocaleDateString('fr-FR')}
                          <span className="ml-3 text-sm text-gray-500 font-normal">
                            Clôturée le {new Date(livraison.date_archivage).toLocaleDateString('fr-FR')}
                          </span>
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                          <div>
                            <p className="text-xs text-gray-600">Stock initial</p>
                            <p className="text-lg font-bold text-gray-600">{livraison.stock_initial || 0} L</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Volume livré</p>
                            <p className="text-lg font-bold text-orange-600">{livraison.volume_livre} L</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Total disponible</p>
                            <p className="text-lg font-bold text-gray-800">{livraison.volume_initial} L</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Usage interne</p>
                            <p className="text-lg font-bold text-blue-600">{totalInternes.toFixed(1)} L</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Ventes externes</p>
                            <p className="text-lg font-bold text-green-600">{totalExternes.toFixed(1)} L</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Restant</p>
                            <p className="text-lg font-bold text-gray-600">{restant.toFixed(1)} L</p>
                          </div>
                        </div>
                        <div className="mt-2 text-sm">
                          <span className="font-semibold">Total ventes: </span>
                          <span className="text-green-700 font-bold">{totalVentesExternes.toFixed(2)} €</span>
                        </div>
                      </div>
                      <Button onClick={() => unarchiveLivraison(livraison.id)} variant="ghost" size="sm">
                        ↩️ Réactiver
                      </Button>
                    </div>
                    
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-gray-900">
                        Voir le détail des prises ({livraison.prises.length})
                      </summary>
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="p-2 text-left">Type</th>
                              <th className="p-2 text-left">Immat/Réf</th>
                              <th className="p-2 text-left">Nom/Client</th>
                              <th className="p-2 text-left">Date</th>
                              <th className="p-2 text-right">Volume</th>
                              <th className="p-2 text-right">Prix/L</th>
                              <th className="p-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {livraison.prises.map(prise => (
                              <tr key={prise.id} className="border-b">
                                <td className="p-2">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    prise.type === 'interne' 
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-green-100 text-green-700'
                                  }`}>
                                    {prise.type === 'interne' ? 'Interne' : 'Externe'}
                                  </span>
                                </td>
                                <td className="p-2">{prise.immatriculation}</td>
                                <td className="p-2">{prise.nom}</td>
                                <td className="p-2">{new Date(prise.date).toLocaleDateString('fr-FR')}</td>
                                <td className="p-2 text-right font-semibold">{prise.volume} L</td>
                                <td className="p-2 text-right">
                                  {prise.prix_litre ? `${parseFloat(prise.prix_litre).toFixed(2)} €` : '-'}
                                </td>
                                <td className="p-2 text-right font-bold text-green-600">
                                  {prise.prix_total ? `${parseFloat(prise.prix_total).toFixed(2)} €` : '-'}
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
    </div>
  )
}