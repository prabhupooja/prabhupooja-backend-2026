const db = require('../config/db');

async function migrate() {
  console.log("Starting temple schema migration...");

  const columnsToAdd = [
    { name: "tag", type: "VARCHAR(255) DEFAULT 'Divine Temple'" },
    { name: "subtitle", type: "VARCHAR(255) DEFAULT NULL" },
    { name: "location", type: "VARCHAR(255) DEFAULT NULL" },
    { name: "map_url", type: "TEXT DEFAULT NULL" },
    { name: "gallery_images", type: "LONGTEXT DEFAULT NULL" },
    { name: "about", type: "LONGTEXT DEFAULT NULL" },
    { name: "significance", type: "LONGTEXT DEFAULT NULL" },
    { name: "rituals", type: "LONGTEXT DEFAULT NULL" },
    { name: "timings", type: "LONGTEXT DEFAULT NULL" },
    { name: "whatsapp_number", type: "VARCHAR(50) DEFAULT NULL" },
    { name: "facebook_url", type: "VARCHAR(500) DEFAULT NULL" },
    { name: "bottom_notes", type: "TEXT DEFAULT NULL" },
    { name: "status", type: "ENUM('Active', 'Inactive') DEFAULT 'Active'" }
  ];

  try {
    const [existingCols] = await db.query("DESCRIBE temple");
    const existingColNames = existingCols.map(c => c.Field.toLowerCase());

    for (const col of columnsToAdd) {
      if (!existingColNames.includes(col.name.toLowerCase())) {
        console.log(`Adding column: ${col.name}`);
        await db.query(`ALTER TABLE temple ADD COLUMN \`${col.name}\` ${col.type}`);
      } else {
        console.log(`Column ${col.name} already exists.`);
      }
    }

    console.log("Schema migration complete. Now seeding rich data for existing temples...");

    // Seed / Update Temple 1: Khajrana Ganesh Mandir
    await db.query(`
      UPDATE temple SET
        tag = 'Divine Temple',
        subtitle = 'Khajrana Temple Pooja & Darshan',
        location = 'Indore, Madhya Pradesh',
        map_url = 'https://maps.google.com/?q=Khajrana+Ganesh+Mandir+Indore',
        about = 'The Khajrana Ganesh Temple is dedicated to Lord Ganesh, located in the Khajrana area of Indore city. It is one of the most powerful and revered Ganesh shrines in Central India where thousands of devotees gather daily for darshan, modak offerings, and special aartis.',
        significance = 'The temple was established by Rani Ahilyabai Holkar, the ruler of Indore, in the 18th century. It is believed that praying here with true devotion fulfills all wishes, removes life obstacles, and brings prosperity and peace.',
        rituals = 'गणेश अथर्वशीर्ष पाठ\\nविशेष मोदक महाभोग अनुष्ठान\\nसंकटनाशन गणेश स्तोत्र जप\\nदूर्वा एवं सिंदूर अभिषेक पूजा\\nदैनिक प्रातः एवं सांध्य आरती\\nविशेष बुधवार पूजन',
        timings = 'Morning Darshan: 5:00 AM to 12:00 PM\\nEvening Darshan: 4:00 PM to 11:00 PM\\nMorning Aarti: 8:00 AM\\nEvening Aarti: 8:00 PM\\nAbhishek Time: 5:30 AM to 6:30 AM',
        whatsapp_number = '7225016699',
        facebook_url = 'https://www.facebook.com/profile.php?id=61565211141697',
        bottom_notes = '|| वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ ||\\n|| निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा ||',
        gallery_images = '["https://www.prabhupooja.com/static/media/khajranatemple-img.fe6f29274d72c40aa458.jpeg"]'
      WHERE id = 1
    `);

    // Seed / Update Temple 2: Ujjain Mahakal Mandir
    await db.query(`
      UPDATE temple SET
        tag = 'Jyotirlinga Temple',
        subtitle = 'Shri Mahakaleshwar Jyotirlinga Pooja & Darshan',
        location = 'Ujjain, Madhya Pradesh',
        map_url = 'https://maps.google.com/?q=Mahakaleshwar+Jyotirlinga+Ujjain',
        about = 'Mahakal Mandir in Ujjain, also known as Mahakaleshwar Jyotirlinga, is one of the twelve sacred Jyotirlingas of Lord Shiva. Situated on the holy banks of river Shipra, it is revered as a Dakshinmukhi Swayambhu lingam holding immense cosmic and spiritual power.',
        significance = 'The temple exhibits classic ancient architectural grandeur and is famous worldwide for the divine Bhasma Aarti. Devotees visit from across the globe to seek liberation from untimely death (Akaal Mrityu) and achieve peace, strength, and enlightenment.',
        rituals = 'श्री महाकाल भस्म आरती\\nरुद्राभिषेक एवं महामृत्युंजय जप\\nकालसर्प दोष एवं नागबलि शांति पूजा\\nविशेष पंचामृत अभिषेक\\nसांध्य आरती एवं शृंगार दर्शन\\nसोमवार विशेष भस्म पूजन',
        timings = 'Temple Opening: 4:00 AM\\nBhasma Aarti: 4:00 AM to 6:00 AM\\nMorning Aarti: 7:00 AM to 7:30 AM\\nEvening Aarti: 5:00 PM to 5:30 PM\\nShri Mahakal Aarti: 7:00 PM to 7:30 PM\\nTemple Closing: 11:00 PM',
        whatsapp_number = '7225016699',
        facebook_url = 'https://www.facebook.com/profile.php?id=61565211141697',
        bottom_notes = '|| ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम् ||\\n|| उर्वारुकमिव बन्धनान्मृत्योर्मुक्षीय माऽमृतात् ||\\n|| ॐ नमः शिवाय ||',
        gallery_images = '["https://www.prabhupooja.com/static/media/ujjaintemple-img.b47bb15007eaee1e36f2.jpeg"]'
      WHERE id = 2
    `);

    // Seed / Update Temple 3: Panchmukhi Shani Hanuman Mandir
    await db.query(`
      UPDATE temple SET
        tag = 'Divine Temple',
        subtitle = 'Lord Shanidev & Panchmukhi Hanuman Ji',
        location = 'Indore, Madhya Pradesh',
        map_url = 'https://share.google/ARpxTZuexHY8VobeJ',
        about = 'Panchmukhi Shani Hanuman Mandir is a sacred spiritual place devoted to Lord Shanidev, Panchmukhi Hanuman Ji, and Lord Shiva. Devotees visit this temple to seek protection, positivity, strength, peace, and relief from negative planetary effects.\\n\\nThe divine atmosphere of the temple creates a feeling of devotion and inner peace. Regular puja, abhishek, mantra jaap, and vishesh aaraadhana are performed here with great faith and dedication.\\n\\nPanchmukhi Hanuman Ji is worshipped for courage, protection, and spiritual power, while Lord Shanidev is worshipped to reduce hardships and bring discipline, justice, and success in life.',
        significance = 'This temple is known among devotees for its spiritual energy and peaceful environment. Many devotees visit on Saturdays, Hanuman Jayanti, and special Shiv puja occasions to perform prayers and seek blessings.\\n\\nThe temple represents faith, devotion, and divine energy, where devotees gather to perform puja and experience spiritual positivity.',
        rituals = 'शनि शांति अनुष्ठान\\nशनि महादशा निवारण पूजा\\nसाढ़े साती एवं ढैय्या शांति पूजा\\nपंचमुखी संकटमोचन सुरक्षा पूजा\\n1008 शनि महामंत्र जाप\\nतेल एवं तिल अभिषेक अनुष्ठान\\nविशेष कालसर्प दोष निवारण',
        timings = 'Morning Darshan: 6:00 AM to 12:00 PM\\nEvening Darshan: 4:00 PM to 9:00 PM\\nSpecial Saturday Pooja Available',
        whatsapp_number = '7225016699',
        facebook_url = 'https://www.facebook.com/profile.php?id=61565211141697',
        bottom_notes = '|| ॐ शं शनैश्चराय नमः ||\\n|| ॐ हनुमते नमः ||\\n|| ॐ नमः शिवाय ||',
        gallery_images = '["https://prabhupooja1.s3.ap-south-1.amazonaws.com/onlinePooja/1778585810611-ChatGPT%20Image%20May%2012%2C%202026%2C%2005_04_50%20PM.png"]'
      WHERE id = 3
    `);

    console.log("Seeding and migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
