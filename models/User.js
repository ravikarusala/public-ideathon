var bcrypt = require('bcrypt-nodejs');
var crypto = require('crypto');
var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,

  judge: Boolean,

  profile: {
    name: { type: String, default: '' },
    gender: { type: String, default: '' },
    mentor: { type: Boolean, default: false },
    skills: { type: String, default: '' },
    location: { type: String, default: '' },
  },

  resetPasswordToken: String,
  resetPasswordExpires: Date
});

/**
 * Password hash middleware.
 */
userSchema.pre('save', function(next) {
  var user = this;
  if (!user.isModified('password')) return next();
  bcrypt.genSalt(10, function(err, salt) {
    if (err) return next(err);
    bcrypt.hash(user.password, salt, null, function(err, hash) {
      if (err) return next(err);
      user.password = hash;
      next();
    });
  });
});

/**
 * Helper method for validating user's password.
 */
userSchema.methods.comparePassword = function(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

/**
 * Helper method for getting user's gravatar.
 */
userSchema.methods.gravatar = function(size) {
  if (!size) size = 240;
  var md5 = crypto.createHash('md5').update(this.profile.name).digest('hex');
  return 'https://gravatar.com/avatar/' + md5 + '?s=' + size + '&d=retro';
};

userSchema.methods.getPic = function() {
  const pic = `https://outlook.office.com/owa/service.svc/s/GetPersonaPhoto?email=${this.email}&UA=0&size=HR240x240`;
  return pic;
};

userSchema.methods.getRecasedEmailAddress = function() {
  return this.email.split("@")[0].split(".").map(str => str.charAt(0).toUpperCase() + str.slice(1)).join(".") 
    + '@' + this.email.split("@")[1];
};

module.exports = mongoose.model('User', userSchema);
