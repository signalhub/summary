'use strict';
// require("material-design-icons");
// require('underscore');
require('normalize.css');
require('./app.styl');

var __svg__ = { path: 'assets/images/svg/*.svg', name: 'images/svg-build/[hash].buttons.svg' };
require('webpack-svgstore-plugin/src/helpers/svgxhr')(__svg__);

// console.log('Hello world!');
