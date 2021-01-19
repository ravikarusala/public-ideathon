var mongoose = require('mongoose');
var md = require("node-markdown").Markdown;

var Rules = require('../models/Rules.js');

exports.getRules = function(req, res) {
    Rules.find(function(err, docs) {
        res.render('rules', { md: md, rules: docs[0] });
    });
};

exports.editRules = function(req, res) {
    Rules.find(function(err, docs) {
        if (!docs || !docs[0]) {
            var rules = new Rules();
            rules.save(function(err, entity) {
                if (err) return next(err);
                res.render('admin/create-rules', { rules :entity });
            });
        } else {
            res.render('admin/create-rules', { rules: docs[0] });
        }

    });
};

exports.postRules = function(req, res) {
    if (req.body.id) {
        Rules.find(function (err, docs) {
            docs[0].description = req.body.description;
            docs[0].save(function (err, entity) {
                if (err) return next(err);
                req.flash('success', {msg: 'Rules edited.'});
                res.redirect('/rules');
            });
        });
    } else {
        var rules = new Rules();
        rules.description = req.body.description;

        rules.save(function(err, entity) {
            if (err) return next(err);
            req.flash('success', { msg: 'Rules created.'});
            res.redirect('/rules');
        });
    }
};
