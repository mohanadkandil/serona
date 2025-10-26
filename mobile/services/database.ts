/**
 * Local SQLite Database for Session Reports
 * Stores all medical analysis sessions locally on the device
 */

import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('serona.db');

export interface SessionReport {
  id?: number;
  date: string;
  transcript: string;
  classification: string;
  severity: string;
  chiefComplaint: string;
  medicalAnalysis: string;
  patientInsights: string;
  researchSteps: string;
  patientHistory: string;
  createdAt: string;
}

/**
 * Initialize database and create tables
 */
export async function initDatabase() {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS session_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        transcript TEXT NOT NULL,
        classification TEXT,
        severity TEXT,
        chiefComplaint TEXT,
        medicalAnalysis TEXT,
        patientInsights TEXT,
        researchSteps TEXT,
        patientHistory TEXT,
        createdAt TEXT NOT NULL
      );
    `);

    console.log('✅ Database initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

/**
 * Save a new session report
 */
export async function saveSessionReport(report: Omit<SessionReport, 'id'>): Promise<number> {
  try {
    const result = await db.runAsync(
      `INSERT INTO session_reports (
        date, transcript, classification, severity, chiefComplaint,
        medicalAnalysis, patientInsights, researchSteps, patientHistory, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        report.date,
        report.transcript,
        report.classification || '',
        report.severity || '',
        report.chiefComplaint || '',
        report.medicalAnalysis || '',
        report.patientInsights || '',
        report.researchSteps || '',
        report.patientHistory || '',
        report.createdAt,
      ]
    );

    console.log('✅ Session saved to database, ID:', result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error('❌ Error saving session:', error);
    throw error;
  }
}

/**
 * Get all session reports (ordered by date, newest first)
 */
export async function getAllSessionReports(): Promise<SessionReport[]> {
  try {
    const result = await db.getAllAsync<SessionReport>(
      'SELECT * FROM session_reports ORDER BY createdAt DESC'
    );

    return result;
  } catch (error) {
    console.error('❌ Error fetching sessions:', error);
    return [];
  }
}

/**
 * Get a single session report by ID
 */
export async function getSessionReport(id: number): Promise<SessionReport | null> {
  try {
    const result = await db.getFirstAsync<SessionReport>(
      'SELECT * FROM session_reports WHERE id = ?',
      [id]
    );

    return result || null;
  } catch (error) {
    console.error('❌ Error fetching session:', error);
    return null;
  }
}

/**
 * Update a session report
 */
export async function updateSessionReport(id: number, report: Partial<Omit<SessionReport, 'id'>>): Promise<void> {
  try {
    const updates: string[] = [];
    const values: any[] = [];

    if (report.transcript !== undefined) {
      updates.push('transcript = ?');
      values.push(report.transcript);
    }
    if (report.classification !== undefined) {
      updates.push('classification = ?');
      values.push(report.classification);
    }
    if (report.severity !== undefined) {
      updates.push('severity = ?');
      values.push(report.severity);
    }
    if (report.chiefComplaint !== undefined) {
      updates.push('chiefComplaint = ?');
      values.push(report.chiefComplaint);
    }
    if (report.medicalAnalysis !== undefined) {
      updates.push('medicalAnalysis = ?');
      values.push(report.medicalAnalysis);
    }
    if (report.patientInsights !== undefined) {
      updates.push('patientInsights = ?');
      values.push(report.patientInsights);
    }
    if (report.researchSteps !== undefined) {
      updates.push('researchSteps = ?');
      values.push(report.researchSteps);
    }
    if (report.patientHistory !== undefined) {
      updates.push('patientHistory = ?');
      values.push(report.patientHistory);
    }

    if (updates.length === 0) {
      console.log('⚠️  No fields to update');
      return;
    }

    values.push(id);

    await db.runAsync(
      `UPDATE session_reports SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    console.log('✅ Session updated:', id);
  } catch (error) {
    console.error('❌ Error updating session:', error);
    throw error;
  }
}

/**
 * Delete a session report
 */
export async function deleteSessionReport(id: number): Promise<void> {
  try {
    await db.runAsync('DELETE FROM session_reports WHERE id = ?', [id]);
    console.log('✅ Session deleted:', id);
  } catch (error) {
    console.error('❌ Error deleting session:', error);
    throw error;
  }
}

/**
 * Get session count
 */
export async function getSessionCount(): Promise<number> {
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM session_reports'
    );

    return result?.count || 0;
  } catch (error) {
    console.error('❌ Error counting sessions:', error);
    return 0;
  }
}

/**
 * Search sessions by text
 */
export async function searchSessions(query: string): Promise<SessionReport[]> {
  try {
    const searchPattern = `%${query}%`;
    const result = await db.getAllAsync<SessionReport>(
      `SELECT * FROM session_reports
       WHERE transcript LIKE ?
       OR chiefComplaint LIKE ?
       OR classification LIKE ?
       ORDER BY createdAt DESC`,
      [searchPattern, searchPattern, searchPattern]
    );

    return result;
  } catch (error) {
    console.error('❌ Error searching sessions:', error);
    return [];
  }
}
