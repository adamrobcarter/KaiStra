const redirect_uri =  "http://strava.com/oauth/success";
const scope = "activity:read,activity:write"

const auth_url = "https://www.strava.com/oauth/authorize";

const url = new URL(auth_url);
url.searchParams.append('client_id', client_id);
url.searchParams.append('redirect_uri', redirect_uri);
url.searchParams.append('scope', scope);
url.searchParams.append('response_type', 'code');

console.log(url.href);
navigator.spatialNavigationEnabled = true;
window.location.href = url.href;