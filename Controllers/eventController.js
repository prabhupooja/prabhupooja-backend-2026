const db = require('../config/db');

/**
 * Helper: Safely normalize incoming event body (handles single event, snake_case & camelCase, arrays & files)
 */
function normalizeEventInput(body = {}, files = [], defaultIsPast = false) {
  // Title / Name
  const title = (
    body.title ||
    body.name ||
    body.event_name ||
    body.eventName ||
    body.eventTitle ||
    ""
  ).trim();

  // Description & Short Description
  const description = body.description || body.desc || body.details || null;
  const short_description = body.short_description || body.shortDescription || body.summary || body.subtitle || null;

  // Tag & Category
  let tag = body.tag || body.category || null;
  if (Array.isArray(body.tag)) tag = body.tag.join(', ');
  else if (Array.isArray(body.tags)) tag = body.tags.join(', ');
  else if (body.tags && typeof body.tags === 'string') tag = body.tags;

  // Dates & Times
  const date_info = body.date_info || body.dateInfo || body.date_string || body.event_date || body.date || null;
  const start_date = body.start_date || body.startDate || body.from_date || body.fromDate || body.date || null;
  const end_date = body.end_date || body.endDate || body.to_date || body.toDate || null;
  const event_time = body.event_time || body.eventTime || body.time || body.poojaTime || null;

  // Location & Venue
  const location = body.location || body.place || body.city || body.address || null;
  const venue = body.venue || body.mandir || body.temple_name || body.temple || null;

  // Pooja & Service
  const special_pooja = body.special_pooja || body.specialPooja || body.pooja_name || body.puja || null;
  const service_type = body.service_type || body.serviceType || body.service || null;

  // Links & URLs
  const website = body.website || body.url || body.web_link || null;
  const registration_link = body.registration_link || body.registrationLink || body.booking_link || body.registerLink || null;
  const video_url = body.video_url || body.videoUrl || body.youtube_url || body.live_url || body.stream_url || null;

  // Highlights (Handles Array, JSON string, or comma string)
  let highlights = null;
  const rawHighlights = body.highlights || body.eventHighlights || body.key_points || body.points;
  if (rawHighlights) {
    if (Array.isArray(rawHighlights)) {
      highlights = JSON.stringify(rawHighlights);
    } else if (typeof rawHighlights === 'object') {
      highlights = JSON.stringify(rawHighlights);
    } else if (typeof rawHighlights === 'string') {
      const trimmed = rawHighlights.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        highlights = trimmed;
      } else if (trimmed.includes(',')) {
        highlights = JSON.stringify(trimmed.split(',').map(s => s.trim()).filter(Boolean));
      } else if (trimmed.includes('\n')) {
        highlights = JSON.stringify(trimmed.split('\n').map(s => s.trim()).filter(Boolean));
      } else {
        highlights = JSON.stringify([trimmed]);
      }
    }
  }

  // Handle Uploaded Files & Image URLs
  let image = body.image || body.banner || body.photo || body.thumbnail || body.img || body.imageUrl || null;
  let galleryList = [];

  // Parse any gallery / images passed as string/array in body
  const rawGallery = body.gallery || body.images || body.gallery_images || body.photos;
  if (rawGallery) {
    if (Array.isArray(rawGallery)) {
      galleryList = [...rawGallery];
    } else if (typeof rawGallery === 'string') {
      try {
        const parsed = JSON.parse(rawGallery);
        if (Array.isArray(parsed)) galleryList = parsed;
        else galleryList = [rawGallery];
      } catch (e) {
        galleryList = rawGallery.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
  }

  // Extract from Multer files if uploaded
  if (Array.isArray(files) && files.length > 0) {
    files.forEach((f) => {
      const fileUrl = f.location || f.filename || (f.path ? f.path.replace(/\\/g, '/') : null);
      if (!fileUrl) return;

      const fieldName = (f.fieldname || '').toLowerCase();
      if (['image', 'banner', 'photo', 'thumbnail', 'file', 'img'].includes(fieldName) && !image) {
        image = fileUrl;
      } else if (['gallery', 'images', 'photos', 'gallery_images'].includes(fieldName) || fieldName.startsWith('gallery') || fieldName.startsWith('images')) {
        galleryList.push(fileUrl);
      } else if (!image) {
        image = fileUrl;
      } else {
        galleryList.push(fileUrl);
      }
    });
  }

  const gallery = galleryList.length > 0 ? JSON.stringify(galleryList) : null;

  // Determine is_past and event_type
  const rawIsPast = body.is_past !== undefined ? body.is_past : body.isPast;
  const rawPastEvent = body.past_event !== undefined ? body.past_event : body.isPastEvent;
  const rawEventType = body.event_type || body.eventType || body.type;

  const isPastBool = Boolean(
    defaultIsPast ||
    rawIsPast === true ||
    rawIsPast === 1 ||
    rawIsPast === '1' ||
    rawIsPast === 'true' ||
    rawPastEvent === true ||
    rawPastEvent === 1 ||
    rawPastEvent === '1' ||
    rawPastEvent === 'true' ||
    String(rawEventType).toLowerCase() === 'past' ||
    String(body.category).toLowerCase() === 'past'
  );

  const computedIsPast = isPastBool ? 1 : 0;
  const computedEventType = isPastBool ? 'past' : (rawEventType ? String(rawEventType).toLowerCase() : 'latest');
  const computedStatus = body.status || (isPastBool ? 'completed' : 'active');

  const rawFeatured = body.is_featured !== undefined ? body.is_featured : body.isFeatured;
  const computedFeatured = (rawFeatured === true || rawFeatured === 1 || rawFeatured === '1' || rawFeatured === 'true' || body.featured === true || body.featured === 1) ? 1 : 0;

  const rawAttendees = body.attendees_count || body.attendeesCount || body.attendees || body.totalAttendees;
  const computedAttendees = rawAttendees ? parseInt(rawAttendees, 10) : 0;

  return {
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
    image,
    gallery,
    event_type: computedEventType,
    is_past: computedIsPast,
    status: computedStatus,
    is_featured: computedFeatured,
    attendees_count: computedAttendees
  };
}

/**
 * Helper: Formats an event row from DB for maximum frontend compatibility (JSON arrays & camelCase aliases)
 */
function formatEvent(row) {
  if (!row) return null;

  // Safe parsing for highlights
  let parsedHighlights = [];
  if (row.highlights && typeof row.highlights === 'string') {
    const trimmed = row.highlights.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        parsedHighlights = JSON.parse(trimmed);
      } catch (e) {
        parsedHighlights = trimmed.includes('\n') ? trimmed.split('\n').map(s => s.trim()).filter(Boolean) : [trimmed];
      }
    } else if (trimmed.includes(',')) {
      parsedHighlights = trimmed.split(',').map(s => s.trim()).filter(Boolean);
    } else if (trimmed.includes('\n')) {
      parsedHighlights = trimmed.split('\n').map(s => s.trim()).filter(Boolean);
    } else {
      parsedHighlights = [trimmed];
    }
  } else if (Array.isArray(row.highlights)) {
    parsedHighlights = row.highlights;
  }

  // Safe parsing for gallery
  let parsedGallery = [];
  if (row.gallery && typeof row.gallery === 'string') {
    try {
      const parsed = JSON.parse(row.gallery);
      if (Array.isArray(parsed)) parsedGallery = parsed;
      else parsedGallery = [row.gallery];
    } catch (e) {
      parsedGallery = row.gallery.split(',').map(s => s.trim()).filter(Boolean);
    }
  } else if (Array.isArray(row.gallery)) {
    parsedGallery = row.gallery;
  }

  const isPastBool = Boolean(row.is_past === 1 || String(row.event_type).toLowerCase() === 'past');

  return {
    ...row,
    id: Number(row.id),
    is_past: Number(row.is_past),
    is_featured: Number(row.is_featured || 0),
    view_count: Number(row.view_count || 0),
    attendees_count: Number(row.attendees_count || 0),
    highlights: parsedHighlights,
    highlights_raw: row.highlights || null,
    gallery: parsedGallery,

    // CamelCase & universal frontend aliases
    name: row.title,
    eventName: row.title,
    eventTitle: row.title,
    shortDescription: row.short_description,
    dateInfo: row.date_info,
    startDate: row.start_date,
    endDate: row.end_date,
    eventTime: row.event_time,
    specialPooja: row.special_pooja,
    serviceType: row.service_type,
    registrationLink: row.registration_link,
    videoUrl: row.video_url,
    eventType: row.event_type,
    isPast: isPastBool,
    isFeatured: Boolean(row.is_featured === 1),
    attendeesCount: Number(row.attendees_count || 0),
    viewCount: Number(row.view_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const eventController = {
  /**
   * 1. Create Event (Latest, Past, Single Object or Bulk Array)
   */
  create: async (req, res) => {
    try {
      const defaultIsPast = Boolean(
        req.query.type === 'past' ||
        req.originalUrl.includes('/past') ||
        req.body?.is_past === 1 ||
        req.body?.is_past === true ||
        req.body?.is_past === 'true' ||
        req.body?.is_past === '1' ||
        req.body?.isPast === true ||
        req.body?.isPast === 1 ||
        req.body?.isPast === 'true' ||
        req.body?.isPast === '1' ||
        req.body?.event_type === 'past' ||
        req.body?.eventType === 'past' ||
        req.body?.type === 'past'
      );

      // Check if body is an array or contains an events/past_events array (Bulk creation)
      let itemsToCreate = [];
      if (Array.isArray(req.body)) {
        itemsToCreate = req.body;
      } else if (Array.isArray(req.body.events)) {
        itemsToCreate = req.body.events;
      } else if (Array.isArray(req.body.past_events)) {
        itemsToCreate = req.body.past_events;
      } else if (Array.isArray(req.body.latest_events)) {
        itemsToCreate = req.body.latest_events;
      } else if (Array.isArray(req.body.data)) {
        itemsToCreate = req.body.data;
      }

      // Handle Bulk Creation
      if (itemsToCreate.length > 0) {
        const createdEvents = [];
        for (const item of itemsToCreate) {
          const norm = normalizeEventInput(item, [], defaultIsPast);
          if (!norm.title) continue;

          const query = `
            INSERT INTO latest_events 
            (tag, title, description, short_description, date_info, start_date, end_date, event_time, 
             location, venue, special_pooja, service_type, website, registration_link, video_url, 
             highlights, image, gallery, event_type, is_past, status, is_featured, attendees_count) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          const values = [
            norm.tag, norm.title, norm.description, norm.short_description, norm.date_info,
            norm.start_date, norm.end_date, norm.event_time, norm.location, norm.venue,
            norm.special_pooja, norm.service_type, norm.website, norm.registration_link,
            norm.video_url, norm.highlights, norm.image, norm.gallery, norm.event_type,
            norm.is_past, norm.status, norm.is_featured, norm.attendees_count
          ];

          const [result] = await db.query(query, values);
          const [row] = await db.query(`SELECT * FROM latest_events WHERE id = ?`, [result.insertId]);
          if (row.length > 0) createdEvents.push(formatEvent(row[0]));
        }

        return res.status(201).json({
          success: true,
          message: `${createdEvents.length} events created successfully`,
          count: createdEvents.length,
          data: createdEvents,
          events: createdEvents,
          past_events: createdEvents.filter(e => e.is_past === 1),
          latest_events: createdEvents.filter(e => e.is_past === 0)
        });
      }

      // Handle Single Event Creation
      const norm = normalizeEventInput(req.body, req.files || (req.file ? [req.file] : []), defaultIsPast);

      if (!norm.title) {
        return res.status(400).json({
          success: false,
          message: 'Title / Event name is required (e.g. title: "Maha Shivratri Mahapuja")'
        });
      }

      const query = `
        INSERT INTO latest_events 
        (tag, title, description, short_description, date_info, start_date, end_date, event_time, 
         location, venue, special_pooja, service_type, website, registration_link, video_url, 
         highlights, image, gallery, event_type, is_past, status, is_featured, attendees_count) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        norm.tag,
        norm.title,
        norm.description,
        norm.short_description,
        norm.date_info,
        norm.start_date,
        norm.end_date,
        norm.event_time,
        norm.location,
        norm.venue,
        norm.special_pooja,
        norm.service_type,
        norm.website,
        norm.registration_link,
        norm.video_url,
        norm.highlights,
        norm.image,
        norm.gallery,
        norm.event_type,
        norm.is_past,
        norm.status,
        norm.is_featured,
        norm.attendees_count
      ];

      const [result] = await db.query(query, values);
      const [newEvent] = await db.query(`SELECT * FROM latest_events WHERE id = ?`, [result.insertId]);
      const formatted = formatEvent(newEvent[0]);

      return res.status(201).json({
        success: true,
        message: `${norm.event_type === 'past' ? 'Past' : 'Latest'} event created successfully`,
        data: formatted,
        event: formatted
      });
    } catch (err) {
      console.error('Error creating event:', err);
      return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
  },

  /**
   * Explicit Endpoint: Create Past Event
   */
  createPast: async (req, res) => {
    req.body = req.body || {};
    req.body.is_past = 1;
    req.body.event_type = 'past';
    return eventController.create(req, res);
  },

  /**
   * Explicit Endpoint: Create Latest Event
   */
  createLatest: async (req, res) => {
    req.body = req.body || {};
    req.body.is_past = 0;
    req.body.event_type = 'latest';
    return eventController.create(req, res);
  },

  /**
   * 2. Get All Events with Comprehensive Filtering
   */
  getAll: async (req, res) => {
    try {
      const { type, is_past, isPast, status, search, tag, sort, page, limit } = req.query;

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
      } else if (is_past !== undefined || isPast !== undefined) {
        const pastParam = is_past !== undefined ? is_past : isPast;
        const isPastBool = (pastParam === 'true' || pastParam === '1' || pastParam === true || pastParam === 1);
        if (isPastBool) {
          whereClauses.push('(is_past = 1 OR event_type = "past")');
        } else {
          whereClauses.push('(is_past = 0 OR event_type = "latest")');
        }
      }

      // Filter by status
      if (status && status !== 'all') {
        whereClauses.push('status = ?');
        queryParams.push(status);
      }

      // Filter by tag
      if (tag && tag !== 'all') {
        whereClauses.push('(tag LIKE ? OR tags LIKE ?)');
        queryParams.push(`%${tag}%`, `%${tag}%`);
      }

      // Text search filter
      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        whereClauses.push('(title LIKE ? OR tag LIKE ? OR description LIKE ? OR location LIKE ? OR short_description LIKE ? OR venue LIKE ?)');
        queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

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
      const [rawEvents] = await db.query(`SELECT * FROM latest_events ${whereSql} ${orderBy}${paginationSql}`, queryParams);
      const formattedEvents = rawEvents.map(formatEvent);

      // Fetch summary counts for tabs/badges
      const [[counts]] = await db.query(`
        SELECT 
          COUNT(*) AS total,
          SUM(CASE WHEN is_past = 0 OR event_type = 'latest' THEN 1 ELSE 0 END) AS latest_count,
          SUM(CASE WHEN is_past = 1 OR event_type = 'past' THEN 1 ELSE 0 END) AS past_count
        FROM latest_events
      `);

      const pastEvents = formattedEvents.filter(e => e.is_past === 1 || e.event_type === 'past');
      const latestEvents = formattedEvents.filter(e => e.is_past === 0 || e.event_type === 'latest');

      return res.status(200).json({
        success: true,
        total: counts ? Number(counts.total) : formattedEvents.length,
        latest_count: counts ? Number(counts.latest_count || 0) : 0,
        past_count: counts ? Number(counts.past_count || 0) : 0,
        count: formattedEvents.length,
        data: formattedEvents,
        events: formattedEvents,
        past_events: pastEvents,
        latest_events: latestEvents,
        result: formattedEvents
      });
    } catch (err) {
      console.error('Error getting events:', err);
      return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
  },

  /**
   * 3. Get only Latest events
   */
  getLatest: async (req, res) => {
    req.query.type = 'latest';
    return eventController.getAll(req, res);
  },

  /**
   * 4. Get only Past events
   */
  getPast: async (req, res) => {
    req.query.type = 'past';
    return eventController.getAll(req, res);
  },

  /**
   * 5. Get Event Statistics
   */
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

  /**
   * 6. Get Event By ID
   */
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

      const formatted = formatEvent(event[0]);
      return res.status(200).json({
        success: true,
        data: formatted,
        event: formatted
      });
    } catch (err) {
      console.error('Error getting event by ID:', err);
      return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
  },

  /**
   * 7. Update Event
   */
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
      const files = req.files || (req.file ? [req.file] : []);
      const norm = normalizeEventInput(req.body, files, false);

      const updatedTitle = norm.title || current.title;
      const updatedTag = req.body.tag !== undefined || req.body.tags !== undefined ? norm.tag : current.tag;
      const updatedDescription = req.body.description !== undefined || req.body.desc !== undefined ? norm.description : current.description;
      const updatedShortDesc = req.body.short_description !== undefined || req.body.shortDescription !== undefined ? norm.short_description : current.short_description;
      const updatedDateInfo = req.body.date_info !== undefined || req.body.dateInfo !== undefined ? norm.date_info : current.date_info;
      const updatedStartDate = req.body.start_date !== undefined || req.body.startDate !== undefined ? norm.start_date : current.start_date;
      const updatedEndDate = req.body.end_date !== undefined || req.body.endDate !== undefined ? norm.end_date : current.end_date;
      const updatedEventTime = req.body.event_time !== undefined || req.body.eventTime !== undefined ? norm.event_time : current.event_time;
      const updatedLocation = req.body.location !== undefined || req.body.place !== undefined ? norm.location : current.location;
      const updatedVenue = req.body.venue !== undefined || req.body.mandir !== undefined ? norm.venue : current.venue;
      const updatedSpecialPooja = req.body.special_pooja !== undefined || req.body.specialPooja !== undefined ? norm.special_pooja : current.special_pooja;
      const updatedServiceType = req.body.service_type !== undefined || req.body.serviceType !== undefined ? norm.service_type : current.service_type;
      const updatedWebsite = req.body.website !== undefined || req.body.url !== undefined ? norm.website : current.website;
      const updatedRegistrationLink = req.body.registration_link !== undefined || req.body.registrationLink !== undefined ? norm.registration_link : current.registration_link;
      const updatedVideoUrl = req.body.video_url !== undefined || req.body.videoUrl !== undefined ? norm.video_url : current.video_url;
      const updatedHighlights = req.body.highlights !== undefined || req.body.eventHighlights !== undefined ? norm.highlights : current.highlights;
      const updatedImage = norm.image !== null ? norm.image : current.image;
      const updatedGallery = norm.gallery !== null ? norm.gallery : current.gallery;

      // Event Type & is_past updates
      let computedIsPast = current.is_past;
      let computedEventType = current.event_type;

      if (req.body.is_past !== undefined || req.body.isPast !== undefined) {
        const pastVal = req.body.is_past !== undefined ? req.body.is_past : req.body.isPast;
        const isPastBool = (pastVal === true || pastVal === 1 || pastVal === '1' || pastVal === 'true');
        computedIsPast = isPastBool ? 1 : 0;
        computedEventType = isPastBool ? 'past' : 'latest';
      } else if (req.body.event_type !== undefined || req.body.eventType !== undefined || req.body.type !== undefined) {
        const typeStr = String(req.body.event_type || req.body.eventType || req.body.type).toLowerCase();
        computedEventType = typeStr;
        computedIsPast = typeStr === 'past' ? 1 : 0;
      }

      const updatedStatus = req.body.status !== undefined ? req.body.status : current.status;
      const updatedFeatured = (req.body.is_featured !== undefined || req.body.isFeatured !== undefined) ? norm.is_featured : current.is_featured;
      const updatedAttendees = (req.body.attendees_count !== undefined || req.body.attendeesCount !== undefined) ? norm.attendees_count : current.attendees_count;

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
          gallery = ?,
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
        updatedImage,
        updatedGallery,
        computedEventType,
        computedIsPast,
        updatedStatus,
        updatedFeatured,
        updatedAttendees,
        id
      ];

      await db.query(query, values);

      const [updatedRecord] = await db.query(`SELECT * FROM latest_events WHERE id = ?`, [id]);
      const formatted = formatEvent(updatedRecord[0]);

      return res.status(200).json({
        success: true,
        message: 'Event updated successfully',
        data: formatted,
        event: formatted
      });
    } catch (err) {
      console.error('Error updating event:', err);
      return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
  },

  /**
   * 8. Update Event Status or Type
   */
  updateStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { is_past, isPast, event_type, eventType, status } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, message: 'Event ID is required' });
      }

      const [existing] = await db.query(`SELECT * FROM latest_events WHERE id = ?`, [id]);
      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }

      let updates = [];
      let params = [];

      const pastVal = is_past !== undefined ? is_past : isPast;
      if (pastVal !== undefined) {
        const isPastBool = (pastVal === true || pastVal === 1 || pastVal === '1' || pastVal === 'true');
        updates.push('is_past = ?', 'event_type = ?');
        params.push(isPastBool ? 1 : 0, isPastBool ? 'past' : 'latest');
      } else if (event_type !== undefined || eventType !== undefined) {
        const typeStr = String(event_type || eventType).toLowerCase();
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
      const formatted = formatEvent(updated[0]);

      return res.status(200).json({
        success: true,
        message: 'Event status updated successfully',
        data: formatted,
        event: formatted
      });
    } catch (err) {
      console.error('Error updating event status:', err);
      return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
  },

  /**
   * 9. Quick Toggle between Latest and Past
   */
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
      const formatted = formatEvent(updated[0]);

      return res.status(200).json({
        success: true,
        message: newIsPast === 1 ? 'Event moved to Past Events' : 'Event moved to Latest Events',
        data: formatted,
        event: formatted
      });
    } catch (err) {
      console.error('Error toggling event state:', err);
      return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
  },

  /**
   * 10. Delete Event
   */
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

  /**
   * 11. Register / Book an Event (User / Devotee)
   */
  registerEvent: async (req, res) => {
    try {
      const fullName = req.body.fullName || req.body.name || req.body.userName || req.body.devoteeName || "";
      const mobile = req.body.mobile || req.body.phone || req.body.contact || req.body.userMobile || "";
      const email = req.body.email || req.body.userEmail || null;
      const service = req.body.service || req.body.event_title || req.body.eventName || req.body.pooja_name || "Event Registration";
      const poojaDate = req.body.poojaDate || req.body.date || req.body.eventDate || null;
      const poojaTime = req.body.poojaTime || req.body.time || req.body.eventTime || null;
      const poojaLocation = req.body.poojaLocation || req.body.location || req.body.address || null;
      const message = req.body.message || req.body.remark || req.body.notes || null;
      const event_id = req.body.event_id || req.body.eventId || null;
      const user_id = req.body.user_id || req.body.userId || null;
      const amount = req.body.amount || req.body.price || 0;
      const paymentStatus = req.body.paymentStatus || req.body.payment_status || 'unpaid';
      const paymentId = req.body.paymentId || req.body.payment_id || null;

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
      let resolvedEventTitle = service;
      let resolvedEventId = event_id ? parseInt(event_id, 10) : null;

      if (resolvedEventId) {
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

      // Also mirror to rudraAbhishek table for complete backward compatibility
      try {
        await db.query(
          `INSERT INTO rudraAbhishek (fullName, mobile, email, service, poojaDate, message, status) 
           VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
          [fullName.trim(), cleanMobile, email || null, service.trim(), poojaDate || null, message || null]
        );
      } catch (rErr) {
        // Ignored if already recorded
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

  /**
   * 12. Get All Event Bookings (Admin Panel)
   */
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

  /**
   * 13. Get Bookings for a Specific Event
   */
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

  /**
   * 14. Get Single Event Booking by ID
   */
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

  /**
   * 15. Update Event Booking Status / Assignment (Admin)
   */
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

  /**
   * 16. Delete Event Booking
   */
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
