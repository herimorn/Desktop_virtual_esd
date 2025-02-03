import { ipcMain } from 'electron';
import { connectToDatabase } from '../../src/main/database';

const db = connectToDatabase();

// Handle storing customizations

ipcMain.handle('storePraforma-customization', (event, customizationString) => {
  try {
    // Parse the JSON string into an object
    const customization = JSON.parse(customizationString);
    console.log("the custumization is ", custumizationString);
    const { fontSize, fontFamily, imageSize } = customization;

    // Log the parsed values
    // console.log('Customization Data Received:', customization);

    if (!fontSize || !fontFamily || !imageSize) {
      console.error('Invalid customization data:', customization);
      return { success: false, message: 'Invalid customization data' };
    }

    // Check if a record already exists
    db.get(
      `SELECT * FROM praformaCustomization LIMIT 1`, // Assuming there will only be one record
      (err, row) => {
        if (err) {
          console.error('Database error:', err);
          return { success: false, message: 'Database error' };
        }

        if (row) {
          // Update existing customization
          db.run(
            `UPDATE praformaCustomization
             SET fontSize = ?, fontFamily = ?, imageSize = ?
             WHERE id = ?`,
            [fontSize, fontFamily, imageSize, row.id],
            function (updateErr) {
              if (updateErr) {
                console.error('Error updating customization:', updateErr);
                return { success: false, message: 'Database error' };
              } else {
                return { success: true, message: 'Customization updated' };
              }
            }
          );
        } else {
          // Insert new customization
          db.run(
            `INSERT INTO praformaCustomization (fontSize, fontFamily, imageSize)
             VALUES (?, ?, ?)`,
            [fontSize, fontFamily, imageSize],
            function (insertErr) {
              if (insertErr) {
                console.error('Error inserting customization:', insertErr);
                return { success: false, message: 'Database error' };
              } else {
                return { success: true, message: 'Customization saved' };
              }
            }
          );
        }
      }
    );
  } catch (parseError) {
    console.error('Error parsing customization data:', parseError);
    return { success: false, message: 'Invalid customization format' };
  }
});


ipcMain.handle('update-Praformacustomization', async (event, data) => {

  try {
    const { header_images, footer_images } = data;

    // First, check if a record exists
    const checkSql = `SELECT * FROM  praformaCustomization LIMIT 1`;

    return new Promise((resolve, reject) => {
      db.get(checkSql, [], (err, row) => {
        if (err) {
          console.error('Error checking customizations:', err);
          reject({ success: false, error: err.message });
          return;
        }

        // Keep existing values if new ones aren't provided
        const updatedHeader = header_images || (row ? row.header_images : null);
        const updatedFooter = footer_images || (row ? row.footer_images : null);

        if (!row) {
          // If no record exists, insert a new one with just the images
          const insertSql = `
            INSERT INTO customizations (header_images, footer_images)
            VALUES (?, ?)
          `;

          db.run(insertSql, [updatedHeader, updatedFooter], (insertErr) => {
            if (insertErr) {
              console.error('Error inserting customization:', insertErr);
              reject({ success: false, error: insertErr.message });
            } else {
              console.log('Successfully inserted new customization');
              resolve({ success: true });
            }
          });
        } else {
          // If record exists, update only the images
          const updateSql = `
            UPDATE praformaCustomization
            SET header_images = ?,
                footer_images = ?
            WHERE id = ?
          `;

          db.run(updateSql, [updatedHeader, updatedFooter, row.id], (updateErr) => {
            if (updateErr) {
              console.error('Error updating customization:', updateErr);
              reject({ success: false, error: updateErr.message });
            } else {
              console.log('Successfully updated customization');
              resolve({ success: true });
            }
          });
        }
      });
    });

  } catch (error) {
    console.error('Error in update-customization handler:', error);
    return { success: false, error: error.message };
  }
});



// Handle fetching customizations
ipcMain.handle('fetch-Praformacustomizations', async (event) => {
  try {
    // Fetch all rows from the customizations table
    const results = await new Promise((resolve, reject) => {
      db.all(`
        SELECT id, fontSize, fontFamily, imageSize, header_images, footer_images
        FROM praformaCustomization
      `, [], (err, rows) => {
        if (err) {
          console.error("Error fetching customizations:", err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });

    return results || []; // Return an empty array if no results are found
  } catch (err) {
    console.error("Error fetching customizations:", err.message);
    return [];
  }
});
























ipcMain.handle('store-customization', (event, customizationString) => {
  try {
    // Parse the JSON string into an object
    const customization = JSON.parse(customizationString);
    const { fontSize, fontFamily, imageSize } = customization;

    // Log the parsed values
    // console.log('Customization Data Received:', customization);

    if (!fontSize || !fontFamily || !imageSize) {
      console.error('Invalid customization data:', customization);
      return { success: false, message: 'Invalid customization data' };
    }

    // Check if a record already exists
    db.get(
      `SELECT * FROM customizations LIMIT 1`, // Assuming there will only be one record
      (err, row) => {
        if (err) {
          console.error('Database error:', err);
          return { success: false, message: 'Database error' };
        }

        if (row) {
          // Update existing customization
          db.run(
            `UPDATE customizations
             SET fontSize = ?, fontFamily = ?, imageSize = ?
             WHERE id = ?`,
            [fontSize, fontFamily, imageSize, row.id],
            function (updateErr) {
              if (updateErr) {
                console.error('Error updating customization:', updateErr);
                return { success: false, message: 'Database error' };
              } else {
                return { success: true, message: 'Customization updated' };
              }
            }
          );
        } else {
          // Insert new customization
          db.run(
            `INSERT INTO customizations (fontSize, fontFamily, imageSize)
             VALUES (?, ?, ?)`,
            [fontSize, fontFamily, imageSize],
            function (insertErr) {
              if (insertErr) {
                console.error('Error inserting customization:', insertErr);
                return { success: false, message: 'Database error' };
              } else {
                return { success: true, message: 'Customization saved' };
              }
            }
          );
        }
      }
    );
  } catch (parseError) {
    console.error('Error parsing customization data:', parseError);
    return { success: false, message: 'Invalid customization format' };
  }
});


ipcMain.handle('update-customization', async (event, data) => {

  try {
    const { header_images, footer_images } = data;

    // First, check if a record exists
    const checkSql = `SELECT * FROM customizations LIMIT 1`;

    return new Promise((resolve, reject) => {
      db.get(checkSql, [], (err, row) => {
        if (err) {
          console.error('Error checking customizations:', err);
          reject({ success: false, error: err.message });
          return;
        }

        // Keep existing values if new ones aren't provided
        const updatedHeader = header_images || (row ? row.header_images : null);
        const updatedFooter = footer_images || (row ? row.footer_images : null);

        if (!row) {
          // If no record exists, insert a new one with just the images
          const insertSql = `
            INSERT INTO customizations (header_images, footer_images)
            VALUES (?, ?)
          `;

          db.run(insertSql, [updatedHeader, updatedFooter], (insertErr) => {
            if (insertErr) {
              console.error('Error inserting customization:', insertErr);
              reject({ success: false, error: insertErr.message });
            } else {
              console.log('Successfully inserted new customization');
              resolve({ success: true });
            }
          });
        } else {
          // If record exists, update only the images
          const updateSql = `
            UPDATE customizations
            SET header_images = ?,
                footer_images = ?
            WHERE id = ?
          `;

          db.run(updateSql, [updatedHeader, updatedFooter, row.id], (updateErr) => {
            if (updateErr) {
              console.error('Error updating customization:', updateErr);
              reject({ success: false, error: updateErr.message });
            } else {
              console.log('Successfully updated customization');
              resolve({ success: true });
            }
          });
        }
      });
    });

  } catch (error) {
    console.error('Error in update-customization handler:', error);
    return { success: false, error: error.message };
  }
});



// Handle fetching customizations
ipcMain.handle('fetch-customizations', async (event) => {
  try {
    // Fetch all rows from the customizations table
    const results = await new Promise((resolve, reject) => {
      db.all(`
        SELECT id, fontSize, fontFamily, imageSize, header_images, footer_images
        FROM customizations
      `, [], (err, rows) => {
        if (err) {
          console.error("Error fetching customizations:", err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });

    return results || []; // Return an empty array if no results are found
  } catch (err) {
    console.error("Error fetching customizations:", err.message);
    return [];
  }
});
