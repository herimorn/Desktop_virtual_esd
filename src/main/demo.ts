import { connectToDatabase } from "./database";

const db=connectToDatabase();

// Function to insert the TRA data
export function insertDemoData() {
  const insertStatement = `
    INSERT OR IGNORE INTO TRA (
      tin, certKey, regId, username, password, gc, receiptCode
    ) VALUES (
      '109272930', '10TZ101167', 'TZ0100559122', 'bababbgh8490bcms', 'j4MZ9k%oFFAQzA3_', '819', '317B48'
    )
  `;

  db.run(insertStatement, function (err) {
    if (err) {
      console.error('Error inserting TRA data:', err.message);
    } else {
      console.log('TRA data inserted successfully.');
    }
  });
}

// Close the database connection when done (if needed)
export function closeDatabase() {
  db.close((err) => {
    if (err) {
      console.error('Error closing the database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
  });
}
