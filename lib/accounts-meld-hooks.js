// Register `updateOrCreateUserFromExternalService` function to
// be used in place of the original `Accounts.updateOrCreateUserFromExternalService`
Accounts.updateOrCreateUserFromExternalService = updateOrCreateUserFromExternalService;


// Register `updateEmails` and checkPasswordLogin` functions
// to be triggered with the `onLogin` hook
Accounts.onLogin(function(info) {
    // Updates registered_emails field
    updateEmails(info);
    // Checks for possible meld actions to be created
    checkForMelds(info.user);
});