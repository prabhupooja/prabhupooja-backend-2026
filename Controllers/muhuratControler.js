const db = require('../config/db');

exports.create = async (req, res) => {
  const { name } = req.body;
  if (!req.file || !req.file.location) {
    return res.status(400).send({
      success: false,
      message: 'Image file is required'
    });
  }

  const image = req.file.location;

  if (!name || !image) {
    return res.status(400).send({
      success: false,
      message: 'All fields are required'
    });
  }

  try {

    const data = await db.query(
      `INSERT INTO muhurat(name, image) VALUES(?, ?)`,
      [name, image]
    );

    return res.status(201).send({
      success: true,
      message: 'Record created successfully',
    });

  } catch (error) {
    console.error('Error inserting data into the table:', error);
    return res.status(500).send({
      success: false,
      message: 'An error occurred while creating the record',
    });
  }
};

exports.getAll = async (req, res) => {
  try {

    const data = await db.query('SELECT * FROM muhurat');

    return res.status(200).send({
      success: true,
      data: data[0]
    });

  } catch (error) {
    console.error('Error fetching data from the table:', error);
    return res.status(500).send({
      success: false,
      message: 'An error occurred while fetching the records',
    });
  }
};

exports.membership = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('User ID:', userId);

    // Fetch the membership data
    const [data] = await db.query(
      'SELECT * FROM membership WHERE user_id = ? ORDER BY id DESC LIMIT 1',
      [userId]
    );
    console.log('Membership Data:', data);

    if (!data || data.length === 0) {
      return res.status(200).send({
        success: false,
        message: 'No membership found for the given user ID',
      });
    }

    // Get the expiry date and current date
    const expiryDate = new Date(data[0].expiry_date);
    const currentDate = new Date();

    console.log('Expiry Date:', expiryDate);
    console.log('Current Date:', currentDate);

    if (expiryDate.toDateString() === currentDate.toDateString() || expiryDate < currentDate) {
      try {
        const updateResult = await db.query(
          'UPDATE users SET member = 0, membershipBalance = 0.00 WHERE id = ?',
          [userId]
        );
        console.log('User membership status updated:', updateResult);
      } catch (updateError) {
        console.error('Error updating user table:', updateError);
        return res.status(500).send({
          success: false,
          message: 'Error updating user membership status',
        });
      }
    } else {
      console.log('Membership has not expired yet.');
    }

    setTimeout(async () => {
      console.log('Rechecking membership status after 1 minute...');
      await fetch(`http://localhost:3002/api/v1/muhurat/member/${userId}`)
        .then(response => response.json())
        .then(data => console.log('Recheck Response:', data))
        .catch(err => console.error('Error rechecking membership:', err));
    }, 60000); // 60 seconds (1 minute)

    return res.status(200).send({
      success: true,
      data: data[0],
    });

  } catch (error) {
    console.error('Error fetching data from the table:', error);
    return res.status(500).send({
      success: false,
      message: 'An error occurred while fetching the records',
    });
  }
};

exports.getMembership= async(req,res)=>{
  try{
    const data = await db.query(` SELECT 
        m.id, 
        m.user_id, 
        m.amount, 
        m.payment_date, 
        m.expiry_date, 
        u.name, 
        u.mobile, 
        u.email 
      FROM membership m
      JOIN users u ON m.user_id = u.id`);

    return res.status(200).send({
      success: true,
      data: data[0]
    });
  }
  catch(error){
    console.error('Error fetching data from the table:', error);
    return res.status(500).send({
      success: false,
      message: 'An error occurred while fetching the records',
    });
  }
};

exports.updateMembership = async (req, res) => {
  const { id } = req.params;
  const { amount, payment_date, expiry_date } = req.body; 

  try {

    const [existingMembership] = await db.query('SELECT * FROM membership WHERE id = ?', [id]);

    if (existingMembership.length === 0) {
      return res.status(404).send({ success: false, message: "Membership not found" });
    }

    let fieldsToUpdate = [];
    let queryParams = [];

    
    if (amount !== undefined) {
      fieldsToUpdate.push(`amount = ?`);
      queryParams.push(amount);
    }
    if (payment_date !== undefined) {
      fieldsToUpdate.push(`payment_date = ?`);
      queryParams.push(payment_date);
    }
    if (expiry_date !== undefined) {
      fieldsToUpdate.push(`expiry_date = ?`);
      queryParams.push(expiry_date);
    }

    if (fieldsToUpdate.length === 0) {
      return res.status(400).send({ success: false, message: "No valid fields provided for update" });
    }

    
    const updateQuery = `UPDATE membership SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
    queryParams.push(id);

    await db.query(updateQuery, queryParams);

    return res.status(200).send({ success: true, message: "Membership updated successfully" });

  } catch (error) {
    console.error('Error updating membership:', error);
    return res.status(500).send({ success: false, message: 'Internal server error' });
  }
};

exports.deleteMembership = async (req, res) => {
  const { id } = req.params; // Get membership ID from URL params

  try {
    // Check if the membership exists
    const [existingMembership] = await db.query('SELECT * FROM membership WHERE id = ?', [id]);

    if (existingMembership.length === 0) {
      return res.status(404).send({ success: false, message: "Membership not found" });
    }

    // Delete membership by ID
    await db.query('DELETE FROM membership WHERE id = ?', [id]);

    return res.status(200).send({ success: true, message: "Membership deleted successfully" });

  } catch (error) {
    console.error('Error deleting membership:', error);
    return res.status(500).send({ success: false, message: 'Internal server error' });
  }
};

