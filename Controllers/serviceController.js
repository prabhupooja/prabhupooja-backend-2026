const { response } = require("express");
const db = require("../config/db");

exports.create = async (req, res) => {
  const { name } = req.body;
  const image = req.file.location; 

  if (!image) {
    return res.status(400).send({
      success: false,
      message: "Image file is required",
    });
  }

  try {
    const data = await db.query(
      `INSERT INTO services (name, image) VALUES (?, ?)`,
      [name, image]
    );

    if (!data) {
      return res.status(404).send({
        success: false,
        message: "Error in insert query",
      });
    }

    res.status(201).send({
      success: true,
      message: "File uploaded successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.get = async (req, res) => {
  try {
    const data = await db.query(`SELECT * FROM services`);

    if (!data || data.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No services found",
      });
    }

    const routeMap = {
      "Online Pooja": "PoojaScreen",
      Astrology: "Astrology",
      Pandit: "Pandit",
      Yoga: "Yoga",
      Membership: "Membership",
      "Prasad Delivery": "Prasaddelivery",
      "E-Commerce": "Ecommerce",
      Muhurat: "MuhuratScreen",
      Temple: "Temple",
    };

    const services = data[0].map((service) => {
      const route = routeMap[service.name];

      if (!route) {
        console.error(`Route not defined for service: ${service.name}`);
      }
      return { ...service, route };
    });

    // console.log(services);
    res.status(200).send({
      success: true,
      data: services,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await db.query(`SELECT * FROM services WHERE id = ?`, [id]);

    if (!data || data.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Service not found",
      });
    }

    res.status(200).send({
      success: true,
      data: data[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  // multer-s3 provides `location`
  const image = req.file ? req.file.location : null;

  try {
    // Fetch existing service
    const [rows] = await db.query(
      "SELECT * FROM services WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    const existingService = rows[0];

    // Build update fields
    const updateFields = [];
    const updateValues = [];

    if (name) {
      updateFields.push("name = ?");
      updateValues.push(name);
    }

    if (image) {
      updateFields.push("image = ?");
      updateValues.push(image);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    updateValues.push(id);

    const updateQuery = `
      UPDATE services 
      SET ${updateFields.join(", ")} 
      WHERE id = ?
    `;

    const [result] = await db.query(updateQuery, updateValues);

    if (result.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message: "Update failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Service updated successfully",
    });
  } catch (error) {
    console.error("Update Service Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};



exports.delete = async (req, res) => {
  const { id } = req.params;

  try {
    const existingService = await db.query(
      `SELECT * FROM services WHERE id = ?`,
      [id]
    );

    if (!existingService || existingService.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Service not found",
      });
    }

    const data = await db.query(`DELETE FROM services WHERE id = ?`, [id]);

    if (!data) {
      return res.status(404).send({
        success: false,
        message: "Error in delete query",
      });
    }

    res.status(200).send({
      success: true,
      message: "Service deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.searchServices = async (req, res) => {
  const searchTerm = req.query.q; 

  try {
    const query = `SELECT * FROM services WHERE name LIKE '%${searchTerm}%'`;
    const data = await db.query(query);

    if (!data || data.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No services found",
      });
    }

    const routeMap = {
      "Online Pooja": "PoojaScreen",
      Astrology: "Astrology",
      Pandit: "Pandit",
      Yoga: "Yoga",
      Membership: "Membership",
      "Prasad Delivery": "Prasaddelivery",
      "E-Commerce": "Ecommerce",
      Muhurat: "Muhurat",
      Temple: "Temple",
   
    };

    const services = data[0].map((service) => {
      const route = routeMap[service.name];

      if (!route) {
        console.error(`Route not defined for service: ${service.name}`);
      }
      return { ...service, route };
    });

  return  res.status(200).send({
      success: true,
      data: services,
    });
  } catch (error) {
    console.error(error);
   return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};
