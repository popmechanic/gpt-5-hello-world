import React, { useMemo, useState, useEffect, useRef } from "react"
import { useLiveQuery } from 'dexie-react-hooks'
import { callAI } from "call-ai"
import { ImgGen } from "use-vibes"
import { db, noteHelpers, imageHelpers, syncHelpers } from './database.js'
import { AuthPanel } from './components/AuthPanel.jsx'

export default function App() {
  // Live queries for real-time updates
  const notesRaw = useLiveQuery(() => noteHelpers.getAllNotes()) || []
  const imageDocs = useLiveQuery(() => imageHelpers.getAllImages()) || []

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
  const [aiPreview, setAiPreview] = useState("")
  const [aiBusy, setAiBusy] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const aiBoxRef = useRef(null)

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

  // Background pattern
  const bgPattern = {
    backgroundImage: `radial-gradient(#e9ff70 1.2px, transparent 1.2px), radial-gradient(#ff70a6 1.2px, transparent 1.2px), linear-gradient(135deg, rgba(112,214,255,0.25) 20%, transparent 20%), linear-gradient(225deg, rgba(255,151,112,0.25) 20%, transparent 20%)`,
    backgroundPosition: "0 0, 12px 12px, 0 0, 0 0",
    backgroundSize: "24px 24px, 24px 24px, 24px 24px, 24px 24px"
  }

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

  // AI Generation (structured + streaming)
  async function generateFromPrompt(promptText) {
    if (!promptText?.trim()) return
    setAiBusy(true)
    setAiPreview("")
    let finalResponse = ""
    try {
      const generator = await callAI([
        { role: "system", content: "Create concise, upbeat records. Keep titles short and tags helpful." },
        { role: "user", content: `Create 5 items from this prompt: ${promptText}. Return JSON only with fields: title, details, tags (array), priority (low, medium, high).` }
      ], {
        stream: true,
        schema: {
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  details: { type: "string" },
                  tags: { type: "array", items: { type: "string" } },
                  priority: { type: "string" }
                }
              }
            }
          }
        }
      })

      for await (const chunk of generator) {
        setAiPreview(chunk)
        finalResponse = chunk
        if (aiBoxRef.current) aiBoxRef.current.scrollTop = aiBoxRef.current.scrollHeight
      }

      let data
      try {
        data = JSON.parse(finalResponse)
      } catch {
        // Fallback: try to recover JSON segment
        const start = finalResponse.indexOf("{")
        const end = finalResponse.lastIndexOf("}")
        data = JSON.parse(finalResponse.slice(start, end + 1))
      }
      const items = data.items || data.result?.items || []
      for (const it of items) {
        await noteHelpers.addNote({
          title: it.title || "",
          details: it.details || "",
          tags: Array.isArray(it.tags) ? it.tags : [],
          priority: it.priority || "medium"
        })
      }
    } catch (err) {
      setAiPreview(`Error: ${err?.message || String(err)}`)
    } finally {
      setAiBusy(false)
    }
  }

  return (
    <div className="min-h-screen text-[#242424]" style={bgPattern}>
      {/* Decorative shapes */}
      <div className="pointer-events-none fixed -top-10 -left-10 w-40 h-40 rounded-full bg-[#70d6ff] opacity-60 border-4 border-[#242424]" />
      <div className="pointer-events-none fixed top-10 -right-10 w-32 h-32 rotate-12 bg-[#ff9770] opacity-60 border-4 border-[#242424]" />
      <div className="pointer-events-none fixed bottom-10 right-10 w-24 h-24 -rotate-6 bg-[#ff70a6] opacity-60 border-4 border-[#242424]" />

      <header className="max-w-6xl mx-auto px-4 pt-6 pb-2">
        <h1 className="inline-block text-3xl sm:text-4xl font-extrabold px-4 py-2 bg-[#ffd670] border-4 border-[#242424] shadow-none">
          Playful Data Lab
        </h1>
        <p className="mt-3 italic bg-[#ffffff] inline-block px-3 py-2 border-4 border-[#242424]">
          Capture ideas, attach files, and turn prompts into structured cards. Use the generator to create batches, tap any card to edit, and try the image studio to visualize concepts. All cards are publicly readable and sync across devices. Everything saves instantly and shares with the community.
        </p>
      </header>

      <main className="max-w-6xl mx-auto px-4 pb-16 space-y-8">
        {/* Authentication and Sync Status */}
        <AuthPanel />

        {/* Create note and AI generator */}
        <section className="grid md:grid-cols-2 gap-6">
          <div className="bg-[#ffffff] border-4 border-[#242424] p-4 rounded-sm">
            <h2 className="text-xl font-bold mb-3">New Card</h2>
            <div className="space-y-3">
              <label className="block">
                <span className="font-semibold">Title</span>
                <input
                  value={newNote.title}
                  onChange={(e) => updateNewNote({ title: e.target.value })}
                  placeholder="Short title"
                  className="mt-1 w-full border-4 border-[#242424] px-3 py-2 rounded-sm bg-[#e9ff70] placeholder-[#242424]/60"
                />
              </label>
              <label className="block">
                <span className="font-semibold">Details</span>
                <textarea
                  value={newNote.details}
                  onChange={(e) => updateNewNote({ details: e.target.value })}
                  placeholder="What is it about?"
                  rows={4}
                  className="mt-1 w-full border-4 border-[#242424] px-3 py-2 rounded-sm bg-[#70d6ff]/50 placeholder-[#242424]/60"
                />
              </label>
              <div>
                <span className="font-semibold">Tags</span>
                <div className="mt-1 flex gap-2">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTag()}
                    placeholder="Add a tag then press Enter"
                    className="flex-1 border-4 border-[#242424] px-3 py-2 rounded-sm bg-[#ff9770]/40 placeholder-[#242424]/60"
                  />
                  <button
                    onClick={() => addTag()}
                    className="px-3 py-2 bg-[#ff9770] border-4 border-[#242424] font-semibold"
                  >
                    Add
                  </button>
                </div>
                {tagSuggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tagSuggestions.map(t => (
                      <button
                        key={t}
                        onClick={() => addTag(t)}
                        className="text-sm px-2 py-1 bg-[#ffd670] border-4 border-[#242424]"
                      >
                        #{t}
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {(newNote.tags || []).map(t => (
                    <span key={t} className="text-sm px-2 py-1 bg-[#ff70a6]/70 border-4 border-[#242424]">
                      #{t}{" "}
                      <button onClick={() => removeTag(t)} className="ml-1 underline">
                        remove
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="font-semibold">Priority</span>
                <select
                  value={newNote.priority}
                  onChange={(e) => updateNewNote({ priority: e.target.value })}
                  className="mt-1 w-full border-4 border-[#242424] px-3 py-2 rounded-sm bg-[#70d6ff]/40"
                >
                  <option>low</option>
                  <option>medium</option>
                  <option>high</option>
                </select>
              </label>

              <div
                className={`mt-2 border-4 border-dashed ${dragActive ? "bg-[#ff70a6]/40" : "bg-[#ffffff]"} border-[#242424] rounded-sm p-3 text-sm`}
                onDragEnter={() => setDragActive(true)}
                onDragOver={preventDefaults}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDropNew}
              >
                Drag & drop files here to attach (images, docs, anything)
              </div>
              {newNote._files && Object.keys(newNote._files).length > 0 && (
                <div className="text-sm mt-2">
                  Attachments:{" "}
                  {Object.keys(newNote._files).map(name => (
                    <span key={name} className="mr-2 px-2 py-1 bg-[#e9ff70] border-4 border-[#242424]">
                      {name}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={saveNewNote}
                  className="px-4 py-2 bg-[#e9ff70] border-4 border-[#242424] font-bold"
                >
                  Save Card
                </button>
                <button
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
                  className="px-4 py-2 bg-[#70d6ff] border-4 border-[#242424] font-bold"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[#ffffff] border-4 border-[#242424] p-4 rounded-sm">
            <h2 className="text-xl font-bold mb-3">AI Generator</h2>
            <GeneratorForm
              busy={aiBusy}
              onGenerate={generateFromPrompt}
              onDemo={() =>
                generateFromPrompt("Brainstorm community festival activities with logistics and volunteer roles")
              }
            />
            <div className="mt-3">
              <label className="font-semibold">Streaming preview</label>
              <pre
                ref={aiBoxRef}
                className="mt-1 h-40 overflow-auto whitespace-pre-wrap bg-[#ff9770]/30 border-4 border-[#242424] p-2 rounded-sm"
              >
                {aiPreview || "Waiting for output..."}
              </pre>
            </div>
          </div>
        </section>

        {/* Search and list */}
        <section className="bg-[#ffffff] border-4 border-[#242424] p-4 rounded-sm">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <h2 className="text-xl font-bold">Your Cards</h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, details, or #tag"
              className="w-full sm:w-80 border-4 border-[#242424] px-3 py-2 rounded-sm bg-[#70d6ff]/40 placeholder-[#242424]/60"
            />
          </div>

          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map(n => (
              <button
                key={n.id}
                onClick={() => setSelectedId(n.id)}
                className="text-left bg-[#ffffff] border-4 border-[#242424] rounded-sm hover:translate-x-0.5 hover:-translate-y-0.5 transition-transform"
              >
                <div className="p-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={`https://picsum.photos/seed/${encodeURIComponent(n.id)}/96`}
                      alt=""
                      className="w-16 h-16 object-cover border-4 border-[#242424]"
                    />
                    <div>
                      <div className="font-bold">{n.title || "(untitled)"}</div>
                      <div className="text-sm opacity-80">priority: {n.priority || "medium"}</div>
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm">{n.details}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(n.tags || []).slice(0, 4).map(t => (
                      <span key={t} className="text-xs px-2 py-1 bg-[#ffd670] border-4 border-[#242424]">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
            {notes.length === 0 && (
              <div className="p-6 bg-[#e9ff70] border-4 border-[#242424] rounded-sm">
                No cards yet — try the generator or add one above.
              </div>
            )}
          </div>
        </section>

        {/* Detail editor */}
        <section className="bg-[#ffffff] border-4 border-[#242424] p-4 rounded-sm">
          <h2 className="text-xl font-bold mb-3">Details</h2>
          {selectedId ? (
            <DetailEditor noteId={selectedId} onClose={() => setSelectedId("")} />
          ) : (
            <div className="p-4 bg-[#70d6ff]/30 border-4 border-dashed border-[#242424]">
              Select a card to edit it here.
            </div>
          )}
        </section>

        {/* Image studio */}
        <section className="bg-[#ffffff] border-4 border-[#242424] p-4 rounded-sm">
          <h2 className="text-xl font-bold">Image Studio</h2>
          <p className="text-sm mb-3">Generate or edit images, then browse your history below.</p>
          <div className="border-4 border-[#242424] p-2 bg-[#ff70a6]/20">
            <ImgGen database={{ put: imageHelpers.addImage }} />
          </div>
          {imageDocs.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Previously Created</h3>
              <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {imageDocs.map(img => (
                  <li key={img.id} className="border-4 border-[#242424] bg-[#ffd670]/40 p-2">
                    <ImgGen _id={img.id} database={{ put: imageHelpers.addImage }} />
                    <div className="mt-1 text-xs opacity-80">ID: {img.id}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function GeneratorForm({ busy, onGenerate, onDemo }) {
  const [prompt, setPrompt] = useState("")
  
  return (
    <div>
      <label className="font-semibold">Prompt</label>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe the set of items you want..."
        rows={3}
        className="mt-1 w-full border-4 border-[#242424] px-3 py-2 rounded-sm bg-[#ff70a6]/30 placeholder-[#242424]/60"
      />
      <div className="flex gap-3 mt-2">
        <button
          onClick={() => onGenerate(prompt)}
          disabled={busy}
          className="px-4 py-2 bg-[#ffd670] border-4 border-[#242424] font-bold disabled:opacity-60"
        >
          {busy ? "Generating..." : "Generate"}
        </button>
        <button
          onClick={onDemo}
          disabled={busy}
          className="px-4 py-2 bg-[#70d6ff] border-4 border-[#242424] font-bold"
        >
          Demo Data
        </button>
      </div>
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
    return <div className="p-4 bg-[#70d6ff]/30 border-4 border-[#242424]">Loading…</div>
  }

  if (!doc) {
    return <div className="p-4 bg-[#ff70a6]/30 border-4 border-[#242424]">Note not found</div>
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div>
        <label className="block">
          <span className="font-semibold">Title</span>
          <input
            value={doc.title || ""}
            onChange={(e) => updateDoc({ title: e.target.value })}
            className="mt-1 w-full border-4 border-[#242424] px-3 py-2 rounded-sm bg-[#e9ff70] placeholder-[#242424]/60"
          />
        </label>
        <label className="block mt-3">
          <span className="font-semibold">Details</span>
          <textarea
            value={doc.details || ""}
            onChange={(e) => updateDoc({ details: e.target.value })}
            rows={6}
            className="mt-1 w-full border-4 border-[#242424] px-3 py-2 rounded-sm bg-[#70d6ff]/40"
          />
        </label>

        <div className="mt-3">
          <span className="font-semibold">Tags</span>
          <TagEditor tags={doc.tags || []} onChange={(tags) => updateDoc({ tags })} />
        </div>

        <div className="mt-3">
          <span className="font-semibold">Priority</span>
          <select
            value={doc.priority || "medium"}
            onChange={(e) => updateDoc({ priority: e.target.value })}
            className="mt-1 w-full border-4 border-[#242424] px-3 py-2 rounded-sm bg-[#ff9770]/40"
          >
            <option>low</option>
            <option>medium</option>
            <option>high</option>
          </select>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={deleteNote}
            className="px-4 py-2 bg-[#ff70a6] border-4 border-[#242424] font-bold"
          >
            Delete
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#70d6ff] border-4 border-[#242424] font-bold"
          >
            Close
          </button>
        </div>
      </div>

      <div>
        <div
          className={`p-3 border-4 border-dashed ${dropActive ? "bg-[#ff70a6]/40" : "bg-[#ffffff]"} border-[#242424] rounded-sm`}
          onDragEnter={() => setDropActive(true)}
          onDragOver={preventDefaults}
          onDragLeave={() => setDropActive(false)}
          onDrop={handleDrop}
        >
          Drag & drop files to attach to this card
        </div>
        <div className="mt-2 text-sm">
          {(doc._files && Object.keys(doc._files).length > 0) ? (
            <ul className="space-y-2">
              {Object.keys(doc._files).map(name => (
                <li key={name} className="flex items-center justify-between px-2 py-1 bg-[#ffd670]/40 border-4 border-[#242424]">
                  <span>{name}</span>
                  <button
                    className="px-2 py-1 bg-[#70d6ff] border-4 border-[#242424] text-sm"
                    onClick={async () => {
                      const next = { ...(doc._files || {}) }
                      delete next[name]
                      updateDoc({ _files: next })
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-2 py-2 bg-[#70d6ff]/30 border-4 border-[#242424]">
              No attachments yet.
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
    <div>
      <div className="flex gap-2">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add tag"
          className="flex-1 border-4 border-[#242424] px-3 py-2 rounded-sm bg-[#ff9770]/30"
        />
        <button
          onClick={add}
          className="px-3 py-2 bg-[#ffd670] border-4 border-[#242424] font-semibold"
        >
          Add
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {(tags || []).map(t => (
          <span key={t} className="text-sm px-2 py-1 bg-[#e9ff70] border-4 border-[#242424]">
            #{t}{" "}
            <button
              className="underline"
              onClick={() => onChange(tags.filter(x => x !== t))}
            >
              remove
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}