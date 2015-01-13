twee
====

![TweeLogo](https://pbs.twimg.com/profile_banners/2958425874/1421160388/1500x500)

![Travis Build Status](https://travis-ci.org/mesin/twee.svg)
[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/mesin/twee?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)
[![Dependency Status](https://gemnasium.com/mesin/twee.svg)](https://gemnasium.com/mesin/twee)
[![npm version](https://badge.fury.io/js/twee.svg)](http://badge.fury.io/js/twee)

Twee JavaScript Framework for Node.js, based on Express.js and helps to be not as BlackBox like another frameworks, but to use Express.js like you're using only it.
The second idea is modular structure. You are able to create modules. Each module can include:
- extensions (core code)
- head middleware list (runs before all the controllers)
- tail middleware list (runs after all the controllers)
- controllers (each controller has it's own actions and all actions can be configured for some route)
- module prefixes (for example blog module can have `blog` prefix. If controller has action `list`, then this action will be accessable via `blog/list` url)
- extendable configs, with regarding of environment
- extra configurable core
- support for many template engines
