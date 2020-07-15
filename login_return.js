try{
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    navigator.spatialNavigationEnabled = false;

    var data = {
        "grant_type" : "authorization_code",
        "client_id" : client,
        "client_secret" : secret,
        "code" : code
    };
    $.ajax('https://www.strava.com/oauth/token', { type: "POST", data: data } )
    .done(function(res){
        console.log(res);
        window.localStorage.setItem('access', res.access_token);
        window.localStorage.setItem('refresh', res.refresh_token);
        window.localStorage.setItem('expires_at', res.expires_at);

        console.log("login successful")
        window.location.href = 'index.html'
    })
    .fail(function(err){
        if(err.responseJSON.errors[0].code == "expired"){
            console.log("code expired, trying again")
            window.location.href = 'login.html'
        }
        console.log(err);
    });
} catch(err) {
    console.log(err);
}