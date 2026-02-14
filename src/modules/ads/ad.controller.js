import Ad from "./ad.model.js";

/**
 * Create a new ad (admin only)
 */
export const createAd = async (req, res) => {
  try {
    const { title, description, image, link, position, priority, status, startDate, endDate } = req.body;

    if (!title || !image) {
      return res.status(400).json({ success: false, message: "Title and image are required" });
    }

    const ad = await Ad.create({
      title,
      description: description || "",
      image,
      link: link || "",
      position: position || "hero",
      priority: priority || 0,
      status: status || "active",
      startDate: startDate || null,
      endDate: endDate || null,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: ad });
  } catch (error) {
    console.error("Create ad error:", error);
    res.status(500).json({ success: false, message: "Failed to create ad" });
  }
};

/**
 * Get all ads (admin only)
 */
export const getAllAds = async (req, res) => {
  try {
    const { status, position, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && status !== "all") query.status = status;
    if (position && position !== "all") query.position = position;

    const skip = (page - 1) * limit;
    const [ads, total] = await Promise.all([
      Ad.find(query)
        .populate("createdBy", "username email")
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Ad.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: ads,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error("Get ads error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch ads" });
  }
};

/**
 * Update ad (admin only)
 */
export const updateAd = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const ad = await Ad.findByIdAndUpdate(id, updates, { new: true });
    if (!ad) {
      return res.status(404).json({ success: false, message: "Ad not found" });
    }

    res.json({ success: true, data: ad });
  } catch (error) {
    console.error("Update ad error:", error);
    res.status(500).json({ success: false, message: "Failed to update ad" });
  }
};

/**
 * Delete ad (admin only)
 */
export const deleteAd = async (req, res) => {
  try {
    const { id } = req.params;
    const ad = await Ad.findByIdAndDelete(id);

    if (!ad) {
      return res.status(404).json({ success: false, message: "Ad not found" });
    }

    res.json({ success: true, message: "Ad deleted" });
  } catch (error) {
    console.error("Delete ad error:", error);
    res.status(500).json({ success: false, message: "Failed to delete ad" });
  }
};

/**
 * Get active ads for user dashboard (public)
 */
export const getActiveAds = async (req, res) => {
  try {
    const { position } = req.query;
    const now = new Date();
    const query = {
      status: "active",
      $or: [
        { startDate: null, endDate: null },
        { startDate: { $lte: now }, endDate: null },
        { startDate: null, endDate: { $gte: now } },
        { startDate: { $lte: now }, endDate: { $gte: now } },
      ],
    };

    if (position) query.position = position;

    const ads = await Ad.find(query)
      .select("title description image link position priority")
      .sort({ priority: -1, createdAt: -1 })
      .limit(10)
      .lean();

    res.json({ success: true, data: ads });
  } catch (error) {
    console.error("Get active ads error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch ads" });
  }
};

/**
 * Track ad click (public)
 */
export const trackAdClick = async (req, res) => {
  try {
    const { id } = req.params;
    await Ad.findByIdAndUpdate(id, { $inc: { clicks: 1 } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

/**
 * Get ad stats (admin)
 */
export const getAdStats = async (req, res) => {
  try {
    const [total, active, inactive, scheduled, totalClicks, totalViews] = await Promise.all([
      Ad.countDocuments(),
      Ad.countDocuments({ status: "active" }),
      Ad.countDocuments({ status: "inactive" }),
      Ad.countDocuments({ status: "scheduled" }),
      Ad.aggregate([{ $group: { _id: null, clicks: { $sum: "$clicks" } } }]),
      Ad.aggregate([{ $group: { _id: null, views: { $sum: "$views" } } }]),
    ]);

    res.json({
      success: true,
      data: {
        total,
        active,
        inactive,
        scheduled,
        totalClicks: totalClicks[0]?.clicks || 0,
        totalViews: totalViews[0]?.views || 0,
      },
    });
  } catch (error) {
    console.error("Get ad stats error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
};
