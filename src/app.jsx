import React, { useMemo, useState, useEffect } from "react"
import { useLiveQuery } from 'dexie-react-hooks'
import { db, noteHelpers, syncHelpers } from './database.js'
import { AuthPanel } from './components/AuthPanel.jsx'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

export default function App() {
  // Live queries for real-time updates
  const notesRaw = useLiveQuery(() => noteHelpers.getAllNotes()) || []

  // New note form state
  const [newNote, setNewNote] = useState({
    title: "",
    details: "",
    tags: [],
    priority: "medium",
    _files: {}
  })

  // UI state (ephemeral)
  const [selectedId, setSelectedId] = useState("")
  const [search, setSearch] = useState("")
  const [tagInput, setTagInput] = useState("")
  const [dragActive, setDragActive] = useState(false)

  // Derived data
  const notes = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return notesRaw
    return notesRaw.filter(n =>
      (n.title || "").toLowerCase().includes(term) ||
      (n.details || "").toLowerCase().includes(term) ||
      (Array.isArray(n.tags) ? n.tags.join(" ").toLowerCase() : "").includes(term)
    )
  }, [notesRaw, search])

  const allTags = useMemo(() => {
    const s = new Set()
    notesRaw.forEach(n => (n.tags || []).forEach(t => s.add(t)))
    return Array.from(s).sort()
  }, [notesRaw])

  const tagSuggestions = useMemo(() => {
    const q = tagInput.trim().toLowerCase()
    if (!q) return []
    return allTags.filter(t =>
      t.toLowerCase().includes(q) && !(newNote.tags || []).includes(t)
    ).slice(0, 6)
  }, [allTags, tagInput, newNote.tags])

  // Neobrutalism background - no pattern needed, the colors will pop

  // Update new note fields
  const updateNewNote = (updates) => {
    setNewNote(prev => ({ ...prev, ...updates }))
  }

  // Drag & drop for new note
  function handleDropNew(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const files = e.dataTransfer?.files
    if (!files || !files.length) return
    const bucket = { ...(newNote._files || {}) }
    for (const f of files) bucket[f.name] = f
    updateNewNote({ _files: bucket })
  }

  function preventDefaults(e) {
    e.preventDefault()
    e.stopPropagation()
  }

  // Add a tag to the new note
  function addTag(tag) {
    const t = (tag || tagInput).trim()
    if (!t) return
    const next = Array.from(new Set([...(newNote.tags || []), t]))
    updateNewNote({ tags: next })
    setTagInput("")
  }

  // Remove tag
  function removeTag(t) {
    updateNewNote({ tags: (newNote.tags || []).filter(x => x !== t) })
  }

  // Save new note
  async function saveNewNote() {
    if (!newNote.title.trim()) return
    try {
      await noteHelpers.addNote(newNote)
      // Reset form
      setNewNote({
        title: "",
        details: "",
        tags: [],
        priority: "medium",
        _files: {}
      })
      setTagInput("")
    } catch (error) {
      console.error('Error saving note:', error)
    }
  }


  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Neobrutalism geometric background elements */}
      <div className="pointer-events-none fixed -top-20 -left-20 w-60 h-60 bg-primary rotate-12 shadow-shadow opacity-20" />
      <div className="pointer-events-none fixed top-20 -right-20 w-40 h-40 bg-accent -rotate-12 shadow-shadow opacity-20" />
      <div className="pointer-events-none fixed bottom-20 left-20 w-32 h-32 bg-secondary rotate-45 shadow-shadow opacity-20" />
      <div className="pointer-events-none fixed bottom-40 right-40 w-24 h-24 bg-destructive -rotate-45 shadow-shadow opacity-20" />

      <header className="max-w-7xl mx-auto px-6 pt-8 pb-6">
        <div className="bg-primary text-primary-foreground rounded-base p-6 shadow-shadow border-4 border-border transform -rotate-1 hover:rotate-0 transition-transform duration-200">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight">
            PLAYFUL DATA LAB
          </h1>
          <p className="mt-4 text-lg font-bold opacity-90">
            🚀 Create • Share • Sync • Collaborate
          </p>
        </div>
        <div className="mt-6 bg-card text-card-foreground rounded-base p-4 shadow-shadow border-4 border-border">
          <p className="font-bold text-lg">
            💡 Capture ideas, attach files, and organize your thoughts in bold, beautiful cards!
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pb-16 space-y-8">
        {/* Authentication and Sync Status */}
        <AuthPanel />

        {/* Create note */}
        <Card className="transform rotate-1 hover:rotate-0 transition-transform duration-200">
          <CardHeader className="bg-secondary text-secondary-foreground">
            <CardTitle className="text-2xl font-black flex items-center gap-2">
              ✨ CREATE NEW CARD
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-black uppercase tracking-wide">Title</label>
              <Input
                value={newNote.title}
                onChange={(e) => updateNewNote({ title: e.target.value })}
                placeholder="What's your big idea?"
                className="text-lg font-bold"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-black uppercase tracking-wide">Details</label>
              <Textarea
                value={newNote.details}
                onChange={(e) => updateNewNote({ details: e.target.value })}
                placeholder="Tell me more about it..."
                rows={4}
                className="text-base"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-black uppercase tracking-wide">Tags</label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTag()}
                  placeholder="Add tags..."
                  className="flex-1"
                />
                <Button onClick={() => addTag()} variant="outline" className="font-black">
                  ADD
                </Button>
              </div>
              
              {tagSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {tagSuggestions.map(t => (
                    <Button
                      key={t}
                      onClick={() => addTag(t)}
                      variant="secondary"
                      size="sm"
                      className="text-xs font-bold"
                    >
                      #{t}
                    </Button>
                  ))}
                </div>
              )}
              
              <div className="flex flex-wrap gap-2 mt-3">
                {(newNote.tags || []).map(t => (
                  <Badge key={t} variant="outline" className="font-bold">
                    #{t}
                    <Button
                      onClick={() => removeTag(t)}
                      variant="ghost"
                      size="sm"
                      className="ml-2 h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    >
                      ×
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-black uppercase tracking-wide">Priority</label>
              <select
                value={newNote.priority}
                onChange={(e) => updateNewNote({ priority: e.target.value })}
                className="w-full rounded-base border-4 border-border bg-card px-4 py-3 text-base font-bold shadow-shadow focus:ring-4 focus:ring-ring"
              >
                <option value="low">🟢 LOW</option>
                <option value="medium">🟡 MEDIUM</option>
                <option value="high">🔴 HIGH</option>
              </select>
            </div>

              <div className="space-y-2">
              <label className="text-sm font-black uppercase tracking-wide">File Attachments</label>
              <div
                className={`rounded-base border-4 border-dashed border-border p-6 text-center transition-colors ${
                  dragActive ? "bg-accent/50" : "bg-muted/30"
                }`}
                onDragEnter={() => setDragActive(true)}
                onDragOver={preventDefaults}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDropNew}
              >
                <p className="font-bold text-lg">📎 DRAG FILES HERE</p>
                <p className="text-sm font-semibold opacity-70">Images, docs, anything!</p>
              </div>
              
              {newNote._files && Object.keys(newNote._files).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {Object.keys(newNote._files).map(name => (
                    <Badge key={name} variant="secondary" className="font-bold">
                      📎 {name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={saveNewNote}
                size="lg"
                className="flex-1 text-lg font-black transform hover:scale-105 transition-transform"
              >
                💾 SAVE CARD
              </Button>
              <Button
                onClick={() => {
                  setNewNote({
                    title: "",
                    details: "",
                    tags: [],
                    priority: "medium",
                    _files: {}
                  })
                  setTagInput("")
                }}
                variant="outline"
                size="lg"
                className="font-black transform hover:scale-105 transition-transform"
              >
                🗑️ RESET
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search section */}
        <Card className="transform -rotate-1 hover:rotate-0 transition-transform duration-200">
          <CardHeader className="bg-accent text-accent-foreground">
            <CardTitle className="text-2xl font-black flex items-center gap-2">
              🔍 YOUR CARDS COLLECTION
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="🔎 Search titles, details, or #tags..."
                  className="text-lg font-semibold"
                />
              </div>
              <div className="text-sm font-bold bg-muted rounded-base px-4 py-3 border-2 border-border">
                📊 {notes.length} CARDS FOUND
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {notes.map((n, index) => {
            const priorityEmoji = {
              low: "🟢",
              medium: "🟡", 
              high: "🔴"
            }[n.priority] || "🟡"
            
            const rotationClass = [
              "transform rotate-1 hover:rotate-0",
              "transform -rotate-1 hover:rotate-0", 
              "transform rotate-2 hover:rotate-0",
              "transform -rotate-2 hover:rotate-0"
            ][index % 4]
            
            return (
              <Card
                key={n.id}
                className={`${rotationClass} transition-all duration-200 cursor-pointer hover:scale-105 hover:shadow-lg`}
                onClick={() => setSelectedId(n.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 bg-primary text-primary-foreground rounded-base flex items-center justify-center font-black text-xl shadow-shadow">
                      {(n.title || "?")[0].toUpperCase()}
                    </div>
                    <Badge variant="secondary" className="font-black">
                      {priorityEmoji} {(n.priority || "medium").toUpperCase()}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg font-black line-clamp-2">
                    {n.title || "Untitled Card"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm line-clamp-3 mb-3 opacity-80 font-medium">
                    {n.details || "No details provided..."}
                  </p>
                  
                  {(n.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(n.tags || []).slice(0, 3).map(t => (
                        <Badge key={t} variant="outline" className="text-xs font-bold">
                          #{t}
                        </Badge>
                      ))}
                      {(n.tags || []).length > 3 && (
                        <Badge variant="secondary" className="text-xs font-bold">
                          +{(n.tags || []).length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
          
          {notes.length === 0 && (
            <div className="col-span-full">
              <Card className="bg-muted transform rotate-1">
                <CardContent className="p-12 text-center">
                  <p className="text-2xl font-black mb-4">🎯 NO CARDS YET!</p>
                  <p className="text-lg font-bold opacity-70">
                    Create your first card above to get started!
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Detail editor */}
        <Card className="transform rotate-1 hover:rotate-0 transition-transform duration-200">
          <CardHeader className="bg-destructive text-destructive-foreground">
            <CardTitle className="text-2xl font-black flex items-center gap-2">
              ✏️ CARD EDITOR
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {selectedId ? (
              <DetailEditor noteId={selectedId} onClose={() => setSelectedId("")} />
            ) : (
              <div className="text-center py-12">
                <p className="text-2xl font-black mb-4">👆 SELECT A CARD TO EDIT</p>
                <p className="font-bold opacity-70">Click on any card above to start editing!</p>
              </div>
            )}
          </CardContent>
        </Card>

      </main>
    </div>
  )
}


function DetailEditor({ noteId, onClose }) {
  const [doc, setDoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dropActive, setDropActive] = useState(false)

  // Load the note
  useEffect(() => {
    async function loadNote() {
      try {
        const note = await noteHelpers.getNote(noteId)
        setDoc(note)
      } catch (error) {
        console.error('Error loading note:', error)
      } finally {
        setLoading(false)
      }
    }
    loadNote()
  }, [noteId])

  function preventDefaults(e) {
    e.preventDefault()
    e.stopPropagation()
  }
  
  async function handleDrop(e) {
    preventDefaults(e)
    setDropActive(false)
    const files = e.dataTransfer?.files
    if (!files || !files.length) return
    const bucket = { ...(doc._files || {}) }
    for (const f of files) bucket[f.name] = f
    const updatedDoc = { ...doc, _files: bucket }
    setDoc(updatedDoc)
    await noteHelpers.updateNote(noteId, { _files: bucket })
  }

  async function updateDoc(updates) {
    const updatedDoc = { ...doc, ...updates }
    setDoc(updatedDoc)
    await noteHelpers.updateNote(noteId, updates)
  }

  async function deleteNote() {
    await noteHelpers.deleteNote(noteId)
    onClose()
  }

  if (loading) {
    return (
      <div className="bg-accent/30 border-4 border-border rounded-base p-6 text-center">
        <p className="font-black text-lg">⏳ LOADING...</p>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="bg-destructive/30 border-4 border-border rounded-base p-6 text-center">
        <p className="font-black text-lg">❌ CARD NOT FOUND</p>
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-black uppercase tracking-wide">Title</label>
          <Input
            value={doc.title || ""}
            onChange={(e) => updateDoc({ title: e.target.value })}
            placeholder="Enter title..."
            className="text-lg font-bold"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-black uppercase tracking-wide">Details</label>
          <Textarea
            value={doc.details || ""}
            onChange={(e) => updateDoc({ details: e.target.value })}
            placeholder="Add details..."
            rows={6}
            className="text-base"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-black uppercase tracking-wide">Tags</label>
          <TagEditor tags={doc.tags || []} onChange={(tags) => updateDoc({ tags })} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-black uppercase tracking-wide">Priority</label>
          <select
            value={doc.priority || "medium"}
            onChange={(e) => updateDoc({ priority: e.target.value })}
            className="w-full rounded-base border-4 border-border bg-card px-4 py-3 text-base font-bold shadow-shadow focus:ring-4 focus:ring-ring"
          >
            <option value="low">🟢 LOW</option>
            <option value="medium">🟡 MEDIUM</option>
            <option value="high">🔴 HIGH</option>
          </select>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            onClick={deleteNote}
            variant="destructive"
            size="lg"
            className="flex-1 font-black transform hover:scale-105 transition-transform"
          >
            🗑️ DELETE CARD
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            size="lg"
            className="flex-1 font-black transform hover:scale-105 transition-transform"
          >
            ✅ CLOSE
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-black uppercase tracking-wide">File Attachments</label>
          <div
            className={`rounded-base border-4 border-dashed border-border p-6 text-center transition-colors ${
              dropActive ? "bg-accent/50" : "bg-muted/30"
            }`}
            onDragEnter={() => setDropActive(true)}
            onDragOver={preventDefaults}
            onDragLeave={() => setDropActive(false)}
            onDrop={handleDrop}
          >
            <p className="font-bold text-lg">📎 DRAG FILES HERE</p>
            <p className="text-sm font-semibold opacity-70">Add attachments to this card!</p>
          </div>
        </div>
        
        <div className="space-y-3">
          {(doc._files && Object.keys(doc._files).length > 0) ? (
            Object.keys(doc._files).map(name => (
              <div key={name} className="flex items-center justify-between bg-card border-4 border-border rounded-base p-3 shadow-shadow">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">📎</span>
                  <span className="font-semibold">{name}</span>
                </div>
                <Button
                  onClick={async () => {
                    const next = { ...(doc._files || {}) }
                    delete next[name]
                    updateDoc({ _files: next })
                  }}
                  variant="destructive"
                  size="sm"
                  className="font-black"
                >
                  🗑️ REMOVE
                </Button>
              </div>
            ))
          ) : (
            <div className="bg-muted/50 border-4 border-border rounded-base p-4 text-center">
              <p className="font-bold opacity-70">📁 NO ATTACHMENTS YET</p>
              <p className="text-sm font-semibold opacity-50">Drag files above to add them!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TagEditor({ tags, onChange }) {
  const [val, setVal] = useState("")
  
  function add() {
    const t = val.trim()
    if (!t) return
    const next = Array.from(new Set([...(tags || []), t]))
    onChange(next)
    setVal("")
  }
  
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add tag..."
          className="flex-1"
        />
        <Button
          onClick={add}
          variant="outline"
          className="font-black"
        >
          ADD
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(tags || []).map(t => (
          <Badge key={t} variant="outline" className="font-bold">
            #{t}
            <Button
              onClick={() => onChange(tags.filter(x => x !== t))}
              variant="ghost"
              size="sm"
              className="ml-2 h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
            >
              ×
            </Button>
          </Badge>
        ))}
      </div>
    </div>
  )
}