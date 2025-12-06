import { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { BarChart3, TrendingUp, MapPin, Filter } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function StatsModal({ 
  isOpen, 
  onClose, 
  allFlights, 
  pilots,
  userRole,
  onResetData 
}) {
  const [statsStartDate, setStatsStartDate] = useState('')
  const [statsEndDate, setStatsEndDate] = useState('')
  const [statsPilotFilter, setStatsPilotFilter] = useState('all')
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  if (!isOpen) return null

  const handleResetAllData = async () => {
    await onResetData()
    setShowResetConfirm(false)
    onClose()
  }

  return (
    <>
      {/* 📊 MODALE STATISTIQUES ET GRAPHIQUES */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto">
          {/* En-tête modale */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 sm:p-6 rounded-t-lg z-10">
            <div className="flex justify-between items-center">
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <BarChart3 size={24} />
                Statistiques & Graphiques
              </h2>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Contenu modale */}
          <div className="p-3 sm:p-6 space-y-3 sm:space-y-6">
            {(() => {
              // Filtrer les vols selon la période et le pilote
              let filteredFlights = allFlights.filter(f => !f.in_progress && f.arrival_time)
              
              // Filtre par pilote
              if (statsPilotFilter !== 'all') {
                filteredFlights = filteredFlights.filter(f => f.pilot_id === statsPilotFilter)
              }
              
              // Filtre par date de début
              if (statsStartDate) {
                filteredFlights = filteredFlights.filter(f => {
                  const flightDate = new Date(f.departure_time).toISOString().split('T')[0]
                  return flightDate >= statsStartDate
                })
              }
              
              // Filtre par date de fin
              if (statsEndDate) {
                filteredFlights = filteredFlights.filter(f => {
                  const flightDate = new Date(f.departure_time).toISOString().split('T')[0]
                  return flightDate <= statsEndDate
                })
              }

              const completedFlights = filteredFlights
              const totalMinutes = completedFlights.reduce((sum, f) => {
                const diff = new Date(f.arrival_time) - new Date(f.departure_time)
                return sum + Math.round(diff / 60000)
              }, 0)
              const totalHours = Math.floor(totalMinutes / 60)

              return (
                <>
                  {/* Filtres */}
                  <Card className="border-2 border-blue-200 bg-blue-50">
                    <CardContent className="pt-3 sm:pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Filter size={20} className="text-blue-600" />
                        <h3 className="font-semibold text-base sm:text-lg">Filtrer les statistiques</h3>
                      </div>
                      <div className={`grid grid-cols-1 ${userRole === 'agent_sol' ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
                        {/* Filtre pilote - seulement pour agents */}
                        {userRole === 'agent_sol' && (
                          <div>
                            <label className="block text-xs sm:text-sm font-medium mb-2">Pilote</label>
                            <select
                              value={statsPilotFilter}
                              onChange={(e) => setStatsPilotFilter(e.target.value)}
                              className="w-full p-2 border rounded-lg text-sm"
                            >
                              <option value="all">Tous les pilotes</option>
                              {pilots.map(pilot => (
                                <option key={pilot.id} value={pilot.id}>
                                  {pilot.username}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div>
                          <label className="block text-xs sm:text-sm font-medium mb-2">Date de début</label>
                          <input
                            type="date"
                            value={statsStartDate}
                            onChange={(e) => setStatsStartDate(e.target.value)}
                            className="w-full p-2 border rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-medium mb-2">Date de fin</label>
                          <input
                            type="date"
                            value={statsEndDate}
                            onChange={(e) => setStatsEndDate(e.target.value)}
                            className="w-full p-2 border rounded-lg text-sm"
                          />
                        </div>
                        <div className="flex items-end">
                          {(statsStartDate || statsEndDate || statsPilotFilter !== 'all') && (
                            <Button
                              onClick={() => {
                                setStatsStartDate('')
                                setStatsEndDate('')
                                setStatsPilotFilter('all')
                              }}
                              variant="outline"
                              className="w-full text-sm"
                            >
                              Réinitialiser les filtres
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Date de début des données */}
                  {completedFlights.length > 0 && (() => {
                    const oldestFlight = completedFlights.reduce((oldest, flight) => {
                      const flightDate = new Date(flight.departure_time)
                      const oldestDate = new Date(oldest.departure_time)
                      return flightDate < oldestDate ? flight : oldest
                    })
                    const oldestDate = new Date(oldestFlight.departure_time)
                    
                    return (
                      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-lg p-4 text-center">
                        <p className="text-sm text-indigo-600 font-semibold">
                          📅 Données depuis le <span className="text-indigo-900 font-bold">
                            {oldestDate.toLocaleDateString('fr-FR', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </span>
                          {statsStartDate || statsEndDate ? (
                            <span className="text-indigo-500 ml-2">(filtré)</span>
                          ) : (
                            <span className="text-indigo-500 ml-2">
                              • {Math.ceil((new Date() - oldestDate) / (1000 * 60 * 60 * 24))} jours d'historique
                            </span>
                          )}
                        </p>
                      </div>
                    )
                  })()}

                  {/* Stats globales */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border-2 border-blue-200">
                      <div className="text-sm text-blue-600 mb-1">Vols totaux</div>
                      <div className="text-3xl font-bold text-blue-900">{completedFlights.length}</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border-2 border-green-200">
                      <div className="text-sm text-green-600 mb-1">Heures totales</div>
                      <div className="text-3xl font-bold text-green-900">{totalHours}h</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border-2 border-orange-200">
                      <div className="text-sm text-orange-600 mb-1">Minutes totales</div>
                      <div className="text-3xl font-bold text-orange-900">{totalMinutes}</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border-2 border-purple-200">
                      <div className="text-sm text-purple-600 mb-1">Moyenne/vol</div>
                      <div className="text-3xl font-bold text-purple-900">
                        {completedFlights.length > 0 ? Math.round(totalMinutes / completedFlights.length) : 0}min
                      </div>
                    </div>
                  </div>

                  {/* Graphiques */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
                    {/* Graphique 1: Temps de vol par pilote */}
                    <Card className="border-2 border-blue-200">
                      <CardHeader className="bg-blue-50">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <BarChart3 size={20} className="text-blue-600" />
                          Temps de vol par pilote
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart 
                            data={(() => {
                              const pilotStats = {}
                              completedFlights.forEach(flight => {
                                const pilotName = flight.pilot?.username || 'Inconnu'
                                const duration = Math.round((new Date(flight.arrival_time) - new Date(flight.departure_time)) / 60000)
                                
                                if (!pilotStats[pilotName]) {
                                  pilotStats[pilotName] = { name: pilotName, minutes: 0, heures: 0 }
                                }
                                pilotStats[pilotName].minutes += duration
                              })
                              
                              return Object.values(pilotStats).map(p => ({
                                ...p,
                                heures: Number((p.minutes / 60).toFixed(1))
                              }))
                            })()}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} label={{ value: 'Heures', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                            <Tooltip 
                              contentStyle={{ fontSize: 12 }}
                              formatter={(value, name) => {
                                if (name === 'heures') return [`${value}h`, 'Temps de vol']
                                return [value, name]
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="heures" fill="#3b82f6" name="Heures de vol" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Graphique 2: Évolution des vols */}
                    <Card className="border-2 border-green-200">
                      <CardHeader className="bg-green-50">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <TrendingUp size={20} className="text-green-600" />
                          Évolution des vols
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart 
                            data={(() => {
                              const dailyStats = {}
                              completedFlights.forEach(flight => {
                                const date = new Date(flight.departure_time).toLocaleDateString('fr-FR')
                                if (!dailyStats[date]) {
                                  dailyStats[date] = { date, vols: 0, heures: 0 }
                                }
                                dailyStats[date].vols += 1
                                const duration = (new Date(flight.arrival_time) - new Date(flight.departure_time)) / (1000 * 60 * 60)
                                dailyStats[date].heures += duration
                              })
                              
                              return Object.values(dailyStats)
                                .sort((a, b) => {
                                  const dateA = a.date.split('/').reverse().join('-')
                                  const dateB = b.date.split('/').reverse().join('-')
                                  return dateA.localeCompare(dateB)
                                })
                                .slice(-30)
                                .map(d => ({
                                  ...d,
                                  heures: Number(d.heures.toFixed(1))
                                }))
                            })()}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                            <YAxis yAxisId="left" tick={{ fontSize: 12 }} label={{ value: 'Vols', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} label={{ value: 'Heures', angle: 90, position: 'insideRight', style: { fontSize: 12 } }} />
                            <Tooltip contentStyle={{ fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Line yAxisId="left" type="monotone" dataKey="vols" stroke="#8b5cf6" name="Vols" strokeWidth={2} />
                            <Line yAxisId="right" type="monotone" dataKey="heures" stroke="#10b981" name="Heures" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Graphique 3: Top 5 trajets */}
                  <Card className="border-2 border-purple-200">
                    <CardHeader className="bg-purple-50">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <MapPin size={20} className="text-purple-600" />
                        Top 5 des trajets les plus fréquents
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={(() => {
                                const routeStats = {}
                                completedFlights.forEach(flight => {
                                  const departure = flight.departure_dz?.name || flight.departure_location || 'Départ inconnu'
                                  const arrival = flight.arrival_dz?.name || flight.arrival_location || 'Arrivée inconnue'
                                  const route = `${departure} → ${arrival}`
                                  
                                  if (!routeStats[route]) {
                                    routeStats[route] = { name: route, value: 0 }
                                  }
                                  routeStats[route].value += 1
                                })
                                
                                return Object.values(routeStats)
                                  .sort((a, b) => b.value - a.value)
                                  .slice(0, 5)
                              })()}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                            >
                              {[0, 1, 2, 3, 4].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'][index]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                          </PieChart>
                        </ResponsiveContainer>

                        <div className="space-y-2">
                          <h4 className="font-semibold mb-3">Détails des trajets</h4>
                          {(() => {
                            const routeStats = {}
                            completedFlights.forEach(flight => {
                              const departure = flight.departure_dz?.name || flight.departure_location || 'Départ inconnu'
                              const arrival = flight.arrival_dz?.name || flight.arrival_location || 'Arrivée inconnue'
                              const route = `${departure} → ${arrival}`
                              const duration = Math.round((new Date(flight.arrival_time) - new Date(flight.departure_time)) / 60000)
                              
                              if (!routeStats[route]) {
                                routeStats[route] = { name: route, count: 0, totalMinutes: 0 }
                              }
                              routeStats[route].count += 1
                              routeStats[route].totalMinutes += duration
                            })
                            
                            return Object.values(routeStats)
                              .sort((a, b) => b.count - a.count)
                              .slice(0, 5)
                              .map((route, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div 
                                      className="w-4 h-4 rounded-full flex-shrink-0" 
                                      style={{ backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'][idx] }}
                                    />
                                    <span className="font-semibold truncate text-sm">{route.name}</span>
                                  </div>
                                  <div className="flex items-center gap-3 text-sm text-gray-600 flex-shrink-0">
                                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-semibold">
                                      {route.count} vol{route.count > 1 ? 's' : ''}
                                    </span>
                                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded font-semibold">
                                      {Math.floor(route.totalMinutes / 60)}h {route.totalMinutes % 60}min
                                    </span>
                                  </div>
                                </div>
                              ))
                          })()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Boutons en bas */}
                  <div className="flex flex-col gap-3 pt-4 border-t">
                    {/* Info sur les filtres actifs */}
                    {(statsStartDate || statsEndDate || statsPilotFilter !== 'all') && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                        <p className="font-semibold text-blue-900 mb-1">📊 Filtres actifs :</p>
                        <div className="text-blue-700 space-y-1">
                          {statsPilotFilter !== 'all' && (
                            <div>• Pilote : {pilots.find(p => p.id === statsPilotFilter)?.username || 'Inconnu'}</div>
                          )}
                          {statsStartDate && <div>• À partir du : {new Date(statsStartDate).toLocaleDateString('fr-FR')}</div>}
                          {statsEndDate && <div>• Jusqu'au : {new Date(statsEndDate).toLocaleDateString('fr-FR')}</div>}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-center gap-3">
                      <Button
                        onClick={onClose}
                        className="bg-gray-500 hover:bg-gray-600 px-8"
                      >
                        Fermer
                      </Button>
                      
                      {/* Bouton réinitialisation - uniquement pour pilotes */}
                      {userRole !== 'agent_sol' && (
                        <Button
                          onClick={() => setShowResetConfirm(true)}
                          className="bg-red-500 hover:bg-red-600 px-6"
                        >
                          🗑️ Réinitialiser toutes les données
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      </div>

      {/* ⚠️ POPUP CONFIRMATION RÉINITIALISATION */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
          <Card className="max-w-md w-full border-4 border-red-500">
            <CardHeader className="bg-red-50">
              <CardTitle className="text-xl text-red-700 flex items-center gap-2">
                ⚠️ ATTENTION - Confirmation requise
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <p className="text-base font-semibold">
                  Êtes-vous ABSOLUMENT CERTAIN de vouloir supprimer TOUTES les données de vol ?
                </p>
                <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 font-semibold mb-2">
                    Cette action va :
                  </p>
                  <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                    <li>Supprimer TOUS les vols enregistrés</li>
                    <li>Effacer TOUTES les statistiques</li>
                    <li>Réinitialiser TOUS les graphiques</li>
                  </ul>
                </div>
                <p className="text-sm text-red-600 font-bold">
                  ⚠️ CETTE ACTION EST IRRÉVERSIBLE ⚠️
                </p>
                
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleResetAllData}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
                  >
                    OUI, TOUT SUPPRIMER
                  </Button>
                  <Button
                    onClick={() => setShowResetConfirm(false)}
                    variant="outline"
                    className="flex-1 border-2 border-gray-400"
                  >
                    Non, annuler
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}