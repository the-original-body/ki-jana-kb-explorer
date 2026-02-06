/**
 * Notes CRUD Tests
 *
 * Tests for Notes server functions:
 * - createNote(): Creates a new note for authenticated user
 * - deleteNote(): Deletes a note by ID
 * - listNotes(): Lists all notes for authenticated user
 * - updateNote(): Updates an existing note
 * - getNote(): Gets a single note by ID
 * - clearNotes(): Clears all notes for a user
 *
 * Security validations:
 * - All operations require valid session
 * - Users can only access their own notes
 * - Generic error messages prevent information leakage
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createNote,
  deleteNote,
  listNotes,
  updateNote,
  getNote,
  clearNotes,
} from '@/server/notes';
import type { SessionData } from '@/durable-objects/SessionDurableObject';
import { createMockFormData, TEST_USER, TEST_ADMIN } from './setup';

/**
 * Create a valid session for testing
 */
function createValidSession(
  userId: string = TEST_USER.userId,
  email: string = TEST_USER.email
): SessionData {
  return {
    userId,
    email,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Create an expired session for testing
 */
function createExpiredSession(): SessionData {
  return {
    userId: TEST_USER.userId,
    email: TEST_USER.email,
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

describe('Notes CRUD Operations', () => {
  beforeEach(async () => {
    // Clear notes storage before each test by clearing for both test users
    const session = createValidSession();
    await clearNotes(session);
    const adminSession = createValidSession(TEST_ADMIN.userId, TEST_ADMIN.email);
    await clearNotes(adminSession);
  });

  describe('createNote()', () => {
    describe('Authentication', () => {
      it('should return error when session is null', async () => {
        const formData = createMockFormData({ content: 'Test note content' });
        const result = await createNote(formData, null);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unauthorized');
        expect(result.note).toBeUndefined();
      });

      it('should return error when session is expired', async () => {
        const formData = createMockFormData({ content: 'Test note content' });
        const expiredSession = createExpiredSession();
        const result = await createNote(formData, expiredSession);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unauthorized');
      });

      it('should return error when session has no userId', async () => {
        const formData = createMockFormData({ content: 'Test note content' });
        const invalidSession = {
          email: TEST_USER.email,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        } as SessionData;
        const result = await createNote(formData, invalidSession);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unauthorized');
      });

      it('should return error when session has no email', async () => {
        const formData = createMockFormData({ content: 'Test note content' });
        const invalidSession = {
          userId: TEST_USER.userId,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        } as SessionData;
        const result = await createNote(formData, invalidSession);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unauthorized');
      });
    });

    describe('Successful Creation', () => {
      it('should create a note with valid data', async () => {
        const session = createValidSession();
        const formData = createMockFormData({ content: 'Test note content' });
        const result = await createNote(formData, session);

        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();
        expect(result.note).toBeDefined();
        expect(result.note?.content).toBe('Test note content');
      });

      it('should create note with correct userId', async () => {
        const session = createValidSession();
        const formData = createMockFormData({ content: 'My note' });
        const result = await createNote(formData, session);

        expect(result.note?.userId).toBe(session.userId);
      });

      it('should generate unique note ID', async () => {
        const session = createValidSession();
        const formData1 = createMockFormData({ content: 'Note 1' });
        const formData2 = createMockFormData({ content: 'Note 2' });

        const result1 = await createNote(formData1, session);
        const result2 = await createNote(formData2, session);

        expect(result1.note?.id).not.toBe(result2.note?.id);
        expect(result1.note?.id).toMatch(/^note_/);
        expect(result2.note?.id).toMatch(/^note_/);
      });

      it('should set createdAt timestamp', async () => {
        const session = createValidSession();
        const formData = createMockFormData({ content: 'Test note' });
        const before = new Date().toISOString();
        const result = await createNote(formData, session);
        const after = new Date().toISOString();

        expect(result.note?.createdAt).toBeDefined();
        if (result.note?.createdAt) {
          expect(result.note.createdAt >= before).toBe(true);
          expect(result.note.createdAt <= after).toBe(true);
        }
      });

      it('should trim whitespace from content', async () => {
        const session = createValidSession();
        const formData = createMockFormData({ content: '   Trimmed content   ' });
        const result = await createNote(formData, session);

        expect(result.note?.content).toBe('Trimmed content');
      });

      it('should add new notes to the list', async () => {
        const session = createValidSession();
        const formData1 = createMockFormData({ content: 'First note' });
        const formData2 = createMockFormData({ content: 'Second note' });

        await createNote(formData1, session);
        await createNote(formData2, session);

        const listResult = await listNotes(session);
        expect(listResult.notes?.length).toBe(2);
      });
    });

    describe('Input Validation', () => {
      it('should return error for empty content', async () => {
        const session = createValidSession();
        const formData = createMockFormData({ content: '' });
        const result = await createNote(formData, session);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Note content cannot be empty');
      });

      it('should return error for whitespace-only content', async () => {
        const session = createValidSession();
        const formData = createMockFormData({ content: '   ' });
        const result = await createNote(formData, session);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Note content cannot be empty');
      });

      it('should return error for content exceeding max length', async () => {
        const session = createValidSession();
        const longContent = 'a'.repeat(10001);
        const formData = createMockFormData({ content: longContent });
        const result = await createNote(formData, session);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Note content is too long (max 10,000 characters)');
      });

      it('should accept content at max length', async () => {
        const session = createValidSession();
        const maxContent = 'a'.repeat(10000);
        const formData = createMockFormData({ content: maxContent });
        const result = await createNote(formData, session);

        expect(result.success).toBe(true);
        expect(result.note?.content.length).toBe(10000);
      });

      it('should return error for missing content field', async () => {
        const session = createValidSession();
        const formData = new FormData();
        const result = await createNote(formData, session);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid form data');
      });
    });
  });

  describe('deleteNote()', () => {
    describe('Authentication', () => {
      it('should return error when session is null', async () => {
        const result = await deleteNote('some-note-id', null);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unauthorized');
      });

      it('should return error when session is expired', async () => {
        const expiredSession = createExpiredSession();
        const result = await deleteNote('some-note-id', expiredSession);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unauthorized');
      });
    });

    describe('Successful Deletion', () => {
      it('should delete an existing note', async () => {
        const session = createValidSession();
        const formData = createMockFormData({ content: 'To be deleted' });
        const createResult = await createNote(formData, session);
        const noteId = createResult.note!.id;

        const deleteResult = await deleteNote(noteId, session);

        expect(deleteResult.success).toBe(true);
        expect(deleteResult.deletedId).toBe(noteId);
      });

      it('should remove note from list after deletion', async () => {
        const session = createValidSession();
        const formData = createMockFormData({ content: 'To be deleted' });
        const createResult = await createNote(formData, session);
        const noteId = createResult.note!.id;

        await deleteNote(noteId, session);

        const listResult = await listNotes(session);
        expect(listResult.notes?.find((n) => n.id === noteId)).toBeUndefined();
      });

      it('should only delete specified note', async () => {
        const session = createValidSession();
        const formData1 = createMockFormData({ content: 'Keep this' });
        const formData2 = createMockFormData({ content: 'Delete this' });

        await createNote(formData1, session);
        const createResult2 = await createNote(formData2, session);

        await deleteNote(createResult2.note!.id, session);

        const listResult = await listNotes(session);
        expect(listResult.notes?.length).toBe(1);
        expect(listResult.notes?.[0]?.content).toBe('Keep this');
      });
    });

    describe('Error Cases', () => {
      it('should return error for non-existent note', async () => {
        const session = createValidSession();
        const result = await deleteNote('non-existent-id', session);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Note not found');
      });

      it('should return error for invalid note ID', async () => {
        const session = createValidSession();
        const result = await deleteNote('', session);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid note ID');
      });

      it('should not allow deleting another user\'s note', async () => {
        const user1Session = createValidSession(TEST_USER.userId, TEST_USER.email);
        const user2Session = createValidSession(TEST_ADMIN.userId, TEST_ADMIN.email);

        // User 1 creates a note
        const formData = createMockFormData({ content: 'User 1 note' });
        const createResult = await createNote(formData, user1Session);

        // User 2 tries to delete it
        const deleteResult = await deleteNote(createResult.note!.id, user2Session);

        expect(deleteResult.success).toBe(false);
        expect(deleteResult.error).toBe('Note not found');
      });
    });
  });

  describe('listNotes()', () => {
    describe('Authentication', () => {
      it('should return error when session is null', async () => {
        const result = await listNotes(null);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unauthorized');
        expect(result.notes).toBeUndefined();
      });

      it('should return error when session is expired', async () => {
        const expiredSession = createExpiredSession();
        const result = await listNotes(expiredSession);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unauthorized');
      });
    });

    describe('Successful Listing', () => {
      it('should return empty array when no notes exist', async () => {
        const session = createValidSession();
        const result = await listNotes(session);

        expect(result.success).toBe(true);
        expect(result.notes).toEqual([]);
      });

      it('should return all notes for user', async () => {
        const session = createValidSession();
        const formData1 = createMockFormData({ content: 'Note 1' });
        const formData2 = createMockFormData({ content: 'Note 2' });
        const formData3 = createMockFormData({ content: 'Note 3' });

        await createNote(formData1, session);
        await createNote(formData2, session);
        await createNote(formData3, session);

        const result = await listNotes(session);

        expect(result.success).toBe(true);
        expect(result.notes?.length).toBe(3);
      });

      it('should sort notes by createdAt descending (newest first)', async () => {
        const session = createValidSession();

        // Create notes with small delays to ensure different timestamps
        const formData1 = createMockFormData({ content: 'Oldest' });
        await createNote(formData1, session);

        const formData2 = createMockFormData({ content: 'Middle' });
        await createNote(formData2, session);

        const formData3 = createMockFormData({ content: 'Newest' });
        await createNote(formData3, session);

        const result = await listNotes(session);

        // Notes are added to the beginning, so newest should be first
        expect(result.notes?.[0]?.content).toBe('Newest');
        expect(result.notes?.[2]?.content).toBe('Oldest');
      });

      it('should only return notes for authenticated user', async () => {
        const user1Session = createValidSession(TEST_USER.userId, TEST_USER.email);
        const user2Session = createValidSession(TEST_ADMIN.userId, TEST_ADMIN.email);

        // User 1 creates notes
        await createNote(createMockFormData({ content: 'User 1 note' }), user1Session);

        // User 2 creates notes
        await createNote(createMockFormData({ content: 'User 2 note' }), user2Session);

        // User 1 should only see their own notes
        const user1Notes = await listNotes(user1Session);
        expect(user1Notes.notes?.length).toBe(1);
        expect(user1Notes.notes?.[0]?.content).toBe('User 1 note');

        // User 2 should only see their own notes
        const user2Notes = await listNotes(user2Session);
        expect(user2Notes.notes?.length).toBe(1);
        expect(user2Notes.notes?.[0]?.content).toBe('User 2 note');
      });

      it('should return notes with all required fields', async () => {
        const session = createValidSession();
        const formData = createMockFormData({ content: 'Complete note' });
        await createNote(formData, session);

        const result = await listNotes(session);
        const note = result.notes?.[0];

        expect(note).toHaveProperty('id');
        expect(note).toHaveProperty('content');
        expect(note).toHaveProperty('createdAt');
        expect(note).toHaveProperty('userId');
        expect(typeof note?.id).toBe('string');
        expect(typeof note?.content).toBe('string');
        expect(typeof note?.createdAt).toBe('string');
        expect(typeof note?.userId).toBe('string');
      });
    });
  });

  describe('updateNote()', () => {
    describe('Authentication', () => {
      it('should return error when session is null', async () => {
        const formData = createMockFormData({ content: 'Updated content' });
        const result = await updateNote('some-id', formData, null);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unauthorized');
      });

      it('should return error when session is expired', async () => {
        const formData = createMockFormData({ content: 'Updated content' });
        const expiredSession = createExpiredSession();
        const result = await updateNote('some-id', formData, expiredSession);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unauthorized');
      });
    });

    describe('Successful Update', () => {
      it('should update note content', async () => {
        const session = createValidSession();
        const createFormData = createMockFormData({ content: 'Original content' });
        const createResult = await createNote(createFormData, session);
        const noteId = createResult.note!.id;

        const updateFormData = createMockFormData({ content: 'Updated content' });
        const updateResult = await updateNote(noteId, updateFormData, session);

        expect(updateResult.success).toBe(true);
        expect(updateResult.note?.content).toBe('Updated content');
        expect(updateResult.note?.id).toBe(noteId);
      });

      it('should preserve note ID after update', async () => {
        const session = createValidSession();
        const createFormData = createMockFormData({ content: 'Original' });
        const createResult = await createNote(createFormData, session);
        const originalId = createResult.note!.id;

        const updateFormData = createMockFormData({ content: 'Modified' });
        const updateResult = await updateNote(originalId, updateFormData, session);

        expect(updateResult.note?.id).toBe(originalId);
      });

      it('should trim whitespace from updated content', async () => {
        const session = createValidSession();
        const createFormData = createMockFormData({ content: 'Original' });
        const createResult = await createNote(createFormData, session);

        const updateFormData = createMockFormData({ content: '   Trimmed update   ' });
        const updateResult = await updateNote(createResult.note!.id, updateFormData, session);

        expect(updateResult.note?.content).toBe('Trimmed update');
      });
    });

    describe('Error Cases', () => {
      it('should return error for non-existent note', async () => {
        const session = createValidSession();
        const formData = createMockFormData({ content: 'Update' });
        const result = await updateNote('non-existent-id', formData, session);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Note not found');
      });

      it('should return error for invalid note ID', async () => {
        const session = createValidSession();
        const formData = createMockFormData({ content: 'Update' });
        const result = await updateNote('', formData, session);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid note ID');
      });

      it('should return error for empty content', async () => {
        const session = createValidSession();
        const createFormData = createMockFormData({ content: 'Original' });
        const createResult = await createNote(createFormData, session);

        const updateFormData = createMockFormData({ content: '' });
        const result = await updateNote(createResult.note!.id, updateFormData, session);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Note content cannot be empty');
      });

      it('should return error for content exceeding max length', async () => {
        const session = createValidSession();
        const createFormData = createMockFormData({ content: 'Original' });
        const createResult = await createNote(createFormData, session);

        const longContent = 'a'.repeat(10001);
        const updateFormData = createMockFormData({ content: longContent });
        const result = await updateNote(createResult.note!.id, updateFormData, session);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Note content is too long (max 10,000 characters)');
      });

      it('should not allow updating another user\'s note', async () => {
        const user1Session = createValidSession(TEST_USER.userId, TEST_USER.email);
        const user2Session = createValidSession(TEST_ADMIN.userId, TEST_ADMIN.email);

        // User 1 creates a note
        const createFormData = createMockFormData({ content: 'User 1 note' });
        const createResult = await createNote(createFormData, user1Session);

        // User 2 tries to update it
        const updateFormData = createMockFormData({ content: 'Hacked!' });
        const updateResult = await updateNote(createResult.note!.id, updateFormData, user2Session);

        expect(updateResult.success).toBe(false);
        expect(updateResult.error).toBe('Note not found');
      });
    });
  });

  describe('getNote()', () => {
    describe('Authentication', () => {
      it('should return error when session is null', async () => {
        const result = await getNote('some-id', null);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unauthorized');
      });

      it('should return error when session is expired', async () => {
        const expiredSession = createExpiredSession();
        const result = await getNote('some-id', expiredSession);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unauthorized');
      });
    });

    describe('Successful Retrieval', () => {
      it('should return note by ID', async () => {
        const session = createValidSession();
        const formData = createMockFormData({ content: 'Find this note' });
        const createResult = await createNote(formData, session);
        const noteId = createResult.note!.id;

        const getResult = await getNote(noteId, session);

        expect(getResult.success).toBe(true);
        expect(getResult.note?.id).toBe(noteId);
        expect(getResult.note?.content).toBe('Find this note');
      });

      it('should return all note fields', async () => {
        const session = createValidSession();
        const formData = createMockFormData({ content: 'Complete note' });
        const createResult = await createNote(formData, session);

        const getResult = await getNote(createResult.note!.id, session);

        expect(getResult.note).toHaveProperty('id');
        expect(getResult.note).toHaveProperty('content');
        expect(getResult.note).toHaveProperty('createdAt');
        expect(getResult.note).toHaveProperty('userId');
      });
    });

    describe('Error Cases', () => {
      it('should return error for non-existent note', async () => {
        const session = createValidSession();
        const result = await getNote('non-existent-id', session);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Note not found');
      });

      it('should return error for invalid note ID', async () => {
        const session = createValidSession();
        const result = await getNote('', session);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid note ID');
      });

      it('should not allow getting another user\'s note', async () => {
        const user1Session = createValidSession(TEST_USER.userId, TEST_USER.email);
        const user2Session = createValidSession(TEST_ADMIN.userId, TEST_ADMIN.email);

        // User 1 creates a note
        const formData = createMockFormData({ content: 'Private note' });
        const createResult = await createNote(formData, user1Session);

        // User 2 tries to get it
        const getResult = await getNote(createResult.note!.id, user2Session);

        expect(getResult.success).toBe(false);
        expect(getResult.error).toBe('Note not found');
      });
    });
  });

  describe('clearNotes()', () => {
    describe('Authentication', () => {
      it('should return error when session is null', async () => {
        const result = await clearNotes(null);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unauthorized');
      });

      it('should return error when session is expired', async () => {
        const expiredSession = createExpiredSession();
        const result = await clearNotes(expiredSession);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unauthorized');
      });
    });

    describe('Successful Clearing', () => {
      it('should clear all notes for user', async () => {
        const session = createValidSession();

        // Create some notes
        await createNote(createMockFormData({ content: 'Note 1' }), session);
        await createNote(createMockFormData({ content: 'Note 2' }), session);
        await createNote(createMockFormData({ content: 'Note 3' }), session);

        // Verify notes exist
        let listResult = await listNotes(session);
        expect(listResult.notes?.length).toBe(3);

        // Clear notes
        const clearResult = await clearNotes(session);
        expect(clearResult.success).toBe(true);

        // Verify notes are gone
        listResult = await listNotes(session);
        expect(listResult.notes?.length).toBe(0);
      });

      it('should succeed even when no notes exist', async () => {
        const session = createValidSession();
        const result = await clearNotes(session);

        expect(result.success).toBe(true);
      });

      it('should only clear notes for authenticated user', async () => {
        const user1Session = createValidSession(TEST_USER.userId, TEST_USER.email);
        const user2Session = createValidSession(TEST_ADMIN.userId, TEST_ADMIN.email);

        // Both users create notes
        await createNote(createMockFormData({ content: 'User 1 note' }), user1Session);
        await createNote(createMockFormData({ content: 'User 2 note' }), user2Session);

        // User 1 clears their notes
        await clearNotes(user1Session);

        // User 1 should have no notes
        const user1Notes = await listNotes(user1Session);
        expect(user1Notes.notes?.length).toBe(0);

        // User 2 should still have their notes
        const user2Notes = await listNotes(user2Session);
        expect(user2Notes.notes?.length).toBe(1);
      });
    });
  });
});

describe('Note Data Structure', () => {
  beforeEach(async () => {
    const session = createValidSession();
    await clearNotes(session);
  });

  it('should generate note ID with correct prefix', async () => {
    const session = createValidSession();
    const formData = createMockFormData({ content: 'Test' });
    const result = await createNote(formData, session);

    expect(result.note?.id).toMatch(/^note_[a-f0-9]{32}$/);
  });

  it('should store createdAt as ISO string', async () => {
    const session = createValidSession();
    const formData = createMockFormData({ content: 'Test' });
    const result = await createNote(formData, session);

    // Should be a valid ISO date string
    const date = new Date(result.note!.createdAt);
    expect(date.toISOString()).toBe(result.note!.createdAt);
  });

  it('should preserve special characters in content', async () => {
    const session = createValidSession();
    const specialContent = 'Note with <script>alert("xss")</script> & special chars: "quotes" \'apostrophes\'';
    const formData = createMockFormData({ content: specialContent });
    const result = await createNote(formData, session);

    expect(result.note?.content).toBe(specialContent);
  });

  it('should handle unicode content', async () => {
    const session = createValidSession();
    const unicodeContent = '📝 Notes with emojis! 日本語テスト 中文测试 한국어 테스트';
    const formData = createMockFormData({ content: unicodeContent });
    const result = await createNote(formData, session);

    expect(result.note?.content).toBe(unicodeContent);
  });

  it('should handle multiline content', async () => {
    const session = createValidSession();
    const multilineContent = 'Line 1\nLine 2\nLine 3\n\nParagraph 2';
    const formData = createMockFormData({ content: multilineContent });
    const result = await createNote(formData, session);

    expect(result.note?.content).toBe(multilineContent);
  });
});
