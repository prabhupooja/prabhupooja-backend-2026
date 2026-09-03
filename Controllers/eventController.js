const db = require('../config/db');

const eventController = {
  // 1. Create a new event (Latest or Past)
  create: async (req, res) => {
    try {
      const {
        tag,
        title,
        description,
        short_description,
        date_info,
        start_date,
        end_date,
        event_time,
        location,
        venue,
        special_pooja,
        service_type,
        website,
        registration_link,
        video_url,
        highlights,
        event_type,
        is_past,
        status,
        is_featured,
        attendees_count
      } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({ success: false, message: 'Title is required' });
      }

      // Determine image URL/filename
      let image = null;
      if (req.file) {
        image = req.file.location || req.file.filename || (req.file.path ? req.file.path.replace(/\\/g, '/') : null);
      } else if (req.body.image) {
        image = req.body.image;
      }

      // Synchronize is_past (0 or 1) and event_type ('latest' or 'past')
      const isPastBool = (
        is_past === true ||
        is_past === 1 ||
        is_past === '1' ||
        is_past === 'true' ||
        String(event_type).toLowerCase() === 'past'
      );
      const computedIsPast = isPastBool ? 1 : 0;
      const computedEventType = isPastBool ? 'past' : (event_type || 'latest');
      const computedStatus = status || (isPastBool ? 'completed' : 'active');
      const computedFeatured = (is_featured === true || is_featured === 1 || is_featured === '1' || is_featured === 'true') ? 1 : 0;

      const query = `
        INSERT INTO latest_events 
        (tag, title, description, short_description, date_info, start_date, end_date, event_time, 
         location, venue, special_pooja, service_type, website, registration_link, video_url, 
         highlights, image, event_type, is_past, status, is_featured, attendees_count) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        tag || null,
        title.trim(),
        description || null,
        short_description || null,
        date_info || null,
        start_date || null,
        end_date || null,
        event_time || null,
        location || null,
        venue || null,
        special_pooja || null,
        service_type || null,
        website || null,
        registration_link || null,
        video_url || null,
        highlights || null,
        image || null,
        computedEventType,
        computedIsPast,
        computedStatus,
        computedFeatured,
        attendees_count ? parseInt(attendees_count, 10) : 0
      ];

      const [result] = await db.query(query, values);

      const [newEvent] = await db.query(`SELECT * FROM latest_events WHERE id = ?`, [result.insertId]);

      return res.status(201).json({
        success: true,
        message: `${computedEventType === 'past' ? 'Past' : 'Latest'} event created successfully`,
        data: newEvent[0] || { id: result.insertId }
      });
    } catch (err) {
      console.error('Error creating event:', err);
      return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
  },

  // 2. Get All events with flexible filtering (Latest, Past, All, Search, Status)
  getAll: async (req, res) => {
    try {
      const { type, is_past, status, search, tag, sort, page, limit } = req.query;

      let whereClauses = [];
      let queryParams = [];

      // Filter by type or is_past
      if (type) {
        const typeStr = String(type).toLowerCase();
        if (typeStr === 'past') {
          whereClauses.push('(is_past = 1 OR event_type = "past")');
        } else if (typeStr === 'latest') {
          whereClauses.push('(is_past = 0 OR event_type = "latest")');
        }
      } else if (is_past !== undefined) {
        const isPastBool = (is_past === 'true' || is_past === '1' || is_past === true || is_past === 1);
        whereClauses.push('is_past = ?');
        queryParams.push(isPastBool ? 1 : 0);
      }

      // Filter by status
      if (status && status !== 'all') {
        whereClauses.push('status = ?');
        queryParams.push(status);
      }

      // Filter by tag
      if (tag && tag !== 'all') {
        whereClauses.push('tag = ?');
        queryParams.push(tag);
      }

      // Text search filter
      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        whereClauses.push('(title LIKE ? OR tag LIKE ? OR description LIKE ? OR location LIKE ? OR short_description LIKE ?)');
        queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      let whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      // Sorting
      let orderBy = 'ORDER BY created_at DESC';
      if (sort === 'oldest') {
        orderBy = 'ORDER BY created_at ASC';
      } else if (sort === 'start_date_asc') {
        orderBy = 'ORDER BY start_date ASC, created_at DESC';
      } else if (sort === 'start_date_desc') {
        orderBy = 'ORDER BY start_date DESC, created_at DESC';
      }

      // Pagination
      let paginationSql = '';
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      if (!isNaN(pageNum) && !isNaN(limitNum) && pageNum > 0 && limitNum > 0) {
        const offset = (pageNum - 1) * limitNum;
        paginationSql = ` LIMIT ${limitNum} OFFSET ${offset}`;
      }

      // Fetch events
      const [events] = await db.query(`SELECT * FROM latest_events ${whereSql} ${orderBy}${paginationSql}`, queryParams);

      // Fetch summary counts for tabs/badges
      const [[counts]] = await db.query(`
        SELECT 
          COUNT(*) AS total,
          SUM(CASE WHEN is_past = 0 OR event_type = 'latest' THEN 1 ELSE 0 END) AS latest_count,
          SUM(CASE WHEN is_past = 1 OR event_type = 'past' THEN 1 ELSE 0 END) AS past_count
        FROM latest_events
      `);

      return res.status(200).json({
        success: true,
        total: counts ? Number(counts.total) : events.length,
        latest_count: counts ? Number(counts.latest_count || 0) : 0,
        past_count: counts ? Number(counts.past_count || 0) : 0,
        count: events.length,
        data: events,
        events: events // Backwards compatibility for frontends expecting 'events'
      });
    } catch (err) {
      console.error('Error getting events:', err);
      return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
  },

  // 3. Get only Latest events
  getLatest: async (req, res) => {
    req.query.type = 'latest';
    return eventController.getAll(req, res);
  },

  // 4. Get only Past events
  getPast: async (req, res) => {
    req.query.type = 'past';
    return eventController.getAll(req, res);
  },

  // 5. Get Event Statistics
  getStats: async (req, res) => {
    try {
      const [[stats]] = await db.query(`
        SELECT 
          COUNT(*) AS total_events,
          SUM(CASE WHEN is_past = 0 OR event_type = 'latest' THEN 1 ELSE 0 END) AS latest_events,
          SUM(CASE WHEN is_past = 1 OR event_type = 'past' THEN 1 ELSE 0 END) AS past_events,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_events,
          SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) AS inactive_events
        FROM latest_events
      `);

      return res.status(200).json({
        success: true,
        stats: {
          total: Number(stats?.total_events || 0),
          latest: Number(stats?.latest_events || 0),
          past: Number(stats?.past_events || 0),
          active: Number(stats?.active_events || 0),
          inactive: Number(stats?.inactive_events || 0)
        }
      });
    } catch (err) {
      console.error('Error getting event stats:', err);
      return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
  },

  // 6. Get Event By ID
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, message: 'Event ID is required' });
      }

      const [event] = await db.query(`SELECT * FROM latest_events WHERE id = ?`, [id]);

      if (event.length === 0) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      // Increment view count asynchronously
      db.query(`UPDATE latest_events SET view_count = view_count + 1 WHERE id = ?`, [id]).catch(() => {});

      return res.status(200).json({ success: true, data: event[0] });
    } catch (err) {
      console.error('Error getting event by ID:', err);
      return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
  },

  // 7. Update Event
  update: async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, message: 'Event ID is required' });
      }

      // Check if event exists
      const [existing] = await db.query(`SELECT * FROM latest_events WHERE id = ?`, [id]);
      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      const current = existing[0];
      const {
        tag,
        title,
        description,
        short_description,
        date_info,
        start_date,
        end_date,
        event_time,
        location,
        venue,
        special_pooja,
        service_type,
        website,
        registration_link,
        video_url,
        highlights,
        event_type,
        is_past,
        status,
        is_featured,
        attendees_count
      } = req.body;

      // Handle image
      let image = current.image;
      if (req.file) {
        image = req.file.location || req.file.filename || (req.file.path ? req.file.path.replace(/\\/g, '/') : null);
      } else if (req.body.image !== undefined) {
        image = req.body.image;
      }

      // Compute is_past and event_type
      let computedIsPast = current.is_past;
      let computedEventType = current.event_type;

      if (is_past !== undefined) {
        const isPastBool = (is_past === true || is_past === 1 || is_past === '1' || is_past === 'true');
        computedIsPast = isPastBool ? 1 : 0;
        computedEventType = isPastBool ? 'past' : 'latest';
      } else if (event_type !== undefined) {
        computedEventType = String(event_type).toLowerCase();
        computedIsPast = computedEventType === 'past' ? 1 : 0;
      }

      const updatedTitle = title !== undefined ? title : current.title;
      const updatedTag = tag !== undefined ? tag : current.tag;
      const updatedDescription = description !== undefined ? description : current.description;
      const updatedShortDesc = short_description !== undefined ? short_description : current.short_description;
      const updatedDateInfo = date_info !== undefined ? date_info : current.date_info;
      const updatedStartDate = start_date !== undefined ? start_date : current.start_date;
      const updatedEndDate = end_date !== undefined ? end_date : current.end_date;
      const updatedEventTime = event_time !== undefined ? event_time : current.event_time;
      const updatedLocation = location !== undefined ? location : current.location;
      const updatedVenue = venue !== undefined ? venue : current.venue;
      const updatedSpecialPooja = special_pooja !== undefined ? special_pooja : current.special_pooja;
      const updatedServiceType = service_type !== undefined ? service_type : current.service_type;
      const updatedWebsite = website !== undefined ? website : current.website;
      const updatedRegistrationLink = registration_link !== undefined ? registration_link : current.registration_link;
      const updatedVideoUrl = video_url !== undefined ? video_url : current.video_url;
      const updatedHighlights = highlights !== undefined ? highlights : current.highlights;
      const updatedStatus = status !== undefined ? status : current.status;
      const updatedFeatured = is_featured !== undefined ? ((is_featured === true || is_featured === 1 || is_featured === '1' || is_featured === 'true') ? 1 : 0) : current.is_featured;
      const updatedAttendees = attendees_count !== undefined ? parseInt(attendees_count, 10) : current.attendees_count;

      const query = `
        UPDATE latest_events 
        SET 
          tag = ?, 
          title = ?, 
          description = ?, 
          short_description = ?, 
          date_info = ?, 
          start_date = ?, 
          end_date = ?, 
          event_time = ?, 
          location = ?, 
          venue = ?, 
          special_pooja = ?, 
          service_type = ?, 
          website = ?, 
          registration_link = ?, 
          video_url = ?, 
          highlights = ?, 
          image = ?, 
          event_type = ?, 
          is_past = ?, 
          status = ?, 
          is_featured = ?, 
          attendees_count = ?
        WHERE id = ?
      `;

      const values = [
        updatedTag,
        updatedTitle,
        updatedDescription,
        updatedShortDesc,
        updatedDateInfo,
        updatedStartDate,
        updatedEndDate,
        updatedEventTime,
        updatedLocation,
        updatedVenue,
        updatedSpecialPooja,
        updatedServiceType,
        updatedWebsite,
        updatedRegistrationLink,
        updatedVideoUrl,
        updatedHighlights,
        image,
        computedEventType,
        computedIsPast,
        updatedStatus,
        updatedFeatured,
        updatedAttendees,
        id
      ];

      await db.query(query, values);

      const [updatedRecord] = await db.query(`SELECT * FROM latest_events WHERE id = ?`, [id]);

      return res.status(200).json({
        success: true,
        message: 'Event updated successfully',
        data: updatedRecord[0]
      });
    } catch (err) {
      console.error('Error updating event:', err);
      return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
  },

  // 8. Update Event Status or Type
  updateStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { is_past, event_type, status } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, message: 'Event ID is required' });
      }

      const [existing] = await db.query(`SELECT * FROM latest_events WHERE id = ?`, [id]);
      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      let updates = [];
      let params = [];

      if (is_past !== undefined) {
        const isPastBool = (is_past === true || is_past === 1 || is_past === '1' || is_past === 'true');
        updates.push('is_past = ?', 'event_type = ?');
        params.push(isPastBool ? 1 : 0, isPastBool ? 'past' : 'latest');
      } else if (event_type !== undefined) {
        const typeStr = String(event_type).toLowerCase();
        updates.push('event_type = ?', 'is_past = ?');
        params.push(typeStr, typeStr === 'past' ? 1 : 0);
      }

      if (status !== undefined) {
        updates.push('status = ?');
        params.push(status);
      }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, message: 'No status or type provided to update' });
      }

      params.push(id);
      await db.query(`UPDATE latest_events SET ${updates.join(', ')} WHERE id = ?`, params);

      const [updated] = await db.query(`SELECT * FROM latest_events WHERE id = ?`, [id]);

      return res.status(200).json({
        success: true,
        message: 'Event status updated successfully',
        data: updated[0]
      });
    } catch (err) {
      console.error('Error updating event status:', err);
      return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
  },

  // 9. Quick Toggle between Latest and Past
  togglePast: async (req, res) => {
    try {
      const { id } = req.params;
      const [existing] = await db.query(`SELECT is_past, event_type FROM latest_events WHERE id = ?`, [id]);

      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      const newIsPast = existing[0].is_past === 1 ? 0 : 1;
      const newEventType = newIsPast === 1 ? 'past' : 'latest';
      const newStatus = newIsPast === 1 ? 'completed' : 'active';

      await db.query(
        `UPDATE latest_events SET is_past = ?, event_type = ?, status = ? WHERE id = ?`,
        [newIsPast, newEventType, newStatus, id]
      );

      const [updated] = await db.query(`SELECT * FROM latest_events WHERE id = ?`, [id]);

      return res.status(200).json({
        success: true,
        message: newIsPast === 1 ? 'Event moved to Past Events' : 'Event moved to Latest Events',
        data: updated[0]
      });
    } catch (err) {
      console.error('Error toggling event state:', err);
      return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
  },

  // 10. Delete Event
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ success: false, message: 'Event ID is required' });
      }

      const [result] = await db.query(`DELETE FROM latest_events WHERE id = ?`, [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      return res.status(200).json({ success: true, message: 'Event deleted successfully' });
    } catch (err) {
      console.error('Error deleting event:', err);
      return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
  },

  // 11. Register / Book an Event (User / Devotee)
  registerEvent: async (req, res) => {
    try {
      const {
        fullName,
        mobile,
        email,
        service,
        poojaDate,
        poojaTime,
        poojaLocation,
        message,
        event_id,
        event_title,
        user_id,
        amount,
        paymentStatus,
        paymentId
      } = req.body;

      if (!fullName || !fullName.trim() || !mobile || !service) {
        return res.status(400).json({
          success: false,
          message: 'Full name, mobile number, and service/event name are required'
        });
      }

      // Mobile Validation (10 digits)
      const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
      if (cleanMobile.length !== 10) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid 10-digit mobile number'
        });
      }

      // Check duplicate booking
      const [existing] = await db.query(
        `SELECT id FROM event_bookings WHERE mobile = ? AND service = ? AND poojaDate = ?`,
        [cleanMobile, service.trim(), poojaDate || '']
      );

      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'You have already registered for this event/service on this date'
        });
      }

      // Determine event title if event_id is supplied
      let resolvedEventTitle = event_title || service;
      let resolvedEventId = event_id ? parseInt(event_id, 10) : null;

      if (resolvedEventId && !event_title) {
        const [evRow] = await db.query(`SELECT title FROM latest_events WHERE id = ?`, [resolvedEventId]);
        if (evRow.length > 0) {
          resolvedEventTitle = evRow[0].title;
        }
      }

      // Insert into event_bookings table
      const insertQuery = `
        INSERT INTO event_bookings 
        (event_id, event_title, user_id, fullName, mobile, email, service, poojaDate, poojaTime, 
         poojaLocation, message, status, paymentStatus, paymentId, amount) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
      `;

      const [result] = await db.query(insertQuery, [
        resolvedEventId,
        resolvedEventTitle,
        user_id ? parseInt(user_id, 10) : null,
        fullName.trim(),
        cleanMobile,
        email ? email.trim() : null,
        service.trim(),
        poojaDate || null,
        poojaTime || null,
        poojaLocation || null,
        message || null,
        paymentStatus || 'unpaid',
        paymentId || null,
        amount ? parseFloat(amount) : 0.00
      ]);

      const newBookingId = result.insertId;

      // Increment attendees_count on latest_events if applicable
      if (resolvedEventId) {
        try {
          await db.query(
            `UPDATE latest_events SET attendees_count = COALESCE(attendees_count, 0) + 1 WHERE id = ?`,
            [resolvedEventId]
          );
        } catch (cntErr) {
          console.warn('Failed to increment attendees_count:', cntErr.message);
        }
      }

      // Also mirror to rudraabhishek table for complete backward compatibility
      try {
        await db.query(
          `INSERT INTO rudraAbhishek (fullName, mobile, email, service, poojaDate, message, status) 
           VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
          [fullName.trim(), cleanMobile, email || null, service.trim(), poojaDate || null, message || null]
        );
      } catch (rErr) {
        // Ignored if already recorded or duplicate in secondary table
      }

      const [newBooking] = await db.query(`SELECT * FROM event_bookings WHERE id = ?`, [newBookingId]);

      return res.status(201).json({
        success: true,
        message: 'Event registration completed successfully! Our team will contact you shortly.',
        data: newBooking[0] || { id: newBookingId }
      });
    } catch (err) {
      console.error('Error in registerEvent:', err);
      return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
  },

  // 12. Get All Event Bookings (For Admin Panel)
  getAllBookings: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        status = '',
        eventId = ''
      } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
      const offset = (pageNum - 1) * limitNum;

      let whereClauses = [];
      let params = [];

      if (status && status !== 'all') {
        whereClauses.push('status = ?');
        params.push(status);
      }

      if (eventId) {
        whereClauses.push('event_id = ?');
        params.push(parseInt(eventId, 10));
      }

      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        whereClauses.push('(fullName LIKE ? OR mobile LIKE ? OR email LIKE ? OR service LIKE ? OR event_title LIKE ?)');
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      // Count query
      const [countResult] = await db.query(
        `SELECT COUNT(*) AS total FROM event_bookings ${whereSql}`,
        params
      );
      const total = countResult[0]?.total || 0;

      // Stats query
      const [statsResult] = await db.query(`
        SELECT 
          COUNT(*) as totalBookings,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingCount,
          SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmedCount,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedCount,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelledCount
        FROM event_bookings
      `);

      // Data query with safe LIMIT & OFFSET parameter placeholders
      const dataQuery = `
        SELECT * FROM event_bookings 
        ${whereSql} 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `;
      const [bookings] = await db.query(dataQuery, [...params, limitNum, offset]);

      return res.status(200).json({
        success: true,
        data: bookings,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1
        },
        stats: statsResult[0] || {}
      });
    } catch (err) {
      console.error('Error in getAllBookings:', err);
      return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
  },

  // 13. Get Bookings for a Specific Event
  getEventBookingsByEventId: async (req, res) => {
    try {
      const { eventId } = req.params;
      if (!eventId) {
        return res.status(400).json({ success: false, message: 'Event ID is required' });
      }

      const [bookings] = await db.query(
        `SELECT * FROM event_bookings WHERE event_id = ? ORDER BY created_at DESC`,
        [eventId]
      );

      return res.status(200).json({
        success: true,
        count: bookings.length,
        data: bookings
      });
    } catch (err) {
      console.error('Error fetching event bookings by ID:', err);
      return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
  },

  // 14. Get Single Event Booking by ID
  getBookingById: async (req, res) => {
    try {
      const { id } = req.params;
      const [booking] = await db.query(`SELECT * FROM event_bookings WHERE id = ?`, [id]);

      if (booking.length === 0) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      return res.status(200).json({
        success: true,
        data: booking[0]
      });
    } catch (err) {
      console.error('Error in getBookingById:', err);
      return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
  },

  // 15. Update Event Booking Status / Assignment (Admin)
  updateBookingStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        status,
        adminRemark,
        adminAssigned,
        panditName,
        poojaTime,
        poojaLocation,
        paymentStatus
      } = req.body;

      const [existing] = await db.query(`SELECT * FROM event_bookings WHERE id = ?`, [id]);
      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      let updates = [];
      let params = [];

      if (status !== undefined) {
        updates.push('status = ?');
        params.push(status);
      }
      if (adminRemark !== undefined) {
        updates.push('adminRemark = ?');
        params.push(adminRemark);
      }
      if (adminAssigned !== undefined) {
        updates.push('adminAssigned = ?');
        params.push(adminAssigned);
      }
      if (panditName !== undefined) {
        updates.push('panditName = ?');
        params.push(panditName);
      }
      if (poojaTime !== undefined) {
        updates.push('poojaTime = ?');
        params.push(poojaTime);
      }
      if (poojaLocation !== undefined) {
        updates.push('poojaLocation = ?');
        params.push(poojaLocation);
      }
      if (paymentStatus !== undefined) {
        updates.push('paymentStatus = ?');
        params.push(paymentStatus);
      }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, message: 'No fields provided to update' });
      }

      params.push(id);
      await db.query(`UPDATE event_bookings SET ${updates.join(', ')} WHERE id = ?`, params);

      const [updated] = await db.query(`SELECT * FROM event_bookings WHERE id = ?`, [id]);

      return res.status(200).json({
        success: true,
        message: 'Booking status updated successfully',
        data: updated[0]
      });
    } catch (err) {
      console.error('Error updating booking status:', err);
      return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
  },

  // 16. Delete Event Booking
  deleteBooking: async (req, res) => {
    try {
      const { id } = req.params;
      const [result] = await db.query(`DELETE FROM event_bookings WHERE id = ?`, [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      return res.status(200).json({ success: true, message: 'Booking deleted successfully' });
    } catch (err) {
      console.error('Error deleting booking:', err);
      return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
  }
};

module.exports = eventController;
