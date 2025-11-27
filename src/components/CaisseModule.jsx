import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'

export default function CaisseModule() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [modeFilter, setModeFilter] = useState('') // Nouveau filtre
  const [activeView, setActiveView] = useState('ventes') // 'ventes' ou 'achats'
  
  const [newTransaction, setNewTransaction] = useState({
    categorie: 'vente', // 'vente' ou 'achat'
    type: 'encaissement',
    mode_paiement: 'cash',
    date: new Date().toISOString().split('T')[0],
    nom: '',
    montant: '',
    descriptif: '',
    photo_ticket: null
  })

  useEffect(() => {
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    const { data, error } = await supabase
      .from('caisse')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (data) {
      setTransactions(data)
    }
    setLoading(false)
  }

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Créer une preview en base64
    const reader = new FileReader()
    reader.onloadend = () => {
      setNewTransaction({
        ...newTransaction,
        photo_ticket: reader.result
      })
    }
    reader.readAsDataURL(file)
  }

  const addTransaction = async () => {
    if (!newTransaction.nom || !newTransaction.montant) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    const { data, error } = await supabase
      .from('caisse')
      .insert([
        {
          categorie: newTransaction.categorie,
          type: newTransaction.type,
          mode_paiement: newTransaction.mode_paiement,
          date: newTransaction.date,
          nom: newTransaction.nom,
          montant: parseFloat(newTransaction.montant),
          descriptif: newTransaction.descriptif,
          photo_ticket: newTransaction.photo_ticket
        }
      ])
      .select()

    if (data) {
      setTransactions([data[0], ...transactions])
      setNewTransaction({
        categorie: activeView === 'ventes' ? 'vente' : 'achat',
        type: activeView === 'ventes' ? 'encaissement' : 'decaissement',
        mode_paiement: 'cash',
        date: new Date().toISOString().split('T')[0],
        nom: '',
        montant: '',
        descriptif: '',
        photo_ticket: null
      })
      setShowAddTransaction(false)
    }
  }

  const deleteTransaction = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) {
      const { error } = await supabase
        .from('caisse')
        .delete()
        .eq('id', id)

      if (!error) {
        setTransactions(transactions.filter(t => t.id !== id))
      }
    }
  }

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  // Filtrage
  const transactionsVentes = transactions.filter(t => (t.categorie || 'vente') === 'vente')
  const transactionsAchats = transactions.filter(t => t.categorie === 'achat')
  
  const displayedTransactions = activeView === 'ventes' ? transactionsVentes : transactionsAchats

  const filteredTransactions = displayedTransactions.filter(t =>
    t.nom.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (!dateFilter || t.date === dateFilter) &&
    (!modeFilter || t.mode_paiement === modeFilter)
  )

  // Calculs
  const totalEncaissements = transactionsVentes
    .reduce((sum, t) => sum + parseFloat(t.montant), 0)

  const totalDecaissements = transactionsAchats
    .reduce((sum, t) => sum + parseFloat(t.montant), 0)

  const cashDisponible = transactions
    .filter(t => t.mode_paiement === 'cash')
    .reduce((sum, t) => {
      const categorie = t.categorie || 'vente'
      return sum + (categorie === 'vente' ? parseFloat(t.montant) : -parseFloat(t.montant))
    }, 0)

  return (
    <div className="space-y-4">
      <div className="flex justify-end items-center">
        <Button 
          onClick={() => {
            setNewTransaction({
              ...newTransaction,
              categorie: activeView === 'ventes' ? 'vente' : 'achat',
              type: activeView === 'ventes' ? 'encaissement' : 'decaissement'
            })
            setShowAddTransaction(!showAddTransaction)
          }}
          className="text-sm sm:text-base"
        >
          + Nouveau
        </Button>
      </div>

      {/* Cartes de résumé */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
          <CardContent className="pt-4 sm:pt-6">
            <p className="text-xs sm:text-sm opacity-90">Total Ventes</p>
            <p className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">{totalEncaissements.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg">
          <CardContent className="pt-4 sm:pt-6">
            <p className="text-xs sm:text-sm opacity-90">Total Achats</p>
            <p className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">{totalDecaissements.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
          <CardContent className="pt-4 sm:pt-6">
            <p className="text-xs sm:text-sm opacity-90">Cash Dispo</p>
            <p className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2">{cashDisponible.toFixed(2)} €</p>
          </CardContent>
        </Card>
      </div>

      {/* Formulaire d'ajout */}
      {showAddTransaction && (
        <Card className="border-2 border-green-200">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Mode de paiement</label>
                  <select
                    value={newTransaction.mode_paiement}
                    onChange={(e) => setNewTransaction({ ...newTransaction, mode_paiement: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm sm:text-base"
                  >
                    <option value="cash">💵 Cash</option>
                    <option value="carte">💳 Carte</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={newTransaction.date}
                    onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                    className="w-full p-2 border rounded-lg text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nom</label>
                  <input
                    type="text"
                    value={newTransaction.nom}
                    onChange={(e) => setNewTransaction({ ...newTransaction, nom: e.target.value })}
                    placeholder={activeView === 'ventes' ? "Client" : "Fournisseur/Magasin"}
                    className="w-full p-2 border rounded-lg text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Montant (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newTransaction.montant}
                    onChange={(e) => setNewTransaction({ ...newTransaction, montant: e.target.value })}
                    placeholder="0.00"
                    className="w-full p-2 border rounded-lg text-sm sm:text-base"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descriptif</label>
                <textarea
                  value={newTransaction.descriptif}
                  onChange={(e) => setNewTransaction({ ...newTransaction, descriptif: e.target.value })}
                  placeholder="Description..."
                  className="w-full p-2 border rounded-lg text-sm sm:text-base"
                  rows="2"
                />
              </div>

              {activeView === 'achats' && (
                <div>
                  <label className="block text-sm font-medium mb-1">📸 Photo du ticket</label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                  {newTransaction.photo_ticket && (
                    <div className="mt-2">
                      <img 
                        src={newTransaction.photo_ticket} 
                        alt="Aperçu ticket" 
                        className="h-32 w-auto border rounded"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={addTransaction}>Ajouter</Button>
                <Button variant="ghost" onClick={() => setShowAddTransaction(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Onglets Ventes / Achats */}
      <div className="flex gap-2 border-b-2 border-gray-200">
        <button
          onClick={() => setActiveView('ventes')}
          className={`px-4 sm:px-6 py-2 sm:py-3 font-semibold transition-all border-b-4 text-sm sm:text-base ${
            activeView === 'ventes'
              ? 'border-green-500 text-green-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Ventes
          <span className="ml-2 px-2 py-1 bg-green-100 text-green-600 rounded-full text-xs font-bold">
            {transactionsVentes.length}
          </span>
        </button>
        <button
          onClick={() => setActiveView('achats')}
          className={`px-4 sm:px-6 py-2 sm:py-3 font-semibold transition-all border-b-4 text-sm sm:text-base ${
            activeView === 'achats'
              ? 'border-red-500 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Achats
          <span className="ml-2 px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold">
            {transactionsAchats.length}
          </span>
        </button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {/* Filtres */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 Rechercher..."
              className="flex-1 p-2 border rounded-lg text-sm"
            />
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="p-2 border rounded-lg text-sm"
            >
              <option value="">Tous les modes</option>
              <option value="cash">💵 Cash</option>
              <option value="carte">💳 Carte</option>
            </select>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="p-2 border rounded-lg text-sm"
            />
            {(searchTerm || dateFilter || modeFilter) && (
              <Button
                onClick={() => {
                  setSearchTerm('')
                  setDateFilter('')
                  setModeFilter('')
                }}
                variant="ghost"
                className="text-sm"
              >
                Réinitialiser
              </Button>
            )}
          </div>

          {/* Tableau responsive */}
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-1 sm:p-2 text-left">Date</th>
                  <th className="p-1 sm:p-2 text-left">Mode</th>
                  <th className="p-1 sm:p-2 text-left">Nom</th>
                  <th className="p-1 sm:p-2 text-left hidden sm:table-cell">Descriptif</th>
                  <th className="p-1 sm:p-2 text-right">Montant</th>
                  <th className="p-1 sm:p-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-400">
                      💳 Aucune transaction
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map(transaction => (
                    <tr key={transaction.id} className="border-b hover:bg-gray-50">
                      <td className="p-1 sm:p-2 text-xs">
                        {new Date(transaction.date).toLocaleDateString('fr-FR', { 
                          day: '2-digit', 
                          month: '2-digit' 
                        })}
                      </td>
                      <td className="p-1 sm:p-2">
                        <span className="text-xs">
                          {transaction.mode_paiement === 'cash' ? '💵' : '💳'}
                        </span>
                      </td>
                      <td className="p-1 sm:p-2 font-medium text-xs sm:text-sm">{transaction.nom}</td>
                      <td className="p-1 sm:p-2 text-gray-600 text-xs hidden sm:table-cell">
                        {transaction.descriptif || '-'}
                        {transaction.photo_ticket && (
                          <button
                            onClick={() => window.open(transaction.photo_ticket, '_blank')}
                            className="ml-2 text-blue-500 hover:text-blue-700"
                          >
                            📷
                          </button>
                        )}
                      </td>
                      <td className={`p-1 sm:p-2 text-right font-bold text-xs sm:text-sm ${
                        activeView === 'ventes' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {activeView === 'ventes' ? '+' : '-'}{parseFloat(transaction.montant).toFixed(2)} €
                      </td>
                      <td className="p-1 sm:p-2 text-center">
                        <button
                          onClick={() => deleteTransaction(transaction.id)}
                          className="text-red-500 hover:text-red-700 text-xs sm:text-base"
                          title="Supprimer"
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
    </div>
  )
}