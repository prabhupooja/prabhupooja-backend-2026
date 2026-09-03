const db = require("../config/db");
const { sendUserNotification } = require("./notificationController");
const {
  sendNotificationToUser,
} = require("../Controllers/MobilePushNotification");

exports.create = async (req, res) => {
  const { user_id, location, title } = req.body;
  const files = req.files ? req.files.map((file) => file.location) : [];

  try {
    const [userRows] = await db.query("SELECT id FROM users WHERE id = ?", [
      user_id,
    ]);
    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const sql = `INSERT INTO media (user_id, location, type, file,title)
      VALUES (?, ?, "image", ?,?)`;

    await db.query(sql, [user_id, location, JSON.stringify(files), title]);
    res
      .status(201)
      .json({ success: true, message: "Upload created successfully" });
  } catch (error) {
    console.error("Error creating upload:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.video = async (req, res) => {
  const { user_id, location, title } = req.body;
  const files = req.files ? req.files.map((file) => file.location) : [];
  if (!title) {
    return res.status(404).json({
      success: false,
      message: " title is require",
    });
  }
  try {
    const [userRows] = await db.query("SELECT id FROM users WHERE id = ?", [
      user_id,
    ]);
    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const sql = `INSERT INTO media (user_id, location, type, file,title)
      VALUES (?, ?, "video", ?,?)`;

    await db.query(sql, [user_id, location, JSON.stringify(files), title]);
    res
      .status(201)
      .json({ success: true, message: "Upload created successfully" });
  } catch (error) {
    console.error("Error creating upload:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getAll = async (req, res) => {
  const { userId, page = 1, limit = 5 } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const [mediaData] = await db.query(
      `
      SELECT 
        m.*, 
        CONCAT_WS(' ', u.name, u.lastname) AS user_fullname, 
        u.image AS user_image
      FROM 
        media m
      LEFT JOIN 
        users u ON m.user_id = u.id
      ORDER BY 
        m.created_at DESC
      LIMIT ? OFFSET ?
    `,
      [parseInt(limit), offset]
    );

    if (!mediaData.length) {
      return res.status(404).send({
        success: false,
        message: "No media found",
      });
    }

    const mediaIds = mediaData.map((m) => m.id);

    const [likeCounts] = await db.query(
      `
      SELECT media_id, COUNT(*) AS likeCount
      FROM media_like
      WHERE likes = 1 AND media_id IN (?)
      GROUP BY media_id
    `,
      [mediaIds]
    );

    const [commentCounts] = await db.query(
      `
      SELECT media_id, COUNT(*) AS commentCount
      FROM media_like
      WHERE media_id IN (?) AND comment IS NOT NULL AND TRIM(comment) <> ''
      GROUP BY media_id
    `,
      [mediaIds]
    );

    const [userLikes] = await db.query(
      `
      SELECT media_id
      FROM media_like
      WHERE user_id = ? AND likes = 1 AND media_id IN (?)
    `,
      [userId, mediaIds]
    );

    const likeMap = {};
    likeCounts.forEach((row) => (likeMap[row.media_id] = row.likeCount));

    const commentMap = {};
    commentCounts.forEach(
      (row) => (commentMap[row.media_id] = row.commentCount)
    );

    const likedMediaSet = new Set(userLikes.map((row) => row.media_id));

    const enrichedMedia = mediaData.map((m) => ({
      ...m,
      likeCount: likeMap[m.id] || 0,
      commentCount: commentMap[m.id] || 0,
      hasLiked: likedMediaSet.has(m.id),
    }));

    return res.status(200).send({
      success: true,
      data: enrichedMedia,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error in getAll:", error);
    return res.status(500).send({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.getPostingUsers = async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT DISTINCT 
        u.id, 
        u.name, 
        u.lastname, 
        u.image
      FROM 
        users u
      INNER JOIN 
        media m ON u.id = m.user_id
    `);

    if (!users.length) {
      return res.status(404).send({
        success: false,
        message: "No users found who have posted media",
      });
    }

    return res.status(200).send({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Error in getPostingUsers:", error);
    return res.status(500).send({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.getByUserId = async (req, res) => {
  const { user_id } = req.params;

  if (!user_id) {
    return res.status(400).send({
      success: false,
      message: "Missing user_id in request",
    });
  }

  try {
    // Step 1: Get media for user
    const [mediaData] = await db.query(
      `SELECT * FROM media WHERE user_id = ? ORDER BY created_at DESC`,
      [user_id]
    );

    if (!mediaData.length) {
      return res.status(404).send({
        success: false,
        message: "No media found for the specified user",
      });
    }

    const mediaIds = mediaData.map((m) => m.id);

    // Step 2: Get like count for media
    const [likeCounts] = await db.query(
      `
      SELECT media_id, COUNT(*) AS likeCount
      FROM media_like
      WHERE likes = 1 AND media_id IN (?)
      GROUP BY media_id
    `,
      [mediaIds]
    );

    // Step 3: Get comment count for media
    const [commentCounts] = await db.query(
      `
      SELECT media_id, COUNT(*) AS commentCount
      FROM media_like
      WHERE media_id IN (?) AND comment IS NOT NULL AND TRIM(comment) <> ''
      GROUP BY media_id
    `,
      [mediaIds]
    );

    // Step 4: Merge counts into media
    const likeMap = {};
    likeCounts.forEach((row) => (likeMap[row.media_id] = row.likeCount));

    const commentMap = {};
    commentCounts.forEach(
      (row) => (commentMap[row.media_id] = row.commentCount)
    );

    const enrichedMedia = mediaData.map((m) => ({
      ...m,
      likeCount: likeMap[m.id] || 0,
      commentCount: commentMap[m.id] || 0,
    }));

    return res.status(200).send({
      success: true,
      data: enrichedMedia,
    });
  } catch (error) {
    console.error("Error in getByUserId:", error);
    return res.status(500).send({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { title, location } = req.body;

  try {
    const fields = [];
    const values = [];

    if (title) {
      fields.push("title = ?");
      values.push(title);
    }

    if (location) {
      fields.push("location = ?");
      values.push(location);
    }

    values.push(id); // for WHERE clause

    const sql = `UPDATE media SET ${fields.join(", ")} WHERE id = ?`;

    const [result] = await db.query(sql, values);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Media not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Media updated successfully" });
  } catch (error) {
    console.error("Error updating media:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Media ID is required",
    });
  }

  try {
    const sql = "DELETE FROM media WHERE id = ?";
    const [result] = await db.query(sql, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Media not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Media deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting media:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.like = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  try {
    const [media] = await db.query("SELECT * FROM media WHERE id = ?", [id]);

    const [userRows] = await db.query("SELECT name FROM users WHERE id = ?", [
      userId,
    ]);

    const [existingRows] = await db.query(
      "SELECT id, likes FROM media_like WHERE media_id = ? AND user_id = ?",
      [id, userId]
    );

    if (existingRows.length === 0) {
      await db.query(
        "INSERT INTO media_like (media_id, user_id, likes, created_at) VALUES (?, ?, 1, NOW())",
        [id, userId]
      );

      sendNotificationToUser(
        "New Like",
        `your post liked by ${userRows[0].name}`,
        media[0].user_id
      );
      await sendUserNotification(
        media[0].user_id,
        "New Like",
        `your post liked by ${userRows[0].name}`
      );

      return res.status(200).json({
        success: true,
        message: "Liked",
      });
    } else {
      const currentLike = existingRows[0].likes || 0;
      const newLikeValue = currentLike === 1 ? 0 : 1;

      await db.query(
        "UPDATE media_like SET likes = ? WHERE media_id = ? AND user_id = ?",
        [newLikeValue, id, userId]
      );

      return res.status(200).json({
        success: true,
        message: newLikeValue === 1 ? "Liked" : "Unliked",
      });
    }
  } catch (error) {
    console.error("Error in like handler:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.comment = async (req, res) => {
  const { id } = req.params;
  const { userId, comment } = req.body;
  try {
    const [mediaRows] = await db.query("SELECT * FROM media WHERE id = ?", [
      id,
    ]);

    const [userRows] = await db.query("SELECT name FROM users WHERE id = ?", [
      userId,
    ]);

    if (!comment || comment.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Comment cannot be empty" });
    }

    console.log(userRows, mediaRows, "llllkkk");

    const trimmedComment = comment.trim();

    await db.query(
      "INSERT INTO media_like (media_id, user_id, comment, created_at) VALUES (?, ?, ?, NOW())",
      [id, userId, trimmedComment]
    );


      sendNotificationToUser(
         "New Comment",
         `${userRows[0].name} comment on your post`,
          mediaRows[0].user_id
      );

    await sendUserNotification(
      mediaRows[0].user_id,
      "New Comment",
      `${userRows[0].name} comment on your post`
    );

    return res
      .status(200)
      .json({ success: true, message: "Comment added successfully" });
  } catch (error) {
    console.error("Error adding comment:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getByType = async (req, res) => {
  const { type } = req.params;

  if (!type) {
    return res.status(400).send({
      success: false,
      message: "Media type is required",
    });
  }

  try {
    const [rows] = await db.query(
      `SELECT * FROM media WHERE type = ? ORDER BY created_at DESC`,
      [type]
    );

    if (!rows.length) {
      return res.status(404).send({
        success: false,
        message: "No media found for the given type",
      });
    }

    return res.status(200).send({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching media by type:", error);
    return res.status(500).send({
      success: false,
      message: "Internal server error",
    });
  }
};
exports.getMediaSummary = async (req, res) => {
  const { id } = req.params;
  const userId = req.query.userId;

  try {
    const [mediaRows] = await db.query(
      "SELECT id, title, location, type, file FROM media WHERE id = ?",
      [id]
    );

    if (mediaRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Media not found",
      });
    }

    const media = mediaRows[0];

    const [likeRows] = await db.query(
      "SELECT COUNT(*) AS likeCount FROM media_like WHERE media_id = ? AND likes = 1",
      [id]
    );
    const [commentCountRows] = await db.query(
      `SELECT COUNT(*) AS commentCount 
       FROM media_like 
       WHERE media_id = ? AND comment IS NOT NULL AND TRIM(comment) <> ''`,
      [id]
    );
    const [commentDetails] = await db.query(
      `SELECT 
        ml.id AS commentId,
        ml.comment,
        ml.created_at,
        u.id AS userId,
        CONCAT_WS(' ', u.name, u.lastname) AS fullName,
        u.image AS userImage
      FROM media_like ml
      JOIN users u ON ml.user_id = u.id
      WHERE ml.media_id = ? 
        AND ml.comment IS NOT NULL 
        AND TRIM(ml.comment) <> ''
      ORDER BY ml.created_at DESC`,
      [id]
    );

    let hasLiked = false;
    if (userId) {
      const [userLikeRows] = await db.query(
        "SELECT 1 FROM media_like WHERE media_id = ? AND user_id = ? AND likes = 1 LIMIT 1",
        [id, userId]
      );
      hasLiked = userLikeRows.length > 0;
    }

    return res.status(200).json({
      success: true,
      data: {
        media: {
          id: media.id,
          title: media.title,
          location: media.location,
          file: media.file,
          type: media.type,
        },
        likeCount: likeRows[0].likeCount,
        commentCount: commentCountRows[0].commentCount,
        hasLiked,
        comments: commentDetails,
      },
    });
  } catch (error) {
    console.error("Error in getMediaSummary:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
exports.deleteComment = async (req, res) => {
  const { commentId, userId } = req.params;

  try {
    const [commentRows] = await db.query(
      "SELECT id, user_id FROM media_like WHERE id = ?",
      [commentId]
    );

    if (commentRows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Comment not found" });
    }

    const comment = commentRows[0];

    if (comment.user_id !== Number(userId)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to delete this comment",
      });
    }

    await db.query("DELETE FROM media_like WHERE id = ?", [commentId]);

    return res
      .status(200)
      .json({ success: true, message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.relatedMedia = async (req, res) => {
  const { postId } = req.query;
  const userId = req.query.userId || null;
  const page = parseInt(req.query.page || 1);
  const limit = parseInt(req.query.limit || 10);
  const offset = (page - 1) * limit;

  if (!postId) {
    console.log("Missing postId in request");
    return res.status(400).send({
      success: false,
      message: "Missing postId in request",
    });
  }

  try {
    const [originalPost] = await db.query(`SELECT * FROM media WHERE id = ?`, [
      postId,
    ]);

    if (!originalPost.length) {
      return res.status(404).send({
        success: false,
        message: "Original post not found",
      });
    }

    const title = originalPost[0].title;

    const [relatedPosts] = await db.query(
      `SELECT * FROM media 
       WHERE id != ? AND title = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [postId, title, limit, offset]
    );

    if (!relatedPosts.length) {
      return res.status(200).send({
        success: true,
        data: [],
        hasMore: false,
      });
    }

    const mediaIds = relatedPosts.map((m) => m.id);

    const [likeCounts] = await db.query(
      `SELECT media_id, COUNT(*) AS likeCount 
       FROM media_like 
       WHERE likes = 1 AND media_id IN (?) 
       GROUP BY media_id`,
      [mediaIds]
    );

    const [commentCounts] = await db.query(
      `SELECT media_id, COUNT(*) AS commentCount 
       FROM media_like 
       WHERE media_id IN (?) AND comment IS NOT NULL AND TRIM(comment) <> '' 
       GROUP BY media_id`,
      [mediaIds]
    );

    let hasLikedMap = {};
    if (userId) {
      const [likesByUser] = await db.query(
        `SELECT media_id FROM media_like 
         WHERE user_id = ? AND likes = 1 AND media_id IN (?)`,
        [userId, mediaIds]
      );
      likesByUser.forEach((row) => {
        hasLikedMap[row.media_id] = true;
      });
    }
    const likeMap = {};
    likeCounts.forEach((row) => (likeMap[row.media_id] = row.likeCount));

    const commentMap = {};
    commentCounts.forEach(
      (row) => (commentMap[row.media_id] = row.commentCount)
    );

    const enriched = relatedPosts.map((post) => ({
      ...post,
      likeCount: likeMap[post.id] || 0,
      commentCount: commentMap[post.id] || 0,
      hasLiked: hasLikedMap[post.id] || false,
    }));

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM media WHERE id != ? AND title = ?`,
      [postId, title]
    );

    const hasMore = offset + enriched.length < total;

    return res.status(200).send({
      success: true,
      data: enriched,
      hasMore,
    });
  } catch (error) {
    console.error("Error in relatedMedia:", error);
    return res.status(500).send({
      success: false,
      message: "Internal server error",
    });
  }
};
