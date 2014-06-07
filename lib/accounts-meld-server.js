// ----------------------------------------
// Collection to keep meld action documents
// ----------------------------------------

// Each document is composed as follow:
// {
//     dst_user_id: user_id associated to the account which should survive
//     src_user_id: user_id associated to the account to be deleted
//     meld:        one of ["ask", yes", "not_now", "never", "melding", "done"]
//                   used to track the status of the meld action.
//     src_info: {  a bit of information about the source account
//         emails: src_user.registered_emails (see accounts-emails-field package)
//         services: array of registered services' name, but 'resume'
//     }
//     dst_info: {  a bit of information about the destination account
//         emails: dst_user.registered_emails (see accounts-emails-field package)
//         services: array of registered services' name, but 'resume'
//     }
// }
//
//
// Server - Client interaction flow:
//
// 1) a meld action is created: 'meld': 'ask'
// 2) the client is prompted with a question for which answer allowed values are
//    - 'yes' -> requires to perform the meld action
//    - 'not_now' -> requires to as again at the next login
//    - 'never' -> requires not to meld and not to bother again...
//
// 3a) client updates the meld action an sets 'meld': 'yes'
// 3aa) server sets 'meld': 'melding' (so that client can visualize something...)
// 3ab) in case the meld action cannot be performed because of the same service
//      appearing inside both accounts but with different ids the server sets 'meld': 'ask'
//        ...the hope is the user can remove one of the two conflitting services and then
//           ask again to meld.
//      should be probably very rare, but SOMETHING BETTER SHOULD BE DONE!
// 3ac) when the meld action is completed the server sets 'meld': 'done'
// 3ad) the client should visualize something and then set 'meld': 'ok'
//
// 3b) client updates the meld action an sets 'meld': 'not_now'
// 3ba) at the next login the server changes 'meld': 'not_now'  --> 'meld': 'ask'
//
// 3c) client updates the meld action an sets 'meld': 'never'
// 3ca) at the next login the server sees the mels action with 'meld': 'never'
//      and does nothing...
//

MeldActions = new Meteor.Collection("meldActions");

// Allow client-side modification of a meld action only
// to catch the user answer after having proposed a meld
// and to delete the document of a completed meld action.
MeldActions.allow({
    update: function(userId, doc, fieldNames, modifier) {
        // Only the destination user can modify a document
        if (userId !== doc.dst_user_id)
            return false;
        // ...and only the field meld can be modified
        if (fieldNames.length > 1 || fieldNames[0] != "meld")
            return false;
        // ...and only if meld is 'ask' or 'melding'
        if (!_.contains(['ask', 'melding'], doc.meld))
            return false;
        // ...when meld is "ask" only answers ["yes", "not_now", "never"] are allowed 
        if (doc.meld === "ask"){
            var allowedModifiers = [
                {'$set': {meld: 'yes'}},
                {'$set': {meld: 'not_now'}},
                {'$set': {meld: 'never'}}
            ];
            var notAllowed = _.every(allowedModifiers, function(mod){return !_.isEqual(mod, modifier);});
            if (notAllowed)
                return false;
        }
        // ...when meld is "melding" only answer "ok" is allowed 
        if (doc.meld === "melding")
            if (!_.isEqual(modifier, {'$set': {meld: 'ok'}}))
                return false;
        // ...only in case all the above conditions are satisfied:
        return true;
    },
    remove: function(userId, doc) {
        // no removals unless the meld action is completed!
        return doc.meld === "done"
    }
});

// Publish meld action registered for the current user
// ...except those marked with "ok", yes", "not_now", "never"
//    which are not meant to be displayed client-side.
Meteor.publish("pendingMeldActions", function() {
    return MeldActions.find({
        dst_user_id: this.userId,
        meld: { $nin: ["not_now", "never", "ok", "yes"] }
    });
});

// Observe the changes of meld actions to respond to
// client-side user interactions:
//  - remove unnecessary data when a meld action is marked
//    as to be never performed
//  - actually proceed to meld accounts when the client-side
//    answer is "yes"
MeldActions.find().observeChanges({
    changed: function(id, fields) {
        if (fields.meld === "never")
            // Remove unnecessary data from the document
            MeldActions.update(id, {$unset: {src_info: "", dst_info: ""}});
        else if (fields.meld === "yes") {
            // Proceed with actual melding of the two accounts...
            AccountsMeld.executeMeldAction(id);
        }
    }
});



// ------------------
// AccountsMeld class
// ------------------   

function AM() {}

// Configuration pattern to be checked with check
AM.prototype.CONFIG_PAT = {
    askBeforeMeld: Match.Optional(Boolean),
    checkForConflictingServices: Match.Optional(Boolean),
    meldUserCallback: Match.Optional(Match.Where(_.isFunction)),
    meldDBCallback: Match.Optional(Match.Where(_.isFunction))
};

// Current configuration values
AM.prototype._config = {
    // Flags telling whether to ask the user before melding any two accounts
    askBeforeMeld: false,
    // Flags telling whether to check for conflicting services before melding
    checkForConflictingServices: false,
    // Reference to the callback used to meld user objects
    meldUserCallback: null,
    // Reference to the callback used to meld collections" objects
    meldDBCallback: null
};

AM.prototype._meldUsersObject = function(src_user, dst_user) {
    // Checks whether a callback for melding users' object was specified
    var meldUserCallback = this.getConfig('meldUserCallback');
    // ...in case it was, uses the requested one
    if (meldUserCallback)
        var meldedUser = meldUserCallback(src_user, dst_user);

        meldedUser = _.omit(meldedUser, '_id', 'services', 'emails', 'registered_emails');
        _.each(meldedUser, function(value, key){
            dst_user[key] = value;
        });
    // ...otherwise perfors some default fusion
    else{
        // 'createdAt' field: keep the oldest between the two
        if (src_user.createdAt < dst_user.createdAt)
            dst_user.createdAt = src_user.createdAt;
        // 'profile' field
        var profile = {};
        _.defaults(profile, src_user.profile || {});
        _.defaults(profile, dst_user.profile || {});
        if (!_.isEmpty(profile))
            dst_user.profile = profile;
    }
    // 'services' field (at this point we know)
    var services = {};
    _.defaults(services, src_user.services || {});
    _.defaults(services, dst_user.services || {});
    if (!_.isEmpty(services))
        dst_user.services = services;
    // 'emails' field: fuses the two emails fields, giving precedence to verified ones...
    var src_emails = src_user.emails || [];
    var dst_emails = dst_user.emails || [];
    // creates an object with addressess as keys and verification status as values
    var emails = {};
    _.each(_.flatten([src_emails, dst_emails]), function(email) {
       emails[email.address] = emails[email.address] || email.verified;
    });
    // transforms emails back to [{address: addr1, verified: bool}, {address: addr2, verified: bool}, ...]
    dst_user.emails = _.map(emails, function(verified, address){
        return {address: address, verified: verified};
    });
    // registered_emails: fuses the two emails fields, giving precedence to verified ones...
    src_emails = src_user.registered_emails || [];
    dst_emails = dst_user.registered_emails || [];
    // creates an object with addressess as keys and verification status as values
    emails = {};
    _.each(_.flatten([src_emails, dst_emails]), function(email) {
       emails[email.address] = emails[email.address] || email.verified;
    });
    // transforms emails back to [{address: addr1, verified: bool}, {address: addr2, verified: bool}, ...]
    dst_user.registered_emails = _.map(emails, function(verified, address){
        return {address: address, verified: verified};
    });
    // Removes the old user
    Meteor.users.remove(src_user._id);
    // Updates the current user
    Meteor.users.update(dst_user._id, {$set: _.omit(dst_user, "_id")});
};

AM.prototype.getConfig = function(param_name) {
    return this._config[param_name];
};

AM.prototype.configure = function(config) {
    check(config, this.CONFIG_PAT);
    // Update the current configuration
    this._config = _.defaults(config, this._config);
};

AM.prototype.createMeldAction = function(src_user, dst_user){
    MeldActions.insert({
        src_user_id: src_user._id,
        dst_user_id: dst_user._id,
        meld: "ask",
        src_info: {
            emails: src_user.registered_emails,
            services: _.without(_.keys(src_user.services), "resume")
        },
        dst_info: {
            emails: dst_user.registered_emails,
            services: _.without(_.keys(dst_user.services), "resume")
        }
    });
};

AM.prototype.executeMeldAction = function(id) {
    // Retrieve the meld action document
    var meldAction = MeldActions.findOne(id);
    // Marks the meld action as "melding"
    MeldActions.update(meldAction._id, {$set : {meld: "melding"}});

    // Retrieve the source account
    var src_user = Meteor.users.findOne(meldAction.src_user_id);
    // Retrieve the destination account
    var dst_user = Meteor.users.findOne(meldAction.dst_user_id);

    // Actually melds the two accounts
    var meldResult = this.meldAccounts(src_user, dst_user);
    if (meldResult){    
        // Marks the meld action as "done"
        MeldActions.update(meldAction._id, {$set : {meld: "done"}});
        // Possibly removes old meld actions registered for the same two
        // accounts but for the opposite direction
        invMeldAction = MeldActions.findOne({
            src_user_id: meldAction.dst_user_id,
            dst_user_id: meldAction.src_user_id,
        });
        if (invMeldAction)
            MeldActions.remove(invMeldAction._id);
    }
    else{
        // XXX TODO: For know this seems the only thing to be improoved in a near future
        //           Some error status and better client communication of the problem
        //           should be put in place...
        MeldActions.update(meldAction._id, {$set : {meld: "not_now"}});
    }
};

AM.prototype.meldAccounts = function(src_user, dst_user){
    //checks there are no overlapping services which have different ids!!!
    var canMeld = true;
    // Checks for conflicting services before proceeding with actual mergin
    if (this.getConfig('checkForConflictingServices'))
        if (!!src_user.services && !!dst_user.services){
            _.each(_.keys(src_user.services), function(service_name){
                if (service_name !== "resume" && !!dst_user.services[service_name])
                    if (service_name === "password"){
                        if (!_.isEqual(src_user.services[service_name], dst_user.services[service_name]))
                            canMeld = false;
                    }
                    else{
                        var src_service = src_user.services[service_name];
                        var dst_service = dst_user.services[service_name];
                        if (!!src_service.id && !! dst_service.id && src_service.id !== dst_service.id)
                            canMeld = false;
                    }
            })        
        }
    if (!canMeld)
        return false;
    // Melds users'object
    this._meldUsersObject(src_user, dst_user);
    // Check whether a callback for DB document migration was specified
    var meldDBCallback = this.getConfig('meldDBCallback');
    if (meldDBCallback)
        meldDBCallback(src_user._id, dst_user._id);
    return true;
};

AccountsMeld = new AM();




// ------------------------------------------------
// Callback functions to be registered with 'hooks'
// ------------------------------------------------



checkForMelds = function(dst_user) {
    // Updates all possibly pending meld actions...
    MeldActions.update({dst_user_id: dst_user._id, meld: "not_now"}, {$set: {meld: "ask"}}, {multi: true});
    // Picks up verified email addresses and creates a list like
    // [{$elemMatch: {"address": addr1, "verified": true}}, {$elemMatch: {"address": addr2, "verified": true}}, ...]
    var queryEmails = _.chain(dst_user.registered_emails)
        .filter(function(email) {return email.verified;})
        .map(function(email) {return {"registered_emails": {$elemMatch: email}};})
        .value();
    // In case there is at least one registered address
    if (queryEmails.length) {
        // Finds users with at least one registered email address matching the above list
        if (queryEmails.length > 1)
            queryEmails = {$or: queryEmails};
        else
            queryEmails = queryEmails[0];
        // Excludes current user...
        queryEmails["_id"] = {$ne: dst_user._id};
        var users = Meteor.users.find(queryEmails);
        users.forEach(function(user) {
            // Checks if there is already a document about this meld action
            var meldAction = MeldActions.findOne({
                src_user_id: user._id,
                dst_user_id: dst_user._id
            });
            if (meldAction) {
                // If the last time the answer was "Not now", ask again...
                if (meldAction.meld === "not_now")
                    MeldActions.update(meldAction._id, {$set: {meld: "ask"}});
            } else {
                if (AccountsMeld.getConfig('askBeforeMeld'))
                    // Creates a new meld action
                    AccountsMeld.createMeldAction(user, dst_user);
                else
                    // Directly melds the two accounts
                    AccountsMeld.meldAccounts(user, dst_user);
            }
        });
    }
};


var orig_updateOrCreateUserFromExternalService = Accounts.updateOrCreateUserFromExternalService;
updateOrCreateUserFromExternalService = function(serviceName, serviceData, options) {
    var currentUser = Meteor.user();
    if (currentUser) {
        // The user was already logged in with a different account
        // Checks if the service is already registered with this same account
        if (!currentUser.services[serviceName]) {
            // It may be that the same service is already used with a different account
            // Checks is there is already an account with this service
            var selector = {};
            selector["services." + serviceName + ".id"] = serviceData.id;
            var user = Meteor.users.findOne(selector);
            if (!user) {
                // This service is being used for the first time!
                // Simply add the service data to the current user, and that"s it!
                var setAttr = {};
                setAttr["services." + serviceName] = serviceData;
                Meteor.users.update({_id: currentUser._id}, {"$set": setAttr});
            }
            else{
                // This service was already registered for "user"
                if (AccountsMeld.getConfig('askBeforeMeld')){
                    // Creates a new meld action
                    AccountsMeld.createMeldAction(user, currentUser);
                    // Cancels the login to keep currentUser logged in
                    return {
                        type: serviceName,
                        error: new Meteor.Error(
                            Accounts.LoginCancelledError.numericError,
                            "Another account registered with the same service was found!"
                        )
                    };
                }
                else
                    // Directly melds the two accounts
                    AccountsMeld.meldAccounts(user, currentUser);
            }
        }
    }
    // Let the user in!
    return orig_updateOrCreateUserFromExternalService.apply(this, arguments);
};
