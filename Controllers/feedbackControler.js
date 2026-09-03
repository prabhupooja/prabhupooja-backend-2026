const db = require('../config/db');
const nodemailer = require('nodemailer');


exports.create = async (req, res) => {
    const { name, email, userId, pujaId, rating, comment ,problem_name} = req.body;

    if (!userId || !pujaId || !rating || !comment || !name || !email) {
        return res.status(400).send({
            success: false,
            message: 'All fields are required'
        });
    }

    try {
       
        const data = await db.query(
            `INSERT INTO feedback (name, email, userId, pujaId, rating, comment,problem_name) VALUES (?, ?, ?, ?, ?, ?,?)`,
            [name, email, userId, pujaId, rating, comment,problem_name]
        );
        const pujaQuery = await db.query(
            `SELECT name FROM puja WHERE id = ?`,
            [pujaId]
        );

        if (!pujaQuery || pujaQuery.length === 0) {
            return res.status(404).send({
                success: false,
                message: 'Puja not found'
            });
        }

        const pujaName = pujaQuery[0].name;
        if (!data) {
            return res.status(500).send({
                success: false,
                message: 'Error in insert query'
            });
        }
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.email,                   
                pass: process.env.pass  
            }
        });

        const mailOptions = {
            from: email,
            to: 'prabhupooja2024@gmail.com', 
            subject: 'New feedback Submitted',
            html: `
                <h1>New Feedback</h1>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>User ID:</strong> ${userId}</p>
                <p><strong>Puja ID:</strong> ${pujaName}</p>
                <p><strong>Rating:</strong> ${rating}</p>
                <p><strong>Comment:</strong> ${comment}</p>
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });

       
        return res.status(201).send({
            success: true,
            message: 'Enquiry created and email sent successfully'
        });
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            success: false,
            message: 'Internal server error'
        });
    }
};

exports.getAllFeedback = async (req, res) => {
    try {
        
        const query = `
            SELECT 
                f.id, 
                f.name, 
                f.email, 
                f.userId, 
                f.pujaId, 
                f.rating, 
                f.comment, 
                p.name AS pujaName
            FROM feedback f
            JOIN puja p ON f.pujaId = p.id;
        `;

        const feedbackData = await db.query(query);

        if (!feedbackData || feedbackData.length === 0) {
            return res.status(404).send({
                success: false,
                message: 'No feedback found'
            });
        }

       
        return res.status(200).send({
            success: true,
            data: feedbackData
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: 'Internal server error'
        });
    }
};

exports.getPujaRatings = async (req, res) => {
    const { pujaId, problem_name } = req.params;

if (!pujaId) {
    return res.status(400).send({
        success: false,
        message: "pujaId is required",
    });
}

try {
    // Base query for ratings
    let averageQuery = `
        SELECT 
            COALESCE(AVG(rating), 0) AS averageRating,
            COUNT(rating) AS totalRatings
        FROM feedback
        WHERE pujaId = ?
    `;

    // Base query for feedback details
    let feedbackQuery = `
        SELECT 
            name,
            comment,
            rating
        FROM feedback
        WHERE pujaId = ?
    `;

    let queryParams = [pujaId];

    // Apply problem_name filter if provided
    if (problem_name) {
        averageQuery += ` AND problem_name = ?`;
        feedbackQuery += ` AND problem_name = ?`;
        queryParams.push(problem_name);
    } else {
        averageQuery += ` AND (problem_name = 'normal' OR problem_name IS NULL)`;
        feedbackQuery += ` AND (problem_name = 'normal' OR problem_name IS NULL)`;
    }

    // Execute queries
    const [averageResult] = await db.query(averageQuery, queryParams);
    const [feedbackResult] = await db.query(feedbackQuery, queryParams);

    // Extract values safely
    const averageRating = parseFloat(averageResult[0]?.averageRating || 0).toFixed(2);
    const totalRatings = averageResult[0]?.totalRatings || 0;

    // Construct response
    return res.status(200).send({
        success: true,
        data: {
            pujaId,
            problem_name: problem_name || "normal",
            averageRating,
            totalRatings,
            feedbacks: feedbackResult.map((item) => ({
                name: item.name,
                comment: item.comment,
                rating: parseFloat(item.rating).toFixed(2),
            })),
        },
    });
} catch (error) {
    console.error("Error fetching ratings:", error);
    return res.status(500).send({
        success: false,
        message: "Internal server error",
    });
}
};




exports.getProblemRatings = async (req, res) => {
    const { pujaId, problem_name } = req.params;

    // Validate the input
    if (!pujaId || !problem_name) {
        return res.status(400).send({
            success: false,
            message: "Both pujaId and problem_name are required",
        });
    }

    try {
        // Query to get average rating and total ratings count
        const averageQuery = `
            SELECT 
                AVG(rating) AS averageRating,
                COUNT(rating) AS totalRatings
            FROM feedback
            WHERE pujaId = ?
        `;

        // Query to get individual feedbacks
        const feedbackQuery = `
            SELECT 
                name,
                comment,
                rating
            FROM feedback
            WHERE pujaId = ?
        `;

        // Execute queries
        const [averageResult] = await db.query(averageQuery, [pujaId]);
        const [feedbackResult] = await db.query(feedbackQuery, [pujaId]);

        // Handle case where no feedback is found
        if (!averageResult || averageResult.length === 0 || feedbackResult.length === 0) {
            return res.status(404).send({
                success: false,
                message: "No feedback found for the given pujaId",
            });
        }

        // Construct response
        const response = {
            success: true,
            data: {
                pujaId,
                problem_name,
                averageRating: parseFloat(averageResult[0]?.averageRating || 0).toFixed(2),
                totalRatings: averageResult[0]?.totalRatings || 0,
                feedbacks: feedbackResult.map((item) => ({
                    name: item.name,
                    comment: item.comment,
                    rating: parseFloat(item.rating).toFixed(2),
                })),
            },
        };

        // Send response
        return res.status(200).send(response);
    } catch (error) {
        console.error("Error fetching problem ratings:", error);
        return res.status(500).send({
            success: false,
            message: "Internal server error",
        });
    }
};
