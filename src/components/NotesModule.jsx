import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'

export default function NotesModule({ currentUser }) {
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddNote, setShowAddNote] = useState(false)
  const [notesView, setNotesView] = useState('encours')
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [editingText, setEditingText] = useState('')

  useEffect(() => {
    loadNotes()
  }, [notesView])

  const loadNotes = async () => {
    // Charger TOUTES les notes pour avoir les bons compteurs
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('date', { ascending: false })

    if (data) {
      // Stocker toutes les notes
      setNotes(data)
    }
    setLoading(false)
  }

  const addNote = async () => {
    if (newNote.trim()) {
      console.log('🔍 currentUser:', currentUser) // LOG DEBUG
      
      const { data, error } = await supabase
        .from('notes')
        .insert([
          {
            texte: newNote,
            responsable: currentUser,
            cochee: false,
            coche_par: null,
            date_coche: null,
            archivee: false
          }
        ])
        .select()

      console.log('✅ Note créée:', data) // LOG DEBUG

      if (data) {
        setNotes([data[0], ...notes])
        setNewNote('')
        setShowAddNote(false)
      }
    }
  }

  const toggleNote = async (id, currentState) => {
    const { error } = await supabase
      .from('notes')
      .update({ 
        cochee: !currentState,
        coche_par: !currentState ? currentUser : null,
        date_coche: !currentState ? new Date().toISOString() : null
      })
      .eq('id', id)

    if (!error) {
      setNotes(notes.map(note => 
        note.id === id 
          ? { 
              ...note, 
              cochee: !currentState,
              coche_par: !currentState ? currentUser : null,
              date_coche: !currentState ? new Date().toISOString() : null
            }
          : note
      ))
    }
  }

  const archiveNote = async (id) => {
    const { error } = await supabase
      .from('notes')
      .update({ archivee: true })
      .eq('id', id)

    if (!error) {
      setNotes(notes.filter(note => note.id !== id))
    }
  }

  const unarchiveNote = async (id) => {
    const { error } = await supabase
      .from('notes')
      .update({ archivee: false })
      .eq('id', id)

    if (!error) {
      setNotes(notes.filter(note => note.id !== id))
    }
  }

  const deleteNote = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)

      if (!error) {
        setNotes(notes.filter(note => note.id !== id))
      }
    }
  }

  const startEdit = (note) => {
    setEditingNoteId(note.id)
    setEditingText(note.texte)
  }

  const saveEdit = async (id) => {
    if (editingText.trim()) {
      const { error } = await supabase
        .from('notes')
        .update({ texte: editingText })
        .eq('id', id)

      if (!error) {
        setNotes(notes.map(note => 
          note.id === id ? { ...note, texte: editingText } : note
        ))
        setEditingNoteId(null)
        setEditingText('')
      }
    }
  }

  const cancelEdit = () => {
    setEditingNoteId(null)
    setEditingText('')
  }

  const handleFileUpload = async (noteId, event) => {
    const file = event.target.files[0]
    if (!file) return

    // Upload vers Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${noteId}_${Date.now()}.${fileExt}`
    const filePath = `note-attachments/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('notes-files')
      .upload(filePath, file)

    if (uploadError) {
      alert('Erreur lors de l\'upload du fichier')
      return
    }

    // Récupérer l'URL publique
    const { data: urlData } = supabase.storage
      .from('notes-files')
      .getPublicUrl(filePath)

    // Mettre à jour la note avec le fichier attaché
    const note = notes.find(n => n.id === noteId)
    const attachments = note.attachments || []
    attachments.push({
      name: file.name,
      url: urlData.publicUrl,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      uploadedBy: currentUser
    })

    const { error: updateError } = await supabase
      .from('notes')
      .update({ attachments })
      .eq('id', noteId)

    if (!updateError) {
      setNotes(notes.map(n => 
        n.id === noteId ? { ...n, attachments } : n
      ))
    }
  }

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  const notesEnCours = notes.filter(n => !n.archivee).length
  const notesArchivees = notes.filter(n => n.archivee).length
  
  // Filtrer les notes à afficher selon la vue
  const displayedNotes = notes.filter(n => 
    notesView === 'encours' ? !n.archivee : n.archivee
  )

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b-2 border-gray-200">
        <button
          onClick={() => setNotesView('encours')}
          className={`px-6 py-3 font-semibold transition-all border-b-4 ${
            notesView === 'encours'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          En cours
          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-bold">
            {notesEnCours}
          </span>
        </button>
        <button
          onClick={() => setNotesView('archivees')}
          className={`px-6 py-3 font-semibold transition-all border-b-4 ${
            notesView === 'archivees'
              ? 'border-gray-500 text-gray-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Archivées
          <span className="ml-2 px-2 py-1 bg-gray-200 text-gray-600 rounded-full text-xs font-bold">
            {notesArchivees}
          </span>
        </button>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">
          {notesView === 'encours' ? 'Notes en cours' : 'Notes archivées'}
        </h3>
        {notesView === 'encours' && (
          <Button onClick={() => setShowAddNote(!showAddNote)}>
            + Nouvelle note
          </Button>
        )}
      </div>

      {showAddNote && (
        <Card className="border-2 border-blue-200">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Décrivez la tâche ou l'information à partager..."
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
              />
              <div className="flex gap-2">
                <Button onClick={addNote}>Ajouter</Button>
                <Button variant="ghost" onClick={() => {
                  setShowAddNote(false)
                  setNewNote('')
                }}>
                  Annuler
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {displayedNotes.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>
              {notesView === 'encours' 
                ? 'Aucune note en cours' 
                : 'Aucune note archivée'}
            </p>
          </div>
        ) : (
          displayedNotes.map(note => (
            <Card 
              key={note.id} 
              className={`hover:shadow-md transition-shadow border-l-4 ${
                note.cochee ? 'border-green-500 bg-green-50' : 'border-blue-500'
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={note.cochee}
                    onChange={() => toggleNote(note.id, note.cochee)}
                    className="mt-1 w-5 h-5 rounded border-2 cursor-pointer"
                  />
                  
                  <div className="flex-1">
                    {editingNoteId === note.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          rows="3"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(note.id)}
                            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                          >
                            Sauvegarder
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p 
                        className={`cursor-pointer ${note.cochee ? 'line-through text-gray-400' : 'text-gray-800'}`}
                        onClick={() => !note.cochee && startEdit(note)}
                        title="Cliquer pour modifier"
                      >
                        {note.texte}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-3 mt-2 text-sm items-center">
                      <span className="text-gray-500">
                        {new Date(note.date).toLocaleDateString('fr-FR')} à{' '}
                        {new Date(note.date).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      
                      {/* Pastille créateur - toujours visible si pas cochée */}
                      {(() => {
                        console.log(`Note ${note.id}: responsable="${note.responsable}", cochee=${note.cochee}`)
                        return note.responsable && !note.cochee ? (
                          <span 
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-bold shadow-sm"
                            title={`Créé par ${note.responsable}`}
                          >
                            {note.responsable.charAt(0).toUpperCase()}
                          </span>
                        ) : null
                      })()}
                      
                      {/* Prénom complet si cochée */}
                      {note.cochee && note.coche_par && (
                        <span className="text-green-600 font-medium text-sm">
                          ✓ Fait par {note.coche_par} le{' '}
                          {new Date(note.date_coche).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>

                    {/* Pièces jointes */}
                    {note.attachments && note.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {note.attachments.map((file, idx) => (
                          <a
                            key={idx}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                          >
                            📎 {file.name}
                            {file.type.startsWith('image/') && (
                              <img src={file.url} alt={file.name} className="h-16 rounded border" />
                            )}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 flex-shrink-0 items-start">
                    {/* Bouton d'ajout de fichier */}
                    {!note.cochee && (
                      <label className="cursor-pointer text-gray-500 hover:text-gray-700 px-2 py-1" title="Ajouter une pièce jointe">
                        <input
                          type="file"
                          accept="image/*,.pdf,.doc,.docx"
                          capture="environment"
                          onChange={(e) => handleFileUpload(note.id, e)}
                          className="hidden"
                        />
                        📎
                      </label>
                    )}
                    {notesView === 'encours' ? (
                      <button
                        onClick={() => archiveNote(note.id)}
                        className="text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                        title="Archiver"
                      >
                        📦
                      </button>
                    ) : (
                      <button
                        onClick={() => unarchiveNote(note.id)}
                        className="text-blue-500 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                        title="Désarchiver"
                      >
                        ↩️
                      </button>
                    )}
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="text-red-500 hover:text-red-700 px-2 py-1"
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}