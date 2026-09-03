const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport = require('passport');
const db = require('../config/db');


passport.use(new GoogleStrategy({
  clientID: '778173285670-45vnhj5hjoi06cvhc2n5pr0scadcgd0v.apps.googleusercontent.com',
  clientSecret: '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',
  // callbackURL: "https://prabhupooja-backend.onrender.com/auth/google/callback"
  callbackURL: "http://localhost:3002/auth/google/callback"
},
  async (accessToken, refreshToken, profile, done) => {

    try {
      const googleId = profile.id;
      const displayName = profile.displayName;
      const [name, lastname] = displayName.split(' ');
      const email = profile.emails[0].value;
      const image = profile.photos[0].value;
      let [rows] = await db.query(
        'SELECT * FROM users WHERE google_id = ? OR email = ?',
        [googleId, email]
      );

      if (rows.length === 0) {
        await db.query(
            'INSERT INTO users (google_id, name, lastname, email, image) VALUES (?, ?, ?, ?, ?)',
            [googleId, name, lastname, email, image]
          );

        [rows] = await db.query('SELECT * FROM users WHERE google_id = ?', [googleId]);
      }

      const user = rows[0]; 
      done(null, user);
    } catch (err) {
      console.error('Google Strategy Error:', err);
      done(err, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});
