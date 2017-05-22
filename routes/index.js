var Evernote = require('evernote');
var _ = require('lodash')
var config = require('../config.json'); //put my dev key in here
var callbackUrl = "http://localhost:3000/oauth_callback"; //i think evernote gets this and redirects to it after they click allow access

// order of execution

// index else
// oauth
// getRequestToken
// oauth_callback
// index
// Promise { <pending> }


// home page
exports.index = function(req, res) {
  if (req.session.oauthAccessToken) {
    console.log('index')
    var token = req.session.oauthAccessToken;
    var client = new Evernote.Client({
      token: token,
      sandbox: config.SANDBOX,
      china: config.CHINA
    });
    client.getNoteStore().listNotebooks().then(function(notebooks) { // seems that you have to 
      req.session.notebooks = notebooks;
      let filter = new Evernote.NoteStore.NoteFilter({ //need to do Evernote.NoteStore... API does make that clear, had to stackexchange to figure it out
        notebookGuid: notebooks[0].guid
      })

    let resultSpec = new Evernote.NoteStore.NotesMetadataResultSpec({
      includeTitle: true,
      includeContent: true
    });
    let notes = client.getNoteStore().findNotesMetadata(filter, 0, 100, resultSpec)
    console.log(notes.then(notes => {
      let guids = _.map(notesMeta => notesMeta.guid);
      // client.getNoteStore().getNoteContent(guids[0]).then(content=> console.log(content[0])) // example of getting a note, need to get metadata, and then loop over all notes.
    }))
      res.render('index', {session: req.session});
    }, function(error) {
      req.session.error = JSON.stringify(error);
      res.render('index', {session: req.session});
    });
  } else { // index else
    //first load no auth yet
    res.render('index', {session: req.session}); //req gets passed into template variables
  }
};

// OAuth
exports.oauth = function(req, res) { //when they click our link to authenticate
  
  var client = new Evernote.Client({
    consumerKey: config.API_CONSUMER_KEY,
    consumerSecret: config.API_CONSUMER_SECRET,
    sandbox: config.SANDBOX,
    china: config.CHINA
  });

  client.getRequestToken(callbackUrl, function(error, oauthToken, oauthTokenSecret, results) {
    if (error) {
      req.session.error = JSON.stringify(error);
      res.redirect('/');
    } else {
      
      // store the tokens in the session
      req.session.oauthToken = oauthToken; 
      req.session.oauthTokenSecret = oauthTokenSecret;
      
      // redirect the user to authorize the token
      res.redirect(client.getAuthorizeUrl(oauthToken)); //when they click the auth link, they go to evernote to allow access
    }
  });
};

// OAuth callback
exports.oauth_callback = function(req, res) {
  //when they click allow on the evernote site this happens
  var client = new Evernote.Client({
    consumerKey: config.API_CONSUMER_KEY,
    consumerSecret: config.API_CONSUMER_SECRET,
    sandbox: config.SANDBOX,
    china: config.CHINA
  });

  client.getAccessToken(
    req.session.oauthToken, 
    req.session.oauthTokenSecret, 
    req.query.oauth_verifier,
    function(error, oauthAccessToken, oauthAccessTokenSecret, results) {
      if (error) {
        console.log('error');
        console.log(error);
        res.redirect('/');
      } else { // I would recommend saving these access tokens to a local file so you dont have to re-auth everytime you reset the server
        // store the access token in the session
        req.session.oauthAccessToken = oauthAccessToken;
        req.session.oauthAccessTokenSecret = oauthAccessTokenSecret;
        req.session.edamShard = results.edam_shard;
        req.session.edamUserId = results.edam_userId;
        req.session.edamExpires = results.edam_expires;
        req.session.edamNoteStoreUrl = results.edam_noteStoreUrl;
        req.session.edamWebApiUrlPrefix = results.edam_webApiUrlPrefix;
        res.redirect('/');
      }
  });
};

// Clear session
exports.clear = function(req, res) {
  req.session.destroy();
  res.redirect('/');
};
