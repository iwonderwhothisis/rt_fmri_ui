import * as fs from 'fs';
import * as path from 'path';

export interface Participant {
  id: string;
  anchor: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const CSV_FILE = path.join(DATA_DIR, 'participants.csv');

// Ensure data directory exists
const ensureDataDir = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('[ParticipantService] Created data directory');
  }
};

// Ensure CSV file exists with headers
const ensureCsvFile = () => {
  ensureDataDir();
  if (!fs.existsSync(CSV_FILE)) {
    fs.writeFileSync(CSV_FILE, 'id,anchor\n', 'utf-8');
    console.log('[ParticipantService] Created participants.csv');
  }
};

// Parse CSV content to participants array
const parseCsv = (content: string): Participant[] => {
  const lines = content.trim().split('\n');
  if (lines.length <= 1) return []; // Only header or empty

  return lines.slice(1).map(line => {
    // Handle CSV escaping (fields might be quoted)
    const match = line.match(/^"?([^",]*)"?,"?([^"]*)"?$/);
    if (match) {
      return {
        id: match[1],
        anchor: match[2],
      };
    }
    // Simple split fallback
    const [id, anchor = ''] = line.split(',');
    return { id, anchor };
  }).filter(p => p.id); // Filter out empty rows
};

// Convert participants array to CSV content
const toCsv = (participants: Participant[]): string => {
  const header = 'id,anchor';
  const rows = participants.map(p => {
    // Escape values if they contain commas or quotes
    const escapeField = (field: string) => {
      if (field.includes(',') || field.includes('"')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };
    return `${escapeField(p.id)},${escapeField(p.anchor)}`;
  });
  return [header, ...rows].join('\n') + '\n';
};

// Get all participants
export const getParticipants = (): Participant[] => {
  ensureCsvFile();
  try {
    const content = fs.readFileSync(CSV_FILE, 'utf-8');
    return parseCsv(content);
  } catch (error) {
    console.error('[ParticipantService] Error reading CSV:', error);
    return [];
  }
};

// Get participant by ID
export const getParticipant = (id: string): Participant | undefined => {
  const participants = getParticipants();
  return participants.find(p => p.id === id);
};

// Create a new participant
export const createParticipant = (participant: Participant): Participant => {
  const participants = getParticipants();
  
  // Check for duplicate
  if (participants.some(p => p.id === participant.id)) {
    throw new Error(`Participant with ID ${participant.id} already exists`);
  }
  
  participants.push(participant);
  fs.writeFileSync(CSV_FILE, toCsv(participants), 'utf-8');
  console.log(`[ParticipantService] Created participant ${participant.id}`);
  return participant;
};

// Update a participant
export const updateParticipant = (id: string, updates: { anchor?: string }): Participant => {
  const participants = getParticipants();
  const index = participants.findIndex(p => p.id === id);
  
  if (index === -1) {
    throw new Error(`Participant with ID ${id} not found`);
  }
  
  participants[index] = {
    ...participants[index],
    ...updates,
  };
  
  fs.writeFileSync(CSV_FILE, toCsv(participants), 'utf-8');
  console.log(`[ParticipantService] Updated participant ${id}`);
  return participants[index];
};

// Delete a participant
export const deleteParticipant = (id: string): void => {
  const participants = getParticipants();
  const index = participants.findIndex(p => p.id === id);
  
  if (index === -1) {
    throw new Error(`Participant with ID ${id} not found`);
  }
  
  participants.splice(index, 1);
  fs.writeFileSync(CSV_FILE, toCsv(participants), 'utf-8');
  console.log(`[ParticipantService] Deleted participant ${id}`);
};
