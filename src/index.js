import videojs from 'video.js';
import mime from './mime';
import provider from 'lahzenegar-videojs5-hlsjs-source-handler';
import './css/videojs.css';

window.videojs = videojs;
console.log(videojs);
console.log(provider);