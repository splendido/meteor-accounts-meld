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
        if (doc.meld === "done")
            return true;
    }
});

// Publish meld action registered for the current user
// ...except those marked with "yes", "not_now", "never"
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
            // Retrieve the meld action document
            var meldAction = MeldActions.findOne(id);
            // Proceed with actual melding of the two accounts...
            AccountsMeld.executeMeldAction(meldAction);
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
    meldUserCallback: Match.Optional(Match.Where(_.isFunction)),
    meldDBCallback: Match.Optional(Match.Where(_.isFunction))
};

// Current configuration values
AM.prototype._config = {
    // Flags telling whether to ask the user before melding any two accounts
    askBeforeMeld: true,
    // Reference to the callback used to meld user objects
    meldUserCallback: null,
    // Reference to the callback used to meld collections" objects
    meldDBCallback: null
};

AM.prototype._defaultUsersObjectsMeld = function(src_user_id, dst_user_id) {
    // Retrieve the source account
    var src_user = Meteor.users.findOne(src_user_id);
    if (!src_user)
        throw new Meteor.Error(403, "Source account was not found!");
    // Retrieve the destination account
    var dst_user = Meteor.users.findOne(dst_user_id);
    if (!dst_user)
        throw new Meteor.Error(403, "Destination account was not found!");
    // createdAt: keep the oldest between the two
    if (src_user.createdAt < dst_user.createdAt)
        dst_user.createdAt = src_user.createdAt;
    // Profile
    if (!src_user.profile)
        src_user.profile = {};
    if (!dst_user.profile)
        dst_user.profile = {};
    _.defaults(dst_user.profile, src_user.profile);
    // services: adds services appearing inside the src user which
    //           do not appear inside the destination user
    if (!src_user.services)
        src_user.services = {};
    if (!dst_user.services)
        dst_user.services = {};
    _.defaults(dst_user.services, src_user.services);
    // TODO: check there are no overlapping services which have different ids!!!
    // emails: fuses the two emails fields, giving precedence to verified ones...
    var src_emails = src_user.emails || [];
    var dst_emails = dst_user.emails || [];
    _.each(src_emails, function(src_email) {
        // Look for the same email address inside dst_emails
        // email_id === -1 means not found!
        var email_id = _.chain(dst_emails)
            .map(function(dst_email) {
                return src_email.address === dst_email.address;
            })
            .indexOf(true)
            .value();
        if (email_id === -1) {
            // In case the email is not present, adds it to the array
            dst_emails.push(src_email);
        } else {
            if (src_email.verified && !dst_emails[email_id].verified) {
                // If the email was found but its verified state should be promoted
                // to true, updates the array element
                dst_emails[email_id].verified = true;
            }
        }
    });
    dst_user.emails = dst_emails;
    // registered_emails: fuses the two emails fields, giving precedence to verified ones...
    src_emails = src_user.registered_emails || [];
    dst_emails = dst_user.registered_emails || [];
    _.each(src_emails, function(src_email) {
        // Look for the same email address inside dst_emails
        // email_id === -1 means not found!
        var email_id = _.chain(dst_emails)
            .map(function(dst_email) {
                return src_email.address === dst_email.address;
            })
            .indexOf(true)
            .value();
        if (email_id === -1) {
            // In case the email is not present, adds it to the array
            dst_emails.push(src_email);
        } else {
            if (src_email.verified && !dst_emails[email_id].verified) {
                // If the email was found but its verified state should be promoted
                // to true, updates the array element
                dst_emails[email_id].verified = true;
            }
        }
    });
    dst_user.registered_emails = dst_emails;
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

AM.prototype.executeMeldAction = function(meldAction) {
    // Marks the meld action as "melding"
    MeldActions.update(meldAction._id, {$set : {meld: "melding"}});
    // Actually melds the two accounts
    this.meldAccounts(meldAction.src_user_id, meldAction.dst_user_id);
    // Removes the meld action
    //MeldActions.remove(meldAction);
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
};

AM.prototype.meldAccounts = function(src_user_id, dst_user_id){
    // Checks whether a callback for users objects meld was specified
    var meldUserCallback = this.getConfig('meldUserCallback')
    if (meldUserCallback)
        // ...in case it was, uses the requested one
        meldUserCallback(src_user_id, dst_user_id);
    else
        // ...otherwise uses the default one
        this._defaultUsersObjectsMeld(src_user_id, dst_user_id);
    // Check whether a callback for DB document migration was specified
    var meldDBCallback = this.getConfig('meldDBCallback');
    if (meldDBCallback)
        meldDBCallback(src_user_id, dst_user_id);
}

AccountsMeld = new AM();




// ------------------------------------------------
// Callback functions to be registered with 'hooks'
// ------------------------------------------------



checkForMelds = function(dst_user) {
    console.log("checkForMelds");
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
        console.log("Found " + users.count() + " users!");
        users.forEach(function(user) {
            // Checks if there is already a document about this meld action
            var meldAction = MeldActions.findOne({
                src_user_id: user._id,
                dst_user_id: dst_user._id
            });
            if (meldAction) {
                console.log("Old Meld action found!");
                // If the last time the answer was "Not now", ask again...
                if (meldAction.meld === "not_now"){
                    MeldActions.update(meldAction._id, {$set: {meld: "ask"}});
                    console.log("Old Meld action updated!");
                }
            } else {
                console.log("Creating Meld action...");
                if (AccountsMeld.getConfig('askBeforeMeld')){
                    // Creates a new meld action
                    AccountsMeld.createMeldAction(user, dst_user);
                    console.log("Meld action created!");                    
                }
                else{
                    // Directly melds the two accounts
                    AccountsMeld.meldAccounts(user._id, dst_user._id);
                }

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
            /*
            else{
                // This service was already registered for "user"
                console.log("Creating Meld action...");
                // Creates a new meld action
                createMeldAction(user, currentUser);
                console.log("Meld action created!");
                // Exits signalling the currentUser so not to login "user"
                return {
                    type: serviceName,
                    userId: currentUser._id
                };
            }
            */
        }
    }
    // Let the user in!
    return orig_updateOrCreateUserFromExternalService.apply(this, arguments);
};
