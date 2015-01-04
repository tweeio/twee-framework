#!/usr/bin/env node
var twee = new (require('twee'));
twee.setBaseDirectory(__dirname)
    .Bootstrap({
        modules:        'configs/modules',
        tweeConfig:     'configs/twee'
    })
    .run();
