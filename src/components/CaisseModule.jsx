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
    categorie: 'vente', // 'vente', 'achat', ou 'depot_banque'
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

  const exportToCSV = () => {
    if (filteredTransactions.length === 0) {
      alert('Aucune transaction à exporter')
      return
    }

    try {
      const csvData = filteredTransactions.map(t => ({
        Date: new Date(t.date).toLocaleDateString('fr-FR'),
        Catégorie: t.categorie === 'vente' ? 'Vente' : t.categorie === 'achat' ? 'Achat' : 'Dépôt Banque',
        Mode: t.mode_paiement === 'cash' ? 'Cash' : 'Carte',
        Nom: `"${t.nom}"`, // Entourer de guillemets pour éviter les problèmes de virgules
        Descriptif: `"${(t.descriptif || '').replace(/"/g, '""')}"`, // Échapper les guillemets
        Montant: parseFloat(t.montant).toFixed(2)
      }))

      // Créer le CSV
      const headers = 'Date,Catégorie,Mode,Nom,Descriptif,Montant'
      const rows = csvData.map(row => 
        `${row.Date},${row.Catégorie},${row.Mode},${row.Nom},${row.Descriptif},${row.Montant}`
      ).join('\n')
      const csv = headers + '\n' + rows

      // Télécharger
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `caisse_${activeView}_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erreur export CSV:', error)
      alert('Erreur lors de l\'export CSV')
    }
  }

  const exportToExcel = () => {
    if (filteredTransactions.length === 0) {
      alert('Aucune transaction à exporter')
      return
    }

    try {
      // Créer un tableau HTML
      const tableData = filteredTransactions.map(t => `
        <tr>
          <td>${new Date(t.date).toLocaleDateString('fr-FR')}</td>
          <td>${t.categorie === 'vente' ? 'Vente' : t.categorie === 'achat' ? 'Achat' : 'Dépôt Banque'}</td>
          <td>${t.mode_paiement === 'cash' ? 'Cash' : 'Carte'}</td>
          <td>${t.nom}</td>
          <td>${t.descriptif || ''}</td>
          <td>${parseFloat(t.montant).toFixed(2)} €</td>
        </tr>
      `).join('')

      const html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
          <head>
            <meta charset="utf-8">
            <style>
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #4CAF50; color: white; font-weight: bold; }
            </style>
          </head>
          <body>
            <h2>Caisse - ${activeView === 'ventes' ? 'Ventes' : activeView === 'achats' ? 'Achats' : 'Dépôts Banque'}</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Catégorie</th>
                  <th>Mode</th>
                  <th>Nom</th>
                  <th>Descriptif</th>
                  <th>Montant</th>
                </tr>
              </thead>
              <tbody>
                ${tableData}
              </tbody>
            </table>
          </body>
        </html>
      `

      // Télécharger comme .xls (Excel peut l'ouvrir)
      const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `caisse_${activeView}_${new Date().toISOString().split('T')[0]}.xls`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erreur export Excel:', error)
      alert('Erreur lors de l\'export Excel')
    }
  }

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  // Filtrage
  const transactionsVentes = transactions.filter(t => (t.categorie || 'vente') === 'vente')
  const transactionsAchats = transactions.filter(t => t.categorie === 'achat')
  const transactionsDepots = transactions.filter(t => t.categorie === 'depot_banque')
  
  const displayedTransactions = activeView === 'ventes' 
    ? transactionsVentes 
    : activeView === 'achats' 
    ? transactionsAchats 
    : transactionsDepots

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

  const totalDepots = transactionsDepots
    .reduce((sum, t) => sum + parseFloat(t.montant), 0)

  const cashDisponible = transactions
    .filter(t => t.mode_paiement === 'cash')
    .reduce((sum, t) => {
      const categorie = t.categorie || 'vente'
      if (categorie === 'vente') return sum + parseFloat(t.montant)
      if (categorie === 'achat') return sum - parseFloat(t.montant)
      if (categorie === 'depot_banque') return sum - parseFloat(t.montant)
      return sum
    }, 0)

  return (
    <div className="space-y-4">
      {/* Cartes de résumé */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <Card className="bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-lg">
          <CardContent className="pt-3 sm:pt-6 p-2 sm:p-6">
            <p className="text-[10px] sm:text-sm opacity-90">Total Ventes</p>
            <p className="text-base sm:text-3xl font-bold mt-1 sm:mt-2">{totalEncaissements.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-rose-400 to-rose-500 text-white shadow-lg">
          <CardContent className="pt-3 sm:pt-6 p-2 sm:p-6">
            <p className="text-[10px] sm:text-sm opacity-90">Total Achats</p>
            <p className="text-base sm:text-3xl font-bold mt-1 sm:mt-2">{totalDecaissements.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-violet-400 to-violet-500 text-white shadow-lg">
          <CardContent className="pt-3 sm:pt-6 p-2 sm:p-6">
            <p className="text-[10px] sm:text-sm opacity-90">Dépôts Banque</p>
            <p className="text-base sm:text-3xl font-bold mt-1 sm:mt-2">{totalDepots.toFixed(2)} €</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-sky-400 to-sky-500 text-white shadow-lg">
          <CardContent className="pt-3 sm:pt-6 p-2 sm:p-6">
            <p className="text-[10px] sm:text-sm opacity-90">Cash Dispo</p>
            <p className="text-base sm:text-3xl font-bold mt-1 sm:mt-2">{cashDisponible.toFixed(2)} €</p>
          </CardContent>
        </Card>
      </div>

      {/* Boutons d'action - Après les cartes */}
      <div className="grid grid-cols-3 gap-2">
        <Button 
          onClick={() => {
            setNewTransaction({
              categorie: 'vente',
              type: 'encaissement',
              mode_paiement: 'cash',
              date: new Date().toISOString().split('T')[0],
              nom: '',
              montant: '',
              descriptif: '',
              photo_ticket: null
            })
            setActiveView('ventes')
            setShowAddTransaction(true)
          }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm py-2 sm:py-3"
        >
          + Vente
        </Button>
        <Button 
          onClick={() => {
            setNewTransaction({
              categorie: 'achat',
              type: 'decaissement',
              mode_paiement: 'cash',
              date: new Date().toISOString().split('T')[0],
              nom: '',
              montant: '',
              descriptif: '',
              photo_ticket: null
            })
            setActiveView('achats')
            setShowAddTransaction(true)
          }}
          className="bg-rose-500 hover:bg-rose-600 text-white text-xs sm:text-sm py-2 sm:py-3"
        >
          + Achat
        </Button>
        <Button 
          onClick={() => {
            setNewTransaction({
              categorie: 'depot_banque',
              type: 'decaissement',
              mode_paiement: 'cash',
              date: new Date().toISOString().split('T')[0],
              nom: 'Dépôt banque',
              montant: '',
              descriptif: '',
              photo_ticket: null
            })
            setActiveView('depots')
            setShowAddTransaction(true)
          }}
          className="bg-sky-500 hover:bg-sky-600 text-white text-xs sm:text-sm py-2 sm:py-3"
        >
          🏦 Dépôt
        </Button>
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

      {/* Onglets Ventes / Achats / Dépôts Banque */}
      <div className="flex gap-2 border-b-2 border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveView('ventes')}
          className={`px-3 sm:px-6 py-2 sm:py-3 font-semibold transition-all border-b-4 text-xs sm:text-base whitespace-nowrap ${
            activeView === 'ventes'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Ventes
          <span className="ml-2 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
            {transactionsVentes.length}
          </span>
        </button>
        <button
          onClick={() => setActiveView('achats')}
          className={`px-3 sm:px-6 py-2 sm:py-3 font-semibold transition-all border-b-4 text-xs sm:text-base whitespace-nowrap ${
            activeView === 'achats'
              ? 'border-rose-500 text-rose-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Achats
          <span className="ml-2 px-2 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-bold">
            {transactionsAchats.length}
          </span>
        </button>
        <button
          onClick={() => setActiveView('depots')}
          className={`px-3 sm:px-6 py-2 sm:py-3 font-semibold transition-all border-b-4 text-xs sm:text-base whitespace-nowrap ${
            activeView === 'depots'
              ? 'border-violet-500 text-violet-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🏦 Dépôts
          <span className="ml-2 px-2 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-bold">
            {transactionsDepots.length}
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
                        activeView === 'ventes' ? 'text-emerald-600' : activeView === 'achats' ? 'text-rose-600' : 'text-violet-600'
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

          {/* Boutons d'export */}
          {filteredTransactions.length > 0 && (
            <div className="mt-4 pt-4 border-t flex flex-wrap gap-2 justify-end">
              <Button
                onClick={exportToCSV}
                variant="ghost"
                className="text-sm"
              >
                📊 Exporter CSV
              </Button>
              <Button
                onClick={exportToExcel}
                variant="ghost"
                className="text-sm"
              >
                📗 Exporter Excel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}