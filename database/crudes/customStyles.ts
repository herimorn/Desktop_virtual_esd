// customStyles.ts
import { ipcMain } from 'electron';
import {connectToDatabase } from '../../src/main/database';

const db=connectToDatabase();
// Save styles and positions
async function runQuery(query: string, params: any[]): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

ipcMain.handle('save-styles', async (event, sectionId, styles, position) => {
 // console.log("the saved custumizations is",invoiceNumber, sectionId, styles, position);
  const query = `
    INSERT INTO custom_styles ( section_id, styles, position)
    VALUES (?, ?, ?)
    ON CONFLICT(section_id) DO UPDATE SET
    styles=excluded.styles, position=excluded.position;
  `;
  await runQuery(query, [sectionId, JSON.stringify(styles), JSON.stringify(position)]);
  return true;
});

// Fetch styles and positions for a specific invoice
ipcMain.handle('fetch-styles', async () => {
  const query = `SELECT section_id, styles, position FROM custom_styles`;
  const rows = await runQuery(query, []); // Pass an empty array if no parameters
  return rows.map(row => ({
    sectionId: row.section_id,
    styles: JSON.parse(row.styles),
    position: JSON.parse(row.position),
  }));
});
