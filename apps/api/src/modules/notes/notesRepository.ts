import type { NoteInput } from "@library/contracts";
import { prisma } from "../../lib/prisma";

export type NoteInputWithOtherParams = NoteInput & {
  libraryEntryId: string;
  userId: string;
};

export type NotesListParams = {
  libraryId: string;
  userId: string;
};

export type NoteUpdate = {
  noteId: string;
  userId: string;
  content: string;
};

const libraryEntryDetailSelect = {
  id: true,
  status: true,
  currentPage: true,
  rating: true,
  review: true,
  createdAt: true,
  updatedAt: true,
  book: {
    select: {
      googleBooksId: true,
      title: true,
      authors: true,
      description: true,
      coverUrl: true,
      language: true,
      pageCount: true,
    },
  },
  notes: {
    select: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  },
} as const;

export const notesRepository = {
  getDetailById({ libraryId, userId }: NotesListParams) {
    return prisma.libraryEntry.findUnique({
      where: {
        id: libraryId,
        userId: userId,
      },
      select: libraryEntryDetailSelect,
    });
  },

  createNote(data: NoteInputWithOtherParams) {
    return prisma.note.create({
      data: {
        content: data.content,
        libraryEntry: {
          connect: { id: data.libraryEntryId, userId: data.userId },
        },
      },
    });
  },

  getNoteById(noteId: string) {
    return prisma.note.findUnique({
      where: {
        id: noteId,
      },
    });
  },

  updateNote({ noteId, content, userId }: NoteUpdate) {
    return prisma.note.update({
      where: {
        id: noteId,
        libraryEntry: { userId: userId },
      },
      data: { content: content },
    });
  },

  deleteNote(noteId: string, userId: string) {
    return prisma.note.delete({
      where: { id: noteId, libraryEntry: { userId: userId } },
    });
  },
};
