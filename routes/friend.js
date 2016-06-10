const instance = require('../models').instance;
const Friend = instance.model('Friend');

module.exports = function(app) {
    app.get('/friend', function(req, res) {
        if(! req.user) {
            res.status(401).json({ok: false, error: 'AUTH'});
            return;
        }

        Friend.findAll({
            where: {
                FromUserId: req.user.id
            }
        }).then(function(friends) {
            res.json({
                ok: true,
                data: friends.map((x) => x.ToUserId)
            });
        }).catch(function() {
            res.status(500).json({ok: false, error: 'INTERNAL'});
        });
    });

    app.post('/friend', function(req, res) {
        if(! req.user) {
            res.status(401).json({ok: false, error: 'AUTH'});
            return;
        }

        Friend.create({
            FromUserId: req.user.id,
            ToUserId: req.body.id
        }).then(function() {
            res.json({ok: true});
        }).catch(function() {
            res.status(500).json({ok: false, error: 'INTERNAL'});
        });
    });

    app.delete('/friend/:id', function(req, res) {
        if(! req.user) {
            res.status(401).json({ok: false, error: 'AUTH'});
            return;
        }

        Friend.destroy({
            where: {
                FromUserId: req.user.id,
                ToUserId: req.params.id
            }
        }).then(function() {
            res.json({ok: true});
        }).catch(function() {
            res.status(500).json({ok: false, error: 'INTERNAL'});
        });
    });
};
