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
  
  const [newTransaction, setNewTransaction] = useState({
    type: 'encaissement',
    mode_paiement: 'cash',
    date: new Date().toISOString().split('T')[0],
    nom: '',
    montant: '',
    descriptif: ''
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

  const addTransaction = async () => {
    if (!newTransaction.nom || !newTransaction.montant) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    const { data, error } = await supabase
      .from('caisse')
      .insert([
        {
          type: newTransaction.type,
          mode_paiement: newTransaction.mode_paiement,
          date: newTransaction.date,
          nom: newTransaction.nom,
          montant: parseFloat(newTransaction.montant),
          descriptif: newTransaction.descriptif
        }
      ])
      .select()

    if (data) {
      setTransactions([data[0], ...transactions])
      setNewTransaction({
        type: 'encaissement',
        mode_paiement: 'cash',
        date: new Date().toISOString().split('T')[0],
        nom: '',
        montant: '',
        descriptif: ''
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
  const filteredTransactions = transactions.filter(t =>
    t.nom.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (!dateFilter || t.date === dateFilter)
  )

  // Calculs
  const totalEncaissements = transactions
    .filter(t => t.type === 'encaissement')
    .reduce((sum, t) => sum + parseFloat(t.montant), 0)

  const totalDecaissements = transactions
    .filter(t => t.type === 'decaissement')
    .reduce((sum, t) => sum + parseFloat(t.montant), 0)

  const cashDisponible = transactions
    .filter(t => t.mode_paiement === 'cash')
    .reduce((sum, t) => {
      return sum + (t.type === 'encaissement' ? parseFloat(t.montant) : -parseFloat(t.montant))
    }, 0)

  return (
    <div className="space-y-4">
      <div className="flex justify-end items-center">
        <Button onClick={() => setShowAddTransaction(!showAddTransaction)}>
          + Nouvelle transaction
        </Button>
      </div>

      {/* Cartes de résumé */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
          <CardContent className="pt-6">
            <p className="text-sm opacity-90">Total Encaissements</p>
            <p className="text-3xl font-bold mt-2">{totalEncaissements.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg">
          <CardContent className="pt-6">
            <p className="text-sm opacity-90">Total Décaissements</p>
            <p className="text-3xl font-bold mt-2">{totalDecaissements.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
          <CardContent className="pt-6">
            <p className="text-sm opacity-90">Cash Disponible</p>
            <p className="text-3xl font-bold mt-2">{cashDisponible.toFixed(2)} €</p>
          </CardContent>
        </Card>
      </div>

      {/* Formulaire d'ajout */}
      {showAddTransaction && (
        <Card className="border-2 border-green-200">
          <CardContent className="pt-6">
            <div className="space-y-3">
              {/* Type de transaction */}
              <div className="flex gap-2">
                <button
                  onClick={() => setNewTransaction({ ...newTransaction, type: 'encaissement' })}
                  className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                    newTransaction.type === 'encaissement'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Encaissement
                </button>
                <button
                  onClick={() => setNewTransaction({ ...newTransaction, type: 'decaissement' })}
                  className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                    newTransaction.type === 'decaissement'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Décaissement
                </button>
              </div>

              {/* Champs du formulaire */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mode de paiement</label>
                  <select
                    value={newTransaction.mode_paiement}
                    onChange={(e) => setNewTransaction({ ...newTransaction, mode_paiement: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="cash">Cash</option>
                    <option value="carte">Carte</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={newTransaction.date}
                    onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input
                    type="text"
                    value={newTransaction.nom}
                    onChange={(e) => setNewTransaction({ ...newTransaction, nom: e.target.value })}
                    placeholder="Nom de la personne"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Montant (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newTransaction.montant}
                    onChange={(e) => setNewTransaction({ ...newTransaction, montant: e.target.value })}
                    placeholder="0.00"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descriptif</label>
                <textarea
                  value={newTransaction.descriptif}
                  onChange={(e) => setNewTransaction({ ...newTransaction, descriptif: e.target.value })}
                  placeholder="Description de la transaction..."
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows="2"
                />
              </div>

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

      {/* Filtres */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 Rechercher par nom..."
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="min-w-[200px]">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {(searchTerm || dateFilter) && (
              <Button
                onClick={() => {
                  setSearchTerm('')
                  setDateFilter('')
                }}
                variant="ghost"
              >
                Réinitialiser
              </Button>
            )}
          </div>

          {/* Tableau des transactions */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-left">Mode</th>
                  <th className="p-2 text-left">Nom</th>
                  <th className="p-2 text-left">Descriptif</th>
                  <th className="p-2 text-right">Montant</th>
                  <th className="p-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-gray-400">
                      💳 Aucune transaction trouvée
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map(transaction => (
                    <tr key={transaction.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        {new Date(transaction.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="p-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            transaction.type === 'encaissement'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {transaction.type === 'encaissement' ? 'Encaissement' : 'Décaissement'}
                        </span>
                      </td>
                      <td className="p-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          {transaction.mode_paiement === 'cash' ? '💵 Cash' : '💳 Carte'}
                        </span>
                      </td>
                      <td className="p-2 font-medium">{transaction.nom}</td>
                      <td className="p-2 text-gray-600">{transaction.descriptif || '-'}</td>
                      <td
                        className={`p-2 text-right font-bold ${
                          transaction.type === 'encaissement' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {transaction.type === 'encaissement' ? '+' : '-'}
                        {parseFloat(transaction.montant).toFixed(2)} €
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => deleteTransaction(transaction.id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
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