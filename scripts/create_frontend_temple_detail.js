const fs = require('fs');
const path = require('path');

const templeDetailJSX = `import React, { useEffect, useState } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import api from "../Axios/api";
import useAuthStore from "../../Store/UserStore/userAuthStore";
import Swal from "sweetalert2";
import NewLoader from "../NewLoader/NewLoader";
import "./TempleDetail.css";

const TempleDetail = () => {
  const { id: paramId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user1 } = useAuthStore();

  // Resolve temple ID from params or route location state or URL path
  const pathId = location.pathname.split("/").filter(Boolean).pop();
  const templeId = paramId || location.state?.id || location.state?.templeId || pathId || "1";

  const [temple, setTemple] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchTempleDetail = async () => {
      try {
        setLoading(true);
        const response = await api.get(\`/temple/gettemple/\${templeId}\`);
        if (response?.data?.data) {
          const data = response.data.data;
          setTemple(data);
          setActiveImage(data.image || (data.gallery_images && data.gallery_images[0]));
        }
      } catch (error) {
        console.error("Error fetching temple details:", error);
      } finally {
        setLoading(false);
      }
    };

    if (templeId) {
      fetchTempleDetail();
    }
  }, [templeId]);

  const handleBookNow = () => {
    if (!user1) {
      Swal.fire({
        title: "Login Required",
        text: "Please login to book a temple pooja / VIP darshan!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Login Now",
        cancelButtonText: "Cancel",
      }).then((result) => {
        if (result.isConfirmed) {
          navigate("/login");
        }
      });
    } else {
      navigate("/booknowform", {
        state: {
          templeId: temple?.id || templeId,
          price: temple?.price || 501,
        },
      });
    }
  };

  if (loading) {
    return <NewLoader />;
  }

  if (!temple) {
    return (
      <div className="container" style={{ padding: "100px 0", textAlign: "center" }}>
        <h2>Temple Not Found</h2>
        <p>The requested temple details could not be found.</p>
        <Link to="/temple" className="primary_btn_pshm" style={{ display: "inline-block", marginTop: "20px" }}>
          View All Temples
        </Link>
      </div>
    );
  }

  // Format paragraphs
  const aboutParagraphs = (temple.about || temple.description || "")
    .split("\\n")
    .map((p) => p.trim())
    .filter(Boolean);

  // Format significance
  const significanceParagraphs = (temple.significance || "")
    .split("\\n")
    .map((p) => p.trim())
    .filter(Boolean);

  // Format rituals list
  const ritualsList = (temple.rituals || "")
    .split("\\n")
    .map((r) => r.trim())
    .filter(Boolean);

  // Format timings list
  const timingsList = (temple.timings || "")
    .split("\\n")
    .map((t) => t.trim())
    .filter(Boolean);

  // Format bottom chants
  const bottomChants = (temple.bottom_notes || "")
    .split("\\n")
    .map((c) => c.trim())
    .filter(Boolean);

  const galleryList = temple.gallery_images && Array.isArray(temple.gallery_images)
    ? temple.gallery_images
    : (temple.image ? [temple.image] : []);

  const whatsappNum = temple.whatsapp_number || temple.number || "7225016699";
  const facebookUrl = temple.facebook_url || "https://www.facebook.com/profile.php?id=61565211141697";
  const mapUrl = temple.map_url || (temple.location ? \`https://maps.google.com/?q=\${encodeURIComponent(temple.name + " " + temple.location)}\` : null);

  return (
    <>
      {/* Hero Header Section */}
      <div className="sub_header_pshm">
        <div className="overlay_pshm"></div>

        <div className="container">
          <div className="subheader_inner_pshm">
            <div className="subheader_text_pshm">
              <h1>{temple.name}</h1>
              {temple.subtitle && (
                <p style={{ color: "#ffedd5", fontSize: "22px", marginTop: "10px", fontWeight: "500" }}>
                  {temple.subtitle}
                </p>
              )}
            </div>

            <nav aria-label="breadcrumb">
              <ol className="breadcrumb">
                <li className="breadcrumb-item">
                  <Link className="btn-link" to="/">
                    Home
                  </Link>
                </li>
                <li className="breadcrumb-item">
                  <Link className="btn-link" to="/temple">
                    Temples
                  </Link>
                </li>
                <li className="breadcrumb-item active">
                  {temple.name}
                </li>
              </ol>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Temple Details Section */}
      <div className="pshm_section">
        <div className="container">
          <div className="row align-items-start">
            {/* Left Side: Main Photo + Interactive Multi-Image Gallery */}
            <div className="col-lg-5 col-md-12">
              <div className="image_card_pshm">
                <span className="tag_pshm">{temple.tag || "Divine Temple"}</span>

                <img
                  src={activeImage || temple.image}
                  alt={temple.name}
                  className="templeimg_pshm"
                />
              </div>

              {/* Gallery Thumbnails */}
              {galleryList.length > 0 && (
                <div className="image_gallery_pshm">
                  {galleryList.map((imgUrl, index) => (
                    <div
                      key={index}
                      onClick={() => setActiveImage(imgUrl)}
                      className={\`gallery_thumb_wrapper \${activeImage === imgUrl ? "active_thumb" : ""}\`}
                    >
                      <img
                        src={imgUrl}
                        alt={\`\${temple.name} \${index + 1}\`}
                        className="gallery_img_pshm"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Side: Actions, Content, Rituals, Timings, Location */}
            <div className="col-lg-7 col-md-12">
              <div className="temple_content_pshm">
                {/* Action Buttons */}
                <div className="button_group_pshm">
                  <Link className="primary_btn_pshm" to="/enquiryform">
                    Enquiry Now
                  </Link>

                  <a
                    className="primary_btn_pshm facebook"
                    href={facebookUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <i className="fa-brands fa-facebook-f" />
                    Facebook
                  </a>

                  <a
                    className="primary_btn_pshm whatsapp"
                    href={\`https://wa.me/\${whatsappNum}?text=\${encodeURIComponent("Namaste, I want to inquire about " + temple.name)}\`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <i className="fa-brands fa-whatsapp" />
                    Whatsapp
                  </a>

                  <button className="primary_btn_pshm orange" onClick={handleBookNow}>
                    Book Now (₹{temple.price || 501})
                  </button>
                </div>

                {/* Title */}
                <h2 className="heading_pshm">
                  {temple.name}
                </h2>

                {/* About Paragraphs */}
                {aboutParagraphs.map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}

                {/* Special Poojas & Rituals Section */}
                {ritualsList.length > 0 && (
                  <div className="info_box_pshm">
                    <h3>विशेष पूजा एवं अनुष्ठान</h3>
                    <ul>
                      {ritualsList.map((ritual, idx) => (
                        <li key={idx}>{ritual}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Temple Significance & History */}
                {significanceParagraphs.length > 0 && (
                  <div className="info_box_pshm">
                    <h3>Temple Significance & History</h3>
                    {significanceParagraphs.map((para, idx) => (
                      <p key={idx} style={{ marginBottom: "10px" }}>{para}</p>
                    ))}
                  </div>
                )}

                {/* Temple Timings */}
                {timingsList.length > 0 && (
                  <div className="info_box_pshm">
                    <h3>Temple Timings</h3>
                    <ul>
                      {timingsList.map((time, idx) => (
                        <li key={idx}>{time}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Temple Location */}
                <div className="location_box_pshm">
                  <h3>Temple Location</h3>
                  <p style={{ margin: "0 0 10px 0", color: "#444", fontWeight: "500" }}>
                    📍 {temple.location || temple.description || "Holy Shrine"}
                  </p>
                  {mapUrl && (
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View Location on Google Maps →
                    </a>
                  )}
                </div>

                {/* Bottom Sacred Chants & Mantras */}
                {bottomChants.length > 0 && (
                  <div className="bottom_text_pshm">
                    {bottomChants.map((chant, idx) => (
                      <h4 key={idx}>{chant}</h4>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TempleDetail;
`;

const templeDetailCSS = `/* ===========================
   HERO SECTION
=========================== */

.sub_header_pshm {
  position: relative;
  background-image: url("../../Components/Assets/3.webp");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  overflow: visible;
  margin-bottom: 70px;
}

.overlay_pshm {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to right,
    rgba(0, 0, 0, 0.75),
    rgba(0, 0, 0, 0.4)
  );
}

.subheader_inner_pshm {
  position: relative;
  z-index: 2;
  padding: 140px 0 120px;
}

.subheader_text_pshm h1 {
  font-size: 54px;
  font-weight: 800;
  line-height: 1.15;
  color: #fff;
  margin-bottom: 5px;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.sub_header_pshm .breadcrumb {
  background: #fff;
  padding: 14px 30px;
  border-radius: 50px;
  position: absolute;
  bottom: -24px;
  left: 50%;
  transform: translateX(-50%);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  display: flex;
  justify-content: center;
  align-items: center;
}

.breadcrumb {
  display: flex;
  align-items: center;
  list-style: none;
  margin: 0;
  gap: 8px;
}

.breadcrumb-item {
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
}

.breadcrumb-item::after {
  content: "/";
  margin-left: 8px;
  color: #999;
}

.breadcrumb-item:last-child::after {
  content: "";
}

.breadcrumb-item a {
  color: #111;
  text-decoration: none;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 13px;
}

.breadcrumb-item.active {
  color: #ff6b00;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 13px;
}

/* ===========================
   MAIN SECTION
=========================== */

.pshm_section {
  padding: 40px 0 70px;
  margin-top: 20px;
}

.image_card_pshm {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.12);
  background: #f8fafc;
}

.tag_pshm {
  position: absolute;
  top: 18px;
  left: 18px;
  z-index: 2;
  background: linear-gradient(135deg, #ff6b00, #ea580c);
  color: #fff;
  padding: 7px 16px;
  border-radius: 30px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 12px rgba(234, 88, 12, 0.35);
}

.templeimg_pshm {
  width: 100%;
  min-height: 380px;
  max-height: 480px;
  object-fit: cover;
  display: block;
  transition: transform 0.4s ease;
}

.image_card_pshm:hover .templeimg_pshm {
  transform: scale(1.02);
}

.image_gallery_pshm {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.gallery_thumb_wrapper {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.25s ease;
  height: 90px;
  background: #f1f5f9;
}

.gallery_thumb_wrapper:hover {
  transform: translateY(-2px);
  border-color: #ff6b00;
  box-shadow: 0 6px 16px rgba(255, 107, 0, 0.25);
}

.gallery_thumb_wrapper.active_thumb {
  border-color: #ea580c;
  box-shadow: 0 0 0 2px rgba(234, 88, 12, 0.4);
}

.gallery_img_pshm {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* ===========================
   CONTENT
=========================== */

.temple_content_pshm {
  padding-left: 20px;
}

.heading_pshm {
  font-size: 34px;
  font-weight: 800;
  margin-bottom: 18px;
  color: #1a1a1a;
  line-height: 1.25;
}

.temple_content_pshm p {
  font-size: 15.5px;
  line-height: 28px;
  color: #4b5563;
  margin-bottom: 16px;
}

/* ===========================
   BUTTONS
=========================== */

.button_group_pshm {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
}

.primary_btn_pshm {
  background: #9d1220;
  color: #fff;
  text-decoration: none;
  padding: 10px 22px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
}

.primary_btn_pshm:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  color: #fff;
}

.primary_btn_pshm.whatsapp {
  background: #d0973a;
}

.primary_btn_pshm.facebook {
  background: #3b5998;
}

.primary_btn_pshm.orange {
  background: #ea580c;
  font-weight: 700;
}

/* ===========================
   INFO BOX
=========================== */

.info_box_pshm {
  background: #fff8f3;
  border-left: 4px solid #ff6b00;
  padding: 20px 24px;
  border-radius: 12px;
  margin-top: 22px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
}

.info_box_pshm h3 {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 14px;
  color: #9a3412;
}

.info_box_pshm ul {
  padding-left: 20px;
  margin: 0;
}

.info_box_pshm ul li {
  margin-bottom: 10px;
  font-size: 15px;
  color: #374151;
  line-height: 24px;
}

.info_box_pshm p {
  font-size: 15px;
  color: #374151;
  line-height: 26px;
}

/* ===========================
   LOCATION
=========================== */

.location_box_pshm {
  margin-top: 24px;
  padding: 20px 24px;
  background: linear-gradient(135deg, #fff7ed, #ffedd5);
  border-radius: 14px;
  border: 1px solid #fed7aa;
}

.location_box_pshm h3 {
  margin-bottom: 10px;
  font-size: 20px;
  font-weight: 700;
  color: #9a3412;
}

.location_box_pshm a {
  color: #ea580c;
  text-decoration: none;
  font-weight: 700;
  font-size: 14px;
}

.location_box_pshm a:hover {
  text-decoration: underline;
}

/* ===========================
   BOTTOM TEXT
=========================== */

.bottom_text_pshm {
  text-align: center;
  margin-top: 35px;
  padding: 15px;
  background: #fafaf9;
  border-radius: 12px;
}

.bottom_text_pshm h4 {
  font-size: 20px;
  margin-bottom: 8px;
  color: #9d1220;
  font-weight: 700;
}

.bottom_text_pshm h4:last-child {
  margin-bottom: 0;
}

/* ===========================
   RESPONSIVE
=========================== */

@media (max-width: 991px) {
  .temple_content_pshm {
    padding-left: 0;
    margin-top: 35px;
  }

  .subheader_text_pshm h1 {
    font-size: 38px;
  }

  .templeimg_pshm {
    min-height: 300px;
  }

  .button_group_pshm {
    flex-direction: row;
  }
}

@media (max-width: 768px) {
  .subheader_inner_pshm {
    padding: 90px 0 80px;
  }

  .subheader_text_pshm h1 {
    font-size: 28px;
  }

  .sub_header_pshm .breadcrumb {
    padding: 10px 18px;
    bottom: -18px;
  }

  .heading_pshm {
    font-size: 24px;
  }

  .button_group_pshm {
    flex-direction: column;
  }

  .primary_btn_pshm {
    width: 100%;
    text-align: center;
  }

  .image_gallery_pshm {
    grid-template-columns: repeat(3, 1fr);
  }

  .gallery_thumb_wrapper {
    height: 75px;
  }
}
`;

const jsxPath = path.resolve(__dirname, '../../Frontend-Prabhupooja/FRONTEND/src/Components/temple/TempleDetail.jsx');
const cssPath = path.resolve(__dirname, '../../Frontend-Prabhupooja/FRONTEND/src/Components/temple/TempleDetail.css');

fs.writeFileSync(jsxPath, templeDetailJSX, 'utf8');
fs.writeFileSync(cssPath, templeDetailCSS, 'utf8');

console.log("TempleDetail.jsx and TempleDetail.css created successfully!");
