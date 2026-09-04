const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport = require('passport');
const db = require('../config/db');
const config = require('./env');

passport.use(new GoogleStrategy({
  clientID: config.GOOGLE.clientId,
  clientSecret: config.GOOGLE.clientSecret,
  callbackURL: config.GOOGLE.callbackUrl,
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
