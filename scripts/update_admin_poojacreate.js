const fs = require('fs');
const path = require('path');

// 1. Update Poojacreate.jsx
const poojacreatePath = path.resolve(__dirname, '../../Admin-PrabhuPooja/src/Components/poojabooking/Poojacreate.jsx');
let poojacreateContent = fs.readFileSync(poojacreatePath, 'utf8');

// Add temple gallery state if not present
if (!poojacreateContent.includes('templeGalleryFiles')) {
  poojacreateContent = poojacreateContent.replace(
    'const [productFiles, setProductFiles] = useState([]);',
    `const [productFiles, setProductFiles] = useState([]);
  const [templeGalleryFiles, setTempleGalleryFiles] = useState([]);
  const [templeGalleryPreviews, setTempleGalleryPreviews] = useState([]);`
  );
}

// Update handleCreateTemple
const newHandleCreateTemple = `  // create temple api with rich fields & multi-image gallery
  const handleCreateTemple = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.name) {
      Swal.fire({
        icon: "warning",
        title: "Validation Error",
        text: "Temple name is required.",
      });
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append("name", formData.name || "");
    formDataToSend.append("tag", formData.tag || "Divine Temple");
    formDataToSend.append("subtitle", formData.subtitle || "");
    formDataToSend.append("price", formData.price || "0");
    formDataToSend.append("location", formData.location || formData.description || "");
    formDataToSend.append("description", formData.about || formData.description || "");
    formDataToSend.append("map_url", formData.map_url || "");
    formDataToSend.append("about", formData.about || formData.description || "");
    formDataToSend.append("significance", formData.significance || "");
    formDataToSend.append("rituals", formData.rituals || "");
    formDataToSend.append("timings", formData.timings || "");
    formDataToSend.append("number", formData.number || "");
    formDataToSend.append("whatsapp_number", formData.whatsapp_number || formData.number || "");
    formDataToSend.append("email", formData.email || "");
    formDataToSend.append("facebook_url", formData.facebook_url || "");
    formDataToSend.append("bottom_notes", formData.bottom_notes || "");

    if (formData.image) {
      formDataToSend.append("image", formData.image);
    }

    // Append multiple gallery images
    if (templeGalleryFiles && templeGalleryFiles.length > 0) {
      templeGalleryFiles.forEach((file) => {
        formDataToSend.append("gallery", file);
      });
    }

    try {
      const response = await addTemple(formDataToSend);
      if (response?.data?.success || response?.status === 200 || response?.status === 201) {
        Swal.fire({
          icon: "success",
          title: "Temple Created!",
          text: "The Temple and gallery photos have been registered successfully.",
          confirmButtonText: "OK",
        });
        setFormData((prev) => ({
          ...prev,
          name: "",
          price: "",
          tag: "Divine Temple",
          subtitle: "",
          location: "",
          description: "",
          map_url: "",
          about: "",
          significance: "",
          rituals: "",
          timings: "",
          number: "",
          whatsapp_number: "",
          email: "",
          facebook_url: "",
          bottom_notes: "",
          image: null,
        }));
        setImagePreview(null);
        setTempleGalleryFiles([]);
        setTempleGalleryPreviews([]);
      }
    } catch (err) {
      console.error("Error creating temple:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err?.response?.data?.message || "Something went wrong while creating the temple.",
        confirmButtonText: "OK",
      });
    }
  };`;

// Replace handleCreateTemple function in Poojacreate.jsx
const regexHandleTemple = /const handleCreateTemple = async \(\) => {[\s\S]*?const handleCreatePandit = async \(\) => {/;
poojacreateContent = poojacreateContent.replace(
  regexHandleTemple,
  `${newHandleCreateTemple}\n\n  // create pandit api\n  const handleCreatePandit = async () => {`
);

// Replace Temple Form JSX in Poojacreate.jsx
const newTempleFormJSX = `    } else if (cleanName.includes("temple") || cleanName.includes("mandir")) {
      return (
        <div className="poojabooking_form">
          <div className="poojabooking_box" style={{ maxWidth: "850px", margin: "0 auto" }}>
            <h2>Temple Create & Management</h2>
            <p style={{ color: "#666", fontSize: "14px", marginBottom: "20px" }}>
              Add full temple details, multi-image gallery, timings, rituals, and location for devotees.
            </p>
            <form onSubmit={handleCreateTemple}>
              {/* Section 1: Basic Information */}
              <div style={{ background: "#fff8f0", padding: "15px", borderRadius: "8px", marginBottom: "15px", border: "1px solid #ffe0b2" }}>
                <h4 style={{ color: "#d84315", marginBottom: "10px" }}>1. Basic Information</h4>
                <div className="poojabooking_input">
                  <label>
                    Temple Name *
                    <input
                      type="text"
                      name="name"
                      value={formData.name || ""}
                      onChange={handleChange}
                      placeholder="e.g. Panchmukhi Shani Hanuman Mandir"
                      required
                    />
                  </label>
                  <label>
                    Category / Tag
                    <select
                      name="tag"
                      value={formData.tag || "Divine Temple"}
                      onChange={handleChange}
                      style={{ height: "42px", borderRadius: "5px", padding: "0 10px", border: "1px solid #ccc" }}
                    >
                      <option value="Divine Temple">Divine Temple</option>
                      <option value="Jyotirlinga">Jyotirlinga Temple</option>
                      <option value="Siddhapeeth">Siddhapeeth</option>
                      <option value="Dham">Char Dham</option>
                      <option value="Historical Temple">Historical Temple</option>
                    </select>
                  </label>
                </div>

                <div className="poojabooking_input">
                  <label>
                    Deity / Subtitle
                    <input
                      type="text"
                      name="subtitle"
                      value={formData.subtitle || ""}
                      onChange={handleChange}
                      placeholder="e.g. Dedicated to Lord Shanidev & Hanuman Ji"
                    />
                  </label>
                  <label>
                    VIP Darshan / Starting Fee (₹)
                    <input
                      type="number"
                      name="price"
                      value={formData.price || ""}
                      onChange={handleChange}
                      placeholder="e.g. 501"
                    />
                  </label>
                </div>

                <div className="poojabooking_input">
                  <label>
                    Location (City, State) *
                    <input
                      type="text"
                      name="location"
                      value={formData.location || formData.description || ""}
                      onChange={(e) => {
                        handleChange(e);
                        setFormData(prev => ({ ...prev, description: e.target.value, location: e.target.value }));
                      }}
                      placeholder="e.g. Indore, Madhya Pradesh"
                      required
                    />
                  </label>
                  <label>
                    Google Maps Link
                    <input
                      type="url"
                      name="map_url"
                      value={formData.map_url || ""}
                      onChange={handleChange}
                      placeholder="https://maps.google.com/..."
                    />
                  </label>
                </div>
              </div>

              {/* Section 2: Media & Gallery */}
              <div style={{ background: "#f3f8ff", padding: "15px", borderRadius: "8px", marginBottom: "15px", border: "1px solid #bbdefb" }}>
                <h4 style={{ color: "#1565c0", marginBottom: "10px" }}>2. Temple Photos & Gallery</h4>
                <label>
                  Main Cover / Banner Image *
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
                {imagePreview && (
                  <div className="image_preview" style={{ marginBottom: "15px" }}>
                    <img src={imagePreview} alt="Temple Cover Preview" style={{ maxHeight: "150px", borderRadius: "6px" }} />
                  </div>
                )}

                <label style={{ marginTop: "10px" }}>
                  Upload Multiple Gallery Images (Up to 10 photos)
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files);
                      setTempleGalleryFiles(files);
                      const previews = files.map(file => URL.createObjectURL(file));
                      setTempleGalleryPreviews(previews);
                    }}
                  />
                </label>
                {templeGalleryPreviews.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "10px" }}>
                    {templeGalleryPreviews.map((src, idx) => (
                      <div key={idx} style={{ position: "relative", width: "80px", height: "80px", border: "1px solid #ddd", borderRadius: "6px", overflow: "hidden" }}>
                        <img src={src} alt="Gallery Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 3: Contact & Links */}
              <div style={{ background: "#f0fdf4", padding: "15px", borderRadius: "8px", marginBottom: "15px", border: "1px solid #bbf7d0" }}>
                <h4 style={{ color: "#166534", marginBottom: "10px" }}>3. Contact & Social Links</h4>
                <div className="poojabooking_input">
                  <label>
                    Contact / Pandit Phone
                    <input
                      type="text"
                      name="number"
                      value={formData.number || ""}
                      onChange={handleChange}
                      placeholder="e.g. 9302603066"
                    />
                  </label>
                  <label>
                    WhatsApp Number (for Devotees)
                    <input
                      type="text"
                      name="whatsapp_number"
                      value={formData.whatsapp_number || ""}
                      onChange={handleChange}
                      placeholder="e.g. 7225016699"
                    />
                  </label>
                </div>

                <div className="poojabooking_input">
                  <label>
                    Notification Email
                    <input
                      type="email"
                      name="email"
                      value={formData.email || ""}
                      onChange={handleChange}
                      placeholder="e.g. enquiry@prabhupooja.com"
                    />
                  </label>
                  <label>
                    Facebook Page URL
                    <input
                      type="url"
                      name="facebook_url"
                      value={formData.facebook_url || ""}
                      onChange={handleChange}
                      placeholder="https://facebook.com/..."
                    />
                  </label>
                </div>
              </div>

              {/* Section 4: Rich Content */}
              <div style={{ background: "#fdf4ff", padding: "15px", borderRadius: "8px", marginBottom: "20px", border: "1px solid #f5d0fe" }}>
                <h4 style={{ color: "#86198f", marginBottom: "10px" }}>4. Temple Description, Rituals & Timings</h4>
                <label>
                  About Temple / Description
                  <textarea
                    name="about"
                    rows="4"
                    value={formData.about || formData.description || ""}
                    onChange={(e) => {
                      handleChange(e);
                      setFormData(prev => ({ ...prev, about: e.target.value, description: e.target.value }));
                    }}
                    placeholder="Describe the temple, history, and spiritual aura..."
                    style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
                  />
                </label>

                <label style={{ marginTop: "10px" }}>
                  Temple Significance & History
                  <textarea
                    name="significance"
                    rows="3"
                    value={formData.significance || ""}
                    onChange={handleChange}
                    placeholder="Significance of deity, blessings received, and historical background..."
                    style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
                  />
                </label>

                <label style={{ marginTop: "10px" }}>
                  Available Poojas & Special Rituals (One per line)
                  <textarea
                    name="rituals"
                    rows="4"
                    value={formData.rituals || ""}
                    onChange={handleChange}
                    placeholder="शनि शांति अनुष्ठान&#10;शनि महादशा निवारण पूजा&#10;पंचमुखी संकटमोचन सुरक्षा पूजा&#10;विशेष कालसर्प दोष निवारण..."
                    style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
                  />
                </label>

                <label style={{ marginTop: "10px" }}>
                  Temple & Aarti Timings (One per line)
                  <textarea
                    name="timings"
                    rows="3"
                    value={formData.timings || ""}
                    onChange={handleChange}
                    placeholder="Morning Darshan: 6:00 AM to 12:00 PM&#10;Evening Darshan: 4:00 PM to 9:00 PM&#10;Special Saturday Pooja Available..."
                    style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
                  />
                </label>

                <label style={{ marginTop: "10px" }}>
                  Sacred Chants / Mantras / Bottom Notes
                  <textarea
                    name="bottom_notes"
                    rows="2"
                    value={formData.bottom_notes || ""}
                    onChange={handleChange}
                    placeholder="|| ॐ शं शनैश्चराय नमः ||&#10;|| ॐ हनुमते नमः ||"
                    style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
                  />
                </label>
              </div>

              <button
                type="submit"
                className="poojabooking_btn"
                onClick={handleCreateTemple}
                style={{ width: "100%", padding: "12px", fontSize: "16px", background: "#e65100" }}
              >
                Create & Publish Temple
              </button>
            </form>
          </div>
        </div>
      );`;

const regexTempleForm = /} else if \(cleanName\.includes\("temple"\) \|\| cleanName\.includes\("mandir"\)\) {[\s\S]*?} else if \(cleanName\.includes\("pandit"\)/;
poojacreateContent = poojacreateContent.replace(
  regexTempleForm,
  `${newTempleFormJSX}\n    } else if (cleanName.includes("pandit")`
);

fs.writeFileSync(poojacreatePath, poojacreateContent, 'utf8');
console.log("Poojacreate.jsx updated successfully!");
