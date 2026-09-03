const db = require('../config/db');

exports.create = async (req, res) => {
    const { name, problem, temple_name, samagri } = req.body;

    // Extract the image and banner from req.files
    const image = req.files && req.files['image'] ? req.files['image'][0].location : null;
    const banner = req.files && req.files['banner'] ? req.files['banner'][0].location : null;

    try {
        const data = await db.query(
            `INSERT INTO problems (name, problem, temple_name, image, banner,samagri) VALUES ( ?, ?, ?, ?, ?,?)`,
            [name, problem, temple_name, image, banner, samagri]
        );

        if (!data) {
            return res.status(404).send({
                success: false,
                message: 'Error in insert query'
            });
        }

        return res.status(201).send({
            success: true,
            message: "Product created successfully"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error"
        });
    }
};

exports.getByProblemName = async (req, res) => {
    const { problem } = req.params;

    if (!problem) {
        return res.status(400).send({
            success: false,
            message: "Problem name is required"
        });
    }

    try {
        const data = await db.query(
            `SELECT * FROM problems WHERE problem = ?`,
            [problem]
        );

        if (data.length === 0) {
            return res.status(404).send({
                success: false,
                message: "No records found for the given problem name"
            });
        }

        return res.status(200).send({
            success: true,
            data: data[0] // Return the first record
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error"
        });
    }
};

exports.getByProblemId = async (req, res) => {
    const { id } = req.params; // Accepting problem ID from URL params

    if (!id) {
        return res.status(400).send({
            success: false,
            message: "Problem ID is required"
        });
    }

    try {
        const data = await db.query(
            `SELECT * FROM problems WHERE id = ?`,
            [id]
        );

        if (data.length === 0) {
            return res.status(404).send({
                success: false,
                message: "No records found for the given problem ID"
            });
        }

        return res.status(200).send({
            success: true,
            data: data[0][0]
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error"
        });
    }
};
exports.bookingPooja = async (req, res) => {
    const { pujaid, paymentid, amount, userid, paymentdate, bookingdate } = req.body;

    try {
        if (!pujaid || !paymentid || !amount || !userid || !paymentdate || !bookingdate) {
            return res.status(400).send({
                success: false,
                message: "All fields are required",
            });
        }
        // const paymentDate = new Date(paymentdate * 1000);
        const paymentDate = typeof paymentdate === 'string' ? new Date(paymentdate) : new Date(paymentdate * 1000);
        const [result] = await db.query(`INSERT INTO problem_booking(
    pujaid,paymentid,amount,userid,paymentdate,bookingdate) VALUES (?,?,?,?,?,?)`,
            [pujaid, paymentid, amount, userid, paymentDate, bookingdate]);
        res.status(201).send({
            success: true,
            message: "Booking successful",
        })
    } catch (error) {
        console.error("Error creating booking:", error);
        res.status(500).send({
            success: false,
            message: "Failed to create booking",
        });
    }
}
exports.update = async (req, res) => {
    const { id } = req.params;  // Get the id from URL parameters
    const { name, problem, temple_name, price, samagri } = req.body;

    // Extract the image and banner from req.files (if they exist)
    const image = req.files && req.files['image'] ? req.files['image'][0].location : null;
    const banner = req.files && req.files['banner'] ? req.files['banner'][0].location : null;

    try {
        // Create an array to hold the dynamic query values
        let updateFields = [];
        let updateQuery = 'UPDATE problems SET';

        // Add name if provided
        if (name) {
            updateQuery += ` name = ?,`;
            updateFields.push(name);
        }

        // Add problem if provided
        if (problem) {
            updateQuery += ` problem = ?,`;
            updateFields.push(problem);
        }

        // Add temple_name if provided
        if (temple_name) {
            updateQuery += ` temple_name = ?,`;
            updateFields.push(temple_name);
        }

        // Add price if provided
        if (price) {
            updateQuery += ` price = ?,`;
            updateFields.push(price);
        }

        // Add image if provided, otherwise keep the existing image
        if (image) {
            updateQuery += ` image = ?,`;
            updateFields.push(image);
        }

        // Add banner if provided, otherwise keep the existing banner
        if (banner) {
            updateQuery += ` banner = ?,`;
            updateFields.push(banner);
        }
        if (samagri) {
            updateQuery += ` samagri = ?,`;
            updateFields.push(samagri);
        }
        // Remove trailing comma and add the WHERE condition
        updateQuery = updateQuery.slice(0, -1);  // Remove the trailing comma
        updateQuery += ' WHERE id = ?';
        updateFields.push(id);  // Add the ID at the end for the WHERE condition

        // Execute the update query
        const data = await db.query(updateQuery, updateFields);

        if (data.affectedRows === 0) {
            return res.status(404).send({
                success: false,
                message: 'Problem not found or no changes made.'
            });
        }

        return res.status(200).send({
            success: true,
            message: "Product updated successfully"
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error"
        });
    }
};
exports.getbookingbyid = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).send({
                success: false,
                message: "User ID is required",
            });
        }

        const query = `
       SELECT 
  pb.id AS booking_id,
  pb.amount AS price,
  pb.paymentdate AS payment_date,
  pb.bookingdate AS booking_date,
  p.pandit_id AS pandit_id,
  pd.name AS pandit_name,
  pd.mobile AS pandit_mobile,
  p.name AS puja_name,
  p.temple_name AS temple_name
FROM 
  problem_booking pb
LEFT JOIN 
  problems p ON pb.pujaid = p.id
LEFT JOIN 
  pandit pd ON p.pandit_id = pd.id
WHERE 
  pb.userid = ?
ORDER BY 
  pb.bookingdate DESC;

      `;

        const [bookings] = await db.query(query, [userId]);

        if (!bookings) {
            return res.status(404).send({
                success: false,
                message: "No bookings found",
            });
        }
        if(bookings.length===0){
            return res.status(200).send({
                success: true,
                data: bookings,
            })}

        return res.status(200).send({
            success: true,
            data: bookings,
        });
    } catch (error) {
        console.error("Error fetching bookings:", error);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error",
        });
    }
};
exports.getBookingDate = async (req, res) => {
    try {
        const { pooja_id, user_id } = req.params;
        console.log(pooja_id, user_id);

        const data = await db.query(
            `SELECT bookingdate 
         FROM problem_booking 
         WHERE pujaid = ? AND userid = ? 
         ORDER BY bookingdate DESC 
         LIMIT 1`,
            [pooja_id, user_id]
        );

        if (!data || data.length === 0) {
            return res.status(404).send({
                success: false,
                message: "Booking not found for the given pooja_id and user_id",
            });
        }

        return res.status(200).send({
            success: true,
            data: data[0],
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: "Internal Server Error",
        });
    }
};