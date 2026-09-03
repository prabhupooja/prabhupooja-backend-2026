const db = require("../config/db");
const dotenv = require('dotenv');
const twilio = require('twilio');
const { getCache, setCache, deleteCache } = require("../config/redis");

dotenv.config();

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
const client = (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) ? new twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) : null;

// Helper: Convert array or string of pandit IDs to comma-separated string
const normalizePanditIds = (pandit_id, pandit_ids) => {
  const ids = pandit_ids !== undefined ? pandit_ids : pandit_id;
  if (!ids && ids !== 0) return null;
  if (Array.isArray(ids)) {
    return ids.map(id => String(id).trim()).filter(Boolean).join(',');
  }
  return String(ids).trim();
};

// Helper: Extract array of numeric IDs from stored string/number
const parsePanditIds = (pandit_id_str) => {
  if (!pandit_id_str && pandit_id_str !== 0) return [];
  if (typeof pandit_id_str === 'number') return [pandit_id_str];
  return String(pandit_id_str)
    .split(',')
    .map(id => Number(id.trim()))
    .filter(id => !isNaN(id) && id > 0);
};

// Helper: Fetch Pandit objects for a given array of IDs
const fetchPanditsByIds = async (panditIds) => {
  if (!panditIds || panditIds.length === 0) return [];
  try {
    const placeholders = panditIds.map(() => '?').join(',');
    const [rows] = await db.query(
      `SELECT id, name, lastname, experience, skills, profileImage, email, mobile, gotra, qualification, city, state, language, temple, price, verified 
       FROM pandit 
       WHERE id IN (${placeholders})`,
      panditIds
    );
    return rows || [];
  } catch (error) {
    console.error("Error fetching pandits list:", error);
    return [];
  }
};

function generateSlug(name) {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

exports.create = async (req, res) => {
  let { 
    name, price, discount, final_price, pandit_id, pandit_ids, 
    about_samagri, benefits, how_it_happens, about_pooja, 
    after_pooja, pooja_date, pooja_time, countdown_datetime 
  } = req.body;
  
  const image = req.file ? req.file.location : null;

  if (!image) {
    return res.status(400).send({
      success: false,
      message: "Image file is required"
    });
  }

  const numPrice = Number(price) || 0;
  let numDiscount = Number(discount) || 0;
  let numFinalPrice = Number(final_price) || 0;

  if (numPrice > 0) {
    if (numDiscount > 0 && (!numFinalPrice || numFinalPrice <= 0 || numFinalPrice >= numPrice)) {
      numFinalPrice = Math.round(numPrice - (numPrice * numDiscount / 100));
    } else if (numFinalPrice > 0 && numFinalPrice < numPrice && !numDiscount) {
      numDiscount = Math.round(((numPrice - numFinalPrice) / numPrice) * 100);
    } else if (!numFinalPrice) {
      numFinalPrice = numPrice;
    }
  }

  const normalizedPanditIds = normalizePanditIds(pandit_id, pandit_ids);

  try {
    const [data] = await db.query(
      `INSERT INTO puja (
        name, price, image, pandit_id, discount, final_price, 
        about_samagri, benefits, how_it_happens, about_pooja, 
        after_pooja, pooja_date, pooja_time, countdown_datetime
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, numPrice, image, normalizedPanditIds, numDiscount, numFinalPrice, 
        about_samagri, benefits, how_it_happens, about_pooja, 
        after_pooja, pooja_date, pooja_time, countdown_datetime
      ]
    );

    if (!data || data.affectedRows === 0) {
      return res.status(404).send({
        success: false,
        message: "Error in insert query"
      });
    }

    // Invalidate puja cache
    await deleteCache("puja:*");

    return res.status(201).send({
      success: true,
      message: "Puja created successfully",
      id: data.insertId
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.get = async (req, res) => {
  const cacheKey = "puja:all";
  try {
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      res.setHeader("X-Cache", "HIT");
      return res.status(200).send({
        success: true,
        data: cachedData,
      });
    }

    const [rows] = await db.query(`SELECT * FROM puja ORDER BY id DESC`);

    if (!rows || rows.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No puja found",
      });
    }


      const routeMap = {
        "Rahu Ketu Pooja": "RahuKetuPooja",
        "Pitra Dosh Pooja": "PitraDoshPooja",
        "Kaal Sarp Pooja": "KaalSarpPooja",
        "Navgrah Pooja": "NavgrahPooja",
        "Mangal Dosh Pooja": "MangalDoshPooja",
        "Satyanarayan Katha": "SatyanarayanPooja",
        "Maha Mrityunjaya Jaap": "ShriMahaMritunejayPooja",
        "Sundarkand Pooja": "SundarKandPooja",
        "Vastu Shanti Pooja": "VastuShantiPooja",
        "Rudra Abhishek Pooja": "RudraAbhishek",
        "Rin Mukti Pooja": "RinMuktiPooja",
        "Sidhi Vinayak Pooja": "SiddhiVinayakPooja"
      };

      const pujas = rows.map(puja => {
        const route = routeMap[puja.name] || generateSlug(puja.name);
        const slug = generateSlug(puja.name);

        const pPrice = Number(puja.price) || 0;
        let pDiscount = Number(puja.discount) || 0;
        let pFinalPrice = Number(puja.final_price) || 0;

        if (pPrice > 0) {
          if (pDiscount > 0 && (pFinalPrice <= 0 || pFinalPrice >= pPrice)) {
            pFinalPrice = Math.round(pPrice - (pPrice * pDiscount / 100));
          } else if (pFinalPrice > 0 && pFinalPrice < pPrice && pDiscount <= 0) {
            pDiscount = Math.round(((pPrice - pFinalPrice) / pPrice) * 100);
          } else if (!pFinalPrice || pFinalPrice > pPrice) {
            pFinalPrice = pDiscount > 0 ? Math.round(pPrice - (pPrice * pDiscount / 100)) : pPrice;
          }
        }

        return {
          ...puja,
          slug,
          price: pPrice,
          discount: pDiscount,
          final_price: pFinalPrice,
          pandit_ids: parsePanditIds(puja.pandit_id),
          route,
        };
      });

      await setCache(cacheKey, pujas, 900); // 15 mins
      res.setHeader("X-Cache", "MISS");

      return res.status(200).send({
        success: true,
        data: pujas,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).send({
        success: false,
        message: "Internal Server Error",
      });
    }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `puja:item:${id}`;

    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      res.setHeader("X-Cache", "HIT");
      return res.status(200).send({
        success: true,
        data: cachedData,
      });
    }

    let rows = [];

    if (!isNaN(id) && Number.isInteger(Number(id))) {
      const [resRows] = await db.query(`SELECT * FROM puja WHERE id = ?`, [Number(id)]);
      rows = resRows;
    } else {
      const normalizedParam = id.toLowerCase().trim();
      const cleanParam = normalizedParam.replace(/[-_]/g, ' ');
      const noSpaceParam = normalizedParam.replace(/[-_\s]/g, '');

      const [resRows] = await db.query(
        `SELECT * FROM puja 
         WHERE id = ? 
            OR LOWER(name) = ? 
            OR LOWER(REPLACE(name, ' ', '-')) = ? 
            OR LOWER(REPLACE(name, ' ', '')) = ?`,
        [id, cleanParam, normalizedParam, noSpaceParam]
      );
      rows = resRows;
    }

    if (!rows || rows.length === 0) {
      return res.status(404).send({
        success: false,
        message: "puja not found",
      });
    }

    const puja = rows[0];
    const slug = generateSlug(puja.name);
    const pPrice = Number(puja.price) || 0;
    let pDiscount = Number(puja.discount) || 0;
    let pFinalPrice = Number(puja.final_price) || 0;

    if (pPrice > 0) {
      if (pDiscount > 0 && (pFinalPrice <= 0 || pFinalPrice >= pPrice)) {
        pFinalPrice = Math.round(pPrice - (pPrice * pDiscount / 100));
      } else if (pFinalPrice > 0 && pFinalPrice < pPrice && pDiscount <= 0) {
        pDiscount = Math.round(((pPrice - pFinalPrice) / pPrice) * 100);
      } else if (!pFinalPrice || pFinalPrice > pPrice) {
        pFinalPrice = pDiscount > 0 ? Math.round(pPrice - (pPrice * pDiscount / 100)) : pPrice;
      }
    }

    // Fetch assigned Pandits (Multiple support)
    const panditIds = parsePanditIds(puja.pandit_id);
    const pandits = await fetchPanditsByIds(panditIds);
    const pandit = pandits.length > 0 ? pandits[0] : null;

    // Multi-tier Packages
    const basePrice = pFinalPrice > 0 ? pFinalPrice : pPrice;
    const packages = [
      {
        id: "individual",
        name: "Individual / Single Sankalp",
        description: "Vedic Sankalp for 1 devotee with full name and Gotra",
        price: basePrice,
        members_allowed: 1,
        pandit_count: 1,
        prasad_included: false,
        prasad_price: 251
      },
      {
        id: "couple",
        name: "Couple / Dampatti Sankalp",
        description: "Special Sankalp for Husband & Wife for harmony, health & prosperity",
        price: Math.round(basePrice * 1.5),
        members_allowed: 2,
        pandit_count: 1,
        prasad_included: false,
        prasad_price: 251
      },
      {
        id: "family",
        name: "Family / Parivar Sankalp",
        description: "Complete family Sankalp (up to 5-6 members) with Gotra & blessings",
        price: Math.round(basePrice * 2.2),
        members_allowed: 6,
        pandit_count: 2,
        prasad_included: true,
        prasad_price: 0
      },
      {
        id: "maha_puja",
        name: "Maha Hawan & Special Vedic Anushthan",
        description: "Comprehensive Hawan with special samagri, personalized chantings & dedicated team of Pandits",
        price: Math.round(basePrice * 3.5),
        members_allowed: 8,
        pandit_count: 3,
        prasad_included: true,
        prasad_price: 0
      }
    ];

    const responsePayload = {
      ...puja,
      slug,
      price: pPrice,
      discount: pDiscount,
      final_price: pFinalPrice,
      pandit_ids: panditIds,
      pandits,
      pandit,
      packages,
    };

    await setCache(cacheKey, responsePayload, 900);
    res.setHeader("X-Cache", "MISS");

    return res.status(200).send({
      success: true,
      data: responsePayload,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.updatePuja = async (req, res) => {
  const { id } = req.params;
  let { 
    name, price, discount, final_price, pandit_id, pandit_ids, 
    about_samagri, benefits, how_it_happens, about_pooja, 
    after_pooja, pooja_date, pooja_time, countdown_datetime 
  } = req.body;
  const image = req.file ? req.file.location : null;

  if (!id) {
    return res.status(400).send({
      success: false,
      message: "Puja ID is required",
    });
  }

  try {
    if (price !== undefined || discount !== undefined || final_price !== undefined) {
      const [existing] = await db.query(`SELECT price, discount, final_price FROM puja WHERE id = ?`, [id]);
      if (existing && existing.length > 0) {
        const curPrice = price !== undefined ? Number(price) : Number(existing[0].price);
        let curDiscount = discount !== undefined ? Number(discount) : Number(existing[0].discount || 0);
        let curFinalPrice = final_price !== undefined ? Number(final_price) : Number(existing[0].final_price || 0);

        if (curPrice > 0) {
          if (discount !== undefined && (final_price === undefined || curFinalPrice >= curPrice)) {
            curFinalPrice = Math.round(curPrice - (curPrice * curDiscount / 100));
            final_price = curFinalPrice;
          } else if (final_price !== undefined && discount === undefined && curFinalPrice < curPrice) {
            curDiscount = Math.round(((curPrice - curFinalPrice) / curPrice) * 100);
            discount = curDiscount;
          } else if (!curFinalPrice || curFinalPrice > curPrice) {
            curFinalPrice = curDiscount > 0 ? Math.round(curPrice - (curPrice * curDiscount / 100)) : curPrice;
            final_price = curFinalPrice;
          }
        }
      }
    }

    let fields = [];
    let values = [];

    if (name) {
      fields.push("name = ?");
      values.push(name);
    }
    if (price !== undefined) {
      fields.push("price = ?");
      values.push(Number(price));
    }
    if (discount !== undefined) {
      fields.push("discount = ?");
      values.push(Number(discount));
    }
    if (final_price !== undefined) {
      fields.push("final_price = ?");
      values.push(Number(final_price));
    }

    const normalizedPanditIds = normalizePanditIds(pandit_id, pandit_ids);
    if (normalizedPanditIds !== null) {
      fields.push("pandit_id = ?");
      values.push(normalizedPanditIds);
    }

    if (image) {
      fields.push("image = ?");
      values.push(image);
    }
    if (about_samagri !== undefined) {
      fields.push("about_samagri = ?");
      values.push(about_samagri);
    }
    if (benefits !== undefined) {
      fields.push("benefits = ?");
      values.push(benefits);
    }
    if (how_it_happens !== undefined) {
      fields.push("how_it_happens = ?");
      values.push(how_it_happens);
    }
    if (about_pooja !== undefined) {
      fields.push("about_pooja = ?");
      values.push(about_pooja);
    }
    if (after_pooja !== undefined) {
      fields.push("after_pooja = ?");
      values.push(after_pooja);
    }
    if (pooja_date !== undefined) {
      fields.push("pooja_date = ?");
      values.push(pooja_date);
    }
    if (pooja_time !== undefined) {
      fields.push("pooja_time = ?");
      values.push(pooja_time);
    }
    if (countdown_datetime !== undefined) {
      fields.push("countdown_datetime = ?");
      values.push(countdown_datetime);
    }

    if (fields.length === 0) {
      return res.status(400).send({
        success: false,
        message: "No fields provided for update",
      });
    }

    values.push(id);
    const query = `UPDATE puja SET ${fields.join(", ")} WHERE id = ?`;

    const [result] = await db.query(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).send({
        success: false,
        message: "Puja not found or no update made",
      });
    }

    // Invalidate puja cache
    await deleteCache("puja:*");

    return res.status(200).send({
      success: true,
      message: "Puja updated successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;

  try {
    const [data] = await db.query(`DELETE FROM puja WHERE id = ?`, [id]);

    if (!data || data.affectedRows === 0) {
      return res.status(404).send({
        success: false,
        message: "Puja not found"
      });
    }

    // Invalidate puja cache
    await deleteCache("puja:*");

    return res.status(200).send({
      success: true,
      message: "Puja deleted successfully"
    });

  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};


exports.searchPooja = async (req, res) => {
  const searchTerm = req.query.q;

  try {
    const query = `SELECT * FROM puja WHERE name LIKE ?`;
    const [rows] = await db.query(query, [`%${searchTerm}%`]);

    if (!rows || rows.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No puja found",
      });
    }

    const routeMap = {
      "Rahu Ketu Pooja": "RahuKetuPooja",
      "Pitra Dosh Pooja": "PitraDoshPooja",
      "Kaal Sarp Dosh Pooja": "KaalSarpDoshPooja",
      "Navgrah Pooja": "NavgrahPooja",
      "Mangal Dosh Nivaran Pooja": "MangalDoshPooja",
      "Satyanarayan": "SatyanarayanPooja",
      "Shri Maha Mritunejay Jaap": "ShriMahaMritunejayPooja",
      "Sundarkand Path Pooja": "SundarKandPooja",
      "Vastu Shanti Pooja": "VastuShantiPooja",
      "Rudra Abhishek": "RudraAbhishek",
      "Rin Mukti Pooja": "RinMuktiPooja",
      "Siddhi Vinayak Pooja": "SiddhiVinayakPooja"
    };

    const pujas = rows.map(puja => {
      const route = routeMap[puja.name] || generateSlug(puja.name);
      return { 
        ...puja, 
        pandit_ids: parsePanditIds(puja.pandit_id),
        route 
      };
    });

    return res.status(200).send({
      success: true,
      data: pujas,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const sendWhatsAppMessage = async (to, body) => {
  if (!client) return;
  try {
    await client.messages.create({
      body: body,
      from: "whatsapp:+14155238886",
      to: `whatsapp:${to}`,
    });
    console.log('WhatsApp message sent successfully');
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
  }
};

exports.poojaDetailsforpandit = async (req, res) => {
  const { user_id, puja_id } = req.body;

  try {
    const [userRows] = await db.query('SELECT * FROM users WHERE id = ?', [user_id]);
    const [pujaRows] = await db.query('SELECT * FROM puja WHERE id = ?', [puja_id]);

    if (userRows.length === 0 || pujaRows.length === 0) {
      return res.status(400).send({ success: false, message: 'User or Pooja not found.' });
    }

    const user = userRows[0];
    const puja = pujaRows[0];

    const messageBody = `New Pooja Booking:\n\nUser: ${user.name}\nEmail: ${user.email}\nPooja: ${puja.name}\nDate: ${puja.pooja_date || puja.date}\nTime: ${puja.pooja_time || puja.time}\n\nPlease prepare accordingly.`;

    const panditNumber = '+91 9770547691';
    await sendWhatsAppMessage(panditNumber, messageBody);

    return res.status(200).send({ success: true, message: 'Booking successful and notification sent.' });
  } catch (error) {
    console.error('Error handling booking:', error);
    return res.status(500).send({ success: false, message: 'Booking failed.' });
  }
};

exports.getPanditsByPoojaId = async (req, res) => {
  const { poojaId } = req.params;

  try {
    let pujaRows = [];

    if (!isNaN(poojaId) && Number.isInteger(Number(poojaId))) {
      const [rows] = await db.query(`SELECT pandit_id FROM puja WHERE id = ?`, [Number(poojaId)]);
      pujaRows = rows;
    } else {
      const normalizedParam = poojaId.toLowerCase().trim();
      const cleanParam = normalizedParam.replace(/[-_]/g, ' ');
      const noSpaceParam = normalizedParam.replace(/[-_\s]/g, '');

      const [rows] = await db.query(
        `SELECT pandit_id FROM puja 
         WHERE id = ? 
            OR LOWER(name) = ? 
            OR LOWER(REPLACE(name, ' ', '-')) = ? 
            OR LOWER(REPLACE(name, ' ', '')) = ?`,
        [poojaId, cleanParam, normalizedParam, noSpaceParam]
      );
      pujaRows = rows;
    }

    if (!pujaRows || pujaRows.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Pooja not found",
      });
    }

    const panditIds = parsePanditIds(pujaRows[0].pandit_id);
    if (panditIds.length === 0) {
      return res.status(200).send({
        success: true,
        data: [],
        message: "No Pandits assigned to this Pooja",
      });
    }

    const pandits = await fetchPanditsByIds(panditIds);

    return res.status(200).send({
      success: true,
      data: pandits,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error",
    });
  }
};
