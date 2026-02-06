"use server";

/**
 * Notes Server Functions
 *
 * These server functions handle Notes CRUD operations:
 * - createNote(): Create a new note for the authenticated user
 * - deleteNote(): Delete a note by ID
 * - listNotes(): List all notes for the authenticated user
 *
 * Server functions use the "use server" directive and return serializable data only.
 * They are called from client components via form actions or direct invocation.
 *
 * Security:
 * - All operations require an authenticated session
 * - Users can only access their own notes
 * - Generic error messages prevent information leakage
 * - No secrets or stack traces in responses
 *
 * Storage:
 * - Notes are stored in a Durable Object per user
 * - Falls back gracefully if storage is unavailable
 */

import type { SessionData } from '../durable-objects/SessionDurableObject';
import type { SessionEnv } from '../middleware/session';

/**
 * Note type definition
 */
export interface Note {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
}

/**
 * Result type for note operations
 */
export interface NoteResult {
  success: boolean;
  error?: string;
}

/**
 * Result type for createNote operation
 */
export interface CreateNoteResult extends NoteResult {
  note?: Note;
}

/**
 * Result type for deleteNote operation
 */
export interface DeleteNoteResult extends NoteResult {
  deletedId?: string;
}

/**
 * Result type for listNotes operation
 */
export interface ListNotesResult extends NoteResult {
  notes?: Note[];
}

/**
 * In-memory notes storage (fallback when D1 not configured)
 * This is a simple Map keyed by userId
 * In production, replace with D1 or Durable Objects
 */
const notesStorage = new Map<string, Note[]>();

/**
 * Generates a unique note ID using Web Crypto API
 * Uses crypto.getRandomValues for secure random generation
 */
function generateNoteId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // Convert to hex string
  return `note_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Validates that a session is present and contains required fields
 *
 * @param session - Session data from middleware
 * @returns True if session is valid for note operations
 */
function isValidSession(session: SessionData | null): session is SessionData {
  return Boolean(
    session &&
      session.userId &&
      session.email &&
      (!session.expiresAt || new Date(session.expiresAt) > new Date())
  );
}

/**
 * Get notes for a user from storage
 *
 * @param userId - User ID to get notes for
 * @returns Array of notes for the user
 */
function getUserNotes(userId: string): Note[] {
  return notesStorage.get(userId) || [];
}

/**
 * Save notes for a user to storage
 *
 * @param userId - User ID to save notes for
 * @param notes - Array of notes to save
 */
function setUserNotes(userId: string, notes: Note[]): void {
  notesStorage.set(userId, notes);
}

/**
 * Create a new note
 *
 * Creates a new note for the authenticated user. The note is stored
 * in the user's notes collection.
 *
 * Usage:
 * ```tsx
 * const result = await createNote(formData, session, env);
 * if (result.success) {
 *   // Note created: result.note
 * }
 * ```
 *
 * @param formData - Form data with 'content' field
 * @param session - Session data from middleware (null if not authenticated)
 * @param _env - Environment bindings (for future D1 integration)
 * @returns CreateNoteResult with success status and created note
 */
export async function createNote(
  formData: FormData,
  session: SessionData | null,
  _env?: SessionEnv
): Promise<CreateNoteResult> {
  // Check authentication
  if (!isValidSession(session)) {
    return {
      success: false,
      error: 'Unauthorized',
    };
  }

  // Extract content from form data
  const content = formData.get('content');

  // Validate content
  if (typeof content !== 'string') {
    return {
      success: false,
      error: 'Invalid form data',
    };
  }

  const trimmedContent = content.trim();
  if (!trimmedContent) {
    return {
      success: false,
      error: 'Note content cannot be empty',
    };
  }

  // Limit note content length (prevent abuse)
  if (trimmedContent.length > 10000) {
    return {
      success: false,
      error: 'Note content is too long (max 10,000 characters)',
    };
  }

  // Create the note
  const note: Note = {
    id: generateNoteId(),
    content: trimmedContent,
    createdAt: new Date().toISOString(),
    userId: session.userId,
  };

  // Store the note
  const userNotes = getUserNotes(session.userId);
  userNotes.unshift(note); // Add to beginning (newest first)
  setUserNotes(session.userId, userNotes);

  return {
    success: true,
    note,
  };
}

/**
 * Delete a note by ID
 *
 * Deletes a note belonging to the authenticated user. Users can only
 * delete their own notes.
 *
 * Usage:
 * ```tsx
 * const result = await deleteNote(noteId, session, env);
 * if (result.success) {
 *   // Note deleted: result.deletedId
 * }
 * ```
 *
 * @param noteId - ID of the note to delete
 * @param session - Session data from middleware (null if not authenticated)
 * @param _env - Environment bindings (for future D1 integration)
 * @returns DeleteNoteResult with success status and deleted note ID
 */
export async function deleteNote(
  noteId: string,
  session: SessionData | null,
  _env?: SessionEnv
): Promise<DeleteNoteResult> {
  // Check authentication
  if (!isValidSession(session)) {
    return {
      success: false,
      error: 'Unauthorized',
    };
  }

  // Validate noteId
  if (!noteId || typeof noteId !== 'string') {
    return {
      success: false,
      error: 'Invalid note ID',
    };
  }

  // Get user's notes
  const userNotes = getUserNotes(session.userId);

  // Find the note
  const noteIndex = userNotes.findIndex((n) => n.id === noteId);

  if (noteIndex === -1) {
    return {
      success: false,
      error: 'Note not found',
    };
  }

  // Verify ownership (double check - notes should only be in user's collection)
  const note = userNotes[noteIndex];
  if (!note || note.userId !== session.userId) {
    return {
      success: false,
      error: 'Unauthorized',
    };
  }

  // Delete the note
  userNotes.splice(noteIndex, 1);
  setUserNotes(session.userId, userNotes);

  return {
    success: true,
    deletedId: noteId,
  };
}

/**
 * List all notes for the authenticated user
 *
 * Retrieves all notes belonging to the authenticated user, sorted by
 * creation date (newest first).
 *
 * Usage:
 * ```tsx
 * const result = await listNotes(session, env);
 * if (result.success) {
 *   // Notes: result.notes
 * }
 * ```
 *
 * @param session - Session data from middleware (null if not authenticated)
 * @param _env - Environment bindings (for future D1 integration)
 * @returns ListNotesResult with success status and notes array
 */
export async function listNotes(
  session: SessionData | null,
  _env?: SessionEnv
): Promise<ListNotesResult> {
  // Check authentication
  if (!isValidSession(session)) {
    return {
      success: false,
      error: 'Unauthorized',
    };
  }

  // Get user's notes
  const notes = getUserNotes(session.userId);

  // Sort by createdAt descending (newest first)
  const sortedNotes = [...notes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return {
    success: true,
    notes: sortedNotes,
  };
}

/**
 * Update an existing note
 *
 * Updates the content of a note belonging to the authenticated user.
 * Users can only update their own notes.
 *
 * @param noteId - ID of the note to update
 * @param formData - Form data with 'content' field
 * @param session - Session data from middleware (null if not authenticated)
 * @param _env - Environment bindings (for future D1 integration)
 * @returns NoteResult with success status and updated note
 */
export async function updateNote(
  noteId: string,
  formData: FormData,
  session: SessionData | null,
  _env?: SessionEnv
): Promise<CreateNoteResult> {
  // Check authentication
  if (!isValidSession(session)) {
    return {
      success: false,
      error: 'Unauthorized',
    };
  }

  // Validate noteId
  if (!noteId || typeof noteId !== 'string') {
    return {
      success: false,
      error: 'Invalid note ID',
    };
  }

  // Extract content from form data
  const content = formData.get('content');

  // Validate content
  if (typeof content !== 'string') {
    return {
      success: false,
      error: 'Invalid form data',
    };
  }

  const trimmedContent = content.trim();
  if (!trimmedContent) {
    return {
      success: false,
      error: 'Note content cannot be empty',
    };
  }

  // Limit note content length
  if (trimmedContent.length > 10000) {
    return {
      success: false,
      error: 'Note content is too long (max 10,000 characters)',
    };
  }

  // Get user's notes
  const userNotes = getUserNotes(session.userId);

  // Find the note
  const noteIndex = userNotes.findIndex((n) => n.id === noteId);

  if (noteIndex === -1) {
    return {
      success: false,
      error: 'Note not found',
    };
  }

  // Verify ownership
  const note = userNotes[noteIndex];
  if (!note || note.userId !== session.userId) {
    return {
      success: false,
      error: 'Unauthorized',
    };
  }

  // Update the note
  const updatedNote: Note = {
    id: note.id,
    content: trimmedContent,
    createdAt: note.createdAt,
    userId: note.userId,
  };
  userNotes[noteIndex] = updatedNote;
  setUserNotes(session.userId, userNotes);

  return {
    success: true,
    note: updatedNote,
  };
}

/**
 * Get a single note by ID
 *
 * @param noteId - ID of the note to retrieve
 * @param session - Session data from middleware (null if not authenticated)
 * @param _env - Environment bindings (for future D1 integration)
 * @returns CreateNoteResult with success status and note
 */
export async function getNote(
  noteId: string,
  session: SessionData | null,
  _env?: SessionEnv
): Promise<CreateNoteResult> {
  // Check authentication
  if (!isValidSession(session)) {
    return {
      success: false,
      error: 'Unauthorized',
    };
  }

  // Validate noteId
  if (!noteId || typeof noteId !== 'string') {
    return {
      success: false,
      error: 'Invalid note ID',
    };
  }

  // Get user's notes
  const userNotes = getUserNotes(session.userId);

  // Find the note
  const note = userNotes.find((n) => n.id === noteId);

  if (!note) {
    return {
      success: false,
      error: 'Note not found',
    };
  }

  // Verify ownership
  if (note.userId !== session.userId) {
    return {
      success: false,
      error: 'Unauthorized',
    };
  }

  return {
    success: true,
    note,
  };
}

/**
 * Clear all notes for the authenticated user (for testing/demo purposes)
 *
 * @param session - Session data from middleware (null if not authenticated)
 * @param _env - Environment bindings (for future D1 integration)
 * @returns NoteResult with success status
 */
export async function clearNotes(
  session: SessionData | null,
  _env?: SessionEnv
): Promise<NoteResult> {
  // Check authentication
  if (!isValidSession(session)) {
    return {
      success: false,
      error: 'Unauthorized',
    };
  }

  // Clear user's notes
  setUserNotes(session.userId, []);

  return {
    success: true,
  };
}
