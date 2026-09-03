const fs = require('fs');
const path = require('path');

const templeListContent = `import React, { useEffect, useState } from "react";
import "./poojabooking.css";
import { FaEdit, FaRegEye, FaMapMarkerAlt, FaWhatsapp, FaFacebook, FaPhoneAlt, FaEnvelope, FaClock, FaPray } from "react-icons/fa";
import { RiDeleteBin5Line } from "react-icons/ri";
import useTempleStore from "../Store/templeStore/templeStore";
import Swal from "sweetalert2";
import { HiDotsHorizontal } from "react-icons/hi";

function Templelist() {
  const { fetchTemple, temple = [], updateTemple, deleteTemple } = useTempleStore();
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [galleryPreviews, setGalleryPreviews] = useState([]);
  const [isEditPopupOpen, setEditPopupOpen] = useState(false);
  const [selectedPooja, setSelectedPooja] = useState(null);
  const [isViewPopupOpen, setViewPopupOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    fetchTemple();
    const handleClickOutside = (e) => {
      if (!e.target.closest(".dropdown-wrapper")) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [fetchTemple]);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 450);
  };

  const handleBackdropClick = () => {
    if (isViewPopupOpen) {
      handleClosePopup();
      return;
    }

    if (isEditPopupOpen) {
      if (!isDirty) {
        handleClosePopup();
      } else {
        triggerShake();
        Swal.fire({
          title: "Unsaved Changes!",
          text: "You have unsaved changes in this Temple profile. Do you want to discard them?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#ea580c",
          cancelButtonColor: "#64748b",
          confirmButtonText: "Yes, Discard",
          cancelButtonText: "Continue Editing",
        }).then((result) => {
          if (result.isConfirmed) {
            handleClosePopup();
          }
        });
      }
    }
  };

  const handleOpenPopup = (pooja) => {
    setSelectedPooja({ ...pooja });
    setImageFile(null);
    setImagePreview(pooja.image || null);
    setGalleryFiles([]);
    setGalleryPreviews(pooja.gallery_images || []);
    setIsDirty(false);
    setEditPopupOpen(true);
  };

  const handleViewClick = (pooja) => {
    setSelectedPooja(pooja);
    setViewPopupOpen(true);
  };

  const handleClosePopup = () => {
    setEditPopupOpen(false);
    setViewPopupOpen(false);
    setSelectedPooja(null);
    setImageFile(null);
    setImagePreview(null);
    setGalleryFiles([]);
    setGalleryPreviews([]);
    setIsDirty(false);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setIsDirty(true);
    }
  };

  const handleGalleryChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setGalleryFiles(files);
      const previews = files.map((f) => URL.createObjectURL(f));
      setGalleryPreviews(previews);
      setIsDirty(true);
    }
  };

  const handleEditTemple = async () => {
    if (!selectedPooja) return;

    try {
      const formData = new FormData();
      formData.append("name", selectedPooja.name || "");
      formData.append("tag", selectedPooja.tag || "Divine Temple");
      formData.append("subtitle", selectedPooja.subtitle || "");
      formData.append("price", selectedPooja.price || "0");
      formData.append("location", selectedPooja.location || selectedPooja.description || "");
      formData.append("description", selectedPooja.about || selectedPooja.description || "");
      formData.append("about", selectedPooja.about || selectedPooja.description || "");
      formData.append("significance", selectedPooja.significance || "");
      formData.append("rituals", selectedPooja.rituals || "");
      formData.append("timings", selectedPooja.timings || "");
      formData.append("number", selectedPooja.number || "");
      formData.append("whatsapp_number", selectedPooja.whatsapp_number || selectedPooja.number || "");
      formData.append("email", selectedPooja.email || "");
      formData.append("map_url", selectedPooja.map_url || "");
      formData.append("facebook_url", selectedPooja.facebook_url || "");
      formData.append("bottom_notes", selectedPooja.bottom_notes || "");
      formData.append("status", selectedPooja.status || "Active");

      if (imageFile) {
        formData.append("image", imageFile);
      }

      if (galleryFiles && galleryFiles.length > 0) {
        galleryFiles.forEach((file) => {
          formData.append("gallery", file);
        });
      }

      const response = await updateTemple(selectedPooja.id, formData);
      if (response?.data?.success || response?.status === 200) {
        Swal.fire({
          title: "Success!",
          text: "Temple updated successfully.",
          icon: "success",
          confirmButtonText: "OK",
        });
        fetchTemple();
        handleClosePopup();
      }
    } catch (error) {
      console.error("Error updating temple:", error);
      Swal.fire({
        title: "Error!",
        text: error?.response?.data?.message || "Failed to update temple. Please try again.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  const handleDeleteTemple = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This temple will be permanently deleted!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "No, cancel!",
      reverseButtons: true,
    });
    if (result.isConfirmed) {
      await deleteTemple(id);
      fetchTemple();
      Swal.fire("Deleted!", "Temple has been deleted.", "success");
    }
  };

  return (
    <>
      <div className="pooja-booking-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 className="pooja-title" style={{ margin: 0 }}>Registered Temples List</h2>
          <span style={{ background: "#e65100", color: "#fff", padding: "6px 14px", borderRadius: "20px", fontSize: "14px", fontWeight: "bold" }}>
            Total: {temple?.length || 0}
          </span>
        </div>

        <table className="pooja-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Banner</th>
              <th>Temple Name</th>
              <th>Tag / Category</th>
              <th>Location</th>
              <th>VIP Price</th>
              <th>Contact / WhatsApp</th>
              <th>Gallery Photos</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {temple && temple.map((pooja, index) => (
              <tr key={pooja.id}>
                <td>{index + 1}</td>
                <td>
                  <img
                    src={pooja.image}
                    alt={pooja.name}
                    className="pooja-image"
                    style={{ width: "60px", height: "45px", objectFit: "cover", borderRadius: "4px" }}
                  />
                </td>
                <td style={{ fontWeight: "600" }}>{pooja.name}</td>
                <td>
                  <span style={{ background: "#fff3e0", color: "#e65100", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold" }}>
                    {pooja.tag || "Divine Temple"}
                  </span>
                </td>
                <td>{pooja.location || pooja.description || "N/A"}</td>
                <td>₹{pooja.price}</td>
                <td>
                  <div>{pooja.number || "N/A"}</div>
                  {pooja.whatsapp_number && (
                    <small style={{ color: "#16a34a" }}>WA: {pooja.whatsapp_number}</small>
                  )}
                </td>
                <td>
                  <span style={{ background: "#e0f2fe", color: "#0284c7", padding: "3px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>
                    {pooja.gallery_images?.length || 1} Photos
                  </span>
                </td>

                <td className="actions">
                  <div className="dropdown-wrapper">
                    <button
                      className="dropdown-toggle"
                      onClick={() =>
                        setOpenDropdown(
                          openDropdown === pooja.id ? null : pooja.id
                        )
                      }
                    >
                      <HiDotsHorizontal />
                    </button>
                    {openDropdown === pooja.id && (
                      <div className="dropdown-menu">
                        <button
                          className="view-btn-pooja"
                          onClick={() => handleViewClick(pooja)}
                        >
                          <FaRegEye /> View Details
                        </button>
                        <button
                          className="edit-btn-pooja"
                          onClick={() => handleOpenPopup(pooja)}
                        >
                          <FaEdit /> Edit
                        </button>
                        <button
                          className="delete-btn-pooja"
                          onClick={() => {
                            handleDeleteTemple(pooja.id);
                          }}
                        >
                          <RiDeleteBin5Line /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* EDIT TEMPLE MODAL */}
      {isEditPopupOpen && selectedPooja && (
        <div className="edit-popup" onClick={handleBackdropClick}>
          <div
            className={\`popup-content \${isShaking ? "modal-shake" : ""}\`}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "750px", maxHeight: "85vh", overflowY: "auto", padding: "25px" }}
          >
            <h3 style={{ color: "#d84315", marginBottom: "15px", borderBottom: "2px solid #ffcc80", paddingBottom: "8px" }}>
              Edit Temple Profile
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label>Temple Name:</label>
                <input
                  type="text"
                  value={selectedPooja.name || ""}
                  onChange={(e) => {
                    setIsDirty(true);
                    setSelectedPooja({ ...selectedPooja, name: e.target.value });
                  }}
                />
              </div>

              <div>
                <label>Tag / Category:</label>
                <select
                  value={selectedPooja.tag || "Divine Temple"}
                  onChange={(e) => {
                    setIsDirty(true);
                    setSelectedPooja({ ...selectedPooja, tag: e.target.value });
                  }}
                  style={{ width: "100%", height: "40px", borderRadius: "5px", padding: "0 8px", border: "1px solid #ccc" }}
                >
                  <option value="Divine Temple">Divine Temple</option>
                  <option value="Jyotirlinga">Jyotirlinga Temple</option>
                  <option value="Siddhapeeth">Siddhapeeth</option>
                  <option value="Dham">Char Dham</option>
                  <option value="Historical Temple">Historical Temple</option>
                </select>
              </div>

              <div>
                <label>Deity / Subtitle:</label>
                <input
                  type="text"
                  value={selectedPooja.subtitle || ""}
                  onChange={(e) => {
                    setIsDirty(true);
                    setSelectedPooja({ ...selectedPooja, subtitle: e.target.value });
                  }}
                />
              </div>

              <div>
                <label>VIP Darshan Price (₹):</label>
                <input
                  type="number"
                  value={selectedPooja.price || ""}
                  onChange={(e) => {
                    setIsDirty(true);
                    setSelectedPooja({ ...selectedPooja, price: e.target.value });
                  }}
                />
              </div>

              <div>
                <label>Location (City, State):</label>
                <input
                  type="text"
                  value={selectedPooja.location || selectedPooja.description || ""}
                  onChange={(e) => {
                    setIsDirty(true);
                    setSelectedPooja({ ...selectedPooja, location: e.target.value, description: e.target.value });
                  }}
                />
              </div>

              <div>
                <label>Google Maps Link:</label>
                <input
                  type="url"
                  value={selectedPooja.map_url || ""}
                  onChange={(e) => {
                    setIsDirty(true);
                    setSelectedPooja({ ...selectedPooja, map_url: e.target.value });
                  }}
                />
              </div>

              <div>
                <label>Phone Number:</label>
                <input
                  type="text"
                  value={selectedPooja.number || ""}
                  onChange={(e) => {
                    setIsDirty(true);
                    setSelectedPooja({ ...selectedPooja, number: e.target.value });
                  }}
                />
              </div>

              <div>
                <label>WhatsApp Number:</label>
                <input
                  type="text"
                  value={selectedPooja.whatsapp_number || ""}
                  onChange={(e) => {
                    setIsDirty(true);
                    setSelectedPooja({ ...selectedPooja, whatsapp_number: e.target.value });
                  }}
                />
              </div>

              <div>
                <label>Email Address:</label>
                <input
                  type="email"
                  value={selectedPooja.email || ""}
                  onChange={(e) => {
                    setIsDirty(true);
                    setSelectedPooja({ ...selectedPooja, email: e.target.value });
                  }}
                />
              </div>

              <div>
                <label>Facebook Page Link:</label>
                <input
                  type="url"
                  value={selectedPooja.facebook_url || ""}
                  onChange={(e) => {
                    setIsDirty(true);
                    setSelectedPooja({ ...selectedPooja, facebook_url: e.target.value });
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: "12px" }}>
              <label>Update Cover Photo:</label>
              <input type="file" accept="image/*" onChange={handleImageChange} />
              {imagePreview && (
                <div style={{ marginTop: "6px" }}>
                  <img src={imagePreview} alt="Cover Preview" style={{ maxHeight: "100px", borderRadius: "5px" }} />
                </div>
              )}
            </div>

            <div style={{ marginTop: "12px" }}>
              <label>Upload New Multi-Image Gallery:</label>
              <input type="file" accept="image/*" multiple onChange={handleGalleryChange} />
              {galleryPreviews?.length > 0 && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "6px" }}>
                  {galleryPreviews.map((src, i) => (
                    <img key={i} src={src} alt="Gallery item" style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "4px" }} />
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: "12px" }}>
              <label>About Temple / Detailed Story:</label>
              <textarea
                rows="3"
                value={selectedPooja.about || selectedPooja.description || ""}
                onChange={(e) => {
                  setIsDirty(true);
                  setSelectedPooja({ ...selectedPooja, about: e.target.value });
                }}
                style={{ width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }}
              />
            </div>

            <div style={{ marginTop: "12px" }}>
              <label>Temple Significance & History:</label>
              <textarea
                rows="2"
                value={selectedPooja.significance || ""}
                onChange={(e) => {
                  setIsDirty(true);
                  setSelectedPooja({ ...selectedPooja, significance: e.target.value });
                }}
                style={{ width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }}
              />
            </div>

            <div style={{ marginTop: "12px" }}>
              <label>Special Poojas & Rituals (One per line):</label>
              <textarea
                rows="3"
                value={selectedPooja.rituals || ""}
                onChange={(e) => {
                  setIsDirty(true);
                  setSelectedPooja({ ...selectedPooja, rituals: e.target.value });
                }}
                style={{ width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }}
              />
            </div>

            <div style={{ marginTop: "12px" }}>
              <label>Darshan & Aarti Timings (One per line):</label>
              <textarea
                rows="3"
                value={selectedPooja.timings || ""}
                onChange={(e) => {
                  setIsDirty(true);
                  setSelectedPooja({ ...selectedPooja, timings: e.target.value });
                }}
                style={{ width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }}
              />
            </div>

            <div style={{ marginTop: "12px" }}>
              <label>Bottom Chants & Sacred Mantras:</label>
              <textarea
                rows="2"
                value={selectedPooja.bottom_notes || ""}
                onChange={(e) => {
                  setIsDirty(true);
                  setSelectedPooja({ ...selectedPooja, bottom_notes: e.target.value });
                }}
                style={{ width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button onClick={handleClosePopup} className="poojacancel_btn" style={{ flex: 1, padding: "10px" }}>
                Cancel
              </button>
              <button onClick={handleEditTemple} className="poojasave_btn" style={{ flex: 1, padding: "10px", background: "#e65100" }}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW TEMPLE DETAILS MODAL */}
      {isViewPopupOpen && selectedPooja && (
        <div className="view-popup" onClick={handleBackdropClick}>
          <div
            className="popup-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "680px", maxHeight: "85vh", overflowY: "auto", padding: "25px", textAlign: "left" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ background: "#e65100", color: "#fff", padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>
                  {selectedPooja.tag || "Divine Temple"}
                </span>
                <h2 style={{ margin: "8px 0 2px 0", color: "#1e293b" }}>{selectedPooja.name}</h2>
                {selectedPooja.subtitle && (
                  <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>{selectedPooja.subtitle}</p>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "20px", fontWeight: "bold", color: "#16a34a" }}>₹{selectedPooja.price}</span>
                <div style={{ fontSize: "12px", color: "#64748b" }}>Darshan / Entry</div>
              </div>
            </div>

            {selectedPooja.image && (
              <img
                src={selectedPooja.image}
                alt={selectedPooja.name}
                style={{ width: "100%", maxHeight: "240px", objectFit: "cover", borderRadius: "8px", marginTop: "15px" }}
              />
            )}

            {/* Gallery images */}
            {selectedPooja.gallery_images?.length > 0 && (
              <div style={{ marginTop: "10px" }}>
                <h5 style={{ margin: "5px 0", color: "#334155" }}>Photo Gallery ({selectedPooja.gallery_images.length})</h5>
                <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "5px" }}>
                  {selectedPooja.gallery_images.map((imgUrl, i) => (
                    <img key={i} src={imgUrl} alt="Gallery item" style={{ width: "80px", height: "60px", objectFit: "cover", borderRadius: "4px", border: "1px solid #ddd" }} />
                  ))}
                </div>
              </div>
            )}

            {/* Location and Contact */}
            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "6px", margin: "15px 0", fontSize: "14px", lineHeight: "1.6" }}>
              <div><FaMapMarkerAlt style={{ color: "#ea580c", marginRight: "6px" }} /> <strong>Location:</strong> {selectedPooja.location || selectedPooja.description}</div>
              {selectedPooja.map_url && (
                <div><a href={selectedPooja.map_url} target="_blank" rel="noreferrer" style={{ color: "#0284c7" }}>View on Google Maps</a></div>
              )}
              <div style={{ marginTop: "6px" }}><FaPhoneAlt style={{ color: "#2563eb", marginRight: "6px" }} /> <strong>Phone:</strong> {selectedPooja.number || "N/A"}</div>
              {selectedPooja.whatsapp_number && (
                <div><FaWhatsapp style={{ color: "#16a34a", marginRight: "6px" }} /> <strong>WhatsApp:</strong> {selectedPooja.whatsapp_number}</div>
              )}
              {selectedPooja.email && (
                <div><FaEnvelope style={{ color: "#64748b", marginRight: "6px" }} /> <strong>Email:</strong> {selectedPooja.email}</div>
              )}
              {selectedPooja.facebook_url && (
                <div><FaFacebook style={{ color: "#1877f2", marginRight: "6px" }} /> <a href={selectedPooja.facebook_url} target="_blank" rel="noreferrer">Facebook Page</a></div>
              )}
            </div>

            {/* Description / About */}
            {(selectedPooja.about || selectedPooja.description) && (
              <div style={{ marginTop: "10px" }}>
                <h5 style={{ color: "#0f172a", marginBottom: "4px" }}>About Temple</h5>
                <p style={{ fontSize: "14px", color: "#334155", lineHeight: "1.6", whiteSpace: "pre-line" }}>
                  {selectedPooja.about || selectedPooja.description}
                </p>
              </div>
            )}

            {/* Significance */}
            {selectedPooja.significance && (
              <div style={{ marginTop: "10px" }}>
                <h5 style={{ color: "#0f172a", marginBottom: "4px" }}>Significance & History</h5>
                <p style={{ fontSize: "14px", color: "#334155", lineHeight: "1.6", whiteSpace: "pre-line" }}>
                  {selectedPooja.significance}
                </p>
              </div>
            )}

            {/* Rituals */}
            {selectedPooja.rituals && (
              <div style={{ marginTop: "10px", background: "#fffbeb", padding: "12px", borderRadius: "6px", border: "1px solid #fde68a" }}>
                <h5 style={{ color: "#b45309", marginBottom: "6px" }}><FaPray style={{ marginRight: "6px" }} /> Special Poojas & Rituals</h5>
                <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "14px", color: "#78350f" }}>
                  {selectedPooja.rituals.split("\\n").filter(Boolean).map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Timings */}
            {selectedPooja.timings && (
              <div style={{ marginTop: "10px", background: "#f0fdf4", padding: "12px", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
                <h5 style={{ color: "#166534", marginBottom: "6px" }}><FaClock style={{ marginRight: "6px" }} /> Temple Timings</h5>
                <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "14px", color: "#14532d" }}>
                  {selectedPooja.timings.split("\\n").filter(Boolean).map((t, idx) => (
                    <li key={idx}>{t}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Bottom Mantras */}
            {selectedPooja.bottom_notes && (
              <div style={{ marginTop: "15px", textAlign: "center", color: "#c2410c", fontStyle: "italic", fontSize: "14px", background: "#fff7ed", padding: "10px", borderRadius: "6px" }}>
                {selectedPooja.bottom_notes.split("\\n").map((n, idx) => (
                  <div key={idx} style={{ fontWeight: "600" }}>{n}</div>
                ))}
              </div>
            )}

            <button
              onClick={handleClosePopup}
              className="pooja-close-btn"
              style={{ width: "100%", marginTop: "20px", padding: "10px", background: "#334155", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Templelist;
`;

const templeListPath = path.resolve(__dirname, '../../Admin-PrabhuPooja/src/Components/poojabooking/Templelist.jsx');
fs.writeFileSync(templeListPath, templeListContent, 'utf8');
console.log("Templelist.jsx updated successfully!");
