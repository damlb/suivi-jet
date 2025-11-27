import { useState } from 'react'
import { supabase } from './lib/supabase'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState(null)

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username,
            }
          }
        })
        
        if (error) throw error
        
        if (data) {
          alert('Inscription réussie ! Vous pouvez maintenant vous connecter.')
          setIsSignUp(false)
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        if (error) throw error
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
   <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4"> 
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Suivi Quotidien
          </CardTitle>
          <CardDescription className="text-center">
            Jet System Helicopter
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Nom d'utilisateur</label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required={isSignUp}
                  placeholder="Votre nom"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="votre@email.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mot de passe</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Chargement...' : (isSignUp ? 'S\'inscrire' : 'Se connecter')}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError(null)
              }}
              className="w-full"
            >
              {isSignUp ? 'Déjà un compte ? Se connecter' : 'Pas de compte ? S\'inscrire'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}