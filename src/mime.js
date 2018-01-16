'use strict';
var url = require('url');
var E = module.exports;

var mp4Suffix = /\.(mp4|m4p|m4v|mov)$/i;
var hlsSuffix = /\.m3u8$/;
var hdsSuffix = /\.f4m$/;
var dashSuffix = /\.mpd$/;
var flvSuffix = /\.flv$/;
var webmSuffix = /\.webm$/;
function isRxLink(v, rx){
    return !!v && rx.test(url.parse(v).pathname.split(';')[0]); }
E.isMp4Link = function(v){ return isRxLink(v, mp4Suffix); };
E.isHlsLink = function(v){ return isRxLink(v, hlsSuffix); };
E.isHdsLink = function(v){ return isRxLink(v, hdsSuffix); };
E.isDashLink = function(v){ return isRxLink(v, dashSuffix); };
E.isFlvLink = function(v){ return isRxLink(v, flvSuffix); };
E.isWebmLink = function(v){ return isRxLink(v, webmSuffix); };
E.guessLinkType = function(v){
    var p = url && url.parse(v).pathname;
    if (mp4Suffix.test(p))
        return 'video/mp4';
    if (hlsSuffix.test(p))
        return 'application/x-mpegurl';
    if (hdsSuffix.test(p))
        return 'application/adobe-f4m';
    if (dashSuffix.test(p))
        return 'application/dash+xml';
    if (flvSuffix.test(p))
        return 'video/flv';
    if (webmSuffix.test(p))
        return 'video/webm';
    console.log('could not guess link type: "'+v+'" assuming mp4');
    return 'video/mp4';
};
E.isHlsType = function(type){
    return /^application\/x-mpegurl$/i.test(type);
};
E.isHdsType = function(type){
    return /^application\/adobe-f4m$/i.test(type);
};
E.isDashType = function(type){
    return /^application\/dash\+xml/i.test(type);
};
