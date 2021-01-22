var mongoose = require('mongoose');
var md = require("node-markdown").Markdown;
var express = require('express');
var fileUpload = require('express-fileupload');
var path = require('path');

/**
 * GET /events
 * List all events.
 */
var Event = require('../models/Event.js');
var User = require('../models/User');
var Season = require('../models/Season');
var Category = require('../models/Category');

exports.getEvents = function(req, res) {
  Event.find(function(err, events) {
    Season.find(function(err, seasons) {
      Category.find(function(err, categories) {
        var categoryLookup = {};
        for (var i = 0; i < categories.length; i++) {
          categoryLookup[categories[i]._id] = categories[i].name;
        }
        res.render('home', { md: md, events: events, seasons : seasons, categories: categories, categoryLookup: categoryLookup});
      });
    });
  });
};

exports.search = function(req, res) {
	
  if(req.body.title === '*') {
    req.body.title = '';
  }
  
  Event.find({title : {$regex : new RegExp(req.body.title, "i") },
                        category : req.body.category ? req.body.category : { $ne : '' },
                        season : req.body.season ? req.body.season : { $ne : '' }},
                        function(err, docs) {
    Season.find(function(err, seasons) {
      Category.find(function(err, categories) {
          var categoryLookup = {};
          for (var i = 0; i < categories.length; i++) {
            categoryLookup[categories[i]._id] = categories[i].name;
          }
          res.render('home', {md: md, events: docs, seasons: seasons, categories: categories, categoryLookup: categoryLookup});

      });
    });
  });
};

exports.getEvent = function(req, res) {
  var participantsIds;
  var mentorsIds;
  Event.findOne({ _id: req.params.id }, function(err, event) {
    participantsIds = event.owners;
    mentorsIds = event.mentors;
    Category.findOne({_id: event.category}, function(err, category) {
      User.find({_id : {$in :participantsIds}}, function(err, users) {
        var hasJoined = req.user && participantsIds.indexOf(req.user.id) !== -1;

        var authorIds = [];
        for (i = 0; i < event.comments.length; i++) {
          authorIds.push(event.comments[i].author);
        }
        User.find({_id: {$in : authorIds}}, function(err, commenters) {
          var structuredComments = [];
          for (i = 0; event.comments && i < event.comments.length; i++) {
            var commentContent;
            var authorObject;
            for (j = 0; j < commenters.length; j++) {
              if (event.comments[i].author === commenters[j]._id.toString()) {
                commentContent = event.comments[i].comment.content;
                authorObject = commenters[j];
                break;
              }
            }
            structuredComments.push({
              'authorObject': authorObject,
              'comment' : commentContent
            });
            console.log(authorObject);
          }
          Category.find(function(err, categories) {
            var categoryLookup = {};
            for (var i = 0; i < categories.length; i++) {
              categoryLookup[categories[i]._id] = categories[i].name;
            }
            Season.find(function(err, seasons) {
              var seasonLookup = {};
              for (var i = 0; i < seasons.length; i++) {
                seasonLookup[seasons[i]._id] = seasons[i].name;
              }
              User.find({_id: {$in : mentorsIds}}, function(err, mentors) {
                var hasJoinedAsMentor = req.user && mentorsIds.indexOf(req.user.id) !== -1;
                res.render('events/event', { md: md, event: event, participants: users, mentors: mentors, id: req.params.id, category: category.name,
                  joined: hasJoined, joinedAsMentor: hasJoinedAsMentor, comments: structuredComments, categoryLookup: categoryLookup, seasonLookup: seasonLookup});
              });
            });
          });
        });
      });
    })

  });

};

exports.getMy = function(req, res) {
  console.log("user id" + req.user.id);
  Event.find({ owners : req.user.id }, function(err, docs) {
    Category.find(function(err, categories) {
      var categoryLookup = {};
      for (var i = 0; i < categories.length; i++) {
        categoryLookup[categories[i]._id] = categories[i].name;
      }
      res.render('events/my', { md: md, events: docs, categoryLookup: categoryLookup});
    });
  });
};

exports.joinEvent = function(req, res, next) {
  var user = req.user.id;
  if(!user) {
    res.render('login');
  } else {
    Event.findById(req.body.event, function(err, event) {
      if (err) {
        return next(err);
      }
      if (event.owners.indexOf(user) == -1) {
        event.owners.push(user);
      }
      event.save(function(err, entity) {
        if (err) return next(err);
        req.flash('success', { msg: 'Joined this hack.' });
        res.redirect('/events/' + entity._id);
      });
    });
  }
};

exports.leaveEvent = function(req, res, next) {
  var user = req.user.id;
  if(!user) {
    res.render('login');
  } else {
    Event.findById(req.body.event, function(err, event) {
      if (err) {
        return next(err);
      }
      var index = event.owners.indexOf(user);
      if (index > -1) {
        event.owners.splice(index, 1);
      }
      event.save(function(err, entity) {
        if (err) return next(err);
        req.flash('success', { msg: 'Left this hack.' });
        res.redirect('/events/' + entity._id);
      });
    });
  }

};

exports.joinEventAsMentor = function(req, res, next) {
  var user = req.user.id;
  if(!user) {
    res.render('login');
  } else {
    Event.findById(req.body.event, function(err, event) {
      if (err) {
        return next(err);
      }
      if (event.mentors.indexOf(user) == -1) {
        event.mentors.push(user);
      }
      event.save(function(err, entity) {
        if (err) return next(err);
        req.flash('success', { msg: 'Joined this hack as a mentor.' });
        res.redirect('/events/' + entity._id);
      });
    });
  }
};

exports.leaveEventAsMentor = function(req, res, next) {
  var user = req.user.id;
  if(!user) {
    res.render('login');
  } else {
    Event.findById(req.body.event, function(err, event) {
      if (err) {
        return next(err);
      }
      var index = event.mentors.indexOf(user);
      if (index > -1) {
        event.mentors.splice(index, 1);
      }
      event.save(function(err, entity) {
        if (err) return next(err);
        req.flash('success', { msg: 'Left this hack as a mentor.' });
        res.redirect('/events/' + entity._id);
      });
    });
  }

};

exports.createEvent = function(req, res) {
  if (req.params.id) {
    Event.findOne({ _id: req.params.id }, function(err, event) {
      if (err) return next(err);
      Season.find(function(err, seasons) {
        Category.find(function(err, categories) {
          if (err) return next(err);
          res.render('events/create', { md: md, event: event, id: req.params.id, seasons: seasons, categories: categories});
        });
      });
    });
  } else {
      Season.find(function(err, seasons) {
        Category.find(function(err, categories) {
          if (err) return next(err);
          res.render('events/create', { event: new Event(), seasons: seasons, categories: categories});
        });
      });
  }
};

exports.postEvent = function(req, res, next) {

  
  let sampleFile;
  let uploadPath;

  if (!req.files || Object.keys(req.files).length === 0) {
    console.log('No files were uploaded.');
  } else {
    console.log('req.files >>>', req.files);
    sampleFile = req.files.sampleFile;
    console.log('sampleFile >>>', sampleFile);
    let reqPath = path.join(__dirname, '..');
    uploadPath = reqPath + '\\public\\image\\' + sampleFile.name;
    console.log('uploadPath >>>', uploadPath);
    sampleFile.mv(uploadPath);
    req.body.pictureURL = sampleFile.name;
    console.log('req.body.pictureURL >>>', req.body.pictureURL);
  }


  if (req.params.id) {
    Event.findOne({ _id: req.params.id }, function(err, entity) {
      if (err) return next(err);
      entity.title = req.body.title || '';
      entity.shortDescription = req.body.shortDescription || '';
      entity.description = req.body.description || '';
      entity.pictureURL = req.body.pictureURL || '';
      entity.category = req.body.category || '';
      entity.season = req.body.season;
      entity.open = req.body.open;
      entity.location = 'SumTotal';
      entity.science = 'false';
      entity.save(function(err, entity) {
        if (err) return next(err);
        req.flash('success', { msg: 'Hack edited.'});
        res.redirect('/events/' + entity._id);
      });
    });
  } else {
    var event = new Event();
    event.title = req.body.title || '';
    event.shortDescription = req.body.shortDescription || '';
    event.description = req.body.description || '';
    event.pictureURL = req.body.pictureURL || '';
    event.category = req.body.category || '';
    event.season = req.body.season;
    event.owners[0] = req.user.id;
    event.open = req.body.open;
    event.location = 'SumTotal';
    event.science = 'false';

    event.save(function(err, entity) {
      if (err) return next(err);
      req.flash('success', { msg: 'Hack created.'});
      res.redirect('/events/' + entity._id);
    });
  }

};

exports.postComment = function(req, res, next) {
  Event.findOne({ _id: req.body.event }, function(err, entity) {
    if (err) return next(err);
    entity.comments.push({author: req.user.id, comment: { content: req.body.comment}});
    entity.save(function(err, entity) {
      if (err) return next(err);
      req.flash('success', { msg: 'Comment added.'});
      res.redirect('/events/' + entity._id);
    });
  });
};

exports.postNominate = function(req, res, next) {
  User.findById(req.user.id, function(err, thisUser) {
    if (err) return next(err);
    if (thisUser.judge !== true) {
      res.redirect('/');
    } else {
      Event.findOne({ _id: req.body.event }, function(err, entity) {
        if (err) return next(err);
        entity.nominated = true;
        entity.save(function(err, entity) {
          if (err) return next(err);
          req.flash('success', { msg: 'Hack is now nominated.'});
          res.redirect('/events/' + entity._id);
        });
      });
    }
  });
};