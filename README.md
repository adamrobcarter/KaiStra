# KaiStra - a Strava client for KaiOS

Please help me test and reccomend new features you'd like to see! [Create an issue](https://github.com/UltrasonicNXT/KaiStra/issues/new). So far only tested on an 8110.

## Installation
 - Follow the KaiOS 'OS ENV Setup' instructions (install Firefox 59 and ADB)
 - Download source
 - Create `config.js` (see below) 
 - Follow the KaiOS 'Testing your apps' instructions

Do contact me if you want any help with this!

## config.js
You will need a [Strava API client id and client secret](https://www.strava.com/settings/api), and [MapQuest key](https://developer.mapquest.com/user/me/apps). `config.js` should then be:
```
const map_key = "mapquest key"
const secret = "strava client secret"
const client = strava client id
```

## Current features
 - See your recent activities
 - Record and upload new activity