var videojs = window.videojs = require('video.js');
require('./css/videojs.css');
var mime = require('./mime.js');
var url = require('url');
var map = require('lodash/map');
var pick = require('lodash/pick');

window.parsiplayer = parsiplayer;

function parsiplayer(options, readyCallback) {
	if (typeof options=='function')
    {
        readyCallback = options;
        options = {};
    }
    options = videojs.mergeOptions(options);
    var pl = options.player && typeof options.player!='string' && options.player.length
        ? options.player[0] : options.player;
    var element = !pl ? document.querySelector('video, object, embed') :
        videojs.isEl(pl) ? pl : document.querySelector(pl);
    if (!element)
        return null;
    if (element.parsiplayer)
        return element.parsiplayer;
    if (options = setDefaults(element, options))
        return new Player(element, options, readyCallback);
}

function Player(element, options, readyCallback){
    this.readyCallback = readyCallback;
    this.options = options;
    this.element = this.initElement(element);
    this.vjs = this.initVideoJS();
    this.vjs.parsi = this.vjs.parsi||{};
}

Player.prototype.initElement = function(element){
    var options = this.options;
    if (element.tagName=='VIDEO')
    {
        element.autoplay = false;
        element.controls = false;
        // element.removeAttribute('data-setup');
        if (options.poster)
            element.poster = options.poster;
    }
    else
    {
        var style = window.getComputedStyle(element);
        var attrs = {
            id: uniqueID('parsiplayer'),
            class: 'video-js',
            preload: options.preload||'auto',
            width: options.width||parseFloat(style.width),
            height: options.height||parseFloat(style.height),
        };
        if (options.poster)
            attrs.poster = options.poster;
        var videoel = videojs.createEl('video', {}, attrs);
        videojs.appendContent(videoel, options.sources.map(function(source){
            return videojs.createEl('source', {}, source);
        }));
        videoel.style.position = style.position=='static' ?
            'relative' : style.position;
        videoel.style.left = style.left;
        videoel.style.top = style.top;
        element.parentNode.insertBefore(videoel, element.nextSibling);
        element.style.display = 'none';
        element.parsiplayer = this;
        element = videoel;
    }
    if (!element.id)
        element.id = uniqueID('parsiplayer');
    element.setAttribute('playsinline', '');
    element.parsiplayer = this;
    return element;
};

Player.prototype.getVjsOpt = function(){
    var options = this.options;
    console.log(options);
    var originOptions = this.options['data-setup']||{};
    if (originOptions && typeof originOptions=='string')
    {
        try {
            originOptions = JSON.parse(originOptions);
        } catch(e){}
    }

    originOptions = pick(originOptions, ['playbackRates']);
    return videojs.mergeOptions({
        sources: options.sources,
        html5: {
            hlsjsConfig: {
                debug: false,
                fragLoadingLoopThreshold: 1000,
                manifestLoadingTimeOut: 20*1000,
                manifestLoadingMaxRetry: 4,
                levelLoadingTimeOut: 20*1000,
                levelLoadingMaxRetry: 4,
                xhrSetup: options.withCredentials && function(xhr){
                    xhr.withCredentials = true;
                },
            },
            nativeTextTracks: false,
        },
        inactivityTimeout: options.inactivityTimeout===undefined ?
            2000 : options.inactivityTimeout,
        poster: options.poster,
        loop: options.loop,
        muted: options.muted,
        preload: options.preload,
        tooltips: true,
        plugins: {
            // settings: this.get_settings_opt(),
            // dvr: options.dvr,
            // share: options.share,
            // next: options.next,
            // watermark: options.watermark,
            // parsiSkin: options.skin ? false : {
            //     css: false,
            //     showControlsBeforeStart: options.showControlsBeforeStart,
            //     showTimeForLive: options.showTimeForLive,
            //     playButtonColor: options.playButtonColor,
            //     seekBarColor: options.seekBarColor,
            //     title: options.title,
            // },
        },
    }, originOptions);
};

Player.prototype.initVideoJS = function(){
    var options = this.options, callback = this.readyCallback, parsiplayer = this;
    var vjsOptions = this.getVjsOpt();
    loadDependencies({
        'videojs-thumbnails': !!options.thumbnails || options.thumbnails===undefined,
        'videojs-contrib-ads': !!options.ads,
        'videojs-ima': !!options.ads,
        'videojs-watermark': !!vjsOptions.plugins.watermark,
    });
    var element = this.element;

    return videojs(this.element, vjsOptions, function(){
        var player = this;
        player.emitTapEvents();
        if (options.controls)
            player.controls(true);
        if (options.thumbnails)
            player.thumbnails(options.thumbnails);
        parsiplayer.initAds(player);
        // parsiplayer.init_watermark(player, options.controls_watermark);
        player.on('pause', function(e){
            if (player.scrubbing())
                e.stopImmediatePropagation();
        })
        if (callback)
            try { callback(player); } catch(e){ console.error(e.stack||e); }
        if (options.enableMobileAutoplay || options.autoplay &&
            !videojs.browser.IS_ANDROID && !videojs.browser.IS_IOS)
        {
            player.play();
            player.autoplay(true);
        }
    }).on('error', function (){
        var player = this;
        var error = player.error;
        if (!error || error.code!=error.MEDIA_ERR_SRC_NOT_SUPPORTED)
            return;
    });
};

Player.prototype.initAds = function(player){
    var options = this.options;
    if (!options.ads)
        return;
    if(!window.google || !window.google.ima)
    {
        loadScript('//imasdk.googleapis.com/js/sdkloader/ima3.js',
            this.initAds.bind(this, player));
        return;
    }
    if (options.ads.id3)
        options.ads.manual = true;
    if (!options.ads.adTagUrl && !options.ads.adsResponse && !options.ads.manual)
        return console.error('missing Ad Tag');
    if (!window.google)
        return console.error('missing IMA HTML5 SDK');
    if (!player.ads || !player.ima)
        return console.error('missing ad modules');
    player.ima(videojs.mergeOptions({
        id: player.id(),
        vjsControls: true,
        contribAdsSettings: {
            prerollTimeout: 10000,
            postrollTimeout: 1000,
            disablePlayContentBehindAd: true,
        },
    }, options.ads));
    console.info('init ima plugin');
    if (player.ima.adContainerDiv)
    {
        player.ima.adContainerDiv.style.cursor = 'pointer';
        if (options.ads.hideAdContainer)
            player.ima.adContainerDiv.style.display = 'none';
    }
    function init(e){
        player.off(['tap', 'click', 'play'], init);
        if (player.ima.adContainerDiv)
        {
            player.ima.adContainerDiv.style.cursor = '';
            if (options.ads.hideAdContainer)
                player.ima.adContainerDiv.style.display = 'block';
        }
        console.info('init ad container');
        console.info(e.type);
        player.ima.initializeAdDisplayContainer();
        if (!options.ads.manual) {
            player.ima.requestAds();
        	console.info('init ad requestAds');
        }
        if (e && e.type!='play')
            player.play();

    }
    
    if (player.paused())
        player.on(['tap', 'click', 'play'], init);
    else
        init();
};

function setDefaults(element, options){
	options.autoplay = options.autoPlay || options.autoplay;
	if (options.videoUrl)
    {
        options.sources = [{
            src: options.videoUrl,
            type: options.videoType||mime.guessLinkType(options.videoUrl),
        }];
    }
    else if (options.sources && !options.sources.length)
        options.sources = undefined;

    if (['VIDEO', 'DIV', 'OBJECT', 'EMBED'].indexOf(element.tagName)<0)
        return;
    if (element.tagName=='VIDEO')
    {
        if (!options.sources)
        {
            var sources = element.querySelectorAll('source');
            if (!sources.length)
                return;
            options.sources =
                Array.prototype.map.call(sources, videojs.getAttributes);
        }
        options = videojs.mergeOptions(videojs.getAttributes(element), options);
    }
    if (options.sources)
    {
        options.sources.forEach(function(s){
            s.type = s.type||mime.guessLinkType(s.src);
        });
    }
    if (options.share===undefined)
        options.share = {};
    if (!options.share || options.share.buttons && !options.share.buttons.length)
        options.share = undefined;
    else
        options.share = videojs.mergeOptions(options.share, {title: options.title});
    if (options.watermark && !options.watermark.fadeTime)
        options.watermark.fadeTime = null;
    if (options.enableMobileAutoplay && (videojs.browser.IS_ANDROID ||
        !videojs.browser.IS_IOS))
    {
        options.muted = true;
        options.volume = {override_local_storage: true};
    }
    return options.sources && options;
}

function uniqueID(_prefix) {
  return `${_prefix}_${Math.random().toString(36).substr(2, 9)}`;
}

function loadDependencies(deps){
    deps = deps||{};
    require('lahzenegar-videojs5-hlsjs-source-handler');
    if (deps['videojs-thumbnails'])
    {
        require('videojs-thumbnails');
        require('./css/videojs-thumbnails.css');
    }
    if (deps['videojs-contrib-ads'])
    {
        require('videojs-contrib-ads');
        require('./css/videojs-contrib-ads.css');
    }
    if (deps['videojs-ima'])
    {
        require('videojs-ima');
        require('./css/videojs-ima.css');
    }
    if (deps['videojs-watermark'])
    {
        require('videojs-watermark');
        require('./css/videojs-watermark.css');
    }
}

function loadScript(url, onload, attrs) {
    var script = document.createElement('script');
    script.src = url;
    script.onload = onload;
    if (attrs)
        Object.assign(script, attrs);
    if (document.getElementsByTagName('head').length)
        document.getElementsByTagName('head')[0].appendChild(script);
    else if (document.getElementsByTagName('body').length)
        document.getElementsByTagName('body')[0].appendChild(script);
    else if (document.head)
        document.head.appendChild(script);
};