import Dexie from 'dexie'
import dexieCloud from 'dexie-cloud-addon'

// Configure Dexie Cloud addon
Dexie.addons.push(dexieCloud)

// Define the database with cloud sync capabilities
export class PlayfulDataLabDB extends Dexie {
  constructor() {
    super('PlayfulDataLabDB_v3', {
      addons: [dexieCloud]
    })
    
    this.version(1).stores({
      // Use '@' prefix for auto-generated global IDs that sync across devices
      notes: '@id, type, title, details, tags, priority, createdAt, _files, owner, realmId',
      images: '@id, type, createdAt, prompt, imageUrl, _files, owner, realmId'
    })

    // Configure cloud sync
    this.cloud.configure({
      databaseUrl: import.meta.env.VITE_DEXIE_CLOUD_URL || 'https://zgbud0irs.dexie.cloud',
      tryUseServiceWorker: true,
      requireAuth: false // Allow both authenticated and anonymous access
    })
  }
}

// Create database instance
export const db = new PlayfulDataLabDB()

// Enhanced helper functions for notes with sync support
export const noteHelpers = {
  // Get all notes for current user, sorted by creation date
  async getAllNotes() {
    try {
      return await db.notes
        .where('type')
        .equals('note')
        .reverse()
        .sortBy('createdAt')
    } catch (error) {
      console.error('Error fetching notes:', error)
      return []
    }
  },

  // Add a new note to public realm (as database owner)
  async addNote(noteData) {
    try {
      const noteRecord = {
        type: 'note',
        title: noteData.title || '',
        details: noteData.details || '',
        tags: noteData.tags || [],
        priority: noteData.priority || 'medium',
        _files: noteData._files || {},
        createdAt: Date.now(),
        owner: db.cloud.currentUserId || 'anonymous'
      }
      
      // Only add to public realm if authenticated as database owner
      if (db.cloud.currentUserId === 'marcus.e@gmail.com') {
        noteRecord.realmId = 'rlm-public'
      }
      
      return await db.notes.add(noteRecord)
    } catch (error) {
      console.error('Error adding note:', error)
      throw error
    }
  },

  // Update a note
  async updateNote(id, updates) {
    try {
      return await db.notes.update(id, updates)
    } catch (error) {
      console.error('Error updating note:', error)
      throw error
    }
  },

  // Delete a note
  async deleteNote(id) {
    try {
      return await db.notes.delete(id)
    } catch (error) {
      console.error('Error deleting note:', error)
      throw error
    }
  },

  // Get a single note by ID
  async getNote(id) {
    try {
      return await db.notes.get(id)
    } catch (error) {
      console.error('Error fetching note:', error)
      return null
    }
  },

  // Search notes for current user
  async searchNotes(searchTerm) {
    try {
      if (!searchTerm) return await this.getAllNotes()
      
      const term = searchTerm.toLowerCase()
      return await db.notes
        .where('type')
        .equals('note')
        .filter(note => 
          (note.title || '').toLowerCase().includes(term) ||
          (note.details || '').toLowerCase().includes(term) ||
          (Array.isArray(note.tags) ? note.tags.join(' ').toLowerCase() : '').includes(term)
        )
        .reverse()
        .sortBy('createdAt')
    } catch (error) {
      console.error('Error searching notes:', error)
      return []
    }
  }
}

// Enhanced helper functions for images with sync support
export const imageHelpers = {
  // Get all images for current user, sorted by creation date
  async getAllImages() {
    try {
      return await db.images
        .where('type')
        .equals('image')
        .reverse()
        .sortBy('createdAt')
    } catch (error) {
      console.error('Error fetching images:', error)
      return []
    }
  },

  // Add a new image to public realm (as database owner)
  async addImage(imageData) {
    try {
      const imageRecord = {
        type: 'image',
        prompt: imageData.prompt || '',
        imageUrl: imageData.imageUrl || '',
        _files: imageData._files || {},
        createdAt: Date.now(),
        owner: db.cloud.currentUserId || 'anonymous'
      }
      
      // Only add to public realm if authenticated as database owner
      if (db.cloud.currentUserId === 'marcus.e@gmail.com') {
        imageRecord.realmId = 'rlm-public'
      }
      
      return await db.images.add(imageRecord)
    } catch (error) {
      console.error('Error adding image:', error)
      throw error
    }
  },

  // Update an image
  async updateImage(id, updates) {
    try {
      return await db.images.update(id, updates)
    } catch (error) {
      console.error('Error updating image:', error)
      throw error
    }
  },

  // Delete an image
  async deleteImage(id) {
    try {
      return await db.images.delete(id)
    } catch (error) {
      console.error('Error deleting image:', error)
      throw error
    }
  }
}

// Cloud sync utilities
export const syncHelpers = {
  // Check if user is authenticated (exclude "unauthorized")
  isAuthenticated() {
    const userId = db.cloud.currentUserId
    return !!userId && userId !== 'unauthorized'
  },

  // Get current user info
  getCurrentUser() {
    const userId = db.cloud.currentUserId
    const isReallyLoggedIn = !!userId && userId !== 'unauthorized'
    return {
      id: userId,
      email: db.cloud.currentUser?.email,
      isLoggedIn: isReallyLoggedIn
    }
  },

  // Sign in with email (triggers OTP)
  async signIn(email) {
    try {
      return await db.cloud.login(email)
    } catch (error) {
      console.error('Error signing in:', error)
      throw error
    }
  },

  // Sign out
  async signOut() {
    try {
      return await db.cloud.logout()
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  },

  // Get sync status
  getSyncStatus() {
    return {
      isOnline: db.cloud.persistedSyncState?.phase === 'online',
      isSyncing: db.cloud.persistedSyncState?.phase === 'syncing',
      lastSync: db.cloud.persistedSyncState?.lastSync
    }
  }
}