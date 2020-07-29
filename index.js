window.onerror = function(message, source, lineno, colno, error) {
    console.error(error)
};

navigator.spatialNavigationEnabled = false;

const api_url = "https://www.strava.com/api/v3"
const gpsOptions = {
	enableHighAccuracy: true,
	timeout: 30*1000,
	maximumAge: 0
};
const activity_types = [
    'AlpineSki', 'BackcountrySki', 'Canoeing', 'Crossfit', 'EBikeRide', 'Elliptical', 'Golf', 
    'Handcycle', 'Hike', 'IceSkate', 'InlineSkate', 'Kayaking', 'Kitesurf', 'NordicSki', 'Ride', 
    'RockClimbing', 'RollerSki', 'Rowing', 'Run', 'Sail', 'Skateboard', 'Snowboard', 'Snowshoe', 
    'Soccer', 'StairStepper', 'StandUpPaddling', 'Surfing', 'Swim', 'Velomobile', 'VirtualRide',
    'VirtualRun', 'Walk', 'WeightTraining', 'Wheelchair', 'Windsurf', 'Workout',' Yoga'
]

let gps_id
let gps_lock

jQuery.fn.extend({
    selectable: function(){
        return this.attr('tabindex', '')
    }
})

const get = (key) => window.localStorage.getItem(key)
const set = (key, val) => window.localStorage.setItem(key, val)

const app = new PagedApp()

const home = app.newPage()
let header = $("<header />").append($("<h3 />").text("Your activities"))
const activities = $("<div />")
home.append(header).append(activities)

const preRecord = app.newPage()
header = $("<header />").append($("<h3 />").text("Start recording"))
const img0 = $("<img />").addClass('map').addClass("prerecord")
preRecord.append(header).append(img0)

const recording = app.newPage()
header = $("<header />").append($("<h3 />").text("Recording"))
const stats = $("<table />").addClass('stats').attr('cellspacing', 0).attr('cellpadding', 0)
    .append($("<tr />").append($("<td />").text("distance"))
                       .append($("<td />").text("time")))
    .append($("<tr />").append($("<td />").addClass("dist"))
                       .append($("<td />").addClass("time")))
const statusP = $("<p />").text("waiting for gps")
const img = $("<img />").addClass('map').addClass("recording")
recording.append(header).append(stats).append(statusP).append(img)

const postRecord = app.newPage()
header = $("<header />").append($("<h3 />").text("Recording finished"))
const p = $("<p />").text("Activity name:")
const name = $("<input />").attr("type", "text").selectable().val("test name")
const p2 = $("<p />").text("Activity description:")
const desc = $("<input />").attr("type", "text").selectable().val("test desc")
const p3 = $("<p />").text("trainer?")
const trainer = $("<input />").attr('type', 'checkbox').selectable().appendTo(p3)
const p4 = $("<p />").text("commute?")
const commute = $("<input />").attr('type', 'checkbox').selectable().appendTo(p4)
const p5 = $("<p />").text("activity type")
const activityType = $("<select />").selectable().appendTo(p5)
for(type of activity_types){
    $("<option />").text(type).attr('value', type).appendTo(activityType)
}
postRecord.append(header).append(p).append(name).append(p2).append(desc).append(p3).append(p4).append(p5)

const upload = app.newPage()
upload.append("uploading")

home.softRight = {
    label: 'record',
    fn: () => {
        app.nav(preRecord)
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude
            const lon = pos.coords.longitude
            loadMap_internal(img0, lat, lon, lat, lon, null, '240,263')
        }, error, gpsOptions)
    }
}

preRecord.back = () => app.nav(home)
preRecord.center = {
    label: 'start',
    fn: () => {
        app.nav(recording)
        startRecording()
    }
}

function recordingKeysActive(){
    recording.center = {
        label: 'pause',
        fn: () => {
            recordingKeysPaused()
            pauseRecording()
        }
    }
    recording.softLeft = { label: '', fn: () => {} }
    recording.softRight = { label: '', fn: () => {} }
    recording.render()
}

function recordingKeysPaused(){
    recording.center = {
        label: 'resume',
        fn: () => {
            recordingKeysActive()
            resumeRecording()
        }
    }
    recording.softLeft = {
        label: 'abandon',
        fn: () => {
            if(confirm("Are you sure you want to abandon this recording?")){
                abandonRecording()
                app.nav(home)
            }
        }
    }
    recording.softRight = {
        label: 'finish',
        fn: () => app.nav(postRecord)
    }
    recording.render()
}

recording.center = {
    label: 'pause',
    fn: () => {
        recordingKeysPaused()
        pauseRecording()
    }
}

postRecord.softRight = {
    label: 'upload',
    fn: () => {
        // check there's a name
        app.nav(upload)
        makeUpload()
    }
}
postRecord.back = () => {
    app.nav(recording)
}

app.render("body")
start()

var dist
var lastLat
var lastLon
var lastTime = 0
var startTime
var maxLat
var minLat
var maxLon
var minLon
var lastMap = 0

if(!get('access')){
    window.location.href = 'login.html'
}

function start(){
    console.log("start() called")

    const loadState = getState()
    if(loadState == 'recording' || loadState == 'paused'){
        console.log("restoring recording")

        startTime = parseInt(get('startTime'))
        dist = parseInt(get('dist'))
        
        [maxLat, maxLon, minLat, minLon] = extractMaxMins(get('points'))
    
        app.nav(recording, false)

        if(loadState == 'recording'){
            startGPS()
            setState('recording')
            recordingKeysActive()
            //startGPS()
        } else { // paused
            recordingKeysPaused()
        }
        
    } else {
        loadHome()
    }
}

function loadHome(){
    refreshIfNeeded(() => {
        $.ajax(api_url + '/athlete/activities', {beforeSend: add_header, data: {per_page: 5}})
        .done(function(data){
            activities.empty()
        
            console.log(data)
            for(var activity of data){
                const div = $("<div />").addClass('activity')
                $("<h4 />").text(activity.name).appendTo(div)
                $("<div />").append($("<span />").text(formatDist(activity.distance)))
                    .append(" ")
                    .append($("<span />").text(formatTime(activity.moving_time)))
                    .appendTo(div)
                const actImg = $("<img />").appendTo(div)

                const map = activity.map.summary_polyline
                loadMap_internal(actImg, ...extractMaxMins(map), map)
                
                activities.append(div)
            }
        })
        .fail(error)
    })
}

function gpsPoint(point){
    const coords = point.coords
    const lat = coords.latitude
    const lon = coords.longitude
    const time = Math.round(Date.now()/1000)


    if( lastLat == 0 || distance(lastLat, lastLon, lat, lon) > 1){ // if it's the first time or we have moved

        let pointsEnc = get('points')
        const first = pointsEnc.length == 0
        pointsEnc += compressPoint(lastLat, lastLon, lat, lon)
        set('points', pointsEnc)

        let timesEnc = get('times')
        if(!first){ // we don't store the first time point
            timesEnc += compressTime(lastTime, time)
        }
        set('times', timesEnc)

        console.log('point saved. points len', pointsEnc.length, 'times len', timesEnc.length)

        if(first){
            // first ever point
            statusP.text("gps aquired")
            maxLat = lat
            minLat = lat
            maxLon = lon
            minLon = lon
        } else {
            const elapsed = (lastTime - startTime)
            $(".time").text(formatTime(elapsed))

            if( lastLat == 0 ){
                // first point after restoring
                console.log("in first mL", maxLat)
            } else {
                const d = distance(lastLat, lastLon, lat, lon)
                dist += d
                set('dist', dist)
            }

            if(lat > maxLat){
                maxLat = lat
            }
            if(lat < minLat){
                minLat = lat
            }
            if(lon > maxLon){
                maxLon = lon
            }
            if(lon < minLon){
                minLon = lon
            }
        }

        console.log("maxLat", maxLat, "lat", lat)
        loadMap(pointsEnc)

        lastLat = lat
        lastLon = lon
        lastTime = Math.round(Date.now() / 1000)

        $(".dist").text(formatDist(dist))
    } else {
        console.log("ignoring point")
    }
}

document.addEventListener("visibilitychange", function() {
    if(!document.hidden){
        lastMap = 0 // little hackish, but this will force the next gps return to reload the map
    }
});

function loadMap(pointsEnc){
    if(!document.hidden && Date.now() - lastMap > 60*1000){
        loadMap_internal(img, maxLat, maxLon, minLat, minLon, pointsEnc)

        lastMap = Date.now()
    }
}

function loadMap_internal(image, maxLat, maxLon, minLat, minLon, pointsEnc, size='240,170'){
    
    const url = new URL("https://open.mapquestapi.com/staticmap/v4/getmap")
    url.searchParams.append('key', map_key)
    url.searchParams.append('size', size)
    url.searchParams.append('bestfit', maxLat+','+maxLon+','+minLat+','+minLon)
    url.searchParams.append('scalebar', 'false')
    if(pointsEnc){
        url.searchParams.append('polyline', 'color:0xFF0000|width:2|cmp:'+pointsEnc)
    }
    console.log("setting image url", image, url.href)

    image.attr('src', url.href)
}

function startGPS(){
    gps_lock = window.navigator.requestWakeLock('gps');
    gps_id = navigator.geolocation.watchPosition(gpsPoint, () => {}, gpsOptions);
    console.log("out startGPS")
}

function stopGPS(){
    navigator.geolocation.clearWatch(gps_id);
    gps_id = null;
    gps_lock.unlock();
}

function startRecording(){
    dist = 0
    filename = null
    lastLat = 0
    lastLon = 0
    startGPS()
    setState('recording')
    startTime = Math.round(Date.now()/1000)
    set('startTime', startTime)
}

function pauseRecording(){
    stopGPS();
    setState('paused')
}

function resumeRecording(){
    startGPS();
    setState('recording')
}

function abandonRecording(){
    setState('')

    set('times', '')
    set('points', '')
    set('dist', 0)
    set('startTime', 0)
    set('maxLat', '')
    set('minLat', '')
    set('maxLon', '')
    set('minLon', '')
    img0.attr('src', '')
    img.attr('src', '')
}

function makeUpload(){
    setState('')

    const points = decompressPoints(get('points'))
    const times = decompressTimes(parseInt(get('startTime')), get('times')) // add back the first time point
    console.log(points, times)
        
    const xml = document.implementation.createDocument("", "", null);
    
    const gpx = xml.createElement('gpx');
    xml.appendChild(gpx);
    const trk = xml.createElement('trk');
    gpx.appendChild(trk);
    const trkseg = xml.createElement('trkseg');
    trk.appendChild(trkseg);
    
    for(var i in points){
        const trkpt = xml.createElement('trkpt');
        trkpt.setAttribute('lat', points[i].lat);
        trkpt.setAttribute('lon', points[i].lon);
        const timeElem = xml.createElement('time');
        const time = new Date(times[i]*1000);
        timeElem.textContent = time.toISOString();
        trkpt.appendChild(timeElem);
        trkseg.appendChild(trkpt);
    }
    var serializer = new XMLSerializer();
    var res = serializer.serializeToString(xml);
    
    const fileblob = new Blob([res], {type: "text/plain"});
    const filename =  "gps-" + Date.now().toString() + ".gpx"

    abandonRecording()

    refreshIfNeeded( () => {
        const d  = new FormData()
        d.set('name', name.text())
        d.set('description', desc.text())
        d.set('trainer', trainer.is(":checked"))
        d.set('commute', commute.is(":checked"))
        d.set('data_type', 'gpx')
        d.set('external_id', 'kaios_' + filename)
        d.set('activity_type', activityType.val())
        d.set('file', fileblob)
        $.ajax(api_url + '/uploads', {
            data: d,
            beforeSend: add_header,
            cache: false,
            contentType: false,
            processData: false,
            method: 'POST'
        })
        .done(function(data){
            console.log(data)
            if(data.error == null){
                checkUpload(data.id)
            }
            //$(".user-name").text(data.firstname + " " + data.lastname)
            //$("header img").attr('src', data.profile)
        })
        .fail(error)
    })
}

function checkUpload(id){
    $.ajax(api_url + '/uploads/' + id, { beforeSend: add_header })
    .done(function(data){
        console.log(data)
        if(data.status == "Your activity is ready."){
            alert(data.status)
            app.nav(home)
            loadHome()
        } else if(data.status == "There was an error processing your activity."){
            alert(data.status + data.error)
            app.nav(home)
            loadHome()
        } else {
            upload.append(data.status)
            setTimeout(checkUpload, 1000, id)
        }
    })
    .fail(error)
}

function getState(){
    return get('state')
}
function setState(state){
    set('state', state)
}

function add_header(xhr){
    console.log("sending request with access token", get('access'));
    xhr.setRequestHeader('Authorization', 'Bearer ' + get('access') );
}

function refreshIfNeeded(then){
    const expires_at = get('expires_at')
    var secs = new Date() / 1000;

    if(expires_at < secs){
        var data = {
            "grant_type" : "refresh_token",
            "client_id" : client,
            "client_secret" : secret,
            "refresh_token" : get('refresh')
        };
        $.ajax('https://www.strava.com/oauth/token', { type: "POST", data: data } )
        .done(function(res){
            console.log("replacing old access token", get('access'))
            console.log("with new access token", res.access_token)
            console.log(res);
            set('access', res.access_token);
            set('refresh', res.refresh_token);
            set('expires_at', res.expires_at);

            console.log("refresh successful")

            then()
        })
        .fail(function(err){
            console.log(err);

            then() // ?
        });
    } else {
        then()
    }
}
function a(){
$.ajax(api_url + '/athlete',{ beforeSend: add_header })
.done(function(data){
    console.log(data)
    $(".user-name").text(data.firstname + " " + data.lastname)
    $("header img").attr('src', data.profile)
})
.fail(function(err){
    console.log(err)
})
}

function error(err){
    console.error(err)
}

function distance(lat1, lon1, lat2, lon2){
	const R = 6371e3; // metres
	const φ1 = lat1 * Math.PI/180; // φ, λ in radians
	const φ2 = lat2 * Math.PI/180;
	const Δφ = (lat2-lat1) * Math.PI/180;
	const Δλ = (lon2-lon1) * Math.PI/180;

	const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
			  Math.cos(φ1) * Math.cos(φ2) *
			  Math.sin(Δλ/2) * Math.sin(Δλ/2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

	const d = R * c; // in metres
	return d;
}

function compressPoint(lat1, lon1, lat2, lon2) {
    precision = 5
    precision = Math.pow(10, precision);
    //  Round to N decimal places
    lat1 = Math.round(lat1 * precision);
    lon1 = Math.round(lon1 * precision);
    
    lat2 = Math.round(lat2 * precision);
    lon2 = Math.round(lon2 * precision);

    return encodeNumber(lat2 - lat1) + encodeNumber(lon2 - lon1);
}

function compressTime(t1, t2){
    return encodeNumber(t2 - t1)
}

function encodeNumber(num) {
    var num = num << 1;
    if (num < 0) {
       num = ~(num);
    }
    var encoded = '';
    while (num >= 0x20) {
       encoded += String.fromCharCode((0x20 | (num & 0x1f)) + 63);
       num >>= 5;
    }
    encoded += String.fromCharCode(num + 63);
    return encoded;
}

function decompressPoints(encoded) {
    precision = 5
    precision = Math.pow(10, -precision);
    var len = encoded.length, index=0, lat=0, lng = 0, array = [];
    while (index < len) {
        var b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        var dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;
        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        var dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;
        array.push({
            lat: lat * precision,
            lon: lng * precision
        })
    }
    return array;
}

function decompressTimes(firstTime, encoded){
    var len = encoded.length, index=0, time=firstTime, array = [firstTime];
    while (index < len) {
        var b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        var dtime = ((result & 1) ? ~(result >> 1) : (result >> 1));
        time += dtime;
        array.push(time)
    }
    return array;
}

function extractMaxMins(encoded){
    const points = decompressPoints(encoded)
    let maxLat = points[0].lat
    let maxLon = points[0].lon
    let minLat = points[0].lat
    let minLon = points[0].lon
    for({lat, lon} of points){
        if(lat > maxLat){
            maxLat = lat
        }
        if(lat < minLat){
            minLat = lat
        }
        if(lon > maxLon){
            maxLon = lon
        }
        if(lon < minLon){
            minLon = lon
        }
    }
    return [maxLat, maxLon, minLat, minLon]
}

function formatDist(d){
    if(d < 1000){
        return Math.round(d) + "m"
    } else if (d < 10*1000){
        d = d/1000
        return d.toPrecision(2) + "km"
    } else {
        d = d/1000
        return d.toPrecision(3) + "km"
    }
}
function formatTime(t){
    if(t < 60){
        return Math.round(t) + "s"
    } else if(t < 60*60){
        return Math.round(t/60) + "m"
    } else {
        return Math.floor(t/3600) + "h" + Math.round((t/60)%60) + "m"
    }
}